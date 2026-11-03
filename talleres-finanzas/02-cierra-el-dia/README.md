# Taller 02 · Cierra el día con las cuentas claras

**Objetivo práctico:** en 90 minutos, cada participante completa un cierre de caja, identifica una diferencia sin inventar movimientos, deja sus pendientes claros y se lleva una rutina para repetirlo.

## Archivos

| Archivo | Para qué |
|---|---|
| `presentacion.html` | Presentación interactiva (37 pantallas). Abre directo en el navegador, funciona sin internet. |
| `guia-y-consultas.html` | Guía breve imprimible: rutina, hoja de cierre en blanco, tipos de movimiento, errores y 4 consultas para ChatGPT con botón de copiar. |
| `especificacion-mi-cierre-diario.md` | Alcance de la herramienta «Mi cierre diario». **No está desarrollada.** |

Los HTML se generan desde `../src/`. No los edites a mano: edita `src/` y ejecuta `node talleres-finanzas/scripts/build.mjs`.

## Uso de la presentación

- **Avanzar / retroceder:** botones «Anterior» y «Siguiente», flechas, Re Pág / Av Pág, espacio, o deslizar en pantallas táctiles. Primero se revelan los pasos de la pantalla y luego se cambia de pantalla. Mientras se escribe en un campo, las flechas no cambian de pantalla.
- **Barra inferior:** secciones A–F proporcionales a sus minutos, índice, datos de los casos, notas del facilitador (tecla N), vista de todas las pantallas e impresión, modo nocturno, pantalla completa (tecla F).
- **Notas del facilitador:** se abren en una ventana aparte para llevarla a tu pantalla. Si el navegador la bloquea, se muestran en un panel lateral y se avisa que el público podría verlas.
- **Impresión:** «Ver todas las pantallas» despliega todos los pasos y las explicaciones de los botones «i», con opción de incluir notas. Se imprime en carta horizontal.
- La dirección (`#12.3`) guarda pantalla y paso: recargar no pierde el lugar.

## Recorrido de 90 minutos

| Bloque | Min | Pantallas | Qué pasa |
|---|---|---|---|
| A · El problema | 10 | 1–5 | Portada, la tarea, Ana, la escena de las 17:00 (Q235.00 contados), pregunta: ¿ya sabe si está bien? |
| B · Los datos | 15 | 6–12 | El cuaderno; fondo inicial; vender ≠ cobrar; cobro atrasado; aportes y retiros; compras y pagos; etiquetas de cifras |
| C · Paso a paso | 15 | 13–18 | Clasificar las 9 notas (ejercicio); ventas vs. cobrado; efectivo esperado (Q260.00); conteo; diferencia (−Q25.00); qué hacer con ella |
| D · Revisar con IA | 20 | 19–27 | Consulta para ordenar notas; respuesta de IA con 4 errores (demostración); revisión en orden; consulta para revisar la diferencia; la app del banco; recálculo (−Q5.00); «explícamelo más sencillo»; cierre completo; «Mi cierre diario» |
| E · Tu cierre | 20 | 28–33 | Elegir camino (datos propios o Lucía); caso Lucía; consulta para tus notas; mesa de práctica en 3 pasos |
| F · Comprobar y repetir | 10 | 34–37 | Respuesta de Lucía; errores habituales; rutina y decisiones; cierre y taller 03 |

Cada pantalla tiene sus minutos en `data-min`; la prueba automática comprueba que suman 90.

## Caso Ana · martes (nuevo día, ficticio)

Continúa el caso del taller 01 (precio Q20.00 por vaso; costo Q12.00 = Q100.00 ÷ 10 + Q2.00). Las cifras del mes del taller 01 no se usan en los cálculos; aparecen solo como referencia en «Datos del caso».

Supuestos declarados: preparó 2 tandas (20 vasos) con fruta comprada el día anterior y empaque en existencia; vendió todo.

| # | Nota de Ana | Tipo | Forma | Monto |
|---|---|---|---|---|
| 1 | Conté la gaveta al abrir | Fondo inicial | — | Q150.00 |
| 2 | Dinero de mi bolsa para vuelto | Aporte del dueño | Efectivo | Q100.00 |
| 3 | 13 vasos en efectivo → **corregido: 12** | Venta | Efectivo | Q260.00 → **Q240.00** |
| 4 | 5 vasos por transferencia → **corregido: 6** | Venta | Transferencia | Q100.00 → **Q120.00** |
| 5 | Don Luis, 2 vasos, paga el viernes | Venta | Crédito | Q40.00 |
| 6 | Doña Marta, vasos de la semana pasada | Cobro de venta anterior | Efectivo | Q60.00 |
| 7 | Fruta para mañana | Compra de insumos | Efectivo | Q200.00 |
| 8 | Recarga del teléfono del negocio | Pago de gasto | Efectivo | Q50.00 |
| 9 | Útiles de mi hijo | Retiro personal | Efectivo | Q60.00 |
| 10 | Conteo 17:00: 1×Q100, 2×Q50, 1×Q20, 1×Q10, 3×Q1, 4×Q0.50 | Dato contado | — | Q235.00 |

