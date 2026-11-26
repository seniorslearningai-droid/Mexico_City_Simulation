// Every texture in the game is painted on a <canvas> at load time, so the
// game needs no image files. Geometry UVs are in meters (see room.js), so
// each texture's `repeat` says how many times it tiles per meter.
import * as THREE from 'three';

// Small seeded random so the room looks the same on every visit.
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(w, h, draw, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(g, w, h, r, n, alpha, dark = true) {
  for (let i = 0; i < n; i++) {
    const v = dark ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

// Warm oak planks, 2.4 m square.
export function woodFloor() {
  return make(1024, 1024, (g, w, h) => {
    const r = rng(7);
    const rows = 8;
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 400;
      while (x < w) {
        const len = 320 + r() * 420;
        g.fillStyle = `hsl(${26 + r() * 8}, ${42 + r() * 12}%, ${40 + r() * 10}%)`;
        g.fillRect(x, i * rh, len, rh);
        for (let k = 0; k < 22; k++) {
          g.strokeStyle = `rgba(60,30,12,${0.04 + r() * 0.12})`;
          g.lineWidth = 1 + r() * 2;
          const y0 = i * rh + r() * rh;
          const amp = 1 + r() * 3;
          g.beginPath();
          g.moveTo(x, y0);
          for (let t = 0; t <= len; t += 30) g.lineTo(x + t, y0 + Math.sin((t + k * 50) * 0.015) * amp);
          g.stroke();
        }
        g.fillStyle = 'rgba(25,12,5,0.55)';
        g.fillRect(x, i * rh, 2, rh);
        x += len;
      }
      g.fillStyle = 'rgba(25,12,5,0.5)';
      g.fillRect(0, i * rh, w, 2);
      g.fillRect(0, i * rh, 2, rh);
    }
  }, { repeat: [1 / 2.4, 1 / 2.4] });
}

// Straight-grain wood for furniture, tinted by material color.
export function woodGrain() {
  return make(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#d9c2a3';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 140; k++) {
      g.strokeStyle = `rgba(90,55,30,${0.05 + r() * 0.18})`;
      g.lineWidth = 0.5 + r() * 2.5;
      const y0 = r() * h;
      const amp = 2 + r() * 6;
      const ph = r() * 10;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin(x * 0.012 + ph) * amp;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  }, { repeat: [1, 1] });
}

// Hand-troweled plaster, 1 m.
export function plaster() {
  return make(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#eeeeee';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 20 + r() * 50);
      grd.addColorStop(0, `rgba(255,255,255,${0.15 * r()})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    speckle(g, w, h, r, 2500, 0.08);
  }, { repeat: [1, 1] });
}

// Blue-and-white Puebla talavera tile, 20 cm.
export function talavera() {
  return make(256, 256, (g, w, h) => {
    const blue = '#1f3d8c';
    const yellow = '#e2a72e';
    g.fillStyle = '#f5f0e3';
    g.fillRect(0, 0, w, h);
    const c = w / 2;
    // Corner quarter-rosettes join into circles across four tiles.
    g.fillStyle = blue;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      g.beginPath();
      g.arc(x, y, 46, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f5f0e3';
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      g.beginPath();
      g.arc(x, y, 30, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = yellow;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      g.beginPath();
      g.arc(x, y, 16, 0, Math.PI * 2);
      g.fill();
    }
    // Central flower.
    g.save();
    g.translate(c, c);
    g.fillStyle = blue;
    for (let i = 0; i < 8; i++) {
      g.rotate(Math.PI / 4);
      g.beginPath();
      g.ellipse(0, -44, 14, 34, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = yellow;
    g.beginPath();
    g.arc(0, 0, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = blue;
    g.beginPath();
    g.arc(0, 0, 8, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // Little leaves between.
    g.fillStyle = '#2f7a5c';
    for (const [x, y, a] of [[c, 18, 0], [c, h - 18, 0], [18, c, 1], [w - 18, c, 1]]) {
      g.beginPath();
      g.ellipse(x, y, a ? 6 : 14, a ? 14 : 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#cfc6b3';
    g.lineWidth = 4;
    g.strokeRect(0, 0, w, h);
  }, { repeat: [5, 5] });
}

// Terracotta saltillo floor tiles, 2x2 tiles of 30 cm.
export function saltillo() {
  return make(256, 256, (g, w, h) => {
    const r = rng(21);
    const s = w / 2;
    g.fillStyle = '#c9b49b';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        g.fillStyle = `hsl(${15 + r() * 8}, ${50 + r() * 12}%, ${40 + r() * 9}%)`;
        g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        for (let k = 0; k < 10; k++) {
          const grd = g.createRadialGradient(i * s + r() * s, j * s + r() * s, 0, i * s + r() * s, j * s + r() * s, 10 + r() * 40);
          grd.addColorStop(0, `rgba(${r() > 0.5 ? '255,220,180' : '90,40,20'},${0.15 * r()})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grd;
          g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        }
      }
    }
    speckle(g, w, h, r, 900, 0.15);
  }, { repeat: [1 / 0.6, 1 / 0.6] });
}

// Vintage travel poster for the entry hall.
export function poster() {
  return make(384, 512, (g, w, h) => {
    g.fillStyle = '#f1e4c8';
    g.fillRect(0, 0, w, h);
    const sky = g.createLinearGradient(0, 40, 0, 380);
    sky.addColorStop(0, '#e8507e');
    sky.addColorStop(1, '#f6b04a');
    g.fillStyle = sky;
    g.fillRect(24, 24, w - 48, 360);
    g.fillStyle = '#ffe9b0';
    g.beginPath();
    g.arc(w / 2, 220, 90, 0, Math.PI * 2);
    g.fill();
    // Column and winged figure.
    g.fillStyle = '#2b2350';
    g.fillRect(w / 2 - 10, 150, 20, 234);
    g.fillRect(w / 2 - 34, 330, 68, 54);
    g.fillRect(w / 2 - 18, 140, 36, 14);
    g.fillStyle = '#e2a72e';
    g.beginPath();
    g.moveTo(w / 2, 70);
    g.lineTo(w / 2 + 8, 140);
    g.lineTo(w / 2 - 8, 140);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2, 96);
    g.lineTo(w / 2 + 46, 74);
    g.lineTo(w / 2 + 8, 118);
    g.moveTo(w / 2, 96);
    g.lineTo(w / 2 - 46, 74);
    g.lineTo(w / 2 - 8, 118);
    g.fill();
    // Skyline.
    g.fillStyle = '#3b2a4a';
    const r = rng(12);
    for (let x = 24; x < w - 24; x += 22) {
      const bh = 30 + r() * 70;
      if (Math.abs(x - w / 2) < 40) continue;
      g.fillRect(x, 384 - bh, 20, bh);
    }
    g.fillStyle = '#1f3d8c';
    g.font = 'bold 40px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('CIUDAD DE', w / 2, 430);
    g.fillText('MÉXICO', w / 2, 474);
    g.font = '16px Georgia, serif';
    g.fillStyle = '#b8324b';
    g.fillText('· PASEO DE LA REFORMA ·', w / 2, 500);
  }, { wrap: false });
}

