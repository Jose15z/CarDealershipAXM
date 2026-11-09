/** Publishes only the exact observed IDs explicitly reviewed and authorized by the owner. */
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { vehicleSchema } from "../src/lib/validation";
async function main() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (
    process.env.PUBLISH_OBSERVED_CONFIRM !==
    "PUBLISH_REVIEWED_INSTAGRAM_LISTINGS"
  )
    throw new Error(
      "Se requiere PUBLISH_OBSERVED_CONFIRM=PUBLISH_REVIEWED_INSTAGRAM_LISTINGS para ejecutar la publicación autorizada.",
    );
  const manifest = JSON.parse(
    await readFile(process.argv[2] || "docs/instagram-observed.json", "utf8"),
  ) as {
    publicationAuthorization: string;
    vehicles: {
      externalId: string;
      bodyType: string | null;
      approvedForPublication: boolean;
      reviewNote: string;
    }[];
  };
  if (!manifest.publicationAuthorization)
    throw new Error("Falta evidencia de autorización.");
  const db = new PrismaClient();
  let published = 0;
  try {
    await db.$transaction(
      async (tx) => {
        for (const review of manifest.vehicles) {
          if (!review.approvedForPublication) continue;
          const post = await tx.instagramPost.findUnique({
            where: { externalId: review.externalId },
            include: {
              vehicle: {
                include: { images: true, features: true, sale: true },
              },
            },
          });
          const v = post?.vehicle;
          if (!v)
            throw new Error(`No existe la importación ${review.externalId}`);
          if (v.status !== "DRAFT" || v.sale) continue; // Never revive sold, reserved, or archived inventory.
          const values = vehicleSchema.parse({
            brand: v.brand,
            model: v.model,
            version: v.version,
            year: v.year,
            price: v.price === null ? null : Number(v.price),
            mileage: v.mileage,
            transmission: v.transmission,
            fuel: v.fuel,
            bodyType: review.bodyType,
            city: v.city,
            status: "DISPONIBLE",
            verified: true,
            images: v.images.map(({ url, alt, position }) => ({
              url,
              alt,
              position,
            })),
            features: v.features.map(({ category, name }) => ({
              category,
              name,
            })),
          });
          for (const image of values.images)
            if (image.url.startsWith("/images/instagram/"))
              await access(path.join(process.cwd(), "public", image.url));
          const description = `Vehículo anunciado en la publicación original de LA SUBASTA AXM. ${v.price === null ? "La publicación revisada no informa precio; consúltalo con el equipo. " : ""}Confirma disponibilidad y precio actual antes de agendar una visita. Fuente revisada el 7 de noviembre de 2026: ${post!.permalink}`;
          const changed = await tx.vehicle.updateMany({
            where: { id: v.id, status: "DRAFT", revision: v.revision },
            data: {
              bodyType: values.bodyType,
              status: "DISPONIBLE",
              verified: true,
              publishedAt: new Date(),
              featured: ["DdcPu7roxJG", "DdEiy5VkYdA", "DZ7uGUfkbYG"].includes(
                review.externalId,
              ),
              description,
              revision: { increment: 1 },
            },
          });
          if (changed.count !== 1)
            throw new Error(
              `La ficha ${review.externalId} cambió durante la publicación.`,
            );
          await tx.instagramPost.update({
            where: { id: post!.id },
            data: { status: "REVIEWED" },
          });
          published++;
        }
        await tx.instagramSyncLog.create({
          data: {
            status: "OWNER_AUTHORIZED_PUBLICATION",
            imported: published,
            message: `${published} anuncios publicados por solicitud explícita del propietario desde el workspace local. Revisión manual de fuentes; sin avisos de vendido. Los precios no publicados permanecen NULL. No se ejecutaron cambios remotos en Instagram.`,
          },
        });
      },
      { timeout: 30000 },
    );
    console.log(
      `${published} anuncios publicados; vendidos/archivados y fichas no aprobadas se conservan sin cambios.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(
    e instanceof Error ? e.message : "No se completó la publicación.",
  );
  process.exitCode = 1;
});