App del banco (ilustración): 6 transferencias de Q20.00 = Q120.00. La de las 13:20 se había anotado como efectivo.

Comprobaciones:

- Vasos: 13 + 5 + 2 = 20 (cuaderno) y 12 + 6 + 2 = 20 (corregido).
- Ventas del día: 20 × Q20.00 = Q400.00 en ambos casos (solo cambia la forma de pago).
- Cobrado hoy (cuaderno): Q260.00 + Q100.00 + Q60.00 = Q420.00. Corregido: Q240.00 + Q120.00 + Q60.00 = Q420.00.
- Esperado (cuaderno): Q150 + Q100 + Q260 + Q60 − Q200 − Q50 − Q60 = Q260.00 → diferencia Q235 − Q260 = −Q25.00.
- Esperado (corregido): Q150 + Q100 + Q240 + Q60 − Q200 − Q50 − Q60 = Q240.00 → diferencia −Q5.00, pendiente de revisión.
- En la «i» de compras: costo de lo vendido hoy 20 × Q12.00 = Q240.00; aporte antes de gastos fijos 20 × Q8.00 = Q160.00. No es movimiento de la gaveta de hoy.
- Pendientes: revisar −Q5.00; cobrar Q40.00 a Don Luis (previsto, viernes); saldo total del banco (no se conoce el saldo inicial).

## Caso alternativo Lucía · sábado (nuevo, ficticio)

Fondo Q100.00; préstamo de Carmen Q200.00 (efectivo); compra de insumos Q180.00; ventas en efectivo Q310.00; por transferencia Q90.00; fiado a la maestra Elena Q30.00; cobro a Don Beto Q25.00; pago a Doña Tere por ayudar Q60.00 (gasto); retiro Q40.00. Conteo: 1×Q100, 3×Q50, 4×Q20, 2×Q10, 1×Q5, 2×Q1 = Q357.00. App: Q90.00.

- Ventas: Q310 + Q90 + Q30 = Q430.00. Cobrado hoy: Q310 + Q90 + Q25 = Q425.00.
- Esperado: Q100 + Q200 + Q310 + Q25 − Q180 − Q60 − Q40 = Q355.00. Diferencia: Q357 − Q355 = +Q2.00 (sobra, pendiente).
- Pendientes: devolver Q200.00 a Carmen; cobrar Q30.00 a Elena; revisar Q2.00.
- Trampas: préstamo como venta (Q630.00); préstamo y cobro como venta (Q655.00); olvidar el préstamo en el esperado (Q155.00).

## Uso de la IA

Cuatro consultas en la presentación (ordenar las notas de Ana, revisar una diferencia, «explícamelo más sencillo con uno de mis productos», ordenar tus notas) y cuatro en la guía (incluye «revisar mi cierre»). Cada una dice qué resolver, qué datos hay, qué falta, qué no inventar y cómo responder; al lado está qué verificar después. La respuesta con errores de la pantalla 20 está escrita para el taller y se identifica como demostración. La presentación no se conecta a ninguna IA.

## Comprobación automática

```bash
node talleres-finanzas/scripts/build.mjs
```

```bash
node talleres-finanzas/scripts/verificar.mjs 02-cierra-el-dia
```

`verificar.mjs` recorre las 37 pantallas con todos sus pasos a 1920×1080, 1366×768 y 1280×720 (sin contenido fuera del marco ni desplazamiento vertical) y a 390×844 (sin desplazamiento horizontal); prueba teclado, pasos, diálogos (Escape, clic fuera, foco), índice, pestañas, el ejercicio de clasificar y su reinicio, los cálculos de la mesa con Ana y Lucía, montos vacíos e inválidos, exportar/importar JSON (copia repetida, archivo inválido, deshacer), la alternativa cuando el portapapeles falla, la vista de impresión, el modo nocturno y que los minutos sumen 90. Necesita Playwright (si está global: `NODE_PATH=$(npm root -g)`).
