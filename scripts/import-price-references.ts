/** Authorized, documented market references; never overwrites a dealership asking price. */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
async function main() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const schema = z.object({
    references: z.array(
      z.object({
        postId: z.string().min(1),
        price: z.number().int().positive().max(999999999999999),
        url: z.url().refine((v) => v.startsWith("https://")),
        label: z.string().min(10),
        asOf: z.string().min(4),
        checkedAt: z.iso.datetime({ offset: true }),
      }),
    ),
  });
  const data = schema.parse(
    JSON.parse(
      await readFile(process.argv[2] || "docs/price-references.json", "utf8"),
    ),
  );
  if (
    new Set(data.references.map((r) => r.postId)).size !==
    data.references.length
  )
    throw new Error("Referencias duplicadas");
  const db = new PrismaClient();
  try {
    const updated = await db.$transaction(async (tx) => {
      let count = 0;
      for (const r of data.references) {
        const post = await tx.instagramPost.findUnique({
          where: { externalId: r.postId },
          include: { vehicle: true },
        });
        const v = post?.vehicle;
        if (
          !v ||
          v.price !== null ||
          !["DISPONIBLE", "RESERVADO"].includes(v.status)
        )
          continue;
        const referencePriceCheckedAt = new Date(r.checkedAt);
        if (
          Number(v.referencePrice) === r.price &&
          v.referencePriceUrl === r.url &&
          v.referencePriceLabel === r.label &&
          v.referencePriceAsOf === r.asOf &&
          v.referencePriceCheckedAt?.getTime() ===
            referencePriceCheckedAt.getTime()
        )
          continue;
        const result = await tx.vehicle.updateMany({
          where: {
            id: v.id,
            price: null,
            revision: v.revision,
            status: { in: ["DISPONIBLE", "RESERVADO"] },
          },
          data: {
            referencePrice: r.price,
            referencePriceUrl: r.url,
            referencePriceLabel: r.label,
            referencePriceAsOf: r.asOf,
            referencePriceCheckedAt,
            revision: { increment: 1 },
          },
        });
        count += result.count;
      }
      if (count)
        await tx.instagramSyncLog.create({
          data: {
            status: "MARKET_PRICE_REFERENCES_IMPORTED",
            imported: count,
            message:
              "Referencias documentadas en docs/price-references.json. Precios anunciados conservados; no modifica disponibilidad.",
          },
        });
      return count;
    });
    console.log(
      `${updated} referencias actualizadas; precios anunciados preservados.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