// Woven wool rug with a Zapotec-style stepped diamond.
export function rug() {
  return make(640, 512, (g, w, h) => {
    const cols = ['#b8324b', '#e8822d', '#f2c14e', '#2f7f80', '#f4ead6', '#3b2a4a'];
    g.fillStyle = cols[4];
    g.fillRect(0, 0, w, h);
    // Borders.
    const bands = [[0, 28, cols[5]], [28, 14, cols[0]], [42, 10, cols[2]], [52, 14, cols[3]]];
    for (const [o, s, c] of bands) {
      g.fillStyle = c;
      g.fillRect(o, o, w - 2 * o, s);
      g.fillRect(o, h - o - s, w - 2 * o, s);
      g.fillRect(o, o, s, h - 2 * o);
      g.fillRect(w - o - s, o, s, h - 2 * o);
    }
    // Stepped diamonds.
    const cx = w / 2;
    const cy = h / 2;
    const step = 16;
    const layers = [cols[5], cols[0], cols[1], cols[2], cols[3], cols[0], cols[4]];
    layers.forEach((c, i) => {
      const size = (layers.length - i) * 2.4;
      g.fillStyle = c;
      for (let k = -size; k <= size; k++) {
        const half = (size - Math.abs(k)) * step * 0.9;
        g.fillRect(cx - half, cy + k * step - step / 2, half * 2, step);
      }
    });
    // Zig-zag rows.
    g.fillStyle = cols[3];
    for (const y of [100, h - 116]) {
      for (let x = 80; x < w - 80; x += 32) {
        g.beginPath();
        g.moveTo(x, y + 16);
        g.lineTo(x + 16, y);
        g.lineTo(x + 32, y + 16);
        g.fill();
      }
    }
    // Wool fuzz.
    const r = rng(5);
    speckle(g, w, h, r, 6000, 0.12);
    speckle(g, w, h, r, 3000, 0.1, false);
  }, { wrap: false });
}

// Striped sarape blanket for the foot of the bed.
export function sarape() {
  return make(32, 512, (g, w, h) => {
    const stripes = ['#b8324b', '#e8822d', '#f2c14e', '#2f7f80', '#1d2a5a', '#f4ead6', '#d9447a', '#3f9d58'];
    let y = 0;
    let i = 0;
    const r = rng(9);
    while (y < h) {
      const s = 6 + r() * 26;
      g.fillStyle = stripes[i++ % stripes.length];
      g.fillRect(0, y, w, s);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(0, y + s - 2, w, 1);
      y += s;
    }
  }, { wrap: false });
}

// Tufted headboard fabric.
export function fabric() {
  return make(128, 128, (g, w, h) => {
    g.fillStyle = '#bbbbbb';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = y % 4 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      g.fillStyle = x % 4 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      g.fillRect(x, 0, 1, h);
    }
  }, { repeat: [6, 6] });
}

// White marble with soft grey veins, 1 m.
export function marble() {
  return make(512, 512, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = '#f3f1ed';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(120,120,130,${0.08 + r() * 0.25})`;
      g.lineWidth = 0.5 + r() * 2;
      let x = r() * w;
      let y = 0;
      g.beginPath();
      g.moveTo(x, y);
      while (y < h) {
        x += (r() - 0.5) * 40;
        y += 10 + r() * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }, { repeat: [1, 1] });
}

// A landscape painting: sunset over the two volcanoes, agaves in front.
export function painting() {
  return make(512, 320, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#2b3a78');
    sky.addColorStop(0.45, '#d9578a');
    sky.addColorStop(1, '#f6b25a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe39a';
    g.beginPath();
    g.arc(w * 0.68, h * 0.5, 34, 0, Math.PI * 2);
    g.fill();
    // Volcanoes.
    g.fillStyle = '#5b3f73';
    g.beginPath();
    g.moveTo(0, h * 0.72);
    g.quadraticCurveTo(w * 0.18, h * 0.38, w * 0.32, h * 0.42);
    g.quadraticCurveTo(w * 0.42, h * 0.46, w * 0.5, h * 0.72);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.42, h * 0.72);
    g.lineTo(w * 0.62, h * 0.28);
    g.lineTo(w * 0.66, h * 0.28);
    g.lineTo(w * 0.9, h * 0.72);
    g.fill();
    g.fillStyle = '#f4eef7';
    g.beginPath();
    g.moveTo(w * 0.585, h * 0.36);
    g.lineTo(w * 0.62, h * 0.28);
    g.lineTo(w * 0.66, h * 0.28);
    g.lineTo(w * 0.7, h * 0.37);
    g.lineTo(w * 0.66, h * 0.34);
    g.lineTo(w * 0.63, h * 0.37);
    g.fill();
    // Ground.
    g.fillStyle = '#c7663a';
    g.fillRect(0, h * 0.7, w, h * 0.3);
    // Agaves.
    const agave = (x, y, s) => {
      g.fillStyle = '#2f7f6a';
      for (let i = -4; i <= 4; i++) {
        g.save();
        g.translate(x, y);
        g.rotate(i * 0.32);
        g.beginPath();
        g.moveTo(-5 * s, 0);
        g.lineTo(0, -48 * s);
        g.lineTo(5 * s, 0);
        g.fill();
        g.restore();
      }
    };
    agave(70, h - 20, 1.1);
    agave(170, h - 34, 0.8);
    agave(430, h - 18, 1.2);
    // Brush texture.
    const r = rng(2);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${0.05 * r()})`;
      g.fillRect(r() * w, r() * h, 6 + r() * 10, 1);
    }
  }, { wrap: false });
}

// City facade: an 8 x 8 grid of windows (3 m wide, 3.5 m tall each).
// `map` is the daytime look; `emissive` has random lit windows for night.
export function buildingWindows({ seed = 31, bayW = 3, floorH = 3.5, warm = false } = {}) {
  const r = rng(seed);
  const n = 8;
  const size = 512;
  const cell = size / n;
  const lit = [];
  for (let i = 0; i < n * n; i++) lit.push(r() < 0.42 ? `hsl(${36 + r() * 14}, ${70 + r() * 25}%, ${55 + r() * 25}%)` : null);
  const repeat = [1 / (n * bayW), 1 / (n * floorH)];
  const map = make(size, size, (g) => {
    g.fillStyle = '#ece6dc';
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * cell;
        const y = j * cell;
        const grd = g.createLinearGradient(x, y, x + cell, y + cell);
        grd.addColorStop(0, warm ? '#4a5866' : '#3e5163');
        grd.addColorStop(1, warm ? '#232a33' : '#1b2430');
        g.fillStyle = grd;
        g.fillRect(x + cell * 0.18, y + cell * 0.2, cell * 0.64, cell * 0.6);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x + cell * 0.14, y + cell * 0.8, cell * 0.72, cell * 0.05);
      }
    }
    // Stain/grime for realism.
    const rr = rng(seed + 1);
    for (let k = 0; k < 2000; k++) {
      g.fillStyle = `rgba(0,0,0,${0.06 * rr()})`;
      g.fillRect(rr() * size, rr() * size, 2, 2 + rr() * 6);
    }
  }, { repeat });
  const emissive = make(size, size, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const c = lit[i * n + j];
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(i * cell + cell * 0.18, j * cell + cell * 0.2, cell * 0.64, cell * 0.6);
      }
    }
  }, { repeat });
  return { map, emissive, roofUV: [0.01, 0.01] };
}

