const {loadCore}=require('./run.js');const {GBA}=loadCore();const g=new GBA();
g.loadRom(new Uint8Array(0x200));
const b=g.bus, io=b.io16;
// BG1: 4bpp tiles, all pixels color 1 = red; map at screenblock 31
io[0]=0x1000|0x200|0x40; // mode0, BG1, OBJ, 1D
io[0x0A/2]=(31<<8)|1;     // BG1 prio1 charbase0
for(let i=0;i<32;i++) b.vram[32+i]=0x11; // tile 1
for(let i=0;i<1024;i++) b.vram16[(31*0x800>>1)+i]=1;
b.pal16[1]=0x001F; b.pal16[0]=0;
// OBJ 0: 64x32 semi, tile at 0x10000 color1 white, prio 0
b.pal16[256+1]=0x7FFF;
for(let i=0;i<32*32;i++) b.vram[0x10000+i]=0x11;
b.oam16[0]=(1<<14)|(1<<10)|20; b.oam16[1]=(3<<14)|10; b.oam16[2]=0;
io[0x50/2]=0x3F00; io[0x52/2]=0x0808;
g.ppu.renderLine(30);
const px=g.ppu.frame[30*240+20]; console.log('blended pixel', (px>>>0).toString(16), 'outside', (g.ppu.frame[30*240+200]>>>0).toString(16));
// Ruby overworld: WIN0+WIN1 on but empty, WINOUT outside without color-effect bit
io[0]|=0x6000; io[0x40/2]=0; io[0x42/2]=0; io[0x44/2]=0; io[0x46/2]=0; io[0x48/2]=0x1F1F; io[0x4A/2]=0x1F1F;
g.ppu.renderLine(30);
console.log('with windows, blended pixel', (g.ppu.frame[30*240+20]>>>0).toString(16));
