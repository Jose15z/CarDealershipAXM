# LA SUBASTA AXM

Plataforma comercial en español colombiano: Next.js App Router, React, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 6, React Hook Form, Zod, Lucide y Motion. Runtime Node.js **24 LTS** (`.nvmrc`). La autenticación propia usa sesiones opacas revocables almacenadas en PostgreSQL y contraseñas bcrypt; cumple el rol equivalente a Auth.js sin depender de credenciales en el cliente.

## Ejecutar localmente

```bash
nvm use
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Abrir **http://localhost:3100**. El puerto 3100 evita interferir con otros proyectos locales; `APP_URL` y `NEXT_PUBLIC_APP_URL` deben coincidir exactamente con el origen usado. PostgreSQL de desarrollo escucha solo en `127.0.0.1:5433`; las credenciales de `compose.yaml` son exclusivamente locales. Alternativamente conectar una instancia PostgreSQL mediante `DATABASE_URL`.

Sin DATABASE_URL se muestra un catálogo fuera de línea y se deshabilitan los formularios que requieren persistencia. No se simulan operaciones exitosas. Si una base está configurada pero no responde, se informa el error y se requiere corregir la conexión. Ejecutar migraciones antes de iniciar el servidor.

## Datos verificados y publicaciones

El 7 de noviembre de 2026 se revisó el perfil público oficial en Chrome, con autorización del usuario. El archivo `docs/instagram-observed.json` conserva **24 publicaciones** con vehículos, referencias de origen y datos observados; **11 precios** se leyeron directamente de las imágenes. El Yaris Cross dorado queda con precio `null`. No se inventaron amenidades ni disponibilidad. Dirección y teléfono comerciales se comprobaron en la biografía/publicación del Mazda. Las imágenes conservan los originales y se agrupan por publicación; la galería del Mazda incluye dos fotografías capturadas. Las demás galerías deben completarse con fotos autorizadas.

Para importar a una base nueva:

```bash
npx tsx scripts/import-observed.ts docs/instagram-observed.json
```

El importador idempotente crea registros independientes **DRAFT**, `verified=false`, y publicaciones PENDING. Nunca los publica. No sobrescribe una ficha ya vinculada. El seed general solo crea ajustes de marca, no inventario. La dirección y el contacto verificados se cargan con la importación observada.

La sección de Instagram presenta publicaciones originales y advierte que disponibilidad y precios actuales requieren confirmación. Por solicitud explícita del propietario se revisaron y publicaron 22 anuncios sin aviso de vendido. Dos fichas permanecen en borrador: Mercedes C200 2016 por combustible no verificado y Hilux GR por discrepancia entre texto e imagen. Los anuncios sin precio publicado conservan `null` y muestran “Consultar precio”. Los precios mostrados en imágenes antiguas son los anunciados en su fecha, no una oferta actual confirmada. Para repetir la publicación de los IDs revisados: `PUBLISH_OBSERVED_CONFIRM=PUBLISH_REVIEWED_INSTAGRAM_LISTINGS npx tsx scripts/publish-observed.ts docs/instagram-observed.json`. Este paso requiere autorización explícita del propietario y no revive registros vendidos o archivados.

La portada muestra una ilustración generada a partir de una referencia del Audi TT del concesionario. Las fichas del inventario usan las fotografías originales de cada vehículo. Fuentes autoalojadas Manrope y Barlow Condensed bajo SIL OFL; licencias en `public/fonts/`.

## Crear un administrador autorizado

No hay usuario/clave predeterminados, selector público de rol ni endpoint para promover usuarios. Un operador con acceso autorizado al servidor debe ejecutar:

1. Configurar `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (16–72 caracteres y máximo 72 bytes UTF-8).
2. Configurar `ADMIN_BOOTSTRAP_CONFIRM=CREATE_AUTHORIZED_ADMIN`.
3. Ejecutar `npm run admin:create`.
4. Eliminar las variables `ADMIN_*` del entorno después de crear la cuenta.

Usar el gestor de secretos o variables del terminal sin incorporar contraseñas al historial. El script rechaza un correo existente; no eleva privilegios silenciosamente. La operación queda auditada. Las cuentas públicas siempre son `CLIENT`. El formulario de login redirige al panel según el rol.