// Paseo de la Reforma cross-section: 47 m wide, 10 m long tile.
// v=0 is the hotel side (z=-5), v=1 is the far sidewalk (z=-52).
export function avenue() {
  const W = 64;
  const H = 1024;
  const pm = H / 47; // pixels per meter
  return make(W, H, (g) => {
    const r = rng(41);
    const band = (z0, z1, color) => {
      g.fillStyle = color;
      g.fillRect(0, H - z1 * pm, W, (z1 - z0) * pm);
    };
    // Distances from the hotel facade (0) outward to 47.
    band(0, 9, '#b9b1a4'); // hotel-side sidewalk
    band(9, 9.4, '#8d867b');
    band(9.4, 20.5, '#3b3b3e'); // eastbound lanes
    band(20.5, 20.9, '#8d867b');
    band(20.9, 30.9, '#5f7d3d'); // tree median
    band(24.9, 26.9, '#c9bfae'); // median path
    band(30.9, 31.3, '#8d867b');
    band(31.3, 42.4, '#3b3b3e'); // westbound lanes
    band(42.4, 42.8, '#8d867b');
    band(42.8, 47, '#b9b1a4');
    // Lane dashes.
    g.fillStyle = '#e8e4da';
    for (const z of [13.1, 16.8, 35, 38.7]) g.fillRect(0, H - z * pm - 1, W * 0.5, 3);
    // Asphalt grain.
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.05)`;
      g.fillRect(r() * W, r() * H, 1, 1);
    }
  }, { repeat: [1, 1] });
}

// ---------------- Arena México ----------------

// Ring canvas: blue mat with a white border and the arena's name.
export function ringCanvas() {
  return make(1024, 1024, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.7);
    grd.addColorStop(0, '#2c6fd6');
    grd.addColorStop(1, '#1a4aa6');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f1ea';
    g.lineWidth = 18;
    g.strokeRect(40, 40, w - 80, h - 80);
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, 250, 0, Math.PI * 2);
    g.stroke();
    // Gold star in the middle.
    g.fillStyle = '#f2c14e';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 70 : 170;
      g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    g.fill();
    g.fillStyle = '#f4f1ea';
    g.textAlign = 'center';
    g.font = 'bold 78px Georgia, serif';
    g.fillText('ARENA MÉXICO', w / 2, 175);
    g.save();
    g.translate(w / 2, h - 135);
    g.rotate(Math.PI);
    g.fillText('ARENA MÉXICO', 0, -40);
    g.restore();
    // Scuffs.
    const r = rng(44);
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(255,255,255,${0.04 * r()})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 8, 1 + r() * 3);
    }
  });
}

// Apron skirt: black with the arena name and a tricolor stripe.
export function ringSkirt() {
  return make(1024, 192, (g, w, h) => {
    g.fillStyle = '#121216';
    g.fillRect(0, 0, w, h);
    const stripe = h / 9;
    [['#1f8a4c', 0], ['#f4f1ea', 1], ['#c8282e', 2]].forEach(([c, i]) => {
      g.fillStyle = c;
      g.fillRect(0, i * stripe, w, stripe);
    });
    g.fillStyle = '#f2c14e';
    g.font = 'bold 64px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('ARENA MÉXICO', w / 2, h * 0.72);
    g.fillStyle = '#f4f1ea';
    g.font = 'bold 28px sans-serif';
    g.fillText('★  LUCHA LIBRE  ★', w / 2, h * 0.93);
  }, { repeat: [1, 1] });
}

// A luchador mask, used for the banners and merch signs.
// design: [base, trim, eyes, accent]
export const MASKS = [
  ['#c8282e', '#f2c14e', '#ffffff', '#f2c14e'],
  ['#1f4fa8', '#d9dde6', '#ffffff', '#f4f1ea'],
  ['#18181c', '#f2c14e', '#e8507e', '#f2c14e'],
  ['#1f8a4c', '#f4f1ea', '#ffffff', '#c8282e'],
  ['#e2a72e', '#18181c', '#ffffff', '#18181c'],
  ['#6b3fa0', '#d9dde6', '#ffffff', '#3fc1c9'],
];
export function drawMask(g, cx, cy, s, [base, trim, eyes, accent]) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  // Head.
  g.fillStyle = base;
  g.beginPath();
  g.moveTo(0, -120);
  g.bezierCurveTo(95, -120, 105, -20, 92, 40);
  g.bezierCurveTo(80, 110, 35, 130, 0, 132);
  g.bezierCurveTo(-35, 130, -80, 110, -92, 40);
  g.bezierCurveTo(-105, -20, -95, -120, 0, -120);
  g.fill();
  // Forehead flame.
  g.fillStyle = accent;
  g.beginPath();
  g.moveTo(0, -112);
  g.bezierCurveTo(18, -80, 30, -55, 0, -28);
  g.bezierCurveTo(-30, -55, -18, -80, 0, -112);
  g.fill();
  // Eye holes with trim.
  for (const sx of [-1, 1]) {
    g.save();
    g.scale(sx, 1);
    g.fillStyle = trim;
    g.beginPath();
    g.moveTo(10, -10);
    g.bezierCurveTo(40, -40, 92, -30, 86, 8);
    g.bezierCurveTo(70, 30, 30, 26, 10, -10);
    g.fill();
    g.fillStyle = eyes;
    g.beginPath();
    g.moveTo(22, -6);
    g.bezierCurveTo(44, -26, 78, -20, 74, 4);
    g.bezierCurveTo(60, 18, 36, 16, 22, -6);
    g.fill();
    // Side wing.
    g.fillStyle = trim;
    g.beginPath();
    g.moveTo(88, -40);
    g.lineTo(60, -70);
    g.lineTo(70, -44);
    g.fill();
    g.restore();
  }
  // Mouth.
  g.fillStyle = trim;
  g.beginPath();
  g.ellipse(0, 78, 30, 20, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a1014';
  g.beginPath();
  g.ellipse(0, 78, 22, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Tall hanging banner with a mask on it.
export function banner(design, seed = 1) {
  return make(256, 640, (g, w, h) => {
    const [base, trim] = MASKS[design % MASKS.length];
    g.fillStyle = '#141218';
    g.fillRect(0, 0, w, h);
    g.fillStyle = trim;
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
    const grd = g.createRadialGradient(w / 2, 250, 10, w / 2, 250, 220);
    grd.addColorStop(0, base);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.45;
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
    drawMask(g, w / 2, 250, 0.95, MASKS[design % MASKS.length]);
    g.fillStyle = trim;
    g.font = 'bold 44px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('LUCHA', w / 2, 480);
    g.fillText('LIBRE', w / 2, 530);
    const r = rng(seed);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = trim;
      g.globalAlpha = 0.5 * r();
      g.beginPath();
      g.arc(r() * w, 560 + r() * 60, 2 + r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, { wrap: false });
}

// A simple painted shop sign.
export function sign(text, { bg = '#c8282e', fg = '#fff6e6', w = 512, h = 128, font = 'bold 64px Georgia, serif' } = {}) {
  return make(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  }, { wrap: false });
}

// LED strip: bright dashes running along v, scrolled for a chase effect.
export function ledStrip() {
  return make(8, 128, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = '#fff';
      g.fillRect(0, y + 2, w, 10);
    }
  }, { repeat: [1, 1], srgb: false });
}

// A single mask on a transparent background, for the merch pegboard.
export function maskFace(design) {
  return make(256, 320, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    drawMask(g, w / 2, h / 2 + 6, 1.05, MASKS[design % MASKS.length]);
  }, { wrap: false });
}

// ---------------- Chapultepec Zoo aviary ----------------

// Lawn: mottled greens with blades, 4 m.
export function grass() {
  return make(512, 512, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = '#5d8a3a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 30 + r() * 80);
      grd.addColorStop(0, r() > 0.5 ? 'rgba(130,170,70,0.35)' : 'rgba(40,80,30,0.35)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 9000; i++) {
      g.strokeStyle = `hsla(${85 + r() * 30}, ${40 + r() * 30}%, ${25 + r() * 30}%, 0.5)`;
      g.lineWidth = 1;
      const x = r() * w;
      const y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5);
      g.stroke();
    }
  }, { repeat: [1 / 4, 1 / 4] });
}

// Decomposed-granite path, 2 m.
export function gravel() {
  return make(256, 256, (g, w, h) => {
    const r = rng(63);
    g.fillStyle = '#c9b48f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const l = 45 + r() * 35;
      g.fillStyle = `hsla(${30 + r() * 15}, ${20 + r() * 25}%, ${l}%, 0.8)`;
      const s = 1 + r() * 2.5;
      g.fillRect(r() * w, r() * h, s, s);
    }
  }, { repeat: [1 / 2, 1 / 2] });
}

// Forest floor: dark soil, fallen leaves, twigs and moss, 4 m.
export function forestFloor() {
  return make(512, 512, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = '#3a3122';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 30 + r() * 70);
      grd.addColorStop(0, r() > 0.5 ? 'rgba(70,95,40,0.45)' : 'rgba(25,20,12,0.4)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    const leaf = ['#7a4a22', '#9a6a2a', '#5a3a1a', '#6a7a2a', '#b07a32', '#4a5a22'];
    for (let i = 0; i < 900; i++) {
      g.save();
      g.translate(r() * w, r() * h);
      g.rotate(r() * 6.28);
      g.fillStyle = leaf[Math.floor(r() * leaf.length)];
      g.globalAlpha = 0.55 + r() * 0.4;
      g.beginPath();
      g.ellipse(0, 0, 3 + r() * 5, 1.5 + r() * 2.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(40,28,16,0.7)';
    for (let i = 0; i < 70; i++) {
      g.lineWidth = 1 + r() * 1.5;
      const x = r() * w;
      const y = r() * h;
      const a = r() * 6.28;
      const l = 8 + r() * 22;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }, { repeat: [1 / 4, 1 / 4] });
}

// Square wire mesh for the aviary cages (transparent between the wires).
export function cageMesh() {
  return make(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,42,40,0.95)';
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, 0, 3, h);
  }, { repeat: [1, 1] });
}

// Yellow caution tape: "AUTHORIZED ACCESS ONLY".
export function cautionTape() {
  return make(1024, 64, (g, w, h) => {
    g.fillStyle = '#f6d21a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#141414';
    g.fillRect(0, 0, w, 5);
    g.fillRect(0, h - 5, w, 5);
    g.font = 'bold 34px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const x of [w * 0.25, w * 0.75]) g.fillText('AUTHORIZED ACCESS ONLY', x, h / 2 + 2);
    for (const x of [6, w / 2 - 14, w - 34]) {
      g.beginPath();
      g.moveTo(x, h - 12);
      g.lineTo(x + 14, 12);
      g.lineTo(x + 28, h - 12);
      g.closePath();
      g.fill();
      g.fillStyle = '#f6d21a';
      g.font = 'bold 22px Arial, sans-serif';
      g.fillText('!', x + 14, h / 2 + 6);
      g.fillStyle = '#141414';
      g.font = 'bold 34px Arial, sans-serif';
    }
  }, { repeat: [1, 1] });
}

// A peacock's open tail fan: the top half of the texture, centered at the bottom middle.
export function peacockFan(white = false) {
  return make(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2 - 4;
    const grd = g.createRadialGradient(cx, cy, 20, cx, cy, R);
    grd.addColorStop(0, white ? '#e6e2d6' : '#2f5a2a');
    grd.addColorStop(0.5, white ? '#f2efe6' : '#4a7a2e');
    grd.addColorStop(1, white ? '#faf8f2' : '#6a8a2a');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R, Math.PI, Math.PI * 2);
    g.closePath();
    g.fill();
    // Feather shafts.
    g.strokeStyle = white ? 'rgba(170,160,140,0.45)' : 'rgba(200,180,90,0.5)';
    g.lineWidth = 1.5;
    for (let i = 0; i <= 60; i++) {
      const a = Math.PI + (i / 60) * Math.PI;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
    // Rows of "eyes".
    const eye = (x, y, s, a) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      const rings = white
        ? [[13, 17, '#ddd6c6'], [10, 13, '#f6f4ee'], [7.5, 10, '#e2dccd'], [5, 6.5, '#f8f6f0'], [2.4, 3.2, '#d6cfbe']]
        : [[13, 17, '#c8a24a'], [10, 13, '#2e8a5a'], [7.5, 10, '#1fa0a8'], [5, 6.5, '#1f3d8c'], [2.4, 3.2, '#0d1a3a']];
      for (const [rx, ry, c] of rings) {
        g.fillStyle = c;
        g.beginPath();
        g.ellipse(0, 0, rx * s, ry * s, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    };
    for (const [rr, n, s] of [[105, 9, 0.75], [155, 13, 0.9], [200, 17, 1.05], [238, 21, 1.1]]) {
      for (let i = 0; i < n; i++) {
        const a = Math.PI + ((i + 0.5) / n) * Math.PI;
        eye(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s, a + Math.PI / 2);
      }
    }
  }, { wrap: false });
}

// Gentle ripples for the ponds, as a normal map (3 m tile).
export function waterNormals() {
  const size = 256;
  const hgt = new Float32Array(size * size);
  const r = rng(71);
  const waves = Array.from({ length: 9 }, () => [2 + Math.floor(r() * 6), 2 + Math.floor(r() * 6), r() * 6.28]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const [fx, fy, ph] of waves) v += Math.sin(((x * fx + y * fy) / size) * Math.PI * 2 + ph);
      hgt[y * size + x] = v;
    }
  }
  return make(size, size, (g) => {
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const hx = hgt[y * size + ((x + 1) % size)] - hgt[y * size + ((x - 1 + size) % size)];
        const hy = hgt[((y + 1) % size) * size + x] - hgt[((y - 1 + size) % size) * size + x];
        const nx = -hx * 0.35;
        const ny = -hy * 0.35;
        const l = Math.hypot(nx, ny, 1);
        const i = (y * size + x) * 4;
        img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, { repeat: [1 / 3, 1 / 3], srgb: false });
}

// A friendly cartoon bird for the info signs.
export function drawBird(g, x, y, s, c) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  // Tail.
  g.fillStyle = c.tail || c.body;
  g.beginPath();
  g.moveTo(-40, 10);
  g.lineTo(-40 - (c.tailLen || 60), 40);
  g.lineTo(-30, 30);
  g.fill();
  // Body.
  g.fillStyle = c.body;
  g.beginPath();
  g.ellipse(0, 10, 48, 32, -0.2, 0, Math.PI * 2);
  g.fill();
  if (c.belly) {
    g.fillStyle = c.belly;
    g.beginPath();
    g.ellipse(14, 22, 26, 16, -0.3, 0, Math.PI * 2);
    g.fill();
  }
  // Wing.
  g.fillStyle = c.wing || c.body;
  g.beginPath();
  g.ellipse(-8, 8, 30, 16, -0.35, 0, Math.PI * 2);
  g.fill();
  if (c.wingTip) {
    g.fillStyle = c.wingTip;
    g.beginPath();
    g.ellipse(-26, 14, 16, 9, -0.35, 0, Math.PI * 2);
    g.fill();
  }
  // Head.
  g.fillStyle = c.head || c.body;
  g.beginPath();
  g.arc(40, -18, 22, 0, Math.PI * 2);
  g.fill();
  if (c.face) {
    g.fillStyle = c.face;
    g.beginPath();
    g.arc(44, -16, 12, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#111';
  g.beginPath();
  g.arc(46, -22, 4, 0, Math.PI * 2);
  g.fill();
  // Beak.
  g.fillStyle = c.beak;
  g.beginPath();
  const bl = c.beakLen || 22;
  g.moveTo(58, -24);
  g.quadraticCurveTo(62 + bl, -22, 58 + bl, -4);
  g.lineTo(56, -10);
  g.fill();
  g.restore();
}

export function birdSign(title, sub, colors) {
  return make(512, 384, (g, w, h) => {
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f5d3a';
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#f4ecd8';
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(title, w / 2, 48);
    const sky = g.createLinearGradient(0, 90, 0, 300);
    sky.addColorStop(0, '#bfe3f2');
    sky.addColorStop(1, '#e8f4d8');
    g.fillStyle = sky;
    g.fillRect(30, 88, w - 60, 220);
    g.fillStyle = '#6b4a2a';
    g.fillRect(60, 250, w - 120, 10);
    drawBird(g, w / 2 - 10, 200, 1.5, colors);
    g.fillStyle = '#2f5d3a';
    g.font = 'italic 26px Georgia, serif';
    g.fillText(sub, w / 2, 348);
    g.strokeStyle = '#2f5d3a';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  }, { wrap: false });
}

// ---------- panda exhibit ----------

// Bamboo culm: green with a pale ring and a dark line at each node (4 nodes per tile, along v).
export function bamboo() {
  return make(64, 512, (g, w, h) => {
    const r = rng(81);
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#3f6a2a');
    grd.addColorStop(0.45, '#8ab452');
    grd.addColorStop(1, '#3f6a2a');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(30,60,20,${0.15 * r()})`;
      g.fillRect(r() * w, r() * h, 1, 6 + r() * 20);
    }
    for (let k = 0; k < 4; k++) {
      const y = (k + 0.5) * (h / 4);
      g.fillStyle = 'rgba(220,230,160,0.55)';
      g.fillRect(0, y - 7, w, 7);
      g.fillStyle = 'rgba(40,60,25,0.9)';
      g.fillRect(0, y, w, 3);
    }
  }, { repeat: [1, 3] });
}

