/** Imports only explicitly observed, documented facts. Never publishes inventory. */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "node:crypto";
const schema = z.object({
  source: z.string().url().optional(),
  observedAt: z.string().optional(),
  settings: z
    .object({
      address: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
    })
    .optional(),
  vehicles: z.array(
    z.object({
      postId: z.string(),
      permalink: z.string().url(),
      brand: z.string(),
      model: z.string(),
      version: z.string().nullable().optional(),
      year: z.number().int().nullable().optional(),
      price: z.number().positive().nullable().optional(),
      mileage: z.number().int().nonnegative().nullable().optional(),
      transmission: z.string().nullable().optional(),
      fuel: z.string().nullable().optional(),
      bodyType: z.string().nullable().optional(),
      displacement: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
      description: z.string().default(""),
      caption: z.string().default(""),
      images: z
        .array(
          z
            .string()
            .refine(
              (v) =>
                v.startsWith("https://") ||
                /^\/images\/instagram\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(v),
              "Usa una imagen HTTPS o un recurso original verificado.",
            ),
        )
        .default([]),
    }),
  ),
});
async function main() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const filename = process.argv[2];
  if (!filename)
    throw new Error(
      "Uso: npx tsx scripts/import-observed.ts docs/instagram-observed.json",
    );
  const raw = JSON.parse(await readFile(filename, "utf8"));
  const normalized = {
    ...raw,
    settings:
      raw.settings ??
      (raw.dealership
        ? {
            address: raw.dealership.address,
            phone: raw.dealership.phone,
            whatsapp: raw.dealership.whatsapp,
          }
        : undefined),
    vehicles: raw.vehicles?.map((v: Record<string, unknown>) => ({
      ...v,
      postId: v.postId ?? v.externalId,
      permalink:
        v.permalink ??
        `https://www.instagram.com/lasubastaaxm/p/${v.externalId}/`,
    })),
  };
  const input = schema.parse(normalized);
  const db = new PrismaClient();
  try {
    await db.dealershipSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...input.settings },
      update: input.settings ?? {},
    });
    let created = 0;
    for (const item of input.vehicles) {
      await db.$transaction(async (tx) => {
        const existing = await tx.instagramPost.findUnique({
          where: { externalId: item.postId },
        });
        if (existing?.vehicleId) return;
        const post = await tx.instagramPost.upsert({
          where: { externalId: item.postId },
          create: {
            externalId: item.postId,
            permalink: item.permalink,
            caption: item.caption,
            media: item.images.map((url) => ({ url, type: "IMAGE" })),
          },
          update: {},
        });
        const { postId, permalink, caption, images, ...details } = item;
        void postId;
        void permalink;
        void caption;
        const slug =
          `${item.brand}-${item.model}-${item.year ?? "pendiente"}-${randomUUID().slice(0, 8)}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        const vehicle = await tx.vehicle.create({
          data: {
            ...details,
            price: item.price ?? null,
            mileage: item.mileage ?? null,
            year: item.year ?? null,
            status: "DRAFT",
            verified: false,
            featured: false,
            slug,
            images: {
              create: images.map((url, position) => ({
                url,
                position,
                alt: `${item.brand} ${item.model}: fotografía original de la publicación`,
              })),
            },
          },
        });
        await tx.instagramPost.update({
          where: { id: post.id },
          data: { vehicleId: vehicle.id, status: "PENDING" },
        });
        created++;
      });
    }
    console.log(
      `${created} borradores importados. Ningún vehículo se publicó. Revisa disponibilidad, precio, imágenes y todos los datos antes de publicar.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Error de ejecución");
  process.exitCode = 1;
});