## Flujos implementados

- Portada, inventario SSR con filtros en URL, paginación PostgreSQL, orden y búsqueda, estados vacíos y fallos.
- Ficha por slug, galería táctil con miniaturas y visor modal, características verificadas, compartir y WhatsApp con enlace personalizado.
- Registro/login/logout, favoritos persistentes, perfil, consultas y solicitudes de visita, historial y cancelación de visitas propias.
- `/admin`: indicadores, inventario CRUD, borradores, revisión, destacado, reserva, venta confirmada y archivado lógico. Formularios de equipo y galería ordenable.
- Clientes y contacto; gestión de solicitudes y citas; configuración de información comercial, beneficios y documentos legales.
- Conciliación Instagram, importación manual, lectura oficial opcional, logs, revisión de publicaciones y tareas manuales posteriores a la venta.
- Sitemap por vehículos publicados, metadata, Open Graph, JSON-LD Vehicle, imágenes optimizadas, teclado y reduced motion.

Las solicitudes no envían correos ni mensajes de WhatsApp automáticamente: se guardan y se atienden desde administración. WhatsApp abre el cliente del visitante con el mensaje preparado. Una solicitud, una visita o una reserva jamás confirma una venta.

## Ventas e integridad

Estados `DRAFT`, `DISPONIBLE`, `RESERVADO`, `VENDIDO`, `ARCHIVADO`. Datos desconocidos permanecen `null` en borradores. Publicar DISPONIBLE/RESERVADO exige datos técnicos completos, verificación e imagen; el precio puede permanecer `null` cuando no esté anunciado, sin fabricar una cifra. Solo vehículos verificados DISPONIBLE/RESERVADO aparecen en el catálogo; vendidos se conservan en su URL con distintivo de vendido.

La venta usa una transacción PostgreSQL SERIALIZABLE, `updateMany` condicionado por estado y revisión, índice único por vehículo y clave idempotente. Cambios concurrentes devuelven 409. Se registra Sale + AuditLog y la tarea de Instagram dentro de la transacción. Se invalida portada, catálogo, ficha y dashboard. Las lecturas de disponibilidad son dinámicas y las APIs responden `no-store`, evitando caches de stock obsoletas.

Eliminar en la API significa **archivar lógicamente**, con confirmación en pantalla. No hay borrado físico de historial comercial desde la UI. Las migraciones incluyen CHECKs para rango de precio/año/km y completitud al publicar, índices y unicidad de publicación por shortcode.

## Instagram y Meta: configuración pendiente

No se necesita ni se solicita la contraseña de Instagram. No hay scraping, sesión privada automatizada ni sincronización mediante Chrome en el producto. La revisión puntual por navegador solo produjo datos de referencia locales.

La integración implementa **Instagram API con Instagram Login**, lectura de medios de una cuenta profesional autorizada:

1. Crear/configurar una app de Meta e Instagram Login para la cuenta profesional de LA SUBASTA AXM.
2. Obtener autorización oficial del titular y acceso a medios con `instagram_business_basic`, según el producto, nivel de acceso y permisos vigentes en la app. Completar App Review/business verification si Meta lo exige para el uso seleccionado.
3. Configurar en el servidor `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` y `META_GRAPH_VERSION` con una versión habilitada en el panel de Meta. No se fija una versión inventada.
4. Proteger y renovar el token antes de que expire; este proyecto consume un token ya emitido. No incluye pantalla OAuth de consentimiento ni renovación automática. No poner tokens en URLs públicas, Git o variables NEXT_PUBLIC_.
5. Desde `/admin/instagram`, pulsar **Sincronizar ahora**. Consulta `graph.instagram.com/{version}/{account}/media`, hasta 10 páginas de 100 publicaciones, hijos de carruseles incluidos. El siguiente lote o importación histórica se puede completar manualmente. Reintenta respuestas transitorias hasta tres veces con backoff y usa un lock PostgreSQL para evitar sincronizaciones superpuestas.
6. Revisa cada publicación y crea/vincula su borrador. La detección semántica y extracción de fichas es **humana**: no se adivinan especificaciones ni precios desde texto ambiguo ni se publican vehículos automáticamente. Una publicación puede no ser un vehículo.
7. Guarda imágenes autorizadas en el almacenamiento propio: las URLs de medios de Meta pueden expirar. La aplicación no asume permanencia de esas URLs.

