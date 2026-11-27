// Tiny synthesized soundscape. No audio files: everything is filtered noise
// and oscillators.
//  - Hotel: muffled city traffic that swells when the balcony door is open,
//    running water, a soft click for interactions.
//  - Arena: a big reverberant hall, crowd roar and "¡Lu-cha! ¡Lu-cha!"
//    chants when the fans are in, the ring bell, rope boings and a beat for
//    the light show.
const NATURE_SCENES = ['aviary', 'pandas', 'coastal', 'axolotls', 'castle', 'forest'];

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

    // ----- aviary -----
    this.aviaryBus = ctx.createGain();
    this.aviaryBus.gain.value = 0;
    this.aviaryBus.connect(this.master);
    const ff = ctx.createBiquadFilter();
    ff.type = 'bandpass';
    ff.frequency.value = 1100;
    ff.Q.value = 0.35;
    this.falls = ctx.createGain();
    this.falls.gain.value = 0;
    loop(false).connect(ff).connect(this.falls).connect(this.aviaryBus);
    const leaves = ctx.createBiquadFilter();
    leaves.type = 'highpass';
    leaves.frequency.value = 2500;
    const leavesGain = ctx.createGain();
    leavesGain.gain.value = 0.015;
    loop(false).connect(leaves).connect(leavesGain).connect(this.aviaryBus);
    const mf = ctx.createBiquadFilter();
    mf.type = 'highpass';
    mf.frequency.value = 4000;
    this.mistHiss = ctx.createGain();
    this.mistHiss.gain.value = 0;
    loop(false).connect(mf).connect(this.mistHiss).connect(this.aviaryBus);
    this.nextChirp = 0;
    this.setScene(this.scene);
  }

  setScene(id) {
    this.scene = id;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const arena = id === 'arena';
    this.arenaBus.gain.setTargetAtTime(arena ? 1 : 0, t, 0.3);
    // The zoo exhibits and castle grounds share the outdoor ambience.
    this.aviaryBus.gain.setTargetAtTime(NATURE_SCENES.includes(id) ? 1 : 0, t, 0.3);
    if (id !== 'hotel') {
      this.city.gain.setTargetAtTime(0, t, 0.2);
      this.water.gain.setTargetAtTime(0, t, 0.2);
    }
    if (!arena) {
      this.beatOn = false;
      this.chantOn = false;
    }
  }

  // Aviary: water 0..1 how close the waterfall is, mist 0..1, calm 0..1 (sitting still: more birdsong).
  aviary({ water = 0, mist = 0, calm = 0 }) {
    if (!this.ctx || !NATURE_SCENES.includes(this.scene)) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.falls.gain.setTargetAtTime(water * 0.4, t, 0.3);
    this.mistHiss.gain.setTargetAtTime(mist * 0.06, t, 0.3);
    if (this.nextChirp < t) this.nextChirp = t + 0.1;
    while (this.nextChirp < t + 0.2) {
      this.song(this.nextChirp);
      this.nextChirp += (0.25 + Math.random() * 1.1) / (1 + calm * 1.5 + mist * 0.5);
    }
  }

  // A little bird song: a few quick whistles from a random direction.
  song(t) {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = ctx.createGain();
    out.gain.value = 0.02 + Math.random() * 0.04;
    if (pan) {
      pan.pan.value = Math.random() * 2 - 1;
      out.connect(pan).connect(this.aviaryBus);
    } else out.connect(this.aviaryBus);
    const base = 2200 + Math.random() * 2800;
    const notes = 2 + Math.floor(Math.random() * 5);
    const kind = Math.random();
    for (let i = 0; i < notes; i++) {
      const st = t + i * (0.07 + Math.random() * 0.06);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f0 = base * (0.85 + Math.random() * 0.3);
      o.frequency.setValueAtTime(f0, st);
      if (kind < 0.5) o.frequency.exponentialRampToValueAtTime(f0 * 1.5, st + 0.06);
      else o.frequency.exponentialRampToValueAtTime(f0 * 0.65, st + 0.08);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(1, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
      o.connect(g).connect(out);
      o.start(st);
      o.stop(st + 0.1);
    }
  }

  // Macaw: a raucous, nasal squawk (or two). vol 0..1 for birds further away.
  squawk(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    for (let k = 0; k < 2; k++) {
      const t = ctx.currentTime + k * 0.32 + Math.random() * 0.1;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.3);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(f).connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + 0.35);
    }
  }

  // Parakeets: a quick burst of high chirps.
  chatter(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const n = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + Math.random() * 1.2;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f0 = 3200 + Math.random() * 2400;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * (Math.random() < 0.5 ? 1.3 : 0.75), t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06 * vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + 0.07);
    }
  }

  // Peacock: the loud two-note "may-AWW!" call.
  peacock(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    for (let k = 0; k < 2; k++) {
      const t = ctx.currentTime + k * 0.7;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(820, t + 0.12);
      o.frequency.setValueAtTime(900, t + 0.16);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.55);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1300;
      f.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.03);
      g.gain.setValueAtTime(0.22 * vol, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(f).connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + 0.62);
    }
  }

  // You whistle to get a bird's attention: a rising two-tone wolf whistle.
  whistleCall() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    [[1400, 2600, 0, 0.22], [1300, 2300, 0.32, 0.4]].forEach(([a, b, dt, len]) => {
      const t = ctx.currentTime + dt;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(a, t);
      o.frequency.exponentialRampToValueAtTime(b, t + len * 0.6);
      if (dt > 0) o.frequency.exponentialRampToValueAtTime(a * 0.8, t + len);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + len + 0.02);
    });
  }

  // A parrot saying "¡ho-la!": a raspy buzz shaped by two vowel filters (o, then a).
  hola() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (let rep = 0; rep < 2; rep++) {
      const t0 = ctx.currentTime + rep * 0.75;
      [[0, 0.2, 520, 900, 560], [0.22, 0.28, 760, 1250, 640]].forEach(([dt, len, f1, f2, pitch]) => {
        const t = t0 + dt;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(pitch, t);
        o.frequency.linearRampToValueAtTime(pitch * (dt > 0 ? 0.82 : 1.08), t + len);
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
        out.gain.setValueAtTime(0.2, t + len - 0.06);
        out.gain.exponentialRampToValueAtTime(0.0001, t + len);
        for (const [fq, q] of [[f1, 6], [f2, 8]]) {
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = fq;
          f.Q.value = q;
          o.connect(f).connect(out);
        }
        out.connect(this.aviaryBus);
        o.start(t);
        o.stop(t + len + 0.02);
      });
    }
  }

  // Emus and rheas: a deep, hollow drumming boom.
  drum(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * 0.32;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(58, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + 0.32);
    }
  }

  // Swans and geese. kind: 'trumpeter' (a horn-like "hoo-hoo"), 'goose' (honk), 'black' (a high bugle).
  honk(kind = 'goose', vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const [f0, f1, formant, len, n] = {
      trumpeter: [330, 290, 900, 0.32, 3],
      goose: [420, 340, 1300, 0.22, 3],
      black: [700, 620, 1800, 0.35, 2],
    }[kind];
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (len + 0.12) + Math.random() * 0.05;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f1, t + len);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = formant;
      f.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.03);
      g.gain.setValueAtTime(0.22 * vol, t + len - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(f).connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + len + 0.02);
    }
  }

  // Ducks: a few nasal quacks.
  quack(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * 0.2 + Math.random() * 0.08;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(260, t);
      o.frequency.exponentialRampToValueAtTime(190, t + 0.14);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(f).connect(g).connect(this.aviaryBus);
      o.start(t);
      o.stop(t + 0.16);
    }
  }

  // A short filtered-noise hit on the zoo bus.
  rustle(t, { type = 'bandpass', freq = 1000, q = 1, gain = 0.1, decay = 0.1, dur = 0.3, rate = 1 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rate * (0.9 + Math.random() * 0.2);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f).connect(g).connect(this.aviaryBus);
    src.start(t, Math.random() * 0.5, dur);
  }

  // Pandas munching bamboo: a couple of woody snaps and crunches.
  crunch(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.rustle(t + i * 0.13 + Math.random() * 0.05, { type: 'highpass', freq: 1800 + Math.random() * 1500, q: 0.8, gain: 0.16 * vol, decay: 0.06 });
    this.rustle(t + 0.02, { freq: 500, q: 2, gain: 0.08 * vol, decay: 0.1 });
  }

  // A panda's goat-like bleat.
  bleat(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(330, t + 0.45);
    const vib = ctx.createOscillator();
    const vg = ctx.createGain();
    vib.frequency.value = 22;
    vg.gain.value = 18;
    vib.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 950;
    f.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(g).connect(this.aviaryBus);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.52);
    vib.stop(t + 0.52);
  }

  // A sleepy panda snoring: a slow rumbly in-breath and a sigh.
  snore(vol = 1) {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    g.gain.setValueAtTime(0.0001, t + 1.7);
    g.gain.exponentialRampToValueAtTime(0.07 * vol, t + 2.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    const am = ctx.createOscillator();
    const amg = ctx.createGain();
    am.frequency.value = 28;
    amg.gain.value = 0.5;
    const trem = ctx.createGain();
    trem.gain.value = 0.6;
    am.connect(amg).connect(trem.gain);
    src.connect(f).connect(trem).connect(g).connect(this.aviaryBus);
    src.start(t);
    am.start(t);
    src.stop(t + 2.9);
    am.stop(t + 2.9);
  }

  // A squeaky plush toy.
  squeak() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (let i = 0; i < 2; i++) {
      const t = ctx.currentTime + i * 0.22;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(1100, t);
      o.frequency.exponentialRampToValueAtTime(1900, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.18);
    }
  }

  // Souvenir coin machine: a coin dropping into the slot.
  coinIn() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [[0, 2650], [0.09, 3400], [0.16, 2900]].forEach(([dt, f]) => {
      for (const k of [1, 2.76]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f * k;
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime((k === 1 ? 0.09 : 0.03), t + dt + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.25);
        o.connect(g).connect(this.master);
        o.start(t + dt);
        o.stop(t + dt + 0.27);
      }
    });
  }

  // The crank's ratchet: a run of quick clicks.
  ratchet() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const st = t + i * 0.095;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200 + Math.random() * 600;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.18, st + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.035);
      src.connect(f).connect(g).connect(this.master);
      src.start(st, Math.random() * 0.5, 0.05);
    }
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(95, t + 0.85);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.92);
  }

  // The rollers squashing the coin flat: a heavy "ka-chunk".
  coinPress() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const [dt, f0] of [[0, 160], [0.14, 110]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, t + dt);
      o.frequency.exponentialRampToValueAtTime(45, t + dt + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.35, t + dt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.25);
      o.connect(g).connect(this.master);
      o.start(t + dt);
      o.stop(t + dt + 0.27);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, 0, 0.15);
  }

  // The finished coin rattling down into the tray.
  coinDrop() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [0, 0.12, 0.2, 0.25, 0.28].forEach((dt, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 3100 + i * 150;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.07 / (1 + i * 0.5), t + dt + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.12);
      o.connect(g).connect(this.master);
      o.start(t + dt);
      o.stop(t + dt + 0.13);
    });
  }

  // Camera shutter.
  shutter() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const dt of [0, 0.07]) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.04);
      src.connect(f).connect(g).connect(this.master);
      src.start(t + dt, 0, 0.05);
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

  // A quick whoosh for dashing.
  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5, 0.4);
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
