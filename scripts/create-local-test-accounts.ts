/** Explicit local development helper. Never runs in seed or deployment. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
async function main() {
  process.loadEnvFile();
  const url = new URL(process.env.DATABASE_URL || "");
  const app = new URL(process.env.APP_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["localhost", "127.0.0.1"].includes(app.hostname) ||
    url.pathname !== "/axm"
  ) {
    throw new Error(
      "Estas cuentas solo pueden crearse en la base local axm y con APP_URL local.",
    );
  }
  const db = new PrismaClient();
  try {
    for (const account of [
      {
        email: "admin.local@axm.example.test",
        name: "Administrador de prueba local",
        role: "ADMIN" as const,
        password: "AdminLocalAXM2026!",
      },
      {
        email: "cliente.local@axm.example.test",
        name: "Cliente de prueba local",
        role: "CLIENT" as const,
        password: "ClienteLocalAXM2026!",
      },
    ]) {
      const existing = await db.user.findUnique({
        where: { email: account.email },
      });
      if (existing) {
        if (
          existing.role !== account.role ||
          !(await bcrypt.compare(account.password, existing.passwordHash))
        )
          throw new Error(
            `La cuenta ${account.email} ya existe con otra configuración; no se modifica.`,
          );
        console.log(`${account.email}: lista (sin cambios).`);
        continue;
      }
      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: account.email,
            name: account.name,
            role: account.role,
            passwordHash: await bcrypt.hash(account.password, 12),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            entityId: user.id,
            action: "LOCAL_TEST_ACCOUNT_CREATED",
            data: { environment: "local-development" },
          },
        });
      });
      console.log(`${account.email}: creada para pruebas locales.`);
    }
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Error creando cuentas",
  );
  process.exitCode = 1;
});
