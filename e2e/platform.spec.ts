import { test, expect, request, APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const origin = "http://localhost:3101";
const auth = {
  email: "admin@axm.example.test",
  password: "PruebasLocales2026!",
};
let vehicleId = "",
  slug = "";
async function adminApi() {
  const api = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect((await api.post("/api/auth/login", { data: auth })).ok()).toBeTruthy();
  return api;
}
test.describe.configure({ mode: "serial" });
test("portada, navegación móvil y ausencia de desborde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "TU PRÓXIMO CARRO",
  );
  await expect(
    page.getByText("Imagen generada · Inspirada en el Audi TT", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Explorar por marca" })
    .getByRole("link", { name: "PORSCHE", exact: true })
    .click();
  await expect(page).toHaveURL(/\/inventario\?brand=Porsche$/);
  await expect(page.getByLabel("Marca", { exact: true })).toHaveValue(
    "Porsche",
  );
  await expect(
    page.getByRole("heading", {
      name: "No encontramos vehículos con estos filtros",
    }),
  ).toBeVisible();
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Inventario", exact: true })
    .click();
  await expect(page).toHaveURL(/inventario/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "PRÓXIMO CARRO",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("rutas privadas, CSRF y prohibición de autoasignar ADMIN", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/iniciar-sesion/);
  const csrf = await request.post("/api/auth/login", {
    data: auth,
    headers: { Origin: "https://otro.example" },
  });
  expect(csrf.status()).toBe(403);
  const forged = await request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Prueba",
      email: "forged@example.test",
      password: "UnaClaveLarga2026",
      role: "ADMIN",
      consent: true,
    },
  });
  expect(forged.status()).toBe(400);
  expect((await request.get("/api/vehicles?admin=true")).status()).toBe(401);
});
test("formulario de login conserva valores y muestra error", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("inexistente@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("NoExiste2026!!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "incorrectos",
  );
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toHaveValue("inexistente@example.test");
});
test("admin crea, publica y edita un vehículo; filtros consultan PostgreSQL", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion?next=/admin");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(auth.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(auth.password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page
    .getByRole("link", { name: "Agregar vehículo", exact: true })
    .click();
  await page.getByLabel("Marca", { exact: true }).fill("Marca de prueba E2E");
  await page.getByLabel("Modelo", { exact: true }).fill("Vehículo aislado");
  await page.getByLabel("Año", { exact: true }).fill("2024");
  await page.getByLabel("Precio de venta (COP)").fill("85000000");
  await page.getByLabel("Kilometraje (km)").fill("12000");
  await page
    .getByLabel("Transmisión", { exact: true })
    .selectOption("Automática");
  await page
    .getByLabel("Combustible", { exact: true })
    .selectOption("Gasolina");
  await page.getByLabel("Carrocería", { exact: true }).selectOption("SUV");
  await page
    .getByLabel("Agregar fotografía desde URL HTTPS")
    .fill("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600");
  await page
    .getByRole("button", { name: "Agregar fotografía", exact: true })
    .click();
  await page.getByLabel("Estado", { exact: true }).selectOption("DISPONIBLE");
  await page
    .getByLabel("Confirmo que los datos y las imágenes fueron verificados.")
    .check();
  await page
    .getByRole("button", { name: "Guardar vehículo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/inventario(?:\?guardado=1)?$/);
  await expect(
    page.getByText("Marca de prueba E2E", { exact: false }).first(),
  ).toBeVisible();
  const api = await adminApi();
  const list = await (
    await api.get("/api/vehicles?admin=true&q=Vehículo%20aislado")
  ).json();
  vehicleId = list.vehicles[0].id;
  slug = list.vehicles[0].slug;
  await api.dispose();
  await page.goto(`/admin/inventario/${vehicleId}`);
  await page.getByLabel("Precio de venta (COP)").fill("84000000");
  await page
    .getByRole("button", { name: "Guardar vehículo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/inventario(?:\?guardado=1)?$/);
  await page.goto(
    "/inventario?priceMax=84000000&brand=Marca%20de%20prueba%20E2E",
  );
  await expect(page.getByText("$84.000.000 COP")).toBeVisible();
  await page
    .getByLabel("Buscar vehículo", { exact: true })
    .fill("NO_EXISTE_123");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByRole("heading", {
      name: "No encontramos vehículos con estos filtros",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar búsqueda", exact: true })
    .click();
  await expect(page.getByLabel("Buscar vehículo", { exact: true })).toHaveValue(
    "",
  );
});
test("cliente se registra, guarda favorito, consulta y solicita una visita", async ({
  page,
}) => {
  await page.goto("/registro");
  await page
    .getByLabel("Nombre completo", { exact: true })
    .fill("Cliente de pruebas");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("cliente@axm.example.test");
  await page.getByLabel("Celular (opcional)").fill("3110000000");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ClientePruebas2026!");
  await page.locator("input[name=consent]").check();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/mi-cuenta/);
  await page.goto(`/vehiculos/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Vehículo aislado",
  );
  await page
    .getByRole("button", { name: "Abrir galería en pantalla completa" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Galería de fotografías" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Guardar en favoritos", exact: true })
    .click();
  await expect(
    page.getByText("Vehículo guardado en favoritos.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nombre completo", { exact: true })
    .fill("Cliente de pruebas");
  await page.getByLabel("Celular", { exact: true }).fill("3110000000");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("cliente@axm.example.test");
  await page
    .getByLabel("Tu mensaje")
    .fill("Solicitud realizada desde la base de pruebas aislada.");
  await page.locator("input[name=consent]").check();
  await page
    .getByRole("button", { name: "Enviar solicitud", exact: true })
    .click();
  await expect(page.getByText(/Solicitud recibida/)).toBeVisible();
  await page.getByRole("tab", { name: "Agendar visita" }).click();
  await page.getByLabel("Fecha y hora en Colombia").fill("2027-12-20T10:30");
  await page
    .getByRole("button", { name: "Solicitar visita", exact: true })
    .click();
  await expect(page.getByText(/Visita solicitada/)).toBeVisible();
  expect((await page.request.get("/api/vehicles?admin=true")).status()).toBe(
    403,
  );
  await page.goto("/mi-cuenta");
  await expect(
    page.getByText("Vehículo aislado", { exact: false }).first(),
  ).toBeVisible();
});
test("venta confirmada retira el vehículo público y genera tarea Instagram", async ({
  page,
}) => {
  const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  await db.instagramPost.create({
    data: {
      externalId: "E2E_TEST_POST",
      permalink: "https://www.instagram.com/p/E2E_TEST_POST/",
      media: [],
      vehicleId,
    },
  });
  await db.$disconnect();
  await page.goto("/iniciar-sesion?next=/admin/inventario");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(auth.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(auth.password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/inventario/);
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Confirmar venta" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await page.getByLabel("Valor final de venta (COP)").fill("83000000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await expect(page.getByText(/Venta confirmada/).first()).toBeVisible();
  await page.goto("/inventario");
  await expect(
    page.getByText("Marca de prueba E2E", { exact: false }),
  ).toHaveCount(0);
  const api = await adminApi();
  const reconciled = await (await api.get("/api/instagram")).json();
  expect(reconciled.posts[0].status).toBe("MANUAL_UPDATE_REQUIRED");
  await api.dispose();
});

test("cerrar sesión desde el panel invalida la sesión sin errores de formato", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(auth.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(auth.password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/admin/);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "/");
  await expect(
    page.getByRole("link", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/vehicles?admin=true")).status()).toBe(
    401,
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/iniciar-sesion/);
});
