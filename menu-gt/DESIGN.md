# Diseño de Mercadito: "El ticket que se imprime"

Maqueta aprobada: `.impeccable/mocks/comp-1-inicio.png`. Contrato de dirección: `.impeccable/surfaces/index-html.md`.

## Idea
El presupuesto es un ticket de supermercado. Cada total se puede explicar, lo que falta por cotizar queda marcado con un sello y nunca se esconde, y al recalcular el ticket se vuelve a imprimir. Se descarta a propósito el lenguaje de app de comida genérica: verde, tarjetas blancas y cuadrícula de fotos.

## Tokens (`src/ui/styles.css`, `:root`)
| Token | Valor | Uso |
|---|---|---|
| `--ink` | #0a2340 | Barra superior, navegación, cifras |
| `--ink-2` | #0b2f6b | Botones, enlaces, ahorro confirmado (`.pill.ok`) |
| `--ground` | #f3f4f2 | Fondo de papel térmico frío |
| `--paper` | #fdfdfb | Ticket, tarjetas, hoja inferior (claro también en modo oscuro) |
| `--highlight` | #e8f850 | Resaltador: pendiente, selección, saldo que alcanza |
| `--stamp` | #6f3aa0 | Sello "SIN COTIZAR · N" |
| `--red` | #b8262f | "Faltan" (no alcanza) |
| `--grain` | máscara SVG de ruido | Grano de tinta del total |

El verde no se usa: el ahorro se muestra en tinta azul con el resaltador.

## Tipografía (autoalojada, SIL OFL, `assets/fonts/`)
- **Doto** (`--f-display`): el total del ticket. Es una matriz de puntos monoespaciada, como la letra de una impresora térmica.
- **Phudu** (`--f-stamp`): solo el sello.
- **Spline Sans Mono** (`--f-num`): montos, con cifras tabulares.
- **Hanken Grotesk** (`--f-ui`): el texto de la interfaz. Los títulos van a 700.

## Componentes propios
- `.ticket`: monta sobre la barra de tinta, termina con borde de corte en zigzag (`::after`) y usa reglas dobles.
- `.leader`: renglones con línea de puntos entre la etiqueta y el monto. El primer renglón (`.meta`) da el período, sin rótulo en mayúsculas encima.
- `.stamp-mark`: sello dibujado con código (N es un dato vivo), con filtro `#stamp-ink`.
- `.seg.pending`: el tramo rayado de la barra es lo que no tiene precio.
- `.slot`: ilustración circular, nombre, etiqueta de comida resaltada y precio por porción.

## Movimiento propio
Cuando cambia un monto, `app.js` pone `.printing` en el ticket. Cada `.print-line` (con `--i` como orden) se destapa con `clip-path` y la curva `cubic-bezier(0.16,1,0.3,1)`, 70 ms después del renglón anterior. Sin la clase, todo es visible desde el inicio. Con `prefers-reduced-motion` no hay animación. Lo verifica la prueba E2E "el ticket se vuelve a imprimir".

## Reglas
- Primera pantalla a 390×844: el ticket, "Hoy" y dos platos quedan por encima de la navegación (lo comprueba la prueba E2E).
- Objetivos táctiles de al menos 40 px (lo comprueba la prueba E2E).
- Ilustraciones: son generadas, no fotos. Su origen está en `assets/dishes/PROMPTS.md`. No se usan fotos de las tiendas (ver README, "Referencias visuales").
- `npm run capture` guarda capturas de revisión en `.impeccable/review/`, que no se versiona.
