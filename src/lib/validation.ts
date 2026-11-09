import { z } from "zod";
const text = (max = 160) =>
  z.string().trim().min(1, "Este campo es obligatorio.").max(max);
export const registerSchema = z
  .object({
    name: text(100),
    email: z
      .string()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(12, "Usa al menos 12 caracteres.")
      .max(72)
      .refine(
        (v) => new TextEncoder().encode(v).length <= 72,
        "La contraseña supera el límite de 72 bytes.",
      ),
    phone: z.string().trim().max(30).optional(),
    consent: z.literal(true),
  })
  .strict();
export const loginSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(1)
      .max(72)
      .refine(
        (v) => new TextEncoder().encode(v).length <= 72,
        "La contraseña supera el límite de 72 bytes.",
      ),
  })
  .strict();
export const imageSchema = z.object({
  url: z
    .string()
    .refine(
      (v) =>
        v.startsWith("https://") ||
        /^\/images\/instagram\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(v),
      "Usa una URL HTTPS o una fotografía original verificada.",
    ),
  alt: text(250),
  position: z.number().int().min(0),
});
export const vehicleSchema = z
  .object({
    reference: z.string().trim().max(80).nullable().optional(),
    brand: text(80),
    model: text(100),
    version: z.string().trim().max(160).nullable().optional(),
    year: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .nullable(),
    price: z.number().int().positive().max(999999999999999).nullable(),
    mileage: z.number().int().min(0).max(3000000).nullable(),
    transmission: text(80).nullable(),
    fuel: text(80).nullable(),
    bodyType: text(80).nullable(),
    displacement: z.string().max(80).nullable().optional(),
    color: z.string().max(80).nullable().optional(),
    partialPlate: z.string().max(10).nullable().optional(),
    city: text(120).default("Armenia, Quindío"),
    description: z.string().trim().max(15000).default(""),
    status: z
      .enum(["DRAFT", "DISPONIBLE", "RESERVADO", "ARCHIVADO"])
      .default("DRAFT"),
    featured: z.boolean().default(false),
    verified: z.boolean().default(false),
    images: z.array(imageSchema).max(30).default([]),
    features: z
      .array(
        z.object({
          category: z.enum(["Confort", "Tecnología", "Seguridad", "Exterior"]),
          name: text(160),
        }),
      )
      .max(100)
      .default([]),
    revision: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      ["DISPONIBLE", "RESERVADO"].includes(v.status) &&
      (!v.verified ||
        !v.images.length ||
        v.year === null ||
        v.mileage === null ||
        !v.transmission ||
        !v.fuel ||
        !v.bodyType)
    )
      ctx.addIssue({
        code: "custom",
        path: ["verified"],
        message:
          "Completa año, kilometraje, transmisión, combustible, carrocería y fotografías, y verifica los datos antes de publicar.",
      });
    if (new Set(v.images.map((i) => i.position)).size !== v.images.length)
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "El orden de las fotografías no puede repetirse.",
      });
  });
export const inquirySchema = z
  .object({
    vehicleId: z.string().optional(),
    name: text(100),
    email: z.string().email().max(254),
    phone: text(30),
    message: text(5000),
    type: z.enum(["INFORMACION", "VENTA", "CONTACTO"]).default("INFORMACION"),
    consent: z.literal(true, {
      message: "Debes autorizar el tratamiento de tus datos.",
    }),
  })
  .strict();
export const appointmentSchema = z
  .object({
    vehicleId: text(100),
    scheduledAt: z
      .string()
      .datetime()
      .refine((v) => Date.parse(v) > Date.now(), "Elige una fecha futura."),
    note: z.string().max(2000).default(""),
  })
  .strict();
export const settingsSchema = z
  .object({
    name: text(100),
    city: text(150),
    address: z.string().max(250).nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    whatsapp: z
      .string()
      .regex(/^57\d{10}$/, "Usa 57 seguido de diez dígitos.")
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
    instagramUrl: z.literal("https://www.instagram.com/lasubastaaxm/"),
    openingHours: z.string().max(300).nullable().optional(),
    benefits: z
      .array(z.object({ title: text(100), description: text(500) }))
      .max(8),
    privacyPolicy: z.string().max(30000).nullable().optional(),
    terms: z.string().max(30000).nullable().optional(),
  })
  .strict();