// Glazed green roof tiles: rounded tile columns in rows, 1 m tile.
export function roofTiles() {
  return make(256, 256, (g, w, h) => {
    g.fillStyle = '#1f4d36';
    g.fillRect(0, 0, w, h);
    const cols = 6;
    const cw = w / cols;
    for (let i = 0; i < cols; i++) {
      const grd = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      grd.addColorStop(0, '#173d2b');
      grd.addColorStop(0.5, '#4f9a6a');
      grd.addColorStop(1, '#173d2b');
      g.fillStyle = grd;
      g.fillRect(i * cw + 2, 0, cw - 4, h);
    }
    for (let y = 0; y < h; y += h / 4) {
      g.fillStyle = 'rgba(10,30,20,0.6)';
      g.fillRect(0, y, w, 4);
      g.fillStyle = 'rgba(200,255,220,0.18)';
      g.fillRect(0, y + 4, w, 3);
    }
  }, { repeat: [1, 1] });
}

// Stone paving slabs in courses, 2 m tile.
export function paving() {
  return make(512, 512, (g, w, h) => {
    const r = rng(83);
    g.fillStyle = '#8a857c';
    g.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 60;
      while (x < w) {
        const sw = 70 + r() * 90;
        const l = 62 + r() * 12;
        g.fillStyle = `hsl(${35 + r() * 10}, ${8 + r() * 8}%, ${l}%)`;
        g.fillRect(x + 2, j * rh + 2, sw - 4, rh - 4);
        x += sw;
      }
    }
    speckle(g, w, h, r, 6000, 0.12);
  }, { repeat: [1 / 2, 1 / 2] });
}

