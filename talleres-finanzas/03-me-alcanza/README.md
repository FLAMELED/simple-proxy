# Taller 03 · ¿Me alcanza?

**Objetivo práctico:** en 90 minutos, cada participante organiza cuatro semanas de caja con fechas, encuentra el día en que su dinero llega más bajo y prueba una decisión (con ella y sin ella) antes de comprometer dinero.

## Archivos

| Archivo | Para qué |
|---|---|
| `presentacion.html` | Presentación interactiva (33 pantallas), sin internet. Incluye simulador del caso y planificador de práctica. |
| `guia-y-consultas.html` | Guía imprimible: revisión del lunes, cinco ideas, hoja de 4 semanas, hoja para probar una decisión, errores y 4 consultas para ChatGPT. |
| `especificacion-simulador-de-caja.md` | Alcance de la herramienta «Simulador de caja». **No está desarrollada.** |

Se generan desde `../src/03-me-alcanza/` con `node talleres-finanzas/scripts/build.mjs`. La navegación, teclado, notas, índice, impresión y temas son los mismos del taller 02 (ver `../02-cierra-el-dia/README.md`).

## Recorrido de 90 minutos

| Bloque | Min | Pantallas | Qué pasa |
|---|---|---|---|
| A · El problema | 10 | 1–5 | Portada, la tarea, datos de los talleres 01 y 02, la oferta de la oficina, pregunta: ¿le alcanza? |
| B · Los datos | 15 | 6–10 | Q450.00 ya tienen destino; semana normal; pagos de una vez; colchón y etiquetas; costo de cada entrega |
| C · Paso a paso | 15 | 11–15 | Plan semana por semana; lo más bajo día a día; pregunta; el pedido pagado al final (gráfico); qué nos dice |
| D · Simular y revisar | 20 | 16–24 | Simulador (decisión + una prueba); calendario; alternativa de pago por entrega; atraso; consulta para revisar la decisión; respuesta de IA con 4 errores (demostración); «explícamelo más sencillo»; decisión de Ana; alcance de la herramienta |
| E · Tu plan | 20 | 25–29 | Elegir camino; caso Lucía; consulta para ordenar compromisos; planificador (filas); resultado con y sin la decisión |
| F · Comprobar y repetir | 10 | 30–33 | Comprobación de Lucía; errores; revisión del lunes; cierre y taller 04 |

## Caso Ana · plan de 4 semanas (previsto, ficticio)

Día 1 = lunes. Usa datos del taller 01 (Q20.00 por vaso, Q100.00 de fruta por tanda de 10 vasos, Q2.00 de empaque por vaso, Q20.00 por hora) y declara un plan nuevo. Supuestos: vende martes, jueves y sábado (10 vasos cada día, cobrados el mismo día, sin fiados); compra la fruta en la mañana; se paga 5 horas cada sábado (20 h al mes, como en el taller 01). Colchón: Q100.00, decidido por Ana.

| Movimiento | Días | Monto |
|---|---|---|
| Saldo hoy: Q250.00 efectivo (contado) + Q400.00 banco (app) | 1 | Q650.00 |
| Fruta, 1 tanda (mañana) | 2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27 | −Q100.00 |
| Ventas, 10 vasos | mismos días | +Q200.00 |
| Pago por trabajo de Ana (tarde) | 6, 13, 20, 27 | −Q100.00 |
| Espacio de venta · empaque | 1 · 1 y 22 | −Q150.00 · −Q200.00 c/u |
| Teléfono · retiro personal | 15 · 20 | −Q50.00 · −Q150.00 |

Semanas sin pedido: 650 + 600 − 750 = **500**; 500 + 600 − 400 = **700**; 700 + 600 − 600 = **700**; 700 + 600 − 600 = **700**. Lo más bajo: **Q200.00**, martes 2 (650 − 150 − 200 − 100).

**Pedido (la decisión):** 30 vasos los viernes 12, 19 y 26 a Q18.00. Cada jueves anterior: fruta Q300.00 + vasos Q60.00. Cada sábado posterior: trabajo extra 3 h × Q20.00 = Q60.00 (supuesto).

| Escenario | Lo más bajo | Día 28 |
|---|---|---|
| Sin pedido | Q200.00 · martes 2 | Q700.00 |
| Pedido pagado todo el viernes 26 (Q1,620.00) | −Q700.00 · jueves 25 (= Q500.00 − Q1,200.00 adelantados) | Q1,060.00 |
| Pago por entrega (Q540.00 cada viernes) | Q140.00 · jueves 11 (= Q600.00 − Q100.00 − Q360.00) | Q1,060.00 |
| Simulación: 1.ª entrega pagada una semana tarde | −Q130.00 · jueves 18 | Q1,060.00 |
| Simulación: imprevisto Q250.00 el martes 16 (pago por entrega) | Q130.00 | Q810.00 |

El pedido deja Q360.00 más: 90 × (Q18.00 − Q12.00) = Q540.00 de aporte antes de gastos fijos, menos 3 × Q60.00 de trabajo extra. Semanas con pedido pagado al final: 500, 280, −140, 1,060.

## Caso alternativo Lucía (nuevo, ficticio)

Saldo lunes 1: Q500.00; colchón Q100.00. Cobro a la maestra Elena +Q30.00 (día 1); gas −Q135.00 (días 5 y 19); devolución a Carmen −Q200.00 (sábado 6, tarde); cada sábado y domingo: insumos −Q180.00 (mañana), ventas +Q400.00, retiro −Q40.00 (tarde); cada sábado: Doña Tere −Q60.00. Decisión: plancha Q600.00 al contado (precio ficticio). Continúa los pendientes de Lucía del taller 02.

| Plan | Lo más bajo | Día 28 |
|---|---|---|
| Sin plancha | Q135.00 · domingo 7 | Q1,260.00 |
| Plancha el lunes 1 | −Q465.00 · domingo 7 | Q660.00 |
| Plancha el lunes 15 | −Q120.00 · sábado 20 | Q660.00 |
| Plancha el lunes 22 | Q135.00 · domingo 7 (alcanza) | Q660.00 |

## Comprobación automática

```bash
node talleres-finanzas/scripts/verificar.mjs 03-me-alcanza
```

Además de las pruebas comunes (desbordes en PC y celular, teclado, diálogos, índice, vista de impresión, 90 minutos, errores de JavaScript), comprueba todas las cifras de la tabla anterior con el motor del simulador, los veredictos, el calendario, el reinicio, la repetición semanal, y que un monto vacío impide concluir.