`externalId` único y un índice por shortcode evitan duplicar publicaciones entre importación manual y API. Si un vehículo se vende, se crea `MANUAL_UPDATE_REQUIRED`. La app no edita, archiva ni elimina publicaciones remotas: la capacidad depende del producto, tipo de contenido, permisos y versión, y no está habilitada aquí. El administrador recibe el enlace para actualizar Instagram manualmente. No se confirma ninguna acción remota que no se haya ejecutado.

Referencias oficiales revisadas:

- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api (colección oficial de Meta; distingue los flujos Instagram Login/Facebook Login).

## Almacenamiento de fotografías

Configurar `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` y, para proveedor compatible, `S3_ENDPOINT`. Configurar CORS del bucket con el origen exacto de la aplicación y PUT permitido, headers Content-Type; el backend requiere PutObject, Head/GetObject y DeleteObject para rechazar archivos inválidos.

El administrador solicita URL de carga firmada con cinco minutos de vigencia, sube directamente y confirma mediante `/api/uploads/complete`. Se validan tamaño, MIME y firma binaria JPEG/PNG/WebP. UI máximo 10 MB, servidor rechaza por encima de 15 MB. Los secretos solo se usan en servidor. Para mayor control operativo, agregar lifecycle de cargas huérfanas y reencodificación/antimalware según el proveedor. El proyecto permite alternativamente URLs HTTPS autorizadas, y los originales locales observados incluidos en `/public`.

## API REST

| Ruta                                                            | Métodos            | Acceso                                                |
| --------------------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| `/api/auth/register`, `/login`, `/logout` bajo `/api/auth`      | POST               | registro/login públicos con limitación; logout sesión |
| `/api/auth/me`                                                  | GET                | sesión actual                                         |
| `/api/vehicles`                                                 | GET, POST          | GET público, `admin=true` y creación requieren ADMIN  |
| `/api/vehicles/:id`                                             | GET, PATCH, DELETE | lectura pública publicada; modificar/archivar ADMIN   |
| `/api/vehicles/:id/sell`                                        | POST               | ADMIN; revision, amount, idempotencyKey               |
| `/api/favorites`                                                | GET, POST, DELETE  | usuario; vehicleId                                    |
| `/api/profile`                                                  | PATCH              | usuario propio; nombre/celular                        |
| `/api/users`, `/api/users/:id`                                  | GET, PATCH         | ADMIN; contactos CLIENT sin cambios de rol            |
| `/api/inquiries`, `/api/inquiries/:id`                          | GET, POST, PATCH   | crear público; leer propios/ADMIN; gestión ADMIN      |
| `/api/appointments`, `/api/appointments/:id`                    | GET, POST, PATCH   | usuario propio; gestión ADMIN                         |
| `/api/settings`                                                 | GET, PATCH         | lectura pública; editar ADMIN                         |
| `/api/instagram`, `/api/instagram/import`, `/api/instagram/:id` | GET, POST, PATCH   | ADMIN                                                 |
| `/api/uploads`, `/api/uploads/complete`                         | POST               | ADMIN                                                 |

Mutaciones JSON requieren `Origin` igual a `APP_URL`; no se habilita CORS abierto. Zod valida entradas y rechaza campos desconocidos. Respuestas 400/401/403/404/409/413/415/429/503 según caso, sin detalles internos. Las sesiones usan cookies HttpOnly, SameSite=Lax, Secure en producción, token aleatorio de 256 bits, hash SHA-256 en DB y expiración de siete días. Contraseñas bcrypt factor12. Rate limiting persistente en PostgreSQL para autenticación, formularios y sincronización. En Vercel se usa la IP reenviada por su proxy; en local se comparte un bucket. Los formularios conservan datos ante errores. React escapa contenido; JSON-LD escapa `<`. CSP, anti-framing y nosniff configurados.

