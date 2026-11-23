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