// A two-line board, e.g. Chinese characters over a Spanish name.
export function boardSign(top, bottom, { bg = '#1f5a3a', fg = '#f2c14e', w = 1024, h = 256 } = {}) {
  return make(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 10;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 104px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
    g.fillText(top, w / 2, h * 0.36, w - 72);
    g.font = 'bold 60px Georgia, serif';
    g.fillText(bottom, w / 2, h * 0.76, w - 72);
  }, { wrap: false });
}

// A cartoon giant panda sitting up and munching bamboo.
export function drawPanda(g, x, y, s) {
  const W = '#fafaf6';
  const B = '#1c1b1f';
  const blob = (cx, cy, rx, ry, col, rot = 0) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.lineWidth = 3;
  g.strokeStyle = '#6a6a6a';
  // Bamboo stalk behind the paws.
  g.save();
  g.rotate(-0.5);
  g.fillStyle = '#6f9e3a';
  g.fillRect(-6, -110, 12, 190);
  g.fillStyle = '#3f6a2a';
  for (let k = -90; k < 80; k += 45) g.fillRect(-7, k, 14, 3);
  g.fillStyle = '#5f9a3a';
  for (const [lx, ly, a] of [[8, -100, 0.6], [-8, -90, -0.7], [10, -70, 0.9]]) blob(lx + Math.sin(a) * 18, ly, 26, 7, '#5f9a3a', a);
  g.restore();
  // Legs and body.
  blob(-38, 62, 26, 20, B);
  blob(38, 62, 26, 20, B);
  blob(0, 26, 58, 52, W);
  g.beginPath();
  g.ellipse(0, 26, 58, 52, 0, 0, Math.PI * 2);
  g.stroke();
  // Shoulder band and arms holding the bamboo.
  blob(0, -6, 52, 18, B);
  blob(-26, 8, 16, 30, B, 0.6);
  blob(26, 4, 16, 30, B, -0.8);
  // Head.
  blob(-36, -74, 16, 16, B);
  blob(36, -74, 16, 16, B);
  blob(0, -46, 46, 40, W);
  g.beginPath();
  g.ellipse(0, -46, 46, 40, 0, 0, Math.PI * 2);
  g.stroke();
  blob(-18, -50, 11, 15, B, 0.5);
  blob(18, -50, 11, 15, B, -0.5);
  blob(-17, -52, 3.5, 3.5, '#ffffff');
  blob(17, -52, 3.5, 3.5, '#ffffff');
  blob(0, -32, 8, 5.5, B);
  g.restore();
}

