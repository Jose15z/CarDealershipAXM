import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
async function main() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const schema = z.object({
    ADMIN_EMAIL: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    ADMIN_NAME: z.string().min(1),
    ADMIN_PASSWORD: z
      .string()
      .min(16)
      .max(72)
      .refine((v) => new TextEncoder().encode(v).length <= 72),
    ADMIN_BOOTSTRAP_CONFIRM: z.literal("CREATE_AUTHORIZED_ADMIN"),
  });
  const config = schema.safeParse(process.env);
  if (!config.success) {
    console.error(
      "Configura ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (16–72 caracteres), y ADMIN_BOOTSTRAP_CONFIRM=CREATE_AUTHORIZED_ADMIN en el entorno.",
    );
    process.exit(1);
  }
  const db = new PrismaClient();
  try {
    const data = config.data;
    const existing = await db.user.findUnique({
      where: { email: data.ADMIN_EMAIL },
    });
    if (existing)
      throw new Error(
        "El correo ya existe. No se elevarán privilegios de una cuenta existente.",
      );
    const user = await db.user.create({
      data: {
        email: data.ADMIN_EMAIL,
        name: data.ADMIN_NAME,
        passwordHash: await bcrypt.hash(data.ADMIN_PASSWORD, 12),
        role: "ADMIN",
      },
    });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "ADMIN_BOOTSTRAPPED",
        entityId: user.id,
      },
    });
    console.log(
      "Administrador autorizado creado. Elimina las variables ADMIN_* del entorno.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Error de ejecución");
  process.exitCode = 1;
});
