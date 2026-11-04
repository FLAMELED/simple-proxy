# Prompts · Mi plan de cortes

Cópialos y reemplaza lo que está entre [corchetes]. La IA ayuda a **preparar y revisar la lista de piezas**. El plano siempre lo calcula la app, con reglas fijas que se pueden comprobar. No le pidas a la IA que dibuje o adivine una distribución.

---

## 1. De la descripción del producto a la lista de piezas

```
Fabrico [producto] con [material y grosor]. Te describo cómo se arma:
[describe el producto: medidas finales, cómo se unen las piezas, cuántas unidades quiero hacer]

Haz una tabla de piezas rectangulares con estas columnas:
Pieza | Ancho | Largo | Cantidad total | ¿Se puede girar? | De dónde sale la medida

Reglas:
- Usa solo las medidas que te di. Si una medida se deduce (por ejemplo, restar el grosor del material), muestra la cuenta.
- No supongas medidas típicas ni tolerancias. Si falta un dato, escribe "SIN DATO".
- "¿Se puede girar?": responde "No" solo si yo mencioné veta, estampado, doblez u orientación; si no lo sé, escribe "Preguntar".
- Todas las medidas en [cm].
- Al final, lista las preguntas que debo responder antes de cortar.
```

## 2. Revisar una lista de piezas antes de cargarla

```
Revisa esta lista de piezas antes de pasarla a mi app de cortes. Material: [ancho × largo, unidad, cantidad de planchas], separación de corte [valor].

Dime solamente:
- Piezas con medidas faltantes, en cero o con unidad dudosa.
- Piezas más grandes que el material (indica si cabrían girándolas).
- Cantidades que no cuadran con lo que quiero fabricar: [cuántas unidades del producto].
- El área total de las piezas comparada con el área del material (es solo una referencia: que el área alcance no garantiza que las piezas quepan).

No cambies medidas ni propongas valores nuevos.

Lista:
[pega la lista]
```

## 3. Qué hacer con las piezas pendientes

```
Mi app de cortes dejó estas piezas pendientes, con su motivo:
[copia la lista de pendientes del plano]

Material: [medidas y cantidad]. Piezas que no se pueden girar: [cuáles y por qué].

Dame opciones concretas para decidir yo (no hagas un plano de corte):
- ¿Cuántas planchas más haría falta, como mínimo, según el área? Aclara que es una estimación.
- ¿Qué pieza conviene dividir o rediseñar, si el producto lo permite?
- ¿Qué preguntas debería responder antes de comprar más material?
```

## 4. Ideas para los sobrantes

```
Me quedaron estos sobrantes de [material]: [copia la tabla de sobrantes con sus medidas].
Mis productos son: [lista].

Sugiere qué piezas pequeñas de mis productos podría sacar de cada sobrante. Usa solo las medidas de piezas que te doy: [lista de piezas pequeñas con medidas]. Si no hay ninguna que quepa, dilo.
```
