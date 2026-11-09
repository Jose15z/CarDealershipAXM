import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL!;
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
  );
  const db = new PrismaClient({ datasourceUrl: url });
  await db.auditLog.deleteMany();
  await db.sale.deleteMany();
  await db.favorite.deleteMany();
  await db.appointment.deleteMany();
  await db.inquiry.deleteMany();
  await db.session.deleteMany();
  await db.instagramPost.deleteMany();
  await db.instagramSyncLog.deleteMany();
  await db.vehicle.deleteMany();
  await db.user.deleteMany();
  await db.rateLimit.deleteMany();
  await db.user.create({
    data: {
      name: "Administrador de pruebas",
      email: "admin@axm.example.test",
      passwordHash: await bcrypt.hash("PruebasLocales2026!", 12),
      role: "ADMIN",
    },
  });
  await db.dealershipSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
  await db.$disconnect();
}
