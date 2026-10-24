// Writes the SRAM contents jsmolka's save/sram.gba leaves after it has run: node expected_sav.js <sram.gba> <out.sav>
const fs = require('fs');
const { loadCore } = require('../../app/gba/test/run.js');
const { GBA } = loadCore();
const g = new GBA();
g.loadRom(new Uint8Array(fs.readFileSync(process.argv[2])));
for (let i = 0; i < 300; i++) g.runFrame();
fs.writeFileSync(process.argv[3], g.cart.getSaveData());
console.log(g.cart.saveType, g.cart.getSaveData().length, 'bytes');
