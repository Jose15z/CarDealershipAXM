# Contrato UX — LA SUBASTA AXM

## Fuente de verdad

PostgreSQL define disponibilidad. Solo DISPONIBLE y RESERVADO aparecen públicamente; por defecto el catálogo excluye VENDIDO, ARCHIVADO y DRAFT y permite filtrar DISPONIBLE o RESERVADO. Venta se confirma en transacción autorizada, con auditoría y tarea manual Instagram. Registro público siempre CLIENT. No hay cuentas demo.

## Canonical UI Map

| Capability     | Canonical owner                            | Source of truth               | Allowed variants                    | Verification        |
| -------------- | ------------------------------------------ | ----------------------------- | ----------------------------------- | ------------------- |
| Select/Listbox | select nativo global                       | globals.css + contrato        | popup del sistema aceptado          | teclado + e2e       |
| Date           | input datetime-local nativo                | zona explícita America/Bogota | popup nativo aceptado               | validación servidor |
| Form           | RHF y esquemas Zod + Field compartido      | validaciones servidor         | crear/editar                        | unit + e2e          |
| Scrollbar      | globals.css                                | DESIGN.md                     | ninguna                             | auditoría           |
| Toast          | estado inline role=status/alert compartido | componentes/form              | success/error                       | e2e                 |
| CRUD           | API servicios y formularios admin          | reglas de negocio             | volver al listado después guardar   | integración         |
| Dialog         | HTML dialog showModal compartido           | componentes/admin             | venta/archivado/eliminación/galería | teclado             |

No selección masiva de filas. Los formularios declaran noValidate, errores vinculados y conservan valores tras fallos. El guardado espera al servidor, bloquea doble envío y anuncia resultado. No hay confirmaciones nativas JS. Toda acción destructiva requiere diálogo con cancelación inicial; eliminación es excepcional y se prefiere archivar. La galería modal admite Escape y restaura foco.

## Navegación y consultas

Catálogo usa GET con filtros, orden y página en URL. Buscar solo al enviar (sin carreras por debounce). Limpiar búsqueda elimina el valor y restablece página. Paginación acotada de servidor con totales y no-results. Guardar/crear vuelve a lista; errores permanecen junto al formulario. Login returnTo solo ruta interna. Header y footer se comparten. Salir invalida sesión servidor y refresca ruta.

## Estados

No hay datos simulados. Sin conexión de BD se explica la indisponibilidad; sin resultados se ofrece limpiar filtros. Cargas usan spinner accesible y geometría estable. API con 401 invita a iniciar sesión, 403 explica permisos, 409 solicita recargar versión; no reintenta mutaciones automáticamente. Importaciones Instagram crean borradores sin publicar ni adivinar datos. Tokens solo servidor. La publicación manual autorizada puede conservar precio null y mostrar “Consultar precio”; exige los demás datos técnicos verificados e imagen. No se publica una ficha con conflicto entre el modelo escrito y su fotografía. El catálogo explica que los anuncios de Instagram requieren confirmar precio y disponibilidad actual.

## Locale y contacto

es-CO, COP entero y America/Bogota para fechas. Se acepta formato nativo de select y fecha del dispositivo. WhatsApp solo activo si existe teléfono verificado en settings. Las consultas requieren consentimiento y no equivalen a reserva o venta. Textos legales pendientes de aprobación comercial se indican honestamente y no se presentan como asesoría jurídica.

## Verificación

TypeScript, build, Vitest reglas críticas e integración PostgreSQL condicionada a DATABASE_URL de pruebas, Playwright navegación/responsive/auth errors. Auditoría estática de UI documentada en premium-audit.json. No declarar cobertura real de servicios externos sin credenciales autorizadas.

## Referencias de precio autorizadas

Cuando no existe precio anunciado, se muestra una referencia numérica de mercado separada, rotulada en tarjetas y ficha, con enlace, fecha y descripción del comparable. No equivale a oferta del concesionario. El precio anunciado tiene prioridad; filtros y orden consultan catalogPrice mantenido por PostgreSQL. Las referencias no generan Offer en datos estructurados ni suman al valor de inventario con precio registrado.
