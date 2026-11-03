# Diseño de la serie

Tomado del afiche de la serie: titulares serif muy pesados y condensados con cursiva de acento, etiquetas en mayúsculas espaciadas, un campo de color plano por taller, filetes en lugar de cajas redondeadas.

## Tipografía

- **Titulares:** Noto Serif Display, peso 800–900, ancho 62.5–70 %. Da el titular condensado del afiche con un eje de ancho real.
- **Texto:** Atkinson Hyperlegible Next. Diseñada para distinguir letras y números con baja visión; útil en proyector.
- **Cifras:** Atkinson Hyperlegible Mono, solo para montos, operaciones y tablas.

## Color

**Fuente única:** `paleta.json`. El armado (`scripts/build.mjs`) comprueba los contrastes WCAG de todas las combinaciones que usan las pantallas y se detiene si alguna no cumple; luego escribe la paleta en cada HTML y genera `paleta.html`, la hoja de referencia visual con muestras, maquetas en claro y nocturno y la tabla de contrastes. Ningún archivo de `src/` define colores propios: todos usan estos tokens.

### Criterios

- **Contraste para proyector:** texto principal ≥ 7:1 (AAA) sobre papel, hoja y color del taller; texto secundario, estados y enlaces ≥ 4.5:1 (AA); etiquetas sobre rellenos de gráfico ≥ 4.5:1.
- **Un color por taller** (del afiche), con ocho tonos de papel fijo (campo, sus dos textos, filete, relleno fuerte y su texto, resalte suave y acento). La navegación usa solo neutros y el color del taller.
- **Neutros cálidos comunes** a toda la serie, sin tinte de ningún taller.
- **Estados semánticos comunes** y distintos de los colores de taller; siempre acompañados de signo y texto (− Falta, ✓ Cuadra, + Sobra).
- **Gráficos:** serie principal en tinta sólida; segunda en `campo`; tercera en `campo-fuerte`; pendiente o crédito con trama; negativo en `falta`. Todo relleno lleva contorno de tinta.
- **Nocturno** con valores propios para cada token; **impresión** siempre en claro.

### Neutros y estados (todos los talleres)

| Token | Uso | Claro | Nocturno |
|---|---|---|---|
| `--papel` | Fondo | `#f6f4ef` | `#141311` |
| `--papel-2` | Hojas, tablas, campos | `#ffffff` | `#1f1d1a` |
| `--tinta` | Texto, filetes, botones | `#1b1916` | `#f3f0e9` |
| `--tinta-2` | Texto secundario | `#4d4943` | `#c5bfb4` |
| `--regla-suave` | Filetes finos | `#cdc7bc` | `#46423b` |
| `--falta` | Falta · error | `#a1202f` | `#ff9aa3` |
| `--cuadra` | Cuadra · alcanza | `#1d6a3c` | `#8fdcab` |
| `--sobra` | Sobra · bajo el colchón | `#7a4e00` | `#f1c46b` |

### Familia de cada taller

| Taller | Color | `--campo` (claro) | `--campo-fuerte` | `--campo-suave` | `--acento` | `--campo` (nocturno) |
|---|---|---|---|---|---|---|
| 01 · Taller base | Rojo naranja | `#ff6a45` / texto `#000000` | `#c93d1d` | `#fde3db` | `#a8301a` | `#5c1f10` / texto `#ffe9e1` |
| 02 · Registrar | Lila | `#dcc0f5` / texto `#1b1916` | `#a77fd3` | `#f0e5fb` | `#6a2c86` | `#3a2551` / texto `#f6ecff` |
| 03 · Planificar | Amarillo verdoso | `#e8f35a` / texto `#1b1916` | `#c3cc2e` | `#f5f9cf` | `#4d5600` | `#3b4113` / texto `#f4f8d2` |
| 04 · Decidir | Azul | `#1f3fbf` / texto `#ffffff` | `#5c7cf0` | `#e3e9fd` | `#1f3fbf` | `#1a2a6e` / texto `#eef1ff` |

Cada familia define además `--campo-tinta-2` (texto secundario sobre el color), `--campo-regla` (filetes sobre el color) y `--campo-fuerte-tinta` (texto sobre el relleno de gráfico). El 01 se aclaró ligeramente respecto del afiche (`#ff6a45`) para que el texto negro sobre el color llegue a 7:1. El 04 lleva texto blanco sobre azul, como en el afiche.

## Composición

- Marco fijo de 100 × 56.25 unidades (`--u`), así ninguna pantalla se desplaza en PC; en celular el marco se vuelve columna con desplazamiento.
- Encabezado corrido: sección a la izquierda, caso a la derecha (cuadro lleno = caso principal, vacío = caso alternativo, punteado = tus datos, línea = referencia).
- Composiciones por función: escena, cuaderno, libro con saldo, barras proporcionales, conteo de billetes, antes/después, pregunta en campo de color, consulta copiable, mesa de práctica.
- Sin esquinas redondeadas (salvo monedas y el botón «i»), sin gradientes decorativos, sin iconos sin función.

## Movimiento

Solo al revelar pasos (opacidad y 0.4 em de desplazamiento, 220 ms). Nada se anima solo. Con movimiento reducido, sin transiciones.
