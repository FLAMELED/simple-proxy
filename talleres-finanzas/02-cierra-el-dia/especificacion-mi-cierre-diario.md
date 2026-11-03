# «Mi cierre diario» · especificación de alcance

**Estado: no desarrollada.** Este documento describe lo que debe hacer la herramienta. Nada de lo que sigue está implementado ni probado como herramienta. En el taller 02 se usa una **mesa de práctica** dentro de la presentación (pantallas 31 a 33), que no reemplaza esta herramienta.

## Propósito

Que una persona registre los movimientos de su día, haga el cierre de caja y conserve un historial, con los mismos términos del taller 02. Debe poder usarla en el celular y en la PC sin cuentas ni servicios en la nube.

## Fuera de alcance en esta etapa

- Sincronización automática entre dispositivos, cuentas de usuario y servicios en la nube.
- APK, instaladores para Windows y asistentes de IA integrados.
- Cálculo de ganancia, impuestos u obligaciones fiscales.

## Funciones

1. **Registro de movimientos.** Cada movimiento lleva: identificador único, fecha y hora, descripción, tipo, forma de pago, monto en centavos enteros (o vacío = pendiente), estado (registrado / previsto) y fecha de última edición.
   - Tipos: venta, cobro de venta anterior, aporte del dueño, préstamo recibido, compra de insumos o mercadería, pago de gasto del negocio, pago por trabajo del dueño, retiro personal, pago de deuda o préstamo.
   - Formas: efectivo, transferencia, crédito (venta al crédito = por cobrar; compra o gasto al crédito = por pagar).
   - Un cobro de venta anterior puede vincularse con la venta original para no duplicarla.
2. **Cierre del día.** Fondo inicial contado; efectivo esperado = fondo + entradas en efectivo − salidas en efectivo, con la operación visible; conteo por billetes y monedas; diferencia = contado − esperado; comparación de transferencias anotadas con lo que muestra la app del banco.
   - Si falta un dato, no se calcula el esperado y se dice qué falta.
   - Una diferencia se guarda como pendiente de revisión. La herramienta no crea movimientos para cuadrarla.
3. **Pendientes.** Generados a partir de los datos (fiados por cobrar, préstamos por devolver, compras por pagar, diferencias, datos faltantes) más notas libres.
4. **Historial.** Lista de días cerrados con fondo, esperado, contado y diferencia. Un día cerrado se puede reabrir dejando constancia.

## Respaldo e importación JSON

El archivo sirve para **trasladar los datos** entre celular y PC (por ejemplo, enviándolo por correo). No es sincronización automática.

Requisitos:

- **Versión de formato** (`formato`, `version`) y **identificación del negocio** (`negocio.id` generado una vez, `negocio.nombre`).
- **Identificadores únicos** por movimiento y por día de cierre.
- **Validación** completa antes de importar: formato, versión, tipos, formas, montos en centavos enteros no negativos, fechas válidas. Si algo falla, se explica qué y los datos actuales no cambian.
- **Vista previa** antes de aplicar: negocio, rango de fechas, cantidad de movimientos nuevos, iguales y en conflicto.
- **Prevención de duplicados**: un movimiento con el mismo identificador y el mismo contenido no se vuelve a agregar.
- **Respaldo previo automático** de los datos actuales antes de aplicar una importación, con opción de deshacer.
- **Otro negocio**: si `negocio.id` no coincide, se advierte y se pide confirmación expresa.
- **Conflictos**: si el mismo identificador tiene contenido distinto en ambos dispositivos (los dos lo editaron), se muestran las dos versiones con su fecha de edición y la persona elige cuál conservar. No se resuelve en silencio.

Ejemplo del formato propuesto (versión 1):

```json
{
  "formato": "mi-cierre-diario",
  "version": 1,
  "exportado": "2026-11-10T23:05:00-06:00",
  "negocio": { "id": "neg-7f3a", "nombre": "Jugos La Parada" },
  "moneda": "GTQ",
  "unidad": "centavos",
  "dias": [
    {
      "id": "dia-2026-11-10",
      "fecha": "2026-11-10",
      "fondoInicial": 15000,
      "conteo": { "10000": 1, "5000": 2, "2000": 1, "1000": 1, "100": 3, "50": 4 },
      "appTransferencias": 12000,
      "estado": "cerrado",
      "notas": "Revisar vueltos de la mañana"
    }
  ],
  "movimientos": [
    {
      "id": "m-01HF3K",
      "dia": "dia-2026-11-10",
      "hora": "10:15",
      "descripcion": "Cobro a Doña Marta, semana pasada",
      "tipo": "cobro",
      "forma": "efectivo",
      "monto": 6000,
      "estado": "registrado",
      "ventaOriginal": "m-01HE9Q",
      "editado": "2026-11-10T10:16:00-06:00"
    }
  ]
}
```

## Pruebas mínimas antes de declararla terminada

- Cálculos con los casos de Ana (esperado Q240.00, falta Q5.00) y Lucía (esperado Q355.00, sobra Q2.00).
- Monto vacío ≠ cero; monto inválido rechazado.
- Exportar en un dispositivo e importar en otro; importar dos veces la misma copia; copia de otro negocio; conflicto de edición; archivo dañado; deshacer.
- Uso sin internet, en celular (320 y 390 px) y PC.

## Relación con la práctica del taller 02

La mesa de práctica ya usa un formato propio (`cierre-practica-taller02`, versión 1) con identificadores, centavos, validación, vista previa, aviso de copia repetida y deshacer. Es una demostración para el taller: no tiene historial, negocio con identificador ni resolución de conflictos, y sus datos solo duran mientras la pestaña está abierta.
