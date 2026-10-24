// Top-level system: wires components together and runs frames

const CYCLES_PER_FRAME = 280896;
const FRAME_RATE = 16777216 / CYCLES_PER_FRAME; // ~59.73 Hz

class GBA {
  constructor() {
    this.bus = new Bus(this);
    this.cpu = new CPU(this.bus);
    this.cart = new Cart(this);
    this.ppu = new PPU(this);
    this.apu = new APU(this);
    this.dma = new DMA(this);
    this.timers = new Timers(this);
    this.bios = new BIOS(this);
    this.cpu.swiHandler = n => this.bios.call(n);
    this.loaded = false;
  }

  loadRom(data) {
    this.bus.setRom(data);
    this.cart.load(this.bus.rom.subarray(0, data.length));
    this.loaded = true;
    this.reset();
  }

  reset() {
    this.bus.reset();
    this.ppu.reset();
    this.apu.reset();
    this.dma.reset();
    this.timers.reset();
    this.cart.reset();
    this.cpu.reset();
    const io = this.bus;
    io.io16[0x20 >>> 1] = 0x100; io.io16[0x26 >>> 1] = 0x100;
    io.io16[0x30 >>> 1] = 0x100; io.io16[0x36 >>> 1] = 0x100;
    io.io16[0x88 >>> 1] = 0x200;
    io.io[0x300] = 1;
  }

  runFrame() {
    const bus = this.bus, ppu = this.ppu, timers = this.timers, apu = this.apu, cpu = this.cpu;
    ppu.frameDone = false;
    let guard = 0;
    while (!ppu.frameDone) {
      let target = ppu.next;
      if (timers.next < target) target = timers.next;
      if (apu.next < target) target = apu.next;
      bus.target = target;
      cpu.run();
      const now = bus.cycles;
      if (now >= ppu.next) ppu.event(now);
      if (now >= timers.next) timers.handle(now);
      if (now >= apu.next) apu.sample(now);
      if (++guard > 2000000) break;
    }
  }

  setKeys(mask) { this.bus.setKeys(mask); }

  // light = true leaves out the save chip (used for rewind snapshots, so rewinding never undoes an in-game save)
  getState(light) {
    return {
      version: 1, code: this.cart.code,
      cpu: this.cpu.getState(), bus: this.bus.getState(), ppu: this.ppu.getState(),
      apu: this.apu.getState(), dma: this.dma.getState(), timers: this.timers.getState(),
      cart: this.cart.getState(light),
    };
  }

  setState(s) {
    this.bus.setState(s.bus);
    this.cpu.setState(s.cpu);
    this.ppu.setState(s.ppu);
    this.apu.setState(s.apu);
    this.dma.setState(s.dma);
    this.timers.setState(s.timers);
    this.cart.setState(s.cart);
  }
}
