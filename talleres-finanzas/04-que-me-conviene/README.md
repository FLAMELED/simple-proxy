# Taller 04 · ¿Qué me conviene vender?

**Objetivo práctico:** en 90 minutos, cada participante compara de 3 a 5 productos o servicios con cuatro medidas (aporte por unidad, margen, aporte por hora y aporte al mes), considera tiempo, demanda y función de cada uno, prueba un solo cambio y sale con un plan de prueba de dos semanas.

## Archivos

| Archivo | Para qué |
|---|---|
| `presentacion.html` | Presentación interactiva (34 pantallas), sin internet. Incluye comparador del caso y comparador de práctica. |
| `guia-y-consultas.html` | Guía imprimible: las cuatro medidas, hoja de comparación, plan de prueba, errores y 4 consultas para ChatGPT. |
| `especificacion-comparador-de-productos.md` | Alcance de la herramienta «Comparador de productos». **No está desarrollada.** |

Se generan desde `../src/04-que-me-conviene/` con `node talleres-finanzas/scripts/build.mjs`.

## Relación con el taller 01

Se revisó la presentación del taller 01 («Inteligencia Artificial para entender las finanzas de tu negocio», 39 pantallas). Este taller conserva sus cifras y su vocabulario:

- Jugo de naranja, vaso de 500 ml: Q20.00; costo Q12.00 = Q100.00 ÷ 10 vasos + Q2.00; aporte Q8.00.
- Espacio Q150.00 + teléfono Q50.00 como pagos del negocio; trabajo a Q20.00 por hora, contado una sola vez en el periodo.
- La limonada que el taller 01 planteó como ampliación hipotética (Q15.00, costo Q9.00, aporte Q6.00) aquí ya se vende, con esos mismos números.
- «Varios productos ayudan a una sola meta»: no se reparten los pagos fijos entre productos.
- Los dos porcentajes del taller 01 («agregar a la base» y «parte del precio») reaparecen como margen sobre la venta y porcentaje agregado al costo.
- «Antes de impuestos», con la reserva tributaria pendiente.

El taller 01 no se modificó. Su paleta (verde) es propia y distinta de la paleta de la serie; solo se cambiaría si se solicita.

## Recorrido de 90 minutos

| Bloque | Min | Pantallas | Qué pasa |
|---|---|---|---|
| A · El problema | 10 | 1–5 | Portada, la tarea, lo que viene de los talleres 01 a 03, la duda de Ana (34.5 h, quiere 30), pregunta: ¿qué quita? |
| B · Los datos | 15 | 6–11 | Menú y ventas; costo por unidad; aporte por unidad; dos porcentajes; tiempo; una sola meta |
| C · Comparar | 15 | 12–16 | Aporte por hora; tres órdenes; ¿quitamos la limonada?; resultado del mes; qué nos dice |
| D · Probar y revisar | 20 | 17–25 | Comparador (A, B, C); A dejar la ensalada; B en lote; C precio Q18 (simulación); consulta para comparar; respuesta de IA con 4 errores (demostración); «explícamelo más sencillo»; plan de prueba de Ana; alcance de la herramienta |
| E · Tus productos | 20 | 26–30 | Elegir camino; caso Lucía; consulta para sacar costos; comparador de práctica (productos y resultado con un cambio) |
| F · Comprobar y repetir | 10 | 31–34 | Comprobación de Lucía; errores; tu plan de prueba; cierre de la serie |

## Caso Ana · menú de un mes (ficticio)

Pagos del negocio Q200.00. Hora de trabajo Q20.00. Meta de Ana: 30 horas.

| Producto | Precio | Costo | Aporte | Margen | Min | Por hora | Vende | Al mes | Horas |
|---|---|---|---|---|---|---|---|---|---|
| Jugo de naranja 500 ml | Q20.00 | Q12.00 | Q8.00 | 40.0 % | 5 | Q96.00 | 120 | Q960.00 | 10 |
| Licuado con leche | Q25.00 | Q15.00 (8 + 5 + 2) | Q10.00 | 40.0 % | 12 | Q50.00 | 40 | Q400.00 | 8 |
| Ensalada de frutas | Q15.00 | Q7.00 (5.50 + 1.50) | Q8.00 | 53.3 % (114.3 % sobre costo) | 15 | Q32.00 | 50 | Q400.00 | 12.5 |
| Limonada | Q15.00 | Q9.00 (7 + 2) | Q6.00 | 40.0 % | 3 | Q120.00 | 80 | Q480.00 | 4 |

Aporte Q2,240.00 − Q200.00 − Q690.00 (34.5 h × Q20.00) = **Q1,350.00** antes de impuestos. Para Ana: Q1,350.00 + Q690.00 = Q2,040.00.

| Cambio (uno a la vez) | Horas | Resultado | Para Ana |
|---|---|---|---|
| A · Dejar la ensalada | 22 | Q1,200.00 | Q1,640.00 |
| B · Ensalada en lote, 9 min (supuesto por medir) | 29.5 | Q1,450.00 | Q2,040.00 |
| C · Ensalada a Q18.00 vendiendo 40 (simulación) | 32 | Q1,440.00 | Q2,080.00 |

Punto de comparación de C: Q400.00 ÷ Q11.00 = 36.4 → al menos 37 al mes. Ana prueba B dos semanas.

## Caso alternativo Lucía (nuevo, ficticio)

Pagos fijos Q510.00 (gas Q270.00 + Doña Tere Q240.00). Hora Q20.00. Hasta 20 horas.

| Producto | Precio | Costo | Aporte | Margen | Min | Por hora | Vende | Al mes |
|---|---|---|---|---|---|---|---|---|
| Tostada de frijol | Q5.00 | Q2.00 | Q3.00 | 60.0 % | 1.5 | Q120.00 | 160 | Q480.00 |
| Tostada de guacamol | Q6.00 | Q3.50 | Q2.50 | 41.7 % | 2 | Q75.00 | 120 | Q300.00 |
| Atol de elote | Q6.00 | Q2.00 | Q4.00 | 66.7 % | 3 | Q80.00 | 100 | Q400.00 |
| Chuchito | Q7.00 | Q3.00 | Q4.00 | 57.1 % | 6 | Q40.00 | 60 | Q240.00 |

Aporte Q1,420.00 · 19 h · resultado Q530.00. Guacamol a Q7.00: aporte Q3.50; punto de comparación Q300.00 ÷ Q3.50 = 86 al mes; con 120 ventas +Q120.00, con 90 ventas +Q15.00.

## Comprobación automática

```bash
node talleres-finanzas/scripts/verificar.mjs 04-que-me-conviene
```

Además de las pruebas comunes, comprueba con el motor del comparador todas las cifras de las tablas anteriores, los tres órdenes, los veredictos y el reinicio, la prueba de un cambio, que un dato vacío impide comparar y que un costo mayor que el precio se marca como «pierde».
