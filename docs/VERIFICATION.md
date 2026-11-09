# Verificación — 7 de noviembre de 2026

## Resultado

- TypeScript estricto: pasó.
- Compilación Next.js 16.4.5 con Node 24.22.2: pasó. Sitemap dinámico verificado en la salida de build.
- Vitest: 7 pruebas de dominio + 2 de integración PostgreSQL, todas pasaron con `RUN_DB_TESTS=1`.
- Playwright sobre una compilación de producción y PostgreSQL separado `axm_e2e`: 6 flujos completos pasaron (16.5 s, incluye compilación/arranque).
- Prettier: todos los archivos coinciden con el formato.
- Auditoría UI estricta: cero findings; reporte en `premium-audit.json`. Es evidencia estática, no una certificación de accesibilidad.
- Inspección visual en Chrome: portada escritorio y móvil (390 × 844), menú, filtros, selector nativo, mensajes de validación y foco al primer campo inválido.
- Inventario principal: consulta SQL confirmó 12 vehículos DRAFT. Ningún fixture E2E en esa base.

## Flujos E2E

1. Portada, menú móvil, navegación al catálogo, sin desborde horizontal.
2. Redirección de rutas privadas; rechazo CSRF y rechazo de autoasignación ADMIN.
3. Login inválido con error visible y valores conservados.
4. Login de administrador, crear/publicar/editar vehículo, filtros PostgreSQL y no-results/limpieza.
5. Registro de cliente, galería modal/Escape, favorito, consulta, cita y acceso privado restringido.
6. Confirmar/cancelar diálogo de venta, retirar vehículo del catálogo y registrar tarea Instagram.

Las pruebas de integración demuestran que dos ventas simultáneas crean una sola Sale y que reintentar la misma clave no duplica la operación. El error esperado de conflicto de escritura PostgreSQL puede aparecer en stdout del test; es parte del caso probado.

Se corrigieron los errores encontrados durante la verificación. Los tests E2E compilan y usan `next start`, evitando interferencias de HMR entre servidores de desarrollo.

## Límites observados

No se ejecutaron llamadas reales a Meta ni cargas reales a S3 por falta de credenciales autorizadas. El importador observado se ejecutó dos veces: 12 registros en la primera ejecución, cero duplicados en la segunda. La disponibilidad comercial actual requiere revisión administrativa. No se ha publicado un despliegue externo, medido Core Web Vitals de producción ni realizado una auditoría WCAG completa. Documentos legales y credenciales comerciales pendientes están descritos en README.

## Actualización de inventario solicitada por el propietario

Se revisaron otras 12 publicaciones oficiales y sus fotografías originales. El inventario principal contiene ahora 24 registros: 22 anuncios publicados y 2 borradores retenidos (C200 2016 sin combustible verificado; Hilux GR con foto/texto incompatibles). Diez anuncios publicados tienen precio observado; los otros doce conservan precio NULL y muestran “Consultar precio”. La revisión de anuncios sin aviso de vendido no sustituye la confirmación comercial actual, indicada en el catálogo y las fichas.

La migración `202611070003_optional_advertised_price` permite precio no anunciado sin relajar los demás requisitos de publicación ni permitir precios inventados de cero. El valor del dashboard se identifica como valor con precio registrado. El script de publicación requiere una autorización explícita, valida imágenes y datos, y no revive ventas ni registros archivados.

Verificación de esta actualización: TypeScript pasó; 11 pruebas de dominio/integración pasaron; compilación de producción y 6 E2E pasaron (17.0 s). Auditoría estática UI: cero findings. Inspección en Chrome confirmó 12 tarjetas en página 1, 10 en página 2, ficha del Mazda con dos fotografías y precio de $90.000.000 COP, y filtro Toyota con 11 resultados y precios desconocidos al final. El catálogo vuelve a consultarse directamente desde PostgreSQL al recargar.

## 2026-11-07 — referencias de mercado
Migración PostgreSQL 004 aplicada. Importación: 12 referencias, reintento 0 cambios. Precios anunciados preservados. TypeScript sin errores; 14 pruebas Vitest con PostgreSQL y 6 flujos Playwright aprobados; build de producción incluido. Chrome verificó las 12 cifras en la primera página y fuente/fecha en Prado TXL; sus datos estructurados no incluyen Offer al faltar precio del concesionario. La segunda página conserva los 10 precios originales. Evidencias y comparables: price-references.json.
