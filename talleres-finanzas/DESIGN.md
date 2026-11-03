# Diseño de la serie

Tomado del afiche de la serie: titulares serif muy pesados y condensados con cursiva de acento, etiquetas en mayúsculas espaciadas, un campo de color plano por taller, filetes en lugar de cajas redondeadas.

## Tipografía

- **Titulares:** Noto Serif Display, peso 800–900, ancho 62.5–70 %. Da el titular condensado del afiche con un eje de ancho real.
- **Texto:** Atkinson Hyperlegible Next. Diseñada para distinguir letras y números con baja visión; útil en proyector.
- **Cifras:** Atkinson Hyperlegible Mono, solo para montos, operaciones y tablas.

## Color por taller (`--campo`)

| Taller | Claro | Nocturno |
|---|---|---|
| 01 | rojo naranja (afiche) | — |
| 02 | lila `#dcc0f5`, tinta `#22102a` | `#3a2551`, tinta `#f6ecff` |
| 03 | amarillo verdoso (afiche) | por definir |
| 04 | azul (afiche) | por definir |

El papel (`#f6f4f0` / `#15101a`) y la tinta son comunes. Falta / cuadra / sobra siempre llevan texto y signo, además de color.

## Composición

- Marco fijo de 100 × 56.25 unidades (`--u`), así ninguna pantalla se desplaza en PC; en celular el marco se vuelve columna con desplazamiento.
- Encabezado corrido: sección a la izquierda, caso a la derecha (cuadro lleno = caso principal, vacío = caso alternativo, punteado = tus datos, línea = referencia).
- Composiciones por función: escena, cuaderno, libro con saldo, barras proporcionales, conteo de billetes, antes/después, pregunta en campo de color, consulta copiable, mesa de práctica.
- Sin esquinas redondeadas (salvo monedas y el botón «i»), sin gradientes decorativos, sin iconos sin función.

## Movimiento

Solo al revelar pasos (opacidad y 0.4 em de desplazamiento, 220 ms). Nada se anima solo. Con movimiento reducido, sin transiciones.
