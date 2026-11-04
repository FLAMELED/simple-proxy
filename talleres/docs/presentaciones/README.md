# Presentaciones didácticas de los talleres

| Taller | Presentación (PowerPoint editable, 16:9, con notas) | Guion del facilitador | Hoja de práctica con respuestas | Prompts |
|---|---|---|---|---|
| Mide una vez, encuéntralo siempre (Fichero) | `Taller-Fichero-Mide-una-vez.pptx` · 27 diapositivas | `word/guion-fichero.docx` | `word/hoja-practica-fichero.docx` | `word/prompts-fichero.docx` |
| Planea antes de cortar (Cortes) | `Taller-Cortes-Planea-antes-de-cortar.pptx` · 28 diapositivas | `word/guion-cortes.docx` | `word/hoja-practica-cortes.docx` | `word/prompts-cortes.docx` |

Los `.docx` salen de los `.md` de esta carpeta, que son la versión que se puede revisar en GitHub.

## De dónde sale cada cosa

**Contenido.** `src/fichero.mjs` y `src/cortes.mjs` son la única fuente del contenido. Cada diapositiva lleva:
- su bloque;
- sus minutos (el script comprueba que sean continuos de 0 a 90);
- su texto visible;
- sus capturas;
- sus notas: qué decir, qué hacer, pregunta, respuesta esperada, transición y **lo pendiente de comprobar en un teléfono real**.

El guion del facilitador se genera de las mismas notas, así que la presentación y el guion no se contradicen.

**Capturas.** Todas son capturas reales de las apps (`capturas/`). Se toman con estos scripts, que recorren los casos con datos ficticios y comprueban cada paso, incluido el respaldo (guardar, borrar, recuperar):
- `scripts/capturas-fichero.mjs`
- `scripts/capturas-cortes.mjs`

**Respuestas de los ejercicios.**
- Fichero: `scripts/comprobar-ejercicio-fichero.mjs` resuelve el ejercicio de tapicería en la app.
- Cortes: los números salen del motor real (`cortes/src/engine.js`) y pasan `verifyPlan`.

## Volver a generar

```bash
cd talleres
node scripts/build-web.mjs
node scripts/capturas-fichero.mjs && node scripts/capturas-cortes.mjs && node scripts/comprobar-ejercicio-fichero.mjs
# pptxgenjs instalado en alguna carpeta (npm install pptxgenjs@3.12.0):
NODE_PATH=/ruta/node_modules PPTXGENJS=/ruta/node_modules/pptxgenjs node docs/presentaciones/build-decks.mjs
cd docs/presentaciones && for f in guion-fichero guion-cortes hoja-practica-fichero hoja-practica-cortes prompts-fichero prompts-cortes; do pandoc $f.md -o word/$f.docx --resource-path=.; done
```

**Fuentes.** Las presentaciones usan Cambria para los títulos y Calibri para el texto, que vienen con Office. Los colores son los de cada app y quedan en el tema del archivo: en PowerPoint se cambian desde Diseño → Variantes.
