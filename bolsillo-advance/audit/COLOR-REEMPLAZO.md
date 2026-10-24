# Sustitución de la corrección de color

**Fecha:** 2026-10-24. **Archivo:** `app/gba/src/ppu.js`: constantes y funciones L12–14, `setColorCorrection` L50–70.

## 1. Qué se retiró

La opción "Colores: Como la GBA" de la versión auditada usaba:
- gammas 4,0/2,2;
- la matriz R = 255r + 50g + 0b, G = 10r + 230g + 30b, B = 50r + 10g + 220b;
- el escalado 255/280.

Son los parámetros de higan `gba/ppu/color.cpp` (GPLv3 o posterior, "Copyright © 2004-2020 Near et al"). La auditoría la clasificó como **posible adaptación** (§2.3, componente 7). Se ha retirado por completo:
- no queda ninguno de esos coeficientes en el código (`check_apk.py` lo comprueba en el APK);
- la búsqueda de k-gramas ya no encuentra coincidencias con `color.cpp`.

## 2. Qué la sustituye

La opción pasa a llamarse **"Suaves (LCD)"**. El nombre cambia a propósito: ya no pretende reproducir la pantalla de la GBA, solo dar un aspecto menos saturado y algo más oscuro.

Para cada color de 15 bits (r, g, b de 0 a 31):

1. Se normaliza cada canal: `v / 31`.
2. Se pasa a luz lineal con la **función de transferencia sRGB** de **IEC 61966-2-1:1999**: `v ≤ 0,04045 → v/12,92`; si no, `((v+0,055)/1,055)^2,4`.
3. Se calcula la luminancia relativa con los pesos de **ITU-R BT.709**: `Y = 0,2126·R + 0,7152·G + 0,0722·B`. sRGB usa los mismos primarios.
4. Se desatura hacia `Y`: `c' = c + (Y − c)·LCD_DESAT`, con `LCD_DESAT = 0,2`.
5. Se atenúa: `c'' = c'·LCD_GAIN`, con `LCD_GAIN = 0,85`.
6. Se vuelve a codificar con la inversa de sRGB (`≤ 0,0031308 → 12,92·v`; si no, `1,055·v^(1/2,4) − 0,055`) y se escala a 0–255.

La opción "Vivos" (sin corrección) no cambia: `(c << 3) | (c >> 2)`.

## 3. Procedencia del reemplazo

| Elemento | Origen | Estado |
|---|---|---|
| Función de transferencia sRGB y su inversa | Norma IEC 61966-2-1 (fórmula publicada, de uso general) | Fórmula normativa, sin código de terceros |
| Pesos de luma 0,2126 / 0,7152 / 0,0722 | ITU-R BT.709 (Rec. 709) | Constantes normativas |
| Desaturación lineal hacia la luminancia | Operación genérica de mezcla (interpolación lineal) | — |
| `LCD_DESAT = 0,2` y `LCD_GAIN = 0,85` | **Fijados en esta sesión** como valores moderados (20 % de desaturación y 15 % de atenuación), y revisados después a ojo en una captura (BGMode7). No se midieron sobre una GBA real ni se tomaron de otro proyecto. | Parámetros propios |
| Código JS (L12–14, L50–70) | Escrito en esta sesión, el 2026-10-24 | — |

**Qué se consultó:** para escribir el reemplazo no se abrió ningún emulador, shader ni perfil de color de terceros. Esta ronda no descargó nada nuevo, y en toda la conversación no hubo WebFetch ni WebSearch.

**Esto no es una sala limpia.** Quien escribió el reemplazo (el asistente de IA) **había leído** `higan/gba/ppu/color.cpp` durante la auditoría, para compararlo. Además, por su entrenamiento puede conocer otros perfiles de color para la GBA. Por eso el reemplazo evita deliberadamente lo que caracterizaba a higan:
- no tiene una gamma de entrada 4,0;
- no tiene una matriz 3×3 de mezcla entre canales;
- no tiene el escalado 255/280.

Solo usa dos operaciones normalizadas y dos parámetros escalares. Si hace falta una procedencia más fuerte, la opción es que la escriba en sala limpia otra persona, o retirar la opción (ver 5).

**Lo que no se puede afirmar:**
- Que la forma "linealizar → mezclar con Y → reescalar" sea exclusiva de este proyecto. Es una técnica estándar de procesado de color y es muy probable que aparezca en otros programas. Lo que se ha evitado son los parámetros y la matriz concretos de higan y de otros perfiles conocidos para la GBA.
- Que el resultado se parezca a una pantalla de GBA. No se ha medido.

**Comprobación con la herramienta de la auditoría:** `results-actual/scan-k12-cores.txt` no muestra coincidencias del bloque de color de `ppu.js` con higan, ares ni mGBA.

## 4. Verificación

Ver `VERIFICACION-2026-10-24.md`, grupo "Gráficos":
- los grises siguen siendo neutros (r = g = b) y crecientes;
- el negro sigue en 0;
- el blanco pasa a 237;
- la tabla es distinta de la anterior;
- todas las pantallas renderizadas con "Vivos" son idénticas bit a bit a las de la versión auditada.

Capturas: `out/verify/color-raw-BGMode7.png` y `color-lcd-BGMode7.png`. No se publican porque son la salida de una ROM de prueba sin licencia.

## 5. Alternativa

Si se prefiere no tener ninguna corrección, basta con quitar la opción "Suaves (LCD)" de `ui.js` y `setColorCorrection` de `ppu.js`. La opción "Vivos" no depende de ninguna de las dos.
