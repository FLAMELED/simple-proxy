# Genera docs/taller-*/presentacion.html: una idea por pantalla, navegación con flechas, toque o deslizamiento.
import html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def deck(title, colors, slides):
    paper, ink, accent, accent2 = colors
    secs = []
    for i, s in enumerate(slides):
        kind = s.get('kind', 'text')
        body = s.get('body', '')
        src = f'<p class="src">{html.escape(s["src"])}</p>' if s.get('src') else ''
        secs.append(f'<section class="slide k-{kind}" aria-label="Pantalla {i+1}"><div class="in">'
                    + (f'<p class="kick">{s["kick"]}</p>' if s.get('kick') else '')
                    + f'<h2>{s["h"]}</h2>' + (f'<div class="body">{body}</div>' if body else '') + src + '</div></section>')
    return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>
@font-face{{font-family:Fraunces;font-weight:900;src:url(../../shared/fonts/fraunces-latin-900-normal.woff2)}}
@font-face{{font-family:Fraunces;font-weight:900;font-style:italic;src:url(../../shared/fonts/fraunces-latin-900-italic.woff2)}}
@font-face{{font-family:'Source Sans 3';font-weight:400;src:url(../../shared/fonts/source-sans-3-latin-400-normal.woff2)}}
@font-face{{font-family:'Source Sans 3';font-weight:700;src:url(../../shared/fonts/source-sans-3-latin-700-normal.woff2)}}
:root{{--paper:{paper};--ink:{ink};--accent:{accent};--a2:{accent2}}}
*{{box-sizing:border-box;border-radius:0}}html,body{{margin:0;height:100%;background:var(--paper);color:var(--ink);font-family:'Source Sans 3',sans-serif;overflow:hidden}}
.slide{{position:absolute;inset:0;display:none;padding:6vh 7vw 10vh;overflow:auto}}.slide.on{{display:flex;align-items:center}}
.in{{max-width:1000px;width:100%}}
.kick{{font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:clamp(14px,1.8vw,20px);border-bottom:4px solid currentColor;display:inline-block;margin:0 0 2vh}}
h2{{font-family:Fraunces,Georgia,serif;font-weight:900;font-size:clamp(36px,7.2vw,96px);line-height:.95;letter-spacing:-.02em;margin:0 0 3vh}}
h2 em{{color:var(--accent);font-style:italic}}
.body{{font-size:clamp(19px,2.6vw,32px);line-height:1.35;max-width:32em}}.body p{{margin:0 0 .6em}}
.body table{{border-collapse:collapse;font-size:.85em}}.body td,.body th{{text-align:left;padding:.35em .8em .35em 0;border-bottom:1.5px solid currentColor}}
.body code,.body pre{{font-family:ui-monospace,monospace;font-size:.75em;background:rgba(0,0,0,.06);padding:.1em .3em}}.body pre{{padding:.8em;white-space:pre-wrap}}
.k-title{{background:var(--accent);color:#fff}}.k-title h2 em{{color:var(--a2)}}
.k-dark{{background:var(--ink);color:var(--paper)}}.k-dark h2 em{{color:var(--accent)}}
.src{{margin-top:3vh;font-size:clamp(13px,1.5vw,17px);opacity:.75}}.src::before{{content:"Origen del dato: ";font-weight:700}}
nav{{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-weight:700;z-index:2}}
nav button{{font:inherit;font-weight:700;min-width:56px;min-height:48px;border:2px solid currentColor;background:var(--paper);color:var(--ink);cursor:pointer}}
.bar{{position:fixed;left:0;top:0;height:6px;background:var(--accent);transition:width .2s}}
@media print{{html,body{{overflow:visible;height:auto}}.slide{{display:flex!important;position:relative;min-height:100vh;break-after:page}}nav,.bar{{display:none}}}}
</style></head><body><div class="bar" id="bar"></div>{"".join(secs)}
<nav><button id="prev" aria-label="Anterior">←</button><span id="pos"></span><button id="next" aria-label="Siguiente">→</button></nav>
<script>
const s=[...document.querySelectorAll('.slide')];let i=Math.max(0,Math.min(s.length-1,(parseInt(location.hash.slice(1))||1)-1));
function show(n){{i=Math.max(0,Math.min(s.length-1,n));s.forEach((x,j)=>x.classList.toggle('on',j===i));document.getElementById('pos').textContent=(i+1)+' / '+s.length;document.getElementById('bar').style.width=((i+1)/s.length*100)+'%';history.replaceState(null,'','#'+(i+1));}}
document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);
addEventListener('keydown',e=>{{if(['ArrowRight','PageDown',' '].includes(e.key))show(i+1);if(['ArrowLeft','PageUp'].includes(e.key))show(i-1);}});
let x0=null;addEventListener('touchstart',e=>x0=e.touches[0].clientX);addEventListener('touchend',e=>{{if(x0===null)return;const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)show(i+(d<0?1:-1));x0=null;}});
addEventListener('hashchange',()=>show((parseInt(location.hash.slice(1))||1)-1));
show(i);
</script></body></html>'''

fichero = [
  dict(kind='title', kick='02 · Registrar', h='Crea tu archivo de <em>medidas</em> y especificaciones', body='<p>Taller en línea · 90 minutos · con IA</p>'),
  dict(h='El problema: <em>apuntes dispersos</em>', body='<p>Papelitos, fotos sueltas y notas sin unidad. Cuando el cliente vuelve, nadie sabe cuánto medía la ventana.</p>'),
  dict(h='Hoy terminas con <em>tu fichero</em>', body='<p>La app instalada, una plantilla para tu oficio y un proyecto con fichas completas, guardadas y recuperables.</p>'),
  dict(kind='dark', kick='Regla 1', h='Vacío no es <em>cero</em>', body='<p>Si no mediste, deja el campo vacío: dirá «Sin dato». El 0 es solo para una medida que de verdad es cero.</p>'),
  dict(kick='Paso 1', h='Instala y carga el <em>ejemplo</em>', body='<p>Copias → «Cargar el ejemplo "Entre Hilos"». Queda marcado EJEMPLO y luego se quita sin tocar lo tuyo.</p>', src='Entre Hilos es un negocio ficticio creado para el taller.'),
  dict(kick='Caso', h='Dos ventanas, <em>dos fichas</em>', body='<pre>sala: ventana 1.80 ancho x 150 alto. riel 2.20 …\ncomedor: 120 x 140, riel 160, al piso 240 …</pre><p>¿Qué unidades se mezclan? ¿Qué dato falta?</p>', src='Apuntes ficticios, en taller-fichero/taller.md.'),
  dict(kick='Paso 2', h='Proyecto de <em>práctica</em>', body='<p>Nuevo proyecto → marca «Es de práctica». Ficha «Ventana sala» con la plantilla Cortina. Todo en cm: 180, 150, 220, 250.</p>'),
  dict(kick='Paso 3', h='Foto y <em>acabado</em>', body='<p>Agrega una foto como referencia y toca «Dobladillo 10 cm». La foto no mide nada: las medidas las escribes tú.</p>'),
  dict(kick='Paso 4', h='Corrige y <em>compara</em>', body='<p>Volviste a medir: 182 cm. Guarda la versión 2. En Historial verás <code>180 cm → 182 cm</code>.</p>'),
  dict(kick='Paso 5', h='Hoja de <em>trabajo</em>', body='<p>Proyecto → «Hoja de trabajo del proyecto» → Imprimir o guardar PDF. Lo que falta dice «SIN DATO — completar».</p>'),
  dict(kind='dark', kick='IA', h='La IA <em>ordena</em>, tú decides', body='<p>Prompt 1: ordenar apuntes. Prompt 2: campos de tu oficio. Si aparece un número que no escribiste, se borra.</p>'),
  dict(kick='Tu turno', h='Una ficha <em>real</em>', body='<p>Duplica una plantilla y ajústala a tu oficio. Carga un trabajo tuyo, con su foto. Esta vez, sin marcar «de práctica».</p>'),
  dict(kick='Paso 6', h='Guarda una <em>copia</em>', body='<p>Copias → «Guardar una copia» → Drive o correo. Luego «Recuperar una copia» → «Agregar lo nuevo»: no duplica ni pisa nada.</p>'),
  dict(kind='title', kick='Rutina', h='Medir · ficha · versión · hoja · <em>copia</em>', body='<p>Una copia por semana. Quita el ejemplo cuando termines de practicar.</p>'),
]
cortes = [
  dict(kind='title', kick='01 · Aprovechar', h='Planea tus <em>cortes</em> y aprovecha el material', body='<p>Taller en línea · 90 minutos · con IA</p>'),
  dict(h='Cortar «a ojo» <em>cuesta</em>', body='<p>Retazos que no sirven, piezas que no salen y compras de más.</p>'),
  dict(h='Hoy terminas con <em>tu plano</em>', body='<p>La app instalada y un proyecto de corte con piezas identificadas y un plano para imprimir.</p>'),
  dict(kind='dark', kick='Regla', h='La app <em>calcula</em>; la IA no dibuja', body='<p>El plano sale de reglas fijas y se comprueba pieza por pieza. La IA te ayuda a preparar la lista de piezas.</p>'),
  dict(kick='Caso', h='Papel y <em>Forma</em>', body='<table><tr><td>A Base de caja</td><td>30 × 20</td><td>4</td></tr><tr><td>B Lateral largo</td><td>30 × 8</td><td>8</td></tr><tr><td>C Lateral corto</td><td>19,6 × 8</td><td>8</td></tr><tr><td>D Fondo de cuadro</td><td>25 × 35</td><td>3 · no girar</td></tr></table>', src='Emprendimiento ficticio; medidas inventadas y comprobadas en las pruebas de la app.'),
  dict(kick='¿De dónde sale?', h='19,6 = 20 − 2 × <em>0,2</em>', body='<p>El lateral corto va entre los dos largos, y el cartón mide 2 mm. Cada número tiene una razón.</p>'),
  dict(kick='Material', h='Separación y <em>margen</em>', body='<p>La separación es lo que se pierde en cada corte (0,2 cm con cúter). El margen es el borde golpeado de la plancha (0,5 cm).</p>'),
  dict(kick='Paso 1', h='Genera el <em>plano</em>', body='<p>Resultado esperado: 23 de 23 piezas en 2 de 2 planchas, con «✓ Verificado». Amplía con +.</p>'),
  dict(kick='Paso 2', h='Lee la <em>leyenda</em>', body='<p>A1…D3: cada pieza con su posición. ↻ quiere decir girada. Las zonas rayadas S1.1… son sobrantes útiles.</p>'),
  dict(kind='dark', kick='Prueba', h='¿Qué pasa si <em>no cabe</em>?', body='<p>Con 1 plancha: «No alcanzó el material». Con un panel de 75 × 50 sin girar: «No cabe en esa orientación».</p>'),
  dict(h='Propuesta comprobada, <em>no «óptima»</em>', body='<p>Se prueban 15 combinaciones y se elige la mejor de ellas. No se garantiza que sea la mejor posible.</p>'),
  dict(kick='IA', h='De la idea a la <em>lista</em>', body='<p>Prompt 1: describe tu producto y obtén las piezas con medidas. Lo que falta dice «SIN DATO»; no se inventa.</p>'),
  dict(kick='Tu turno', h='Tu material, <em>tus piezas</em>', body='<p>Proyecto nuevo con las medidas reales. Decide qué piezas no se pueden girar. Genera el plano y guárdalo en PDF.</p>'),
  dict(kind='title', kick='Antes de cortar', h='Mide dos veces, <em>corta una</em>', body='<p>Revisa el material real, marca cada pieza con su código y guarda una copia.</p>'),
]
(ROOT/'docs/taller-fichero/presentacion.html').write_text(deck('Crea tu archivo de medidas', ('#fbf8f1','#141a33','#1630a8','#dfe8a6'), fichero), encoding='utf-8')
(ROOT/'docs/taller-cortes/presentacion.html').write_text(deck('Planea tus cortes', ('#f6f1e4','#232323','#c4511a','#232323'), cortes), encoding='utf-8')
print('presentaciones listas')
