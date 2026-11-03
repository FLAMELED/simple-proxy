# Finanzas del negocio con IA · talleres

Serie de talleres de 90 minutos para emprendedores de pequeños negocios de Guatemala. Cada taller tiene una presentación HTML autocontenida (funciona sin internet), un caso ficticio, práctica guiada, guía breve, consultas para ChatGPT y notas del facilitador.

| # | Taller | Estado |
|---|---|---|
| 01 | Entender los números del negocio | Taller base existente (no está en este repositorio) |
| 02 | Cierra el día con las cuentas claras | `02-cierra-el-dia/` |
| 03 | ¿Me alcanza? | Pendiente |
| 04 | ¿Qué me conviene vender? | Pendiente |

## Estructura

- `src/comun/`: motor de presentación común (navegación, pasos, diálogos, notas, impresión, temas) y su barra. Lo usan todos los talleres para que la navegación sea la misma.
- `src/<taller>/`: pantallas, estilos y ejercicios de cada taller.
- `fuentes/`: Noto Serif Display (titulares), Atkinson Hyperlegible Next (texto) y Atkinson Hyperlegible Mono (cifras), con licencia OFL. Se incrustan en cada HTML.
- `scripts/build.mjs`: genera `<taller>/*.html`. `scripts/verificar.mjs`: pruebas en navegador.

Reglas de diseño y contenido de la serie: `DESIGN.md` y `PRODUCT.md`.
