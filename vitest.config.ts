import { defineConfig } from "vitest/config";
try {
  process.loadEnvFile();
} catch {
  /* entorno CI */
}
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], testTimeout: 15000 },
});
