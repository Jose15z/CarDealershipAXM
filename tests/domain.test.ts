import { describe, it, expect } from "vitest";
import {
  registerSchema,
  vehicleSchema,
  inquirySchema,
} from "../src/lib/validation";
import { inventoryWhere } from "../src/lib/data";
const draft = {
  brand: "Marca verificada",
  model: "Modelo verificado",
  year: null,
  price: null,
  mileage: null,
  transmission: null,
  fuel: null,
  bodyType: null,
  status: "DRAFT",
};
describe("verificación del inventario", () => {
  it("publica datos verificados sin inventar un precio que no fue anunciado", () => {
    const listing = vehicleSchema.parse({
      ...draft,
      year: 2023,
      mileage: 58000,
      transmission: "Automática",
      fuel: "Gasolina",
      bodyType: "Pickup",
      status: "DISPONIBLE",
      verified: true,
      images: [
        {
          url: "/images/instagram/DZIr9zwGN12-cover.jpg",
          alt: "Fotografía original observada",
          position: 0,
        },
      ],
    });
    expect(listing.price).toBeNull();
  });
  it("no permite publicar sin combustible verificado aunque tenga fotografía", () => {
    expect(
      vehicleSchema.safeParse({
        ...draft,
        year: 2023,
        mileage: 58000,
        transmission: "Automática",
        bodyType: "SUV",
        status: "DISPONIBLE",
        verified: true,
        images: [
          {
            url: "/images/instagram/DZIr9zwGN12-cover.jpg",
            alt: "Fotografía original",
            position: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("conserva valores desconocidos como null en borrador", () =>
    expect(vehicleSchema.parse(draft).price).toBeNull());
  it("prohíbe publicar un borrador incompleto", () =>
    expect(
      vehicleSchema.safeParse({
        ...draft,
        status: "DISPONIBLE",
        verified: true,
      }).success,
    ).toBe(false));
  it("prohíbe vender por la edición general", () =>
    expect(
      vehicleSchema.safeParse({ ...draft, status: "VENDIDO" }).success,
    ).toBe(false));
  it("excluye ventas y borradores del catálogo", () =>
    expect(inventoryWhere({ status: "VENDIDO" })).toMatchObject({
      status: { in: ["DISPONIBLE", "RESERVADO"] },
      verified: true,
    }));
  it("trata la consulta de búsqueda como datos", () =>
    expect(inventoryWhere({ q: "' OR 1=1 --" }).OR?.[0]).toEqual({
      brand: { contains: "' OR 1=1 --", mode: "insensitive" },
    }));
});
describe("validación pública y roles", () => {
  it("no acepta autoasignación de ADMIN", () =>
    expect(
      registerSchema.safeParse({
        name: "Cliente",
        email: "cliente@example.test",
        password: "strongpassword123",
        consent: true,
        role: "ADMIN",
      }).success,
    ).toBe(false));
  it("no acepta consultas sin autorización de datos", () =>
    expect(
      inquirySchema.safeParse({
        name: "Cliente",
        email: "cliente@example.test",
        phone: "3110000000",
        message: "Consulta",
        consent: false,
      }).success,
    ).toBe(false));
});
