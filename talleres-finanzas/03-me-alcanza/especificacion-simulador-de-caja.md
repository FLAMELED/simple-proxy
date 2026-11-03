# «Simulador de caja» · especificación de alcance

**Estado: no desarrollado.** Describe lo que debe hacer la herramienta. En el taller 03 se usa una práctica dentro de la presentación (simulador del caso de Ana en las pantallas 16–17 y planificador en las 28–29), que no reemplaza esta herramienta.

## Propósito

Ordenar los cobros y pagos de las próximas 4 semanas por fecha, encontrar el día en que el dinero llega más bajo y comparar el plan con una decisión, antes de comprometer dinero.

## Fuera de alcance en esta etapa

- Sincronización automática, cuentas, nube, APK, instaladores y asistentes de IA integrados.
- Proyecciones de ganancia, impuestos o recomendaciones automáticas («compra» / «no compres»).

## Funciones

1. **Saldo de partida**: efectivo contado + banco, con fecha. Colchón elegido por la persona.
2. **Movimientos** con: identificador único, día, momento (mañana / durante el día / tarde), descripción, entra o sale, monto en centavos enteros (vacío = pendiente), estado (previsto / confirmado), repetición semanal, y marca «parte de la decisión».
3. **Cálculo** día por día. Orden dentro del día: mañana → durante el día → tarde; en el mismo momento, primero lo que sale. Muestra lo más bajo (monto, día y movimiento que lo provoca), días bajo el colchón, días con saldo negativo y saldo final.
   - Si falta un monto o un día, no concluye y dice qué falta.
   - Un cobro fuera de las 4 semanas se muestra aparte y no se cuenta.
4. **Escenarios**: plan sin la decisión y con ella, en el mismo gráfico. Una sola prueba a la vez (atraso de un cobro, imprevisto, menos ventas), identificada como simulación.
5. **Vistas**: gráfico del saldo más bajo de cada día con colchón y cero; calendario con detalle por día; tabla por semana.
6. **Revisión semanal**: marcar lo previsto que ya pasó como confirmado, mover lo que se atrasó y agregar una semana nueva. Importar los totales de «Mi cierre diario» cuando exista, sin duplicar movimientos (mismo identificador).
7. **Respaldo JSON** con versión de formato, identificación del negocio, validación, vista previa, prevención de duplicados, respaldo previo y revisión de conflictos (mismos requisitos que «Mi cierre diario»).

## Pruebas mínimas antes de declararla terminada

- Caso de Ana: sin pedido, lo más bajo Q200.00 (martes 2); pedido pagado al final, −Q700.00 (jueves 25); pago por entrega, Q140.00 (jueves 11); atraso del primer pago, −Q130.00 (jueves 18).
- Caso de Lucía: plancha el día 1, −Q465.00; el día 15, −Q120.00 (sábado 20); el día 22, Q135.00 (alcanza).
- Monto vacío ≠ cero; monto inválido rechazado; repetición semanal sin pasar del día 28.
- Celular (320 y 390 px) y PC, sin internet.
