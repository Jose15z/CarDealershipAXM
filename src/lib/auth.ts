import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { AppError } from "./errors";
const cookieName = "axm_session";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const safeUser = (user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});
export async function getCurrentUser() {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date()
    ? safeUser(session.user)
    : null;
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "Inicia sesión para continuar.");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN")
    throw new AppError(403, "No tienes permiso para realizar esta operación.");
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 86400000);
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: expires },
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(cookieName);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
