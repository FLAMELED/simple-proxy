---
title: "Prompts · Planea antes de cortar"
subtitle: "Para usar con una IA externa (ChatGPT o Claude) junto con la app Mi plan de cortes"
lang: es
---

**La app no tiene inteligencia artificial integrada.** Calcula el plano con reglas programadas y lo verifica; funciona sin internet. Estos prompts se usan aparte, en ChatGPT o Claude, que sí necesitan conexión.

**No le pidas a la IA que dibuje o adivine un plano de corte:** un plano hecho por una IA no está verificado. El plano lo hace la app.

**Ciclo de trabajo:**

1. **Organizar:** describe el producto y junta sus medidas.
2. **Consultar:** copia el prompt y completa lo que está entre [corchetes].
3. **Verificar:** rehaz las cuentas y revisa las medidas.
4. **Aplicar:** carga tú las piezas en la app y genera el plano.

No hace falta compartir datos de clientes: basta con el producto y sus medidas.

# Prompt 1 · Del producto a la lista de piezas

**Qué información das:**

- producto;
- material y grosor;
- medidas finales;
- cómo se arma (qué pieza va entre cuáles);
- cuántas unidades vas a fabricar.

```
Fabrico [producto] con [material y grosor, por ejemplo cartón gris de
2 mm].
Medidas finales de una unidad: [ancho × largo × alto, con unidad].
Cómo se arma: [qué piezas lleva y cuáles van entre otras, por ejemplo
"los laterales cortos van entre los largos; la tapa sobresale 0,2 cm
por lado"].
Unidades a fabricar: [cantidad].

Haz una tabla de piezas rectangulares con estas columnas:
Pieza | Ancho | Largo | Cantidad total | ¿Se puede girar? | Cuenta

Reglas:
- Usa solo las medidas que te di. Si una medida se deduce (por ejemplo,
  restar el grosor), muestra la cuenta en la columna "Cuenta".
- La cantidad total es por todo el pedido, no por unidad.
- No supongas medidas típicas ni tolerancias. Si falta un dato,
  escribe "SIN DATO".
- "¿Se puede girar?": responde "No" solo si mencioné veta, estampado,
  doblez u orientación; si no lo sé, escribe "Preguntar".
- Todas las medidas en [cm].
- Al final, lista las preguntas que debo responder antes de cortar.
```

**Qué verificas antes de cargar en la app:**

- Cada resta de grosor (ejemplo: 10 − 2 × 0,2 = 9,6).
- Que las cantidades estén multiplicadas por las unidades del pedido.
- Lo que dice «Preguntar» o «SIN DATO»: lo decides tú.
- Si dudas de una medida, arma primero una pieza de muestra.

# Prompt 2 · Revisar la lista antes de cargarla

**Qué información das:**

- medidas del material y cuántas planchas tienes;
- separación de corte y margen del borde;
- la lista de piezas.

```
Revisa esta lista de piezas antes de pasarla a mi app de cortes.
Material: [ancho × largo de la plancha, unidad], [cantidad] planchas.
Separación de corte: [valor]. Margen del borde: [valor] por lado.

Dime solamente:
- Piezas con medidas faltantes, en cero o con unidad dudosa.
- Piezas más anchas o más largas que el área útil (el material menos
  dos márgenes) y si cabrían girándolas.
- El área total de las piezas comparada con el área útil de las
  planchas, mostrando la cuenta. Aclara que es solo una referencia: si
  el área alcanza, eso no garantiza que las piezas quepan.

No cambies medidas ni propongas valores nuevos.

Lista de piezas:
[pega la lista]
```

**Qué verificas:**

- **El área útil.** Ejemplo: (70 − 2 × 0,5) × (100 − 2 × 0,5) = 69 × 99 = 6831 cm².
- **Si el área total es mayor que el área útil,** seguro hace falta más material.
- **Si es menor,** todavía no sabes si cabe: eso lo dice el plano de la app.
- **Las piezas «más grandes que el material»:** compara tú mismo cada medida y su orientación.

# Prompt 3 · Decidir la compra y el costo por unidad

**Qué información das:**

- lo que dice el plano de la app: piezas colocadas, planchas usadas, pendientes con su motivo y sobrantes útiles;
- el precio real por plancha;
- las unidades del pedido.

```
Mi app de cortes dio este resultado:
- Piezas colocadas: [x de y]. Planchas usadas: [n de m].
- Pendientes y motivo: [copia la lista de pendientes].
- Sobrantes útiles: [copia la tabla de sobrantes].
Precio por plancha: Q[precio de tu proveedor].
Unidades del pedido: [cantidad].

Calcula, mostrando cada cuenta paso a paso:
- Costo de material del pedido.
- Costo de material por unidad.
- Si hay pendientes: cuántas planchas más harían falta como mínimo según
  el área (aclara que es una estimación y que debo confirmarlo con la
  app).

No hagas un plano de corte. Si falta un dato, pídemelo.
```

**Qué verificas y decides:**

- **Rehaz las cuentas con la calculadora.** Ejemplo con precio de ejemplo: Q30 ÷ 12 = Q2,50 por cajita; 2 × Q30 = Q60.
- **Usa el precio real de tu proveedor.**
- **Comprueba la estimación de planchas en la app:** cambia «Planchas disponibles» y genera el plano otra vez.
- **Este costo es solo del material:** no incluye mano de obra ni otros insumos.
- **Decides tú:**
  - ¿compras otra plancha o usas otro material?
  - ¿en qué otro pedido vas a usar el sobrante grande?
