import { Prisma } from "@prisma/client";
import { db, databaseConfigured } from "./db";
export const vehicleInclude = {
  images: { orderBy: { position: "asc" as const } },
  features: true,
  instagramPost: true,
};
export const publicStatuses = ["DISPONIBLE", "RESERVADO"] as const;
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v instanceof Prisma.Decimal ? Number(v) : v,
    ),
  );
}
export const defaultSettings = {
  id: "main",
  name: "LA SUBASTA AXM",
  city: "Armenia, Quindío, Colombia",
  instagramUrl: "https://www.instagram.com/lasubastaaxm/",
  address: null,
  phone: null,
  whatsapp: null,
  email: null,
  openingHours: null,
  benefits: [],
  privacyPolicy: null,
  terms: null,
};
export async function getSettings() {
  if (!databaseConfigured()) return defaultSettings;
  return (
    (await db.dealershipSettings.findUnique({ where: { id: "main" } })) ??
    defaultSettings
  );
}
export function inventoryWhere(
  params: Record<string, string | undefined>,
  admin = false,
): Prisma.VehicleWhereInput {
  const number = (key: string) => {
    const n = Number(params[key]);
    return params[key] && Number.isSafeInteger(n) && n >= 0 ? n : undefined;
  };
  const query = params.q?.trim().slice(0, 150);
  const where: Prisma.VehicleWhereInput = admin
    ? {}
    : { status: { in: ["DISPONIBLE", "RESERVADO"] }, verified: true };
  if (
    params.status &&
    (admin
      ? ["DRAFT", "DISPONIBLE", "RESERVADO", "VENDIDO", "ARCHIVADO"]
      : ["DISPONIBLE", "RESERVADO"]
    ).includes(params.status)
  )
    where.status = params.status as Prisma.EnumVehicleStatusFilter["equals"];
  if (params.brand) where.brand = { equals: params.brand, mode: "insensitive" };
  if (params.model)
    where.model = { contains: params.model, mode: "insensitive" };
  if (query)
    where.OR = ["brand", "model", "version", "description", "reference"].map(
      (key) => ({ [key]: { contains: query, mode: "insensitive" } }),
    );
  if (number("yearMin") !== undefined || number("yearMax") !== undefined)
    where.year = { gte: number("yearMin"), lte: number("yearMax") };
  if (number("priceMin") !== undefined || number("priceMax") !== undefined)
    where.catalogPrice = { gte: number("priceMin"), lte: number("priceMax") };
  if (number("mileageMax") !== undefined)
    where.mileage = { lte: number("mileageMax") };
  for (const key of ["fuel", "transmission", "bodyType"] as const)
    if (params[key])
      where[key] = { contains: params[key], mode: "insensitive" };
  if (params.featured === "true") where.featured = true;
  return where;
}
export async function getInventory(
  params: Record<string, string | undefined> = {},
  admin = false,
) {
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.page) || 1)),
  );
  const pageSize = 12;
  if (!databaseConfigured())
    return {
      configured: false,
      vehicles: [],
      total: 0,
      pages: 0,
      page,
      brands: [],
    };
  const where = inventoryWhere(params, admin);
  const sort: Record<string, Prisma.VehicleOrderByWithRelationInput> = {
    price_asc: { catalogPrice: { sort: "asc", nulls: "last" } },
    price_desc: { catalogPrice: { sort: "desc", nulls: "last" } },
    year_desc: { year: "desc" },
    mileage_asc: { mileage: "asc" },
    recent: { publishedAt: "desc" },
  };
  const total = await db.vehicle.count({ where });
  const pages = Math.ceil(total / pageSize);
  const actualPage = pages ? Math.min(page, pages) : 1;
  const [vehicles, brands] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: vehicleInclude,
      orderBy: sort[params.sort || "recent"] || sort.recent,
      skip: (actualPage - 1) * pageSize,
      take: pageSize,
    }),
    db.vehicle.findMany({
      where: admin
        ? {}
        : { verified: true, status: { in: ["DISPONIBLE", "RESERVADO"] } },
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
  ]);
  return {
    ...serialize({ vehicles }),
    configured: true,
    total,
    pages,
    page: actualPage,
    brands: brands.map((b) => b.brand),
  };
}
export async function getFeaturedVehicles() {
  return (await getInventory({ featured: "true" })).vehicles;
}
export async function getVehicle(slug: string) {
  if (!databaseConfigured()) return null;
  const vehicle = await db.vehicle.findFirst({
    where: {
      slug,
      status: { in: ["DISPONIBLE", "RESERVADO", "VENDIDO"] },
      verified: true,
    },
    include: vehicleInclude,
  });
  return serialize(vehicle);
}
export async function getDashboard() {
  if (!databaseConfigured())
    return {
      configured: false,
      available: 0,
      sold: 0,
      inventoryValue: 0,
      inquiries: 0,
      appointments: 0,
      recentVehicles: [],
    };
  const [available, sold, value, inquiries, appointments, recentVehicles] =
    await Promise.all([
      db.vehicle.count({ where: { status: "DISPONIBLE" } }),
      db.vehicle.count({ where: { status: "VENDIDO" } }),
      db.vehicle.aggregate({
        _sum: { price: true },
        where: { status: { in: ["DISPONIBLE", "RESERVADO"] } },
      }),
      db.inquiry.count({ where: { status: "NUEVA" } }),
      db.appointment.count({
        where: {
          status: { in: ["PENDIENTE", "CONFIRMADA"] },
          scheduledAt: { gte: new Date() },
        },
      }),
      db.vehicle.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: vehicleInclude,
      }),
    ]);
  return {
    configured: true,
    available,
    sold,
    inventoryValue: Number(value._sum.price || 0),
    inquiries,
    appointments,
    recentVehicles: serialize(recentVehicles),
  };
}
export type VehicleRecord = NonNullable<Awaited<ReturnType<typeof getVehicle>>>;
/** Explicitly labelled source-post showcase; does not expose drafts as available inventory. */
export async function getInstagramShowcase() {
  if (!databaseConfigured()) return [];
  const posts = await db.instagramPost.findMany({
    where: { vehicleId: { not: null } },
    include: {
      vehicle: {
        select: {
          brand: true,
          model: true,
          version: true,
          year: true,
          price: true,
          mileage: true,
          transmission: true,
          images: { take: 1, orderBy: { position: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 6,
  });
  return serialize(
    posts.map((post) => ({
      id: post.id,
      permalink: post.permalink,
      externalId: post.externalId,
      vehicle: post.vehicle,
      availabilityVerified: false,
    })),
  );
}
