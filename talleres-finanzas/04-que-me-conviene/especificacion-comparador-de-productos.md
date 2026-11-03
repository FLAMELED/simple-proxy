# «Comparador de productos» · especificación de alcance

**Estado: no desarrollado.** En el taller 04 se usa una práctica dentro de la presentación (comparador del caso en la pantalla 17 y comparador de práctica en las 29–30), que no reemplaza esta herramienta.

## Propósito

Comparar de 3 a 5 productos o servicios con las mismas medidas y probar un cambio a la vez antes de aplicarlo en el negocio.

## Fuera de alcance

Sincronización automática, cuentas, nube, APK, instaladores, asistentes de IA integrados, recomendaciones automáticas de eliminar productos y cálculos de impuestos.

## Funciones

1. **Datos del periodo:** pagos fijos del negocio (una sola vez), valor de la hora de la dueña o el dueño, horas que quiere trabajar.
2. **Productos (3 a 5):** identificador único, nombre, unidad, precio, costo por unidad con su desglose (lo que se compra ÷ lo que rinde + empaque + otros costos de la unidad), minutos por unidad, unidades al mes, para qué sirve. Dato vacío = pendiente.
3. **Medidas:** aporte por unidad, margen sobre la venta, porcentaje agregado al costo (siempre rotulados), aporte por hora, aporte al mes, horas al mes; tres órdenes (por unidad, por hora, al mes); productos que pierden marcados.
4. **Meta común:** suma de aportes frente a pagos fijos + trabajo, con el excedente a la vista; resultado antes de impuestos y total para la dueña (resultado + trabajo). El trabajo nunca entra en el costo por unidad.
5. **Probar un cambio:** un solo dato de un solo producto (precio, costo, minutos o ventas), identificado como simulación; punto de comparación (unidades necesarias para aportar lo mismo que hoy).
6. **Plan de prueba:** cambio, duración, qué se mide, criterio de éxito; registro de lo medido y comparación al final.
7. **Conexión con la serie:** leer costos de «Mi Negocio Finanzas IA» y ventas de «Mi cierre diario», sin duplicar datos (mismos identificadores). Respaldo JSON con los mismos requisitos que «Mi cierre diario».

## Pruebas mínimas antes de declararla terminada

- Caso de Ana: aporte Q2,240.00, 34.5 h, resultado Q1,350.00; alternativas A Q1,640.00, B Q2,040.00, C Q2,080.00 para la dueña; punto de comparación 37.
- Caso de Lucía: aporte Q1,420.00, resultado Q530.00; guacamol a Q7.00 con punto de comparación 86.
- Dato vacío ≠ cero; producto que pierde; trabajo contado una sola vez.
- Celular (320 y 390 px) y PC, sin internet.
