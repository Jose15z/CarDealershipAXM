import { db } from "./db";
import { hashToken } from "./auth";
import { AppError } from "./errors";
export function assertOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new AppError(403, "Origen de solicitud no permitido.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "Envía JSON.");
}
export async function rateLimit(
  request: Request,
  scope: string,
  limit = 12,
  windowMs = 15 * 60000,
) {
  const ip = process.env.VERCEL
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local";
  const key = hashToken(`${scope}:${ip}`);
  const now = new Date();
  await db.rateLimit.deleteMany({ where: { key, resetAt: { lte: now } } });
  const record = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt: new Date(Date.now() + windowMs) },
    update: { count: { increment: 1 } },
  });
  if (record.count > limit)
    throw new AppError(
      429,
      "Demasiadas solicitudes. Intenta de nuevo más tarde.",
    );
}
export async function jsonBody(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body) > 131072)
    throw new AppError(413, "La solicitud supera el tamaño permitido.");
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError(400, "El contenido JSON no es válido.");
  }
}
