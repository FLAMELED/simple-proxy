---
title: "Prompts · Mide una vez, encuéntralo siempre"
subtitle: "Para usar con una IA externa (ChatGPT o Claude) junto con la app Mi fichero de trabajos a medida"
lang: es
---

**La app no tiene inteligencia artificial integrada.** Funciona sin internet. Estos prompts se usan aparte, en ChatGPT o Claude, que sí necesitan conexión.

**Ciclo de trabajo:**

1. **Organizar:** junta tus apuntes y quita nombres completos, teléfonos y direcciones.
2. **Consultar:** copia el prompt y completa lo que está entre [corchetes].
3. **Verificar:** compara la respuesta con tus apuntes.
4. **Aplicar:** escribe tú los datos en la app.

**Privacidad:** usa iniciales («Sra. C. L.»), nunca el teléfono ni la dirección del cliente.

# Prompt 1 · Ordenar apuntes de una visita

**Qué información das:**

- tu oficio;
- tus apuntes tal como los escribiste, con iniciales en vez de nombres;
- la unidad en la que quieres todo (por ejemplo, cm).

```
Soy [tu oficio: cortinas / tapicería / confección / otro].
Te paso mis apuntes de una visita de trabajo.

Ordénalos en una tabla por pieza o espacio (por ejemplo "Ventana sala"),
con estas columnas:
Campo | Valor | Unidad | Texto original de mis apuntes

Reglas:
- Usa SOLO lo que está en mis apuntes. No calcules, no redondees y no
  completes medidas con valores típicos.
- Si un número no dice su unidad, escribe la unidad más probable,
  márcala con "(¿?)" y explica por qué.
- Si hay medidas en unidades distintas (m y cm), conviértelas a [cm]
  y muestra la cuenta.
- Si un dato no aparece, escribe "SIN DATO". Nunca pongas 0 en lugar
  de un dato faltante.
- Al final, haz dos listas: "Datos que faltan" y "Datos dudosos o que
  conviene volver a medir".

Mis apuntes:
[pega aquí tus apuntes, sin nombres completos, teléfonos ni direcciones]
```

**Qué verificas antes de usarlo en la app:**

- Cada número contra el «Texto original». Si aparece un número que tú no escribiste, se borra.
- Cada conversión (por ejemplo, 1.50 m = 150 cm).
- Que «SIN DATO» se quede vacío en la app y no se escriba como 0.
- Lo marcado «(¿?)»: decides tú la unidad. Si no estás seguro, vuelves a medir.

# Prompt 2 · Campos para la plantilla de tu oficio

**Qué información das:**

- qué fabricas;
- qué anotas hoy en cada trabajo, aunque esté desordenado.

```
Hago [qué fabricas y para quién].
Hoy anoto esto en cada trabajo: [lista lo que anotas].

Propón una plantilla de ficha con dos listas:
1) Medidas: nombre claro, unidad (solo una de estas: mm, cm, m, pulg o
   unid.) y una ayuda de una línea sobre cómo medirla.
2) Especificaciones (lo que no es número): nombre y, si corresponde,
   de 3 a 6 opciones típicas separadas por coma.

Reglas:
- Máximo 10 medidas y 8 especificaciones. Prefiere lo que cambia de un
  trabajo a otro.
- No incluyas valores ni medidas de ejemplo.
- Marca con "(opcional)" lo que no siempre se usa.
- Si algo de lo que anoto no queda claro, pregúntame en vez de suponer.
```

**Qué verificas y cómo lo aplicas:**

- Quita los campos que nunca mides y agrega los que falten.
- Revisa que cada unidad sea la que usas en tu taller.
- **En la app:**
  1. Abre Plantillas → elige la más parecida → **Duplicar plantilla**.
  2. Cambia nombres, unidades y ayudas; las opciones se escriben separadas por coma.
  3. Agrega o quita campos.
- Cambiar una plantilla solo afecta a las fichas nuevas; las que ya existen no cambian.

# Prompt 3 · Revisar la hoja de trabajo antes de fabricar

**Qué información das:**

- El texto de la hoja de trabajo, copiado del PDF o en foto. Antes de compartirla, quita el teléfono y el nombre completo del cliente.

```
Esta es la hoja de trabajo de un encargo. Revísala como si fueras a
fabricar con ella.

Dime solamente:
- Qué datos dicen "SIN DATO" o están vacíos y son necesarios para
  fabricar.
- Qué datos parecen incoherentes entre sí (por ejemplo, un riel más
  corto que la ventana) y por qué.
- Un mensaje corto y amable para WhatsApp que pida al cliente solo
  esos datos, uno por línea, con una explicación sencilla de cómo
  medir cada uno.

No propongas valores para lo que falta. No cambies ninguna medida.
No incluyas precios ni fechas.

[pega aquí el texto de la hoja, sin teléfono ni dirección del cliente]
```

**Qué verificas:**

- Si un dato «incoherente» lo es de verdad: lo compruebas midiendo, no confiando en la IA.
- Que el mensaje no prometa precios, fechas ni materiales que no decidiste.
- Si la IA propone medidas para completar lo que falta, se ignoran.
- Cuando el cliente responda, lo registras en la app como una **versión nueva**, con el motivo del cambio.
