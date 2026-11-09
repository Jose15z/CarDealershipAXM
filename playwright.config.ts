import { defineConfig, devices } from "@playwright/test";
try {
  process.loadEnvFile();
} catch {
  /* env is optional in CI */
}
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://axm:local_development_only@localhost:5433/axm_e2e?schema=public";
if (
  !/^postgresql:\/\/[^/]+@(localhost|127\.0\.0\.1):\d+\/axm_e2e(?:\?|$)/.test(
    databaseUrl,
  )
)
  throw new Error("E2E requiere la base local separada axm_e2e.");
process.env.TEST_DATABASE_URL = databaseUrl;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  globalSetup: "./e2e/setup.ts",
  use: {
    baseURL: "http://localhost:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npx --yes --package=node@24 node scripts/e2e-server.mjs",
    url: "http://localhost:3101/api/auth/me",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_URL: databaseUrl,
      APP_URL: "http://localhost:3101",
      NEXT_PUBLIC_APP_URL: "http://localhost:3101",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