export function pandaSign(title, sub) {
  return make(512, 384, (g, w, h) => {
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f5a3a';
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#f2c14e';
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(title, w / 2, 48);
    const sky = g.createLinearGradient(0, 90, 0, 300);
    sky.addColorStop(0, '#cfe8d8');
    sky.addColorStop(1, '#e8f0d0');
    g.fillStyle = sky;
    g.fillRect(30, 88, w - 60, 220);
    g.fillStyle = '#7aa84a';
    g.fillRect(30, 280, w - 60, 28);
    drawPanda(g, w / 2, 205, 0.95);
    g.fillStyle = '#1f5a3a';
    g.font = 'italic 26px Georgia, serif';
    g.fillText(sub, w / 2, 348);
    g.strokeStyle = '#b8262a';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  }, { wrap: false });
}

// A soft round shadow to sit under animals.
export function blobShadow() {
  return make(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, { wrap: false });
}

// A single letter on a transparent background (for sleepy "z"s).
export function letter(ch, color = '#ffffff') {
  return make(128, 128, (g, w, h) => {
    g.font = 'bold 96px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(40,50,80,0.8)';
    g.strokeText(ch, w / 2, h / 2);
    g.fillStyle = color;
    g.fillText(ch, w / 2, h / 2);
  }, { wrap: false });
}

// Falling water: bright streaks that scroll down.
export function waterfall() {
  return make(128, 256, (g, w, h) => {
    const r = rng(87);
    g.fillStyle = 'rgba(200,230,240,0.55)';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 20 + r() * 60);
    }
  }, { repeat: [1, 1] });
}