## Pruebas

```bash
npm run typecheck
npm test
# Integra ventas contra PostgreSQL local, crea y limpia fixtures identificados.
RUN_DB_TESTS=1 npm test
# Base aislada para E2E, jamás usa axm ni un servidor remoto.
docker compose exec -T postgres createdb -U axm axm_e2e
npm run test:e2e
npm run build
npm run format:check
```

Si axm_e2e ya existe, omitir createdb. E2E migra y **vacía únicamente** la base local axm_e2e, crea un administrador/cliente y un vehículo explícitamente de prueba, compila y arranca una instancia de producción separada en 3101 con `.next-e2e`, y usa Chrome instalado mediante Playwright. No mezclar esa base con datos reales. Las credenciales de prueba están restringidas a esa base; nunca son cuentas de producción. Vitest excluye los tests de Playwright. Las pruebas de venta requieren `RUN_DB_TESTS=1` y PostgreSQL local.

No se han probado cargas S3 ni llamadas Meta reales sin credenciales. No se incluyen pago online, transferencia de propiedad, recuperación de contraseña por email, MFA, verificación de email, envíos automáticos de correo ni sincronización programada. Son extensiones separadas del flujo actual. Debe definirse la política de privacidad y términos aprobados en Configuración antes de abrir la plataforma comercial.

## Despliegue en Vercel y PostgreSQL

1. Subir el repositorio a Git y crear un proyecto Vercel usando Next.js y Node 24.
2. Crear PostgreSQL compatible (por ejemplo, proveedor gestionado), habilitar TLS, backups y conexión/pool apropiados para serverless. Configurar `DATABASE_URL` de producción en secretos.
3. Aplicar `npm run db:migrate` contra esa base desde un job autorizado antes de publicar la versión. No usar `db push` ni migraciones de desarrollo en producción. Usar URL directa separada en el job si el proveedor exige evitar pooling para DDL.
4. Configurar `APP_URL` y `NEXT_PUBLIC_APP_URL` con el dominio HTTPS canónico. Build `npm run build`, salida y start nativos de Next.js. Las migraciones no se ejecutan automáticamente en cada función serverless.
5. Cargar settings e importar solamente fuentes autorizadas; ejecutar bootstrap de administrador en entorno seguro. Revisar cada borrador y confirmar disponibilidad antes de publicar.
6. Configurar S3/Meta si se usarán esas integraciones; publicar documentos legales y verificar contacto y WhatsApp con el titular.
7. Ejecutar checks, revisar logs y activar monitorización, backups y renovación de tokens. Mantener pruebas en una base independiente.

Este entregable se prepara para Vercel; **no está desplegado públicamente** ni se han creado servicios externos pagados. Next.js Node/PostgreSQL conserva el stack solicitado; no se convirtió a un runtime Worker ni a una exportación estática.

## Organización

```
src/app/                 Rutas, metadata y REST
src/components/public/  Portada, catálogo, galería y shell
src/components/customer/ Auth, solicitudes, perfil y cuenta
src/components/admin/   Inventario, clientes, citas, integración y ajustes
src/lib/                 Servicios, permisos, validación, datos e integridad
prisma/                  Modelo, migraciones SQL y seed
scripts/                 Bootstrap autorizado e importación observada
tests/                   Unitarias e integración PostgreSQL
e2e/                     Flujos completos aislados
DESIGN.md                Identidad visual y tokens
UX-CONTRACT.md           Comportamiento y accesibilidad
```

### Referencias de mercado

`npm run db:import-prices` importa las 12 referencias documentadas en `docs/price-references.json` únicamente sobre vehículos sin precio anunciado. Es idempotente y conserva el precio del concesionario. Las guías Autocosmos corresponden a enero de 2026; los anuncios comparables tienen su fecha de consulta, kilometraje y variante documentados. No se hicieron ajustes inventados. La UI identifica estas cifras como referencia y enlaza la fuente; no son ofertas, ventas ni cotizaciones de LA SUBASTA AXM. PostgreSQL mantiene `catalogPrice` como precio anunciado o referencia para filtros/orden. No se usan referencias para registrar ventas ni para el valor administrativo del inventario.
