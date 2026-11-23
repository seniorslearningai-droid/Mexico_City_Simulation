// Tiny synthesized soundscape: muffled city traffic that swells when the
// balcony door is open, running water, and a soft click for interactions.
// No audio files; everything comes from filtered noise.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    const noise = (brown) => {
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start();
      return src;
    };

    // City: brown noise, low-passed, with a slow swell like passing traffic.
    this.cityFilter = ctx.createBiquadFilter();
    this.cityFilter.type = 'lowpass';
    this.cityFilter.frequency.value = 400;
    this.city = ctx.createGain();
    this.city.gain.value = 0;
    noise(true).connect(this.cityFilter).connect(this.city).connect(this.master);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(this.cityFilter.frequency);
    lfo.start();

    // Water: white noise through a band-pass.
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 2200;
    wf.Q.value = 0.6;
    this.water = ctx.createGain();
    this.water.gain.value = 0;
    noise(false).connect(wf).connect(this.water).connect(this.master);
  }

  // open: 0..1 how far the balcony door is open; outside: 0..1 how close to the railing.
  set({ open = 0, outside = 0, water = 0, night = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const city = (0.05 + 0.4 * open + 0.4 * outside) * (1 - 0.45 * night);
    this.city.gain.setTargetAtTime(city, t, 0.4);
    this.cityFilter.Q.value = 0.5;
    this.water.gain.setTargetAtTime(water * 0.18, t, 0.15);
  }

  click() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + 0.13);
  }

  chime() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    [659, 784, 988, 1319].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.65);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    return this.muted;
  }
}
