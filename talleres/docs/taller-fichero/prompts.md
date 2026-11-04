# Prompts · Mi fichero de trabajos a medida

Cópialos tal cual y reemplaza lo que está entre [corchetes]. Todos piden a la IA que **no invente** datos. Revisa siempre su respuesta contra tus apuntes antes de cargar algo en la app.

---

## 1. Ordenar apuntes de una visita

```
Te paso mis apuntes de una visita de trabajo. Soy [tu oficio: cortinas / tapicería / confección / otro].

Ordénalos en una tabla por pieza o espacio (por ejemplo: "Ventana sala"), con estas columnas:
Campo | Valor | Unidad | Texto original de mis apuntes

Reglas:
- Usa SOLO lo que está en mis apuntes. No calcules, no redondees, no completes medidas con valores típicos.
- Si un número no dice su unidad, escribe la unidad que parece más probable, pero márcala con "(¿?)" y explica por qué.
- Si encuentras medidas en unidades distintas (m y cm), indica la conversión a [cm] y muestra la cuenta.
- Si un dato no aparece, escribe "SIN DATO". Nunca pongas 0 en lugar de un dato faltante.
- Al final, haz dos listas: "Datos que faltan" y "Datos ambiguos o que conviene volver a medir".

Mis apuntes:
[pega aquí tus apuntes]
```

## 2. Definir los campos de mi oficio

```
Quiero adaptar una ficha de trabajo para mi oficio: [describe qué fabricas y para quién].
Hoy anoto esto en cada trabajo: [lista lo que anotas, aunque sea desordenado].

Propón una plantilla con dos listas:
1) Medidas: nombre claro, unidad (cm, mm, m, pulg o unidades) y una ayuda de una línea sobre cómo medirla.
2) Especificaciones: nombre y, si corresponde, de 3 a 6 opciones típicas separadas por coma.

Reglas:
- Máximo 10 medidas y 8 especificaciones. Prefiere las que cambian de un trabajo a otro.
- No incluyas valores ni medidas de ejemplo.
- Señala con "(opcional)" lo que no siempre se usa.
- Si algo de lo que anoto no queda claro, pregúntame en vez de suponer.
```

## 3. Revisar una ficha antes de fabricar

```
Esta es la hoja de trabajo de una ficha (copiada o en foto). Revísala como si fueras a fabricar con ella.

Dime solamente:
- Qué datos dicen "SIN DATO" o están vacíos y son necesarios para fabricar.
- Qué datos parecen incoherentes entre sí (por ejemplo, un riel más corto que la ventana) y por qué.
- Qué preguntas debería hacerle al cliente.

No propongas valores para lo que falta. No cambies ninguna medida.

[pega aquí el texto de la hoja]
```

## 4. Mensaje para el cliente con lo que falta

```
Con esta lista de datos faltantes, escribe un mensaje corto y amable para mi cliente [nombre], para enviar por WhatsApp. Pide solo esos datos, uno por línea, y explica cómo medir cada uno en palabras sencillas. No agregues datos ni supongas respuestas.

Datos que faltan:
[pega la lista]
```
