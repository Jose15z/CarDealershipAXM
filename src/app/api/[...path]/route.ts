import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";
import { db, databaseConfigured } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createSession,
  clearSession,
  getCurrentUser,
  requireUser,
  requireAdmin,
  hashPassword,
  verifyPassword,
  safeUser,
} from "@/lib/auth";
import { assertOrigin, jsonBody, rateLimit } from "@/lib/security";
import {
  registerSchema,
  loginSchema,
  inquirySchema,
  appointmentSchema,
  settingsSchema,
} from "@/lib/validation";
import {
  getInventory,
  getSettings,
  serialize,
  vehicleInclude,
} from "@/lib/data";
import { saveVehicle, confirmSale, invalidateVehicle } from "@/lib/vehicles";
import {
  instagramConfigured,
  importInstagramPost,
  syncInstagram,
} from "@/lib/instagram";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const ok = (body: unknown, status = 200) =>
  NextResponse.json(serialize(body), {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function handle(request: NextRequest, context: Context) {
  try {
    assertOrigin(request);
    const path = (await context.params).path;
    const [resource, id, action] = path;
    const method = request.method;
    if (path.length > 3) throw new AppError(404, "Ruta no encontrada.");
    if (!databaseConfigured())
      throw new AppError(
        503,
        "La base de datos no está configurada. Contacta al administrador.",
      );
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    if (resource === "auth") {
      if (id === "me" && method === "GET")
        return ok({ user: await getCurrentUser() });
      if (id === "register" && method === "POST") {
        await rateLimit(request, "register", 5);
        const values = registerSchema.parse(await jsonBody(request));
        const { password, consent, ...profile } = values;
        void consent;
        const user = await db.user.create({
          data: {
            ...profile,
            passwordHash: await hashPassword(password),
            role: "CLIENT",
          },
        });
        await createSession(user.id);
        return ok({ user: safeUser(user) }, 201);
      }
      if (id === "login" && method === "POST") {
        await rateLimit(request, "login", 10);
        const v = loginSchema.parse(await jsonBody(request));
        const user = await db.user.findUnique({ where: { email: v.email } });
        const valid = await verifyPassword(
          v.password,
          user?.passwordHash ??
            "$2b$12$8QoL5GlR57DYV8Zcvp9QHeIE3GGbCCe4MmE0CYO69b1AeL9Jd.G/u",
        );
        if (!user || !valid)
          throw new AppError(401, "Correo o contraseña incorrectos.");
        await createSession(user.id);
        return ok({ user: safeUser(user) });
      }
      if (id === "logout" && method === "POST") {
        await clearSession();
        return ok({ success: true });
      }
    }
    if (resource === "vehicles") {
      if (!id && method === "GET") {
        const admin = params.admin === "true";
        if (admin) await requireAdmin();
        return ok(await getInventory(params, admin));
      }
      if (!id && method === "POST") {
        const actor = await requireAdmin();
        return ok(
          { vehicle: await saveVehicle(await jsonBody(request), actor.id) },
          201,
        );
      }
      if (id && method === "GET") {
        const admin = params.admin === "true";
        if (admin) await requireAdmin();
        const vehicle = await db.vehicle.findFirst({
          where: {
            id,
            ...(admin
              ? {}
              : {
                  verified: true,
                  status: { in: ["DISPONIBLE", "RESERVADO", "VENDIDO"] },
                }),
          },
          include: vehicleInclude,
        });
        if (!vehicle) throw new AppError(404, "Vehículo no encontrado.");
        return ok({ vehicle });
      }
      if (id && action === "sell" && method === "POST") {
        const actor = await requireAdmin();
        const v = z
          .object({
            revision: z.number().int().min(0),
            amount: z.number().int().positive().max(999999999999999),
            idempotencyKey: z.string().min(10).max(100),
          })
          .strict()
          .parse(await jsonBody(request));
        return ok({ sale: await confirmSale(id, actor.id, v) });
      }
      if (id && !action && method === "PATCH") {
        const actor = await requireAdmin();
        return ok({
          vehicle: await saveVehicle(await jsonBody(request), actor.id, id),
        });
      }
      if (id && !action && method === "DELETE") {
        const actor = await requireAdmin();
        const v = z
          .object({ revision: z.number().int().min(0) })
          .strict()
          .parse(await jsonBody(request));
        const vehicle = await db.vehicle.findUnique({ where: { id } });
        if (!vehicle) throw new AppError(404, "Vehículo no encontrado.");
        await db.$transaction(async (tx) => {
          const updated = await tx.vehicle.updateMany({
            where: { id, revision: v.revision, status: { not: "VENDIDO" } },
            data: {
              status: "ARCHIVADO",
              featured: false,
              revision: { increment: 1 },
            },
          });
          if (updated.count !== 1)
            throw new AppError(409, "El vehículo cambió o ya fue vendido.");
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "VEHICLE_ARCHIVED",
              entityId: id,
            },
          });
        });
        invalidateVehicle(vehicle.slug);
        return ok({ success: true });
      }
    }
    if (resource === "favorites") {
      const user = await requireUser();
      if (method === "GET") {
        const favoriteWhere = {
          userId: user.id,
          ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
        };
        const total = await db.favorite.count({ where: favoriteWhere });
        const pages = Math.ceil(total / 12);
        const page = Math.min(
          Math.max(1, Math.floor(Number(params.page) || 1)),
          pages || 1,
        );
        return ok({
          favorites: await db.favorite.findMany({
            where: favoriteWhere,
            include: { vehicle: { include: vehicleInclude } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * 12,
            take: 12,
          }),
          total,
          page,
          pages,
        });
      }
      if (method === "POST" || method === "DELETE") {
        const v = z
          .object({ vehicleId: z.string().min(1) })
          .strict()
          .parse(await jsonBody(request));
        if (method === "POST") {
          const vehicle = await db.vehicle.findFirst({
            where: {
              id: v.vehicleId,
              verified: true,
              status: { in: ["DISPONIBLE", "RESERVADO"] },
            },
          });
          if (!vehicle) throw new AppError(404, "Vehículo no disponible.");
          await db.favorite.upsert({
            where: {
              userId_vehicleId: { userId: user.id, vehicleId: v.vehicleId },
            },
            create: { userId: user.id, vehicleId: v.vehicleId },
            update: {},
          });
        } else
          await db.favorite.deleteMany({
            where: { userId: user.id, vehicleId: v.vehicleId },
          });
        return ok({ success: true });
      }
    }
    if (resource === "profile" && method === "PATCH") {
      const user = await requireUser();
      const v = z
        .object({
          name: z.string().trim().min(1).max(100),
          phone: z.string().max(30).nullable().optional(),
        })
        .strict()
        .parse(await jsonBody(request));
      return ok({
        user: safeUser(
          await db.user.update({ where: { id: user.id }, data: v }),
        ),
      });
    }
    if (resource === "users") {
      const actor = await requireAdmin();
      if (method === "GET" && !id) {
        const q = params.q?.trim().slice(0, 100);
        const where: Prisma.UserWhereInput = {
          role: "CLIENT",
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        };
        const total = await db.user.count({ where });
        const page = Math.min(
          Math.max(1, Math.floor(Number(params.page) || 1)),
          Math.ceil(total / 20) || 1,
        );
        const users = await db.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            _count: { select: { inquiries: true, appointments: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 20,
          take: 20,
        });
        return ok({ users, total, page, pages: Math.ceil(total / 20) });
      }
      if (method === "PATCH" && id) {
        const values = z
          .object({
            name: z.string().trim().min(1).max(100),
            phone: z.string().trim().max(30).nullable(),
          })
          .strict()
          .parse(await jsonBody(request));
        const user = await db.$transaction(async (tx) => {
          const existing = await tx.user.findFirst({
            where: { id, role: "CLIENT" },
          });
          if (!existing) throw new AppError(404, "Cliente no encontrado.");
          const updated = await tx.user.update({
            where: { id },
            data: values,
            select: { id: true, name: true, email: true, phone: true },
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "CUSTOMER_UPDATED",
              entityId: id,
            },
          });
          return updated;
        });
        return ok({ user });
      }
    }
    if (resource === "inquiries") {
      if (method === "GET") {
        const user = await requireUser();
        const page = Math.max(1, Number(params.page) || 1);
        const where = user.role === "ADMIN" ? {} : { userId: user.id };
        return ok({
          inquiries: await db.inquiry.findMany({
            where,
            include: {
              vehicle: true,
              user: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * 20,
            take: 20,
          }),
          total: await db.inquiry.count({ where }),
          page,
          pageSize: 20,
        });
      }
      if (method === "POST") {
        await rateLimit(request, "inquiries", 8);
        const v = inquirySchema.parse(await jsonBody(request));
        const user = await getCurrentUser();
        if (v.vehicleId) {
          const vehicle = await db.vehicle.findFirst({
            where: {
              id: v.vehicleId,
              verified: true,
              status: { in: ["DISPONIBLE", "RESERVADO"] },
            },
          });
          if (!vehicle)
            throw new AppError(409, "El vehículo ya no está disponible.");
        }
        const inquiry = await db.inquiry.create({
          data: { ...v, userId: user?.id },
        });
        return ok({ inquiry }, 201);
      }
      if (id && method === "PATCH") {
        const actor = await requireAdmin();
        const v = z
          .object({ status: z.enum(["NUEVA", "EN_CONTACTO", "CERRADA"]) })
          .strict()
          .parse(await jsonBody(request));
        const inquiry = await db.$transaction(async (tx) => {
          const item = await tx.inquiry.update({ where: { id }, data: v });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "INQUIRY_UPDATED",
              entityId: id,
              data: v,
            },
          });
          return item;
        });
        return ok({ inquiry });
      }
    }
    if (resource === "appointments") {
      if (method === "GET") {
        const user = await requireUser();
        const page = Math.max(1, Number(params.page) || 1);
        const where = user.role === "ADMIN" ? {} : { userId: user.id };
        return ok({
          appointments: await db.appointment.findMany({
            where,
            include: {
              vehicle: true,
              user: { select: { name: true, email: true, phone: true } },
            },
            orderBy: { scheduledAt: "asc" },
            skip: (page - 1) * 20,
            take: 20,
          }),
          total: await db.appointment.count({ where }),
          page,
          pageSize: 20,
        });
      }
      if (method === "POST") {
        const user = await requireUser();
        await rateLimit(request, "appointments", 8);
        const v = appointmentSchema.parse(await jsonBody(request));
        const vehicle = await db.vehicle.findFirst({
          where: {
            id: v.vehicleId,
            verified: true,
            status: { in: ["DISPONIBLE", "RESERVADO"] },
          },
        });
        if (!vehicle)
          throw new AppError(409, "El vehículo ya no está disponible.");
        return ok(
          {
            appointment: await db.appointment.create({
              data: {
                ...v,
                userId: user.id,
                scheduledAt: new Date(v.scheduledAt),
              },
            }),
          },
          201,
        );
      }
      if (id && method === "PATCH") {
        const actor = await requireUser();
        const v = z
          .object({
            status: z.enum([
              "PENDIENTE",
              "CONFIRMADA",
              "CANCELADA",
              "COMPLETADA",
            ]),
          })
          .strict()
          .parse(await jsonBody(request));
        const appointment = await db.$transaction(async (tx) => {
          const existing = await tx.appointment.findUnique({ where: { id } });
          if (!existing) throw new AppError(404, "Visita no encontrada.");
          if (
            actor.role !== "ADMIN" &&
            (existing.userId !== actor.id || v.status !== "CANCELADA")
          )
            throw new AppError(
              403,
              "Solo puedes cancelar tus propias visitas.",
            );
          const item = await tx.appointment.update({ where: { id }, data: v });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "APPOINTMENT_UPDATED",
              entityId: id,
              data: v,
            },
          });
          return item;
        });
        return ok({ appointment });
      }
    }
    if (resource === "settings") {
      if (method === "GET") return ok({ settings: await getSettings() });
      if (method === "PATCH") {
        const actor = await requireAdmin();
        const v = settingsSchema.parse(await jsonBody(request));
        const settings = await db.$transaction(async (tx) => {
          const item = await tx.dealershipSettings.upsert({
            where: { id: "main" },
            create: { ...v, id: "main" },
            update: v,
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "SETTINGS_UPDATED",
              entityId: "main",
            },
          });
          return item;
        });
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/", "layout");
        return ok({ settings });
      }
    }
    if (resource === "instagram") {
      const actor = await requireAdmin();
      if (!id && method === "GET") {
        const [posts, logs] = await Promise.all([
          db.instagramPost.findMany({
            include: { vehicle: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          db.instagramSyncLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
        ]);
        return ok({
          posts,
          logs,
          configured: instagramConfigured(),
          lastSync: logs[0]?.createdAt ?? null,
        });
      }
      if (!id && method === "POST") {
        z.object({ action: z.literal("sync") })
          .strict()
          .parse(await jsonBody(request));
        await rateLimit(request, "instagram-sync", 3, 60000);
        return ok(await syncInstagram(actor.id));
      }
      if (id === "import" && method === "POST")
        return ok(
          {
            post: await importInstagramPost(await jsonBody(request), actor.id),
          },
          201,
        );
      if (id && method === "PATCH") {
        const v = z
          .object({ vehicleId: z.string().min(1) })
          .strict()
          .parse(await jsonBody(request));
        const post = await db.$transaction(async (tx) => {
          const vehicle = await tx.vehicle.findUnique({
            where: { id: v.vehicleId },
          });
          if (!vehicle) throw new AppError(404, "Vehículo no encontrado.");
          const item = await tx.instagramPost.update({
            where: { id },
            data: {
              vehicleId: v.vehicleId,
              status:
                vehicle.status === "VENDIDO"
                  ? "MANUAL_UPDATE_REQUIRED"
                  : "REVIEWED",
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "INSTAGRAM_LINKED",
              entityId: id,
              data: v,
            },
          });
          return item;
        });
        return ok({ post });
      }
    }
    if (resource === "uploads" && method === "POST") {
      const actor = await requireAdmin();
      await rateLimit(request, "uploads", 50);
      const body = await jsonBody(request);
      if (id === "complete") {
        const complete = z
          .object({
            key: z.string().regex(/^vehicles\/[a-f0-9-]+\.(jpg|png|webp)$/),
          })
          .strict()
          .parse(body);
        const {
          S3_BUCKET,
          S3_REGION,
          S3_ACCESS_KEY_ID,
          S3_SECRET_ACCESS_KEY,
          S3_PUBLIC_URL,
        } = process.env;
        if (
          !S3_BUCKET ||
          !S3_REGION ||
          !S3_ACCESS_KEY_ID ||
          !S3_SECRET_ACCESS_KEY ||
          !S3_PUBLIC_URL
        )
          throw new AppError(
            503,
            "El almacenamiento externo no está configurado.",
          );
        const client = new S3Client({
          region: S3_REGION,
          endpoint: process.env.S3_ENDPOINT || undefined,
          credentials: {
            accessKeyId: S3_ACCESS_KEY_ID,
            secretAccessKey: S3_SECRET_ACCESS_KEY,
          },
        });
        const head = await client.send(
          new HeadObjectCommand({ Bucket: S3_BUCKET, Key: complete.key }),
        );
        const object = await client.send(
          new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: complete.key,
            Range: "bytes=0-31",
          }),
        );
        const bytes = await object.Body?.transformToByteArray();
        const isJpeg =
          bytes && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const isPng =
          bytes &&
          Buffer.from(bytes.slice(0, 8)).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
          );
        const isWebp =
          bytes &&
          Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
          Buffer.from(bytes.slice(8, 12)).toString() === "WEBP";
        const valid =
          (head.ContentType === "image/jpeg" && isJpeg) ||
          (head.ContentType === "image/png" && isPng) ||
          (head.ContentType === "image/webp" && isWebp);
        if (
          !valid ||
          !head.ContentLength ||
          head.ContentLength > 15 * 1024 * 1024
        ) {
          await client.send(
            new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: complete.key }),
          );
          throw new AppError(
            400,
            "El archivo no corresponde a una imagen JPEG, PNG o WebP válida de hasta 15 MB.",
          );
        }
        return ok({
          url: `${S3_PUBLIC_URL.replace(/\/$/, "")}/${complete.key}`,
          verified: true,
        });
      }
      const v = z
        .object({
          name: z.string().max(200),
          type: z.enum(["image/jpeg", "image/png", "image/webp"]),
          size: z
            .number()
            .int()
            .positive()
            .max(15 * 1024 * 1024),
        })
        .strict()
        .parse(body);
      const {
        S3_BUCKET,
        S3_REGION,
        S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY,
        S3_PUBLIC_URL,
      } = process.env;
      if (
        !S3_BUCKET ||
        !S3_REGION ||
        !S3_ACCESS_KEY_ID ||
        !S3_SECRET_ACCESS_KEY ||
        !S3_PUBLIC_URL
      )
        throw new AppError(
          503,
          "El almacenamiento externo de imágenes no está configurado.",
        );
      const ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[v.type];
      const key = `vehicles/${randomUUID()}.${ext}`;
      const client = new S3Client({
        region: S3_REGION,
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      });
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: v.type,
          ContentLength: v.size,
        }),
        { expiresIn: 300 },
      );
      await db.auditLog.create({
        data: {
          actorId: actor.id,
          action: "IMAGE_UPLOAD_AUTHORIZED",
          entityId: key,
        },
      });
      return ok({
        uploadUrl,
        key,
        url: `${S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`,
        expiresIn: 300,
      });
    }
    throw new AppError(404, "Ruta no encontrada.");
  } catch (error) {
    if (error instanceof ZodError)
      return ok(
        { error: "Revisa los campos del formulario.", issues: error.issues },
        400,
      );
    if (error instanceof AppError)
      return ok({ error: error.message }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return ok(
          {
            error:
              "Este registro ya existe. Revisa los datos e intenta de nuevo.",
          },
          409,
        );
      if (error.code === "P2025")
        return ok({ error: "Registro no encontrado." }, 404);
      if (error.code === "P2034")
        return ok(
          { error: "Hubo un cambio simultáneo. Recarga e intenta de nuevo." },
          409,
        );
    }
    console.error(
      "API operation failed",
      error instanceof Error ? error.name : "unknown",
    );
    return ok(
      { error: "No pudimos completar la operación. Intenta más tarde." },
      500,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
