import { PrismaClient } from "@prisma/client";
async function main() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const db = new PrismaClient();
  await db.dealershipSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      name: "LA SUBASTA AXM",
      city: "Armenia, Quindío, Colombia",
      instagramUrl: "https://www.instagram.com/lasubastaaxm/",
    },
    update: {},
  });
  await db.$disconnect();
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Error de ejecución");
  process.exitCode = 1;
});