// ---------- souvenir coin machine ----------

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// An elongated pressed coin: copper oval, the animal stamped in the middle.
export function zooCoin(animal, name) {
  return make(512, 320, (g, w, h) => {
    const r = rng(name.length * 31 + name.charCodeAt(0));
    g.clearRect(0, 0, w, h);
    const oval = (rx, ry) => {
      g.beginPath();
      g.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2);
    };
    // Rim and face.
    oval(w / 2 - 4, h / 2 - 4);
    g.fillStyle = '#8a4a24';
    g.fill();
    const face = g.createRadialGradient(w * 0.42, h * 0.38, 10, w / 2, h / 2, w / 2);
    face.addColorStop(0, '#f2c29a');
    face.addColorStop(0.55, '#d08a5a');
    face.addColorStop(1, '#a45e34');
    oval(w / 2 - 16, h / 2 - 14);
    g.fillStyle = face;
    g.fill();
    g.save();
    oval(w / 2 - 16, h / 2 - 14);
    g.clip();
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,230,200' : '90,40,15'},${0.08 * r()})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    // Stretch marks from the rollers.
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(255,235,210,${0.05 + 0.05 * r()})`;
      g.lineWidth = 1 + r() * 2;
      const y = r() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (r() - 0.5) * 10);
      g.stroke();
    }
    g.restore();
    // Inner ring.
    oval(w / 2 - 30, h / 2 - 27);
    g.strokeStyle = 'rgba(110,55,25,0.55)';
    g.lineWidth = 3;
    g.stroke();
    // Stamped lettering: dark groove with a light edge.
    const stamp = (text, y, size) => {
      g.font = `bold ${size}px Georgia, serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,225,190,0.7)';
      g.fillText(text, w / 2 + 1.5, y + 1.5);
      g.fillStyle = '#6e3416';
      g.fillText(text, w / 2, y);
    };
    stamp('ZOOLÓGICO DE CHAPULTEPEC', 56, 24);
    stamp(name.toUpperCase(), h - 58, 30);
    // The animal, toned copper and squashed long like a real pressed coin.
    g.save();
    g.translate(w / 2, h / 2 + 2);
    g.scale(1.3, 0.95);
    g.font = `150px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (typeof animal === 'function') {
      g.save();
      g.translate(3, 4);
      animal(g, '#edbc8b');
      g.restore();
      animal(g, '#763c23');
    } else {
      g.filter = 'grayscale(1) brightness(0.35) sepia(1)';
      g.globalAlpha = 0.6;
      g.fillText(animal, 3, 4);
      g.globalAlpha = 1;
      g.filter = 'grayscale(1) sepia(1) saturate(1.7) hue-rotate(-12deg) brightness(0.95) contrast(1.25)';
      g.fillText(animal, 0, 0);
    }
    g.restore();
    g.filter = 'none';
    // A shine across the top.
    g.save();
    oval(w / 2 - 16, h / 2 - 14);
    g.clip();
    const shine = g.createLinearGradient(0, 0, w, h);
    shine.addColorStop(0, 'rgba(255,255,255,0.28)');
    shine.addColorStop(0.35, 'rgba(255,255,255,0)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fillRect(0, 0, w, h);
    g.restore();
  }, { wrap: false });
}

// A small LED display: call set(line1, line2) to change what it says.
export function ledPanel() {
  const t = make(512, 160, () => {}, { wrap: false });
  const c = t.image;
  const g = c.getContext('2d');
  let last = '';
  t.set = (a, b = '') => {
    if (a + '|' + b === last) return;
    last = a + '|' + b;
    g.fillStyle = '#10140e';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(80,255,120,0.06)';
    for (let y = 0; y < c.height; y += 4) g.fillRect(0, y, c.width, 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#5cff7a';
    g.shadowBlur = 12;
    g.fillStyle = '#8dffa0';
    g.font = 'bold 50px "Courier New", monospace';
    g.fillText(a, c.width / 2, b ? 52 : 80);
    if (b) {
      g.font = 'bold 34px "Courier New", monospace';
      g.fillText(b, c.width / 2, 116);
    }
    g.shadowBlur = 0;
    t.needsUpdate = true;
  };
  return t;
}

// The machine's step-by-step instructions.
export function coinSteps(chooseDesign = true) {
  return make(512, 384, (g, w, h) => {
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b02428';
    g.fillRect(0, 0, w, 64);
    g.fillStyle = '#f2c14e';
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('¿CÓMO FUNCIONA?', w / 2, 44);
    const steps = [
      ...(chooseDesign ? [['Elige un animal', 'Choose an animal']] : []),
      ['Inserta 2 monedas', 'Insert 2 coins'],
      ['Gira la manivela 3 veces', 'Turn the crank 3 times'],
      ...(!chooseDesign ? [['Recoge tu moneda', 'Take your coin']] : []),
    ];
    steps.forEach(([es, en], i) => {
      const y = 112 + i * 92;
      g.fillStyle = '#1f5a3a';
      g.beginPath();
      g.arc(52, y, 28, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f4ecd8';
      g.font = 'bold 34px Georgia, serif';
      g.textAlign = 'center';
      g.fillText(String(i + 1), 52, y + 12);
      g.textAlign = 'left';
      g.fillStyle = '#2a2418';
      g.font = 'bold 30px Georgia, serif';
      g.fillText(es, 98, y - 4);
      g.fillStyle = '#6a5a40';
      g.font = 'italic 24px Georgia, serif';
      g.fillText(en, 98, y + 26);
    });
    g.strokeStyle = '#b02428';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  }, { wrap: false });
}

// ---------- the panda family tree mural ----------

// A panda portrait: black shoulders, a round white face, patches, ears and a nose.
function drawPandaFace(g, x, y, s, tilt = 0) {
  const B = '#1c1b1f';
  const blob = (cx, cy, rx, ry, col, rot = 0) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  blob(x, y + s * 1.05, s * 0.95, s * 0.5, B);
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  blob(-s * 0.6, -s * 0.5, s * 0.26, s * 0.26, B);
  blob(s * 0.6, -s * 0.5, s * 0.26, s * 0.26, B);
  blob(0, s * 0.08, s * 0.78, s * 0.68, '#fafaf6');
  blob(-s * 0.3, s * 0.02, s * 0.17, s * 0.25, B, 0.55);
  blob(s * 0.3, s * 0.02, s * 0.17, s * 0.25, B, -0.55);
  blob(-s * 0.28, -s * 0.01, s * 0.05, s * 0.05, '#ffffff');
  blob(s * 0.28, -s * 0.01, s * 0.05, s * 0.05, '#ffffff');
  blob(0, s * 0.3, s * 0.13, s * 0.09, B);
  g.strokeStyle = B;
  g.lineWidth = Math.max(2, s * 0.035);
  g.beginPath();
  g.moveTo(-s * 0.1, s * 0.44);
  g.quadraticCurveTo(0, s * 0.52, s * 0.1, s * 0.44);
  g.stroke();
  g.restore();
}
// A tiny pink newborn cub, curled up asleep.
function drawCub(g, x, y, s) {
  const blob = (cx, cy, rx, ry, col, rot = 0) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  blob(x + s * 0.12, y + s * 0.15, s * 0.62, s * 0.42, '#eea39c', -0.2);
  blob(x - s * 0.42, y - s * 0.12, s * 0.34, s * 0.3, '#f2b0a8');
  blob(x - s * 0.6, y - s * 0.36, s * 0.09, s * 0.08, '#d8867f');
  blob(x + s * 0.6, y + s * 0.35, s * 0.18, s * 0.1, '#e0928a', 0.4);
  g.strokeStyle = '#a05a54';
  g.lineWidth = Math.max(2, s * 0.05);
  g.beginPath();
  g.moveTo(x - s * 0.5, y - s * 0.12);
  g.lineTo(x - s * 0.36, y - s * 0.1);
  g.stroke();
}

// Chapultepec's giant panda family, as painted on the wall by the panda yard.
export function pandaFamilyTree() {
  return make(2048, 1400, (g, w, h) => {
    const r = rng(1975);
    const MALE = '#2f86d6';
    const FEMALE = '#8c48b6';
    g.fillStyle = '#a7b898';
    g.fillRect(0, 0, w, h);
    const vg = g.createRadialGradient(w / 2, h * 0.45, 200, w / 2, h / 2, w * 0.72);
    vg.addColorStop(0, 'rgba(255,255,235,0.22)');
    vg.addColorStop(1, 'rgba(40,60,30,0.28)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 5000, 0.05);
    // Title.
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#2b4426';
    g.font = 'bold 66px Georgia, serif';
    g.fillText('ÁRBOL GENEALÓGICO', w / 2, 92);
    g.font = 'italic 34px Georgia, serif';
    g.fillText('Los pandas gigantes de Chapultepec · The Chapultepec giant panda family', w / 2, 140);

    // Bamboo poles join the family, tied with twine.
    const pole = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      g.save();
      g.translate(x0, y0);
      g.rotate(Math.atan2(y1 - y0, x1 - x0));
      const gr = g.createLinearGradient(0, -10, 0, 10);
      gr.addColorStop(0, '#e2c48a');
      gr.addColorStop(0.5, '#c79c5c');
      gr.addColorStop(1, '#8e6a38');
      g.fillStyle = gr;
      g.fillRect(-4, -10, len + 8, 20);
      for (let d = 40; d < len; d += 78) {
        g.fillStyle = 'rgba(90,60,25,0.75)';
        g.fillRect(d, -11, 5, 22);
        g.fillStyle = 'rgba(255,240,200,0.5)';
        g.fillRect(d + 5, -10, 3, 20);
      }
      g.restore();
    };
    const tie = (x, y) => {
      g.strokeStyle = '#6a4424';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 14, y - 14);
      g.lineTo(x + 14, y + 14);
      g.moveTo(x + 14, y - 14);
      g.lineTo(x - 14, y + 14);
      g.stroke();
    };
    const plaque = (x, y, name, years) => {
      const pw = 252;
      const ph = 88;
      g.save();
      g.translate(x, y);
      g.rotate((r() - 0.5) * 0.04);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(-pw / 2 + 6, -ph / 2 + 7, pw, ph);
      g.fillStyle = '#f6efdc';
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.strokeStyle = '#d8ccae';
      g.lineWidth = 3;
      g.strokeRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12);
      g.fillStyle = '#1e1a14';
      g.textAlign = 'center';
      g.font = `bold italic ${name.length > 10 ? 36 : 42}px Georgia, serif`;
      g.fillText(name, 0, -2);
      g.font = '26px Georgia, serif';
      g.fillText(years, 0, 32);
      g.restore();
    };
    const sexSign = (x, y, male, size = 58) => {
      g.save();
      g.strokeStyle = male ? MALE : FEMALE;
      g.lineWidth = size * 0.13;
      g.lineCap = 'round';
      const rr = size * 0.3;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      if (male) {
        const a = -Math.PI / 4;
        const ex = x + Math.cos(a) * rr * 2.2;
        const ey = y + Math.sin(a) * rr * 2.2;
        g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        g.lineTo(ex, ey);
        g.moveTo(ex - rr * 0.75, ey);
        g.lineTo(ex, ey);
        g.lineTo(ex, ey + rr * 0.75);
      } else {
        g.moveTo(x, y + rr);
        g.lineTo(x, y + rr * 2.3);
        g.moveTo(x - rr * 0.6, y + rr * 1.7);
        g.lineTo(x + rr * 0.6, y + rr * 1.7);
      }
      g.stroke();
      g.restore();
    };
    const portrait = (x, y, rad, male, cub = false, glow = false) => {
      if (glow) {
        const gl = g.createRadialGradient(x, y, rad, x, y, rad + 60);
        gl.addColorStop(0, 'rgba(255,214,90,0.9)');
        gl.addColorStop(1, 'rgba(255,214,90,0)');
        g.fillStyle = gl;
        g.beginPath();
        g.arc(x, y, rad + 60, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.arc(x + 6, y + 8, rad + 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = male ? MALE : FEMALE;
      g.beginPath();
      g.arc(x, y, rad + 12, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.clip();
      const bg = g.createLinearGradient(0, y - rad, 0, y + rad);
      bg.addColorStop(0, cub ? '#f4e4dc' : '#cfe6f0');
      bg.addColorStop(1, cub ? '#e8cfc4' : '#9cc6a0');
      g.fillStyle = bg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      if (cub) drawCub(g, x, y, rad * 0.75);
      else drawPandaFace(g, x, y - rad * 0.08, rad * 0.62, (r() - 0.5) * 0.35);
      g.restore();
    };
    const ribbon = (x, y) => {
      g.save();
      g.translate(x, y);
      g.fillStyle = '#111111';
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-34, -40, -10, -70, 0, -38);
      g.bezierCurveTo(10, -70, 34, -40, 0, 0);
      g.fill();
      g.beginPath();
      g.moveTo(-3, -6);
      g.lineTo(-26, 42);
      g.lineTo(-12, 46);
      g.lineTo(2, 6);
      g.moveTo(3, -6);
      g.lineTo(26, 42);
      g.lineTo(12, 46);
      g.lineTo(-2, 6);
      g.fill();
      g.restore();
    };

    // Pe Pe and Ying Ying, who came from China in 1975.
    const top = 290;
    pole(820, top, 1230, top);
    pole(1025, top, 1025, 440);
    tie(1025, top);
    portrait(820, top, 84, true);
    portrait(1230, top, 84, false);
    plaque(570, top - 18, 'Pe Pe', '1974 – 1988');
    plaque(1480, top - 18, 'Ying Ying', '1976 – 1989');
    sexSign(820 + 92, top - 92, true);
    sexSign(1230, top + 112, false, 52);

    // Their seven cubs, all born at Chapultepec.
    const kids = [
      ['Xen Li', '1980 – 1980', false, true],
      ['Tohui', '1981 – 1993', false, false],
      ['Liang Liang', '1983 – 1999', true, false],
      ['———', '1985 – 1985', true, true],
      ['Xiu Hua', '1985 – 2013', false, false],
      ['Ping Ping', '1987 – 1987', true, true],
      ['Shuan Shuan', '1987 – Presente', false, false],
    ];
    const bar = 440;
    const xs = kids.map((_, i) => 175 + i * 283);
    pole(xs[0], bar, xs[6], bar);
    kids.forEach(([name, years, male, cub], i) => {
      const x = xs[i];
      pole(x, bar, x, 470);
      tie(x, bar);
      plaque(x, 515, name, years);
      const py = cub ? 640 : 660;
      const pr = cub ? 54 : 72;
      portrait(x, py, pr, male, cub);
      sexSign(x, py + pr + 40, male, cub ? 44 : 52);
    });
    ribbon(xs[6] + 100, 596);

    // Tohui and Chia Chia, the parents of Xin Xin.
    const low = 950;
    pole(xs[1], 830, xs[1], low);
    pole(xs[1], low, 900, low);
    tie(xs[1], low);
    portrait(900, low, 72, true);
    plaque(1150, low, 'Chia Chia', '1972 – 1991');
    sexSign(900 + 82, low - 82, true, 50);
    const mid = (xs[1] + 900) / 2;
    pole(mid, low, mid, 1010);
    tie(mid, low);
    plaque(mid, 1055, 'Xin Xin', '1990 – Presente');
    portrait(mid, 1205, 84, false, false, true);
    sexSign(mid + 120, 1205, false, 52);
    g.fillStyle = '#b02428';
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'left';
    g.fillText('★ ¡Vive aquí!', mid + 160, 1170);
    g.font = 'italic 28px Georgia, serif';
    g.fillText('She lives right here.', mid + 160, 1210);

    // Legend.
    const lx = 1400;
    const ly = 1080;
    g.fillStyle = 'rgba(246,239,220,0.92)';
    g.fillRect(lx, ly, 560, 250);
    g.strokeStyle = '#8e6a38';
    g.lineWidth = 4;
    g.strokeRect(lx + 8, ly + 8, 544, 234);
    g.fillStyle = '#1e1a14';
    g.font = 'bold 30px Georgia, serif';
    g.textAlign = 'left';
    g.fillText('Leyenda · Key', lx + 30, ly + 52);
    g.font = '27px Georgia, serif';
    sexSign(lx + 55, ly + 98, true, 40);
    g.fillText('Macho · Male', lx + 100, ly + 108);
    sexSign(lx + 55, ly + 145, false, 40);
    g.fillText('Hembra · Female', lx + 100, ly + 162);
    g.save();
    g.translate(lx + 55, ly + 205);
    g.scale(0.55, 0.55);
    ribbon(0, 0);
    g.restore();
    g.fillText('En memoria · In memory', lx + 100, ly + 214);
  }, { wrap: false });
}

// A zoo sign with a big animal picture (an emoji), title and subtitle.
export function zooSign(title, sub, emoji, { head = '#c8406a', ink = '#5a1a2e', sky = ['#ffe4ea', '#f6f0d8'] } = {}) {
  return make(512, 384, (g, w, h) => {
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = head;
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff6ea';
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(title, w / 2, 48);
    const gr = g.createLinearGradient(0, 90, 0, 300);
    gr.addColorStop(0, sky[0]);
    gr.addColorStop(1, sky[1]);
    g.fillStyle = gr;
    g.fillRect(30, 88, w - 60, 220);
    g.fillStyle = '#7fb8c8';
    g.fillRect(30, 270, w - 60, 38);
    g.font = `170px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    g.textBaseline = 'middle';
    g.fillText(emoji, w / 2, 196);
    g.textBaseline = 'alphabetic';
    g.fillStyle = ink;
    g.font = 'italic 25px Georgia, serif';
    g.fillText(sub, w / 2, 348);
    g.strokeStyle = head;
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  }, { wrap: false });
}
