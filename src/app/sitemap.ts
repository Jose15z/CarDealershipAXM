import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
import { db, databaseConfigured } from "@/lib/db";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pages = [
    "",
    "/inventario",
    "/nosotros",
    "/contacto",
    "/vende-tu-carro",
  ].map((p) => ({ url: `${base}${p}` }));
  if (!databaseConfigured()) return pages;
  const vehicles = await db.vehicle.findMany({
    where: { verified: true, status: { in: ["DISPONIBLE", "RESERVADO"] } },
    select: { slug: true, updatedAt: true },
  });
  return [
    ...pages,
    ...vehicles.map((v) => ({
      url: `${base}/vehiculos/${v.slug}`,
      lastModified: v.updatedAt,
    })),
  ];
}
