# LA SUBASTA AXM — diseño

## Contexto y dirección

Plataforma comercial de vehículos, español colombiano, Armenia, Quindío. Registro híbrido: portada editorial expresiva; catálogo y administración orientados a tareas. La fuente de evidencia del negocio es el encargo del propietario; el inventario y contacto se documentan con fuentes originales de Instagram en docs/instagram-observed.json. No atribuir el vehículo de portada al inventario.

## Identidad y fuente de tokens

Los valores normativos se mantienen aquí y se implementan en `src/app/globals.css` mediante variables CSS; Tailwind v4 usa la misma hoja. Cualquier cambio exige actualizar ambos archivos. No existe tema alternativo.

| Token            | Valor   | Uso                  |
| ---------------- | ------- | -------------------- |
| background       | #0A0A0A | fondo principal      |
| surface          | #171717 | paneles              |
| elevated         | #252525 | controles/bordes     |
| brand            | #C8102E | acción principal     |
| brand-hover      | #E32636 | interacción          |
| foreground       | #FFFFFF | texto                |
| muted            | #A3A3A3 | texto secundario     |
| focus            | #FFFFFF | foco de teclado      |
| scrollbar-thumb  | #626262 | barra desplazamiento |
| scrollbar-track  | #171717 | fondo barra          |
| scrollbar-hover  | #A3A3A3 | hover barra          |
| scrollbar-active | #FFFFFF | barra activa         |

## Tipografía

Títulos: Barlow Condensed semibold, autoalojada; caja alta y altura compacta en portada, escala fluida 56–110px. Texto: Manrope, autoalojada, 14–17px. Datos financieros con cifras tabulares. Si las fuentes no cargan, sans-serif nativa. Sin fuentes remotas durante render.

## Composición y firma

Header de 88px, contenedor máximo 1400px, márgenes 6vw. Portada panorámica con carro completo a la derecha, bloque tipográfico arriba a la izquierda y buscador de inventario suspendido sobre el límite inferior. Firma: línea roja en ángulo que cruza el logotipo tipográfico y ecos mínimos de una pista de conducción. Sin estadísticas comerciales inventadas.

## Sistema

Espaciado 4/8/12/16/24/32/48/64/96px. Paneles radio 8px, controles 4px. Bordes 1px; sombras solo en overlays. Lucide, trazo 1.5–2px. Botones mínimos 44px, primarios rojos con etiqueta blanca y secundarios delineados. Animación de entrada 400ms y hover 180ms; respetar prefers-reduced-motion. Galerías con aspect-ratio y dimensiones reservadas.

## Responsive y accesibilidad

Desktop catálogo 3 columnas + filtros; tablet 2; teléfono 1 y disclosure de filtros. Menú móvil nativo disclosure. Dashboard sidebar colapsa a navegación horizontal. Contraste AA, foco visible, skip link, errores textuales, scroll-margin para header. Scrollbars visibles globales incluyendo forced-colors. Ninguna funcionalidad depende de hover.

## Contenido y confianza

Precio: `$85.000.000 COP`; fechas es-CO y zona America/Bogota. Ilustración editorial inspirada en el Audi TT con leyenda visible de imagen generada. Las fichas conservan las fotografías originales del inventario. Sin vehículos, reseñas, garantías, teléfonos o direcciones inventados. Beneficios editables y sin promesas de certificación. Estados de base de datos no configurada y catálogo vacío son distintos.

Precios no anunciados se mantienen nulos y se presentan como “Consultar precio”. La carrocería puede verificarse visualmente en la fotografía original; las discrepancias de identidad impiden publicar.

## Referencias de precio autorizadas

Cuando no existe precio anunciado, se muestra una referencia numérica de mercado separada, rotulada en tarjetas y ficha, con enlace, fecha y descripción del comparable. No equivale a oferta del concesionario. El precio anunciado tiene prioridad; filtros y orden consultan catalogPrice mantenido por PostgreSQL. Las referencias no generan Offer en datos estructurados ni suman al valor de inventario con precio registrado.
