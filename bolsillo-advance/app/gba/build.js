// Builds the web payload into dist/:
//   bolsillo-advance.html  page body for the claude.ai artifact (mpl/*.js published next to it)
//   www/                   full site for the Android app: index.html, mpl/*.js, notices and licences
// The MPL-2.0 Covered Files (src/mpl/) are never concatenated into the page: they ship as separate files.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..'); // bolsillo-advance/
const DIST = path.join(__dirname, 'dist');
const SRC = ['cpu.js', 'bus.js', 'ppu.js', 'apu.js', 'bios.js', 'cart.js', 'gba.js'];
const MPL = ['mpl/gpio-rtc.js', 'mpl/bios-hle.js'];
const VERSION = require(path.join(ROOT, 'version.json'));

// where the exact source of this build can be found (a commit URL when built from a clean checkout)
function sourceInfo() {
  const git = c => execSync('git ' + c, { cwd: ROOT, encoding: 'utf8' }).trim();
  let repo = process.env.BOLSILLO_SOURCE_REPO, commit = process.env.BOLSILLO_SOURCE_COMMIT, dirty = false;
  try {
    repo = repo || git('remote get-url origin').replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
    commit = commit || git('rev-parse HEAD');
    dirty = git('status --porcelain -- .') !== '';
  } catch (e) { /* not a git checkout: use the env vars */ }
  if (!repo || !commit) throw new Error('set BOLSILLO_SOURCE_REPO and BOLSILLO_SOURCE_COMMIT outside a git checkout');
  const base = `${repo}/tree/${commit}/bolsillo-advance`;
  return {
    version: `${VERSION.name} (código ${VERSION.code}), commit ${commit.slice(0, 12)}${dirty ? ' + cambios locales sin commit' : ''}`,
    source: base, covered: `${repo}/blob/${commit}/bolsillo-advance/audit/COVERED-FILES.md`,
  };
}

const info = sourceInfo();
const stamp = t => t.replace('{{VERSION}}', info.version).replace('{{SOURCE_URL}}', info.source).replace('{{COVERED_URL}}', info.covered);
const notices = stamp(fs.readFileSync(path.join(ROOT, 'notices', 'THIRD-PARTY-NOTICES.txt'), 'utf8'));
const licences = [['MPL-2.0.txt', 'A. Mozilla Public License, v. 2.0'], ['BSD-2-Clause-GBA.js.txt', 'B. BSD-2-Clause (GBA.js)']]
  .map(([f, t]) => [f, t, fs.readFileSync(path.join(ROOT, 'notices', 'licenses', f), 'utf8')]);
const noticesHtml = (notices + licences.map(([, t, x]) => `\n\n==== ${t} ====\n\n${x}`).join(''))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const core = SRC.map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
const ui = fs.readFileSync(path.join(__dirname, 'ui', 'ui.js'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'ui', 'template.html'), 'utf8');
const script = ('"use strict";\n' + core + '\n' + ui).replace(/<\/script/gi, '<\\/script');
const mplTags = MPL.map(f => `<script src="${f}"></script>`).join('\n');
const body = tpl.replace('{{NOTICES}}', () => noticesHtml).replace('{{MPL_SCRIPTS}}', () => mplTags).replace('{{SCRIPT}}', () => script);

fs.rmSync(DIST, { recursive: true, force: true });
const put = (rel, data) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
put('bolsillo-advance.html', body);
for (const f of MPL) {
  const src = fs.readFileSync(path.join(__dirname, 'src', f));
  put(f, src); put(path.join('www', f), src);
}
const head = '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
put('www/index.html', head + body + '</body></html>');
put('www/THIRD-PARTY-NOTICES.txt', notices);
for (const [f, , x] of licences) put('www/licenses/' + f, x);
console.log('built', body.length, 'bytes ·', info.version);
