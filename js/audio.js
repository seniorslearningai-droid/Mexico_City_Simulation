// Tiny synthesized soundscape. No audio files: everything is filtered noise
// and oscillators.
//  - Hotel: muffled city traffic that swells when the balcony door is open,
//    running water, a soft click for interactions.
//  - Arena: a big reverberant hall, crowd roar and "¡Lu-cha! ¡Lu-cha!"
//    chants when the fans are in, the ring bell, rope boings and a beat for
//    the light show.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.scene = 'hotel';
    this.nextBeat = 0;
    this.beatN = 0;
    this.nextChant = 0;
    this.beatOn = false;
    this.chantOn = false;
  }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    const loop = (brown) => {
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
    // A short burst of white noise, reused for claps, hats and chants.
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // ----- hotel -----
    this.cityFilter = ctx.createBiquadFilter();
    this.cityFilter.type = 'lowpass';
    this.cityFilter.frequency.value = 400;
    this.city = ctx.createGain();
    this.city.gain.value = 0;
    loop(true).connect(this.cityFilter).connect(this.city).connect(this.master);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(this.cityFilter.frequency);
    lfo.start();

    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 2200;
    wf.Q.value = 0.6;
    this.water = ctx.createGain();
    this.water.gain.value = 0;
    loop(false).connect(wf).connect(this.water).connect(this.master);

    // ----- arena -----
    // Everything in the arena runs through one bus with a long reverb.
    this.arenaBus = ctx.createGain();
    this.arenaBus.gain.value = 0;
    this.arenaBus.connect(this.master);
    const verb = ctx.createConvolver();
    const irLen = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < irLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.arenaBus.connect(verb).connect(wet).connect(this.master);

    const hf = ctx.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 160;
    const hall = ctx.createGain();
    hall.gain.value = 0.22;
    loop(true).connect(hf).connect(hall).connect(this.arenaBus);

    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 650;
    cf.Q.value = 0.5;
    this.crowd = ctx.createGain();
    this.crowd.gain.value = 0;
    loop(false).connect(cf).connect(this.crowd).connect(this.arenaBus);
    const crowdLfo = ctx.createOscillator();
    const crowdLfoGain = ctx.createGain();
    crowdLfo.frequency.value = 0.21;
    crowdLfoGain.gain.value = 180;
    crowdLfo.connect(crowdLfoGain).connect(cf.frequency);
    crowdLfo.start();

    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.arenaBus);
    this.setScene(this.scene);
  }

  setScene(id) {
    this.scene = id;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const arena = id === 'arena';
    this.arenaBus.gain.setTargetAtTime(arena ? 1 : 0, t, 0.3);
    if (arena) {
      this.city.gain.setTargetAtTime(0, t, 0.2);
      this.water.gain.setTargetAtTime(0, t, 0.2);
    } else {
      this.beatOn = false;
      this.chantOn = false;
    }
  }

  // Hotel: open is 0..1 how far the balcony door is open; outside 0..1 how close to the railing.
  set({ open = 0, outside = 0, water = 0, night = 0 }) {
    if (!this.ctx || this.scene !== 'hotel') return;
    const t = this.ctx.currentTime;
    const city = (0.05 + 0.4 * open + 0.4 * outside) * (1 - 0.45 * night);
    this.city.gain.setTargetAtTime(city, t, 0.4);
    this.water.gain.setTargetAtTime(water * 0.18, t, 0.15);
  }

  // Arena: fans 0..1 how full it is, cheer 0..1 how excited, show 0..1 light show.
  arena({ fans = 0, cheer = 0, show = 0 }) {
    if (!this.ctx || this.scene !== 'arena') return;
    const t = this.ctx.currentTime;
    this.crowd.gain.setTargetAtTime(fans * (0.06 + 0.5 * cheer), t, 0.25);
    this.music.gain.setTargetAtTime(show * 0.55, t, 0.3);
    this.beatOn = show > 0.05;
    this.chantOn = fans > 0.3 && cheer > 0.2;
    this.schedule();
  }

  schedule() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (this.beatOn) {
      if (this.nextBeat < now) this.nextBeat = now + 0.05;
      while (this.nextBeat < now + 0.2) {
        const t = this.nextBeat;
        this.kick(t);
        this.hat(t + 0.25);
        if (this.beatN % 4 === 0) this.stab(t, this.beatN % 8 === 0 ? 0 : 1);
        this.nextBeat += 0.5;
        this.beatN++;
      }
    }
    if (this.chantOn) {
      if (this.nextChant < now) this.nextChant = now + 0.1;
      while (this.nextChant < now + 0.2) {
        const t = this.nextChant;
        // "¡LU-CHA! ¡LU-CHA!" with claps on the strong beats.
        this.syllable(t, 420, 0.24);
        this.syllable(t + 0.28, 950, 0.3);
        this.clap(t + 0.28);
        this.syllable(t + 0.85, 420, 0.24);
        this.syllable(t + 1.13, 950, 0.3);
        this.clap(t + 1.13);
        this.nextChant += 2.1;
      }
    }
  }

  burst(t, { type = 'bandpass', freq = 1000, q = 1, gain = 0.1, decay = 0.1, dur = 0.3 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f).connect(g).connect(this.arenaBus);
    src.start(t, Math.random() * 0.5, dur);
  }

  syllable(t, formant, len) {
    // A crowd "voice": a few noise bands around a vowel formant.
    for (let i = 0; i < 3; i++) {
      this.burst(t + i * 0.012, { freq: formant * (0.92 + i * 0.08), q: 3, gain: 0.09, decay: len, dur: len + 0.05 });
    }
  }

  clap(t) {
    for (let i = 0; i < 6; i++) this.burst(t + Math.random() * 0.03, { type: 'highpass', freq: 1200, q: 0.7, gain: 0.07, decay: 0.07, dur: 0.1 });
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.4);
  }

  hat(t) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(f).connect(g).connect(this.music);
    src.start(t, Math.random() * 0.5, 0.08);
  }

  stab(t, which) {
    const ctx = this.ctx;
    const chords = [[220, 261.6, 329.6], [196, 246.9, 293.7]];
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    f.connect(g).connect(this.music);
    for (const hz of chords[which]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      o.connect(f);
      o.start(t);
      o.stop(t + 1);
    }
  }

  // Three strikes of the ring bell.
  bell() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (let k = 0; k < 3; k++) {
      const t = ctx.currentTime + k * 0.34;
      [[1, 0.22], [2.76, 0.08], [5.4, 0.04]].forEach(([mult, amp]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 830 * mult;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5 / mult + 0.3);
        o.connect(g).connect(this.arenaBus);
        o.start(t);
        o.stop(t + 2);
      });
    }
  }

  // A springy rope "boing" plus a thump on the canvas.
  boing() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.arenaBus);
    o.start(t);
    o.stop(t + 0.55);
    this.burst(t, { type: 'lowpass', freq: 300, q: 0.7, gain: 0.35, decay: 0.2, dur: 0.25 });
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
