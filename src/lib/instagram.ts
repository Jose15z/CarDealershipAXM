import { db } from "./db";
import { AppError } from "./errors";
import { z } from "zod";
const imageUrl = z
  .string()
  .url()
  .refine((v) => v.startsWith("https://"));
export const manualImportSchema = z
  .object({
    postId: z.string().trim().min(1).max(100),
    permalink: z
      .string()
      .url()
      .refine(
        (v) =>
          /^https:\/\/www\.instagram\.com\/(?:lasubastaaxm\/)?(p|reel)\/[\w-]+\/?$/.test(
            v,
          ),
        "Usa el enlace original de la publicación de Instagram.",
      ),
    caption: z.string().max(20000).default(""),
    images: z.array(imageUrl).max(30).default([]),
  })
  .strict();
export const instagramConfigured = () =>
  Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
    process.env.INSTAGRAM_ACCOUNT_ID &&
    process.env.META_GRAPH_VERSION,
  );
export async function importInstagramPost(input: unknown, actorId: string) {
  const v = manualImportSchema.parse(input);
  return db.$transaction(async (tx) => {
    const shortcode = v.permalink.match(/\/(?:p|reel)\/([^/?#]+)/)?.[1];
    const existing = shortcode
      ? await tx.instagramPost.findFirst({
          where: { permalink: { endsWith: `/${shortcode}/` } },
        })
      : null;
    const post =
      existing ??
      (await tx.instagramPost.upsert({
        where: { externalId: v.postId },
        create: {
          externalId: v.postId,
          permalink: v.permalink,
          caption: v.caption,
          media: v.images.map((url) => ({ url, type: "IMAGE" })),
        },
        update: {},
      }));
    await tx.auditLog.create({
      data: { actorId, action: "INSTAGRAM_MANUAL_IMPORT", entityId: post.id },
    });
    return post;
  });
}
type Media = {
  id: string;
  caption?: string;
  permalink?: string;
  media_type?: string;
  media_url?: string;
  timestamp?: string;
  children?: { data: Media[] };
};
export async function syncInstagram(actorId: string) {
  if (!instagramConfigured())
    throw new AppError(
      503,
      "Configura INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID y META_GRAPH_VERSION con acceso oficial de Meta.",
    );
  const version = process.env.META_GRAPH_VERSION!;
  if (!/^v\d+\.\d+$/.test(version))
    throw new AppError(503, "META_GRAPH_VERSION no es válida.");
  const account = process.env.INSTAGRAM_ACCOUNT_ID!;
  if (!/^\d+$/.test(account))
    throw new AppError(503, "INSTAGRAM_ACCOUNT_ID no es válido.");
  const now = new Date();
  const lock = await db.integrationLock.upsert({
    where: { key: "instagram" },
    create: { key: "instagram", expiresAt: new Date(0) },
    update: {},
  });
  if (lock.expiresAt > now)
    throw new AppError(409, "Ya hay una sincronización en curso.");
  const acquired = await db.integrationLock.updateMany({
    where: { key: "instagram", expiresAt: { lte: now } },
    data: { expiresAt: new Date(Date.now() + 900000) },
  });
  if (acquired.count !== 1)
    throw new AppError(409, "Ya hay una sincronización en curso.");
  let imported = 0;
  try {
    const url = new URL(
      `https://graph.instagram.com/${version}/${account}/media`,
    );
    url.searchParams.set(
      "fields",
      "id,caption,permalink,media_type,media_url,timestamp,children{id,media_type,media_url}",
    );
    url.searchParams.set("limit", "100");
    for (let page = 0; page < 10; page++) {
      let response: Response | null = null;
      for (let retry = 0; retry < 3; retry++) {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
          },
          signal: AbortSignal.timeout(20000),
          cache: "no-store",
        });
        if (response.ok || ![429, 500, 502, 503, 504].includes(response.status))
          break;
        if (retry < 2)
          await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** retry));
      }
      if (!response?.ok)
        throw new Error(
          `Meta devolvió HTTP ${response?.status ?? "sin respuesta"}. Revisa permisos y vigencia del token.`,
        );
      const payload = (await response.json()) as {
        data?: Media[];
        paging?: { cursors?: { after?: string }; next?: string };
      };
      for (const media of payload.data ?? []) {
        if (!media.id || !media.permalink) continue;
        const images = (media.children?.data ?? [media])
          .filter((item) => item.media_type === "IMAGE" && item.media_url)
          .map((item) => ({ url: item.media_url!, type: "IMAGE" }));
        const existing = await db.instagramPost.findFirst({
          where: {
            OR: [
              { externalId: media.id },
              {
                permalink: {
                  endsWith: `/${media.permalink.match(/\/(?:p|reel)\/([^/?#]+)/)?.[1]}/`,
                },
              },
            ],
          },
          select: { id: true },
        });
        if (!existing) {
          await db.instagramPost.upsert({
            where: { externalId: media.id },
            create: {
              externalId: media.id,
              caption: media.caption ?? "",
              permalink: media.permalink,
              media: images,
              publishedAt: media.timestamp ? new Date(media.timestamp) : null,
            },
            update: {},
          });
          imported++;
        }
      }
      if (!payload.paging?.next || !payload.paging.cursors?.after) break;
      url.searchParams.set("after", payload.paging.cursors.after);
    }
    await db.instagramSyncLog.create({
      data: {
        status: "SUCCESS",
        imported,
        message:
          "Publicaciones importadas para revisión. No se publicaron vehículos sin verificar.",
      },
    });
    await db.auditLog.create({
      data: {
        actorId,
        action: "INSTAGRAM_SYNC",
        entityId: account,
        data: { imported },
      },
    });
    return { imported };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "La sincronización falló.";
    await db.instagramSyncLog.create({
      data: { status: "ERROR", imported, message: message.slice(0, 500) },
    });
    throw new AppError(
      502,
      "No se completó la sincronización. Revisa el registro de integración.",
    );
  } finally {
    await db.integrationLock.update({
      where: { key: "instagram" },
      data: { expiresAt: new Date(0) },
    });
  }
}
