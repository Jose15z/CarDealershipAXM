import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { confirmSale } from "../src/lib/vehicles";
import { db } from "../src/lib/db";
const enabled = process.env.RUN_DB_TESTS === "1";
const ids: string[] = [];
let actorId = "";
describe.skipIf(!enabled)("transacción de venta PostgreSQL", () => {
  beforeAll(async () => {
    if (
      !process.env.DATABASE_URL?.includes("localhost") &&
      !process.env.DATABASE_URL?.includes("127.0.0.1")
    )
      throw new Error(
        "Las pruebas destructivas requieren una base PostgreSQL local.",
      );
    const user = await db.user.create({
      data: {
        name: "Integration test",
        email: `test-${Date.now()}@example.test`,
        passwordHash: "not-a-login",
        role: "ADMIN",
      },
    });
    actorId = user.id;
  });
  afterAll(async () => {
    if (actorId) {
      await db.auditLog.deleteMany({ where: { actorId } });
      await db.sale.deleteMany({ where: { vehicleId: { in: ids } } });
      await db.vehicle.deleteMany({ where: { id: { in: ids } } });
      await db.user.delete({ where: { id: actorId } });
    }
    await db.$disconnect();
  });
  it("mantiene el precio de catálogo en PostgreSQL y prioriza el precio anunciado", async () => {
    const vehicle = await db.vehicle.create({
      data: {
        brand: "Prueba técnica",
        model: "Referencia",
        slug: `price-test-${Date.now()}`,
        referencePrice: 80,
        referencePriceUrl: "https://example.test/comparable",
        referencePriceLabel: "Comparable documentado",
        referencePriceAsOf: "noviembre de 2026",
        referencePriceCheckedAt: new Date(),
      },
    });
    ids.push(vehicle.id);
    expect(Number(vehicle.catalogPrice)).toBe(80);
    expect(
      await db.vehicle.count({
        where: { id: vehicle.id, catalogPrice: { gte: 70, lte: 90 } },
      }),
    ).toBe(1);
    const quoted = await db.vehicle.update({
      where: { id: vehicle.id },
      data: { price: 100, catalogPrice: 1 },
    });
    expect(Number(quoted.catalogPrice)).toBe(100);
    expect(Number(quoted.referencePrice)).toBe(80);
    const fallback = await db.vehicle.update({
      where: { id: vehicle.id },
      data: { price: null },
    });
    expect(Number(fallback.catalogPrice)).toBe(80);
  });
  it("dos ventas concurrentes producen una sola venta y un único estado VENDIDO", async () => {
    const vehicle = await db.vehicle.create({
      data: {
        brand: "Prueba técnica",
        model: "No publicar",
        slug: `integration-${Date.now()}`,
        price: 100,
        year: 2020,
        mileage: 1,
        transmission: "Automática",
        fuel: "Gasolina",
        bodyType: "SUV",
        status: "DISPONIBLE",
        verified: true,
      },
    });
    ids.push(vehicle.id);
    const results = await Promise.allSettled([
      confirmSale(vehicle.id, actorId, {
        revision: 0,
        amount: 100,
        idempotencyKey: `test-sale-a-${vehicle.id}`,
      }),
      confirmSale(vehicle.id, actorId, {
        revision: 0,
        amount: 100,
        idempotencyKey: `test-sale-b-${vehicle.id}`,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.sale.count({ where: { vehicleId: vehicle.id } })).toBe(1);
    expect(
      (await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } }))
        .status,
    ).toBe("VENDIDO");
  });
  it("un reintento con la misma clave no duplica la venta", async () => {
    const vehicle = await db.vehicle.create({
      data: {
        brand: "Prueba técnica",
        model: "No publicar",
        slug: `idempotent-${Date.now()}`,
        price: 100,
        year: 2020,
        mileage: 1,
        transmission: "Automática",
        fuel: "Gasolina",
        bodyType: "SUV",
        verified: true,
        status: "DISPONIBLE",
      },
    });
    ids.push(vehicle.id);
    const input = {
      revision: 0,
      amount: 100,
      idempotencyKey: `test-sale-retry-${vehicle.id}`,
    };
    const first = await confirmSale(vehicle.id, actorId, input);
    const second = await confirmSale(vehicle.id, actorId, input);
    expect(first.id).toBe(second.id);
  });
});
