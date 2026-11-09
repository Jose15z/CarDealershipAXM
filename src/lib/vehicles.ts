import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { AppError } from "./errors";
import { vehicleSchema } from "./validation";
export function vehicleSlug(brand: string, model: string, year: number | null) {
  return (
    `${brand}-${model}-${year ?? "pendiente"}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    randomUUID().slice(0, 8)
  );
}
export function invalidateVehicle(slug: string) {
  revalidatePath("/");
  revalidatePath("/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath(`/vehiculos/${slug}`);
}
export async function saveVehicle(
  input: unknown,
  actorId: string,
  id?: string,
) {
  const values = vehicleSchema.parse(input);
  const { images, features, revision, ...data } = values;
  const updated = await db.$transaction(async (tx) => {
    if (id) {
      const existing = await tx.vehicle.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, "Vehículo no encontrado.");
      if (existing.status === "VENDIDO")
        throw new AppError(
          409,
          "El vehículo vendido conserva su historial y no se puede modificar.",
        );
      if (revision === undefined)
        throw new AppError(400, "La revisión es obligatoria para editar.");
      const changed = await tx.vehicle.updateMany({
        where: { id, revision, status: { not: "VENDIDO" } },
        data: {
          ...data,
          revision: { increment: 1 },
          publishedAt:
            data.status === "DISPONIBLE"
              ? (existing.publishedAt ?? new Date())
              : existing.publishedAt,
        },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          "Otro administrador modificó el vehículo. Recarga los datos antes de continuar.",
        );
      await tx.vehicleImage.deleteMany({ where: { vehicleId: id } });
      await tx.vehicleFeature.deleteMany({ where: { vehicleId: id } });
      if (images.length)
        await tx.vehicleImage.createMany({
          data: images.map((image) => ({ ...image, vehicleId: id })),
        });
      if (features.length)
        await tx.vehicleFeature.createMany({
          data: features.map((feature) => ({ ...feature, vehicleId: id })),
        });
      await tx.auditLog.create({
        data: { actorId, action: "VEHICLE_UPDATED", entityId: id },
      });
      return tx.vehicle.findUniqueOrThrow({ where: { id } });
    }
    const vehicle = await tx.vehicle.create({
      data: {
        ...data,
        slug: vehicleSlug(data.brand, data.model, data.year),
        publishedAt: data.status === "DISPONIBLE" ? new Date() : null,
        images: { create: images },
        features: { create: features },
      },
    });
    await tx.auditLog.create({
      data: { actorId, action: "VEHICLE_CREATED", entityId: vehicle.id },
    });
    return vehicle;
  });
  invalidateVehicle(updated.slug);
  return updated;
}
export async function confirmSale(
  vehicleId: string,
  actorId: string,
  input: { revision: number; amount: number; idempotencyKey: string },
) {
  const sale = await db.$transaction(
    async (tx) => {
      const previous = await tx.sale.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (previous) {
        if (
          previous.vehicleId !== vehicleId ||
          Number(previous.amount) !== input.amount
        )
          throw new AppError(
            409,
            "La clave de operación ya fue utilizada para una venta diferente.",
          );
        return previous;
      }
      const changed = await tx.vehicle.updateMany({
        where: {
          id: vehicleId,
          revision: input.revision,
          status: { in: ["DISPONIBLE", "RESERVADO"] },
        },
        data: {
          status: "VENDIDO",
          featured: false,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          "No se pudo confirmar: el vehículo cambió de estado o ya fue vendido.",
        );
      const result = await tx.sale.create({
        data: {
          vehicleId,
          confirmedById: actorId,
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
        },
      });
      await tx.instagramPost.updateMany({
        where: { vehicleId },
        data: { status: "MANUAL_UPDATE_REQUIRED" },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "SALE_CONFIRMED",
          entityId: vehicleId,
          data: { saleId: result.id, amount: input.amount },
        },
      });
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  const vehicle = await db.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
  });
  invalidateVehicle(vehicle.slug);
  return sale;
}
