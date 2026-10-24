// Mirrors the bit-banging done by the games' siirtc.c driver (SCK=1, SIO=2, CS=4)
const {loadCore}=require('./run.js');const {GBA}=loadCore();const g=new GBA();
g.loadRom(new Uint8Array(0x200));
const c=g.cart, W=(o,v)=>c.gpioWrite(o,v), R=()=>c.gpioRead(0xC4);
W(0xC8,1);
function start(){ W(0xC4,1); W(0xC4,5); }
function stop(){ W(0xC4,1); W(0xC4,1); }
function writeCmd(v){ for(let i=0;i<8;i++){const t=(v>>(7-i))&1; for(let k=0;k<4;k++) W(0xC4,(t<<1)|4); W(0xC4,(t<<1)|4|1);} }
function writeData(v){ for(let i=0;i<8;i++){const t=(v>>i)&1; for(let k=0;k<4;k++) W(0xC4,(t<<1)|4); W(0xC4,(t<<1)|4|1);} }
function readData(){ let v=0; for(let i=0;i<8;i++){ for(let k=0;k<4;k++) W(0xC4,4); W(0xC4,5); const t=(R()&2)>>1; v=(v>>1)|(t<<7);} return v; }
// set 24h mode (control register write: CMD 0x62 | write)
W(0xC6,7); start(); writeCmd(0x62); writeData(0x40); stop();
// read status
W(0xC6,7); start(); writeCmd(0x63); W(0xC6,5); const st=readData(); stop();
// read date/time
W(0xC6,7); start(); writeCmd(0x65); W(0xC6,5); const dt=[]; for(let i=0;i<7;i++) dt.push(readData()); stop();
const hx=v=>v.toString(16).padStart(2,'0');
console.log('status', hx(st), 'datetime(BCD) 20'+hx(dt[0])+'-'+hx(dt[1])+'-'+hx(dt[2])+' wd'+dt[3]+' '+hx(dt[4])+':'+hx(dt[5])+':'+hx(dt[6]));
console.log('real now', new Date().toISOString());
