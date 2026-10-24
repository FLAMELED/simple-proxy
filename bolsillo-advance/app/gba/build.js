const fs = require('fs');
const path = require('path');
const SRC = ['cpu.js', 'bus.js', 'ppu.js', 'apu.js', 'bios.js', 'cart.js', 'gba.js'];
const core = SRC.map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
const ui = fs.readFileSync(path.join(__dirname, 'ui', 'ui.js'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'ui', 'template.html'), 'utf8');
// third-party notices, shown in the menu (Licencias y avisos)
const NOTICES = ['THIRD-PARTY-NOTICES.txt', 'licenses/MPL-2.0.txt', 'licenses/BSD-2-Clause-GBA.js.txt'];
const titles = ['', '\n\n==== A. Mozilla Public License, v. 2.0 ====\n\n', '\n\n==== B. BSD-2-Clause (GBA.js) ====\n\n'];
const notices = NOTICES.map((f, i) => titles[i] + fs.readFileSync(path.join(__dirname, '..', '..', 'notices', f), 'utf8')).join('')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const script = ('"use strict";\n' + core + '\n' + ui).replace(/<\/script/gi, '<\\/script');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const out = tpl.replace('{{NOTICES}}', () => notices).replace('{{SCRIPT}}', () => script);
fs.writeFileSync(path.join(__dirname, 'dist', 'bolsillo-advance.html'), out);
console.log('built', out.length, 'bytes');
