// La Bandera Monumental: a huge plaza with a 50 m flagpole and a giant
// Mexican flag waving in the wind (its shadow sweeps across the paving), plus
// a row of stalls selling traditional toys.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

export const BANDERA_SPAWN = { x: 6, z: 34, yaw: 0.05, pitch: 0.12 };

const POLE_H = 50;
const FLAG_W = 25;
const FLAG_H = 14.3;
const HOIST = 0.55; // the flag's hoist edge, just off the pole
const LIMIT = 44; // the plaza is 88 m square

// Toys for sale. Prices are in pesos and paid with $5 coins.
export const TOYS = [
  { key: 'trompo', name: 'Trompo', en: 'spinning top', price: 10, stall: 0 },
  { key: 'balero', name: 'Balero', en: 'cup-and-ball', price: 10, stall: 0 },
  { key: 'yoyo', name: 'Yoyo de madera', en: 'wooden yo-yo', price: 10, stall: 0 },
  { key: 'loteria', name: 'Lotería', en: 'picture bingo game', price: 20, stall: 1 },
  { key: 'matraca', name: 'Matraca', en: 'wooden rattle', price: 15, stall: 1 },
  { key: 'pinata', name: 'Piñata', en: 'little star piñata', price: 20, stall: 1 },
  { key: 'alebrije', name: 'Alebrije', en: 'painted fantasy creature', price: 30, stall: 2 },
  { key: 'luchador', name: 'Luchador', en: 'wrestler figure', price: 25, stall: 2 },
  { key: 'matatena', name: 'Matatena', en: 'jacks', price: 5, stall: 2 },
];
const STALLS = [
  { name: 'JUGUETES DE MADERA', sub: 'Wooden toys', z: -12, stripe: ['#e8417a', '#fff4e0'] },
  { name: 'JUEGOS Y FIESTA', sub: 'Games and party', z: 0, stripe: ['#2f9a6a', '#fff4e0'] },
  { name: 'ARTESANÍAS', sub: 'Folk art', z: 12, stripe: ['#f2a23a', '#fff4e0'] },
];

const std = (o) => new THREE.MeshStandardMaterial(o);
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// ---------- the flag: green, white and red with the eagle on the nopal ----------
function drawEmblem(g, cx, cy, s) {
  // Laurel and oak wreath round the bottom, tied with a tricolour ribbon.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + side * (0.25 + i * 0.16);
      const x = cx + Math.cos(a) * s * 0.92;
      const y = cy + Math.sin(a) * s * 0.92;
      g.save();
      g.translate(x, y);
      g.rotate(a + side * 1.2);
      g.fillStyle = side < 0 ? '#3f6e2a' : '#5a8a32';
      g.beginPath();
      g.ellipse(0, 0, s * 0.13, s * 0.055, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  [['#006847', -0.16], ['#ffffff', 0], ['#ce1126', 0.16]].forEach(([c, dx]) => {
    g.fillStyle = c;
    g.fillRect(cx + dx * s - s * 0.08, cy + s * 0.86, s * 0.16, s * 0.12);
  });
  // Water and the rock.
  g.fillStyle = '#5a8ab0';
  g.beginPath();
  g.ellipse(cx, cy + s * 0.72, s * 0.42, s * 0.08, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8a6a4a';
  g.beginPath();
  g.ellipse(cx, cy + s * 0.64, s * 0.2, s * 0.08, 0, 0, Math.PI * 2);
  g.fill();
  // The nopal, with red tunas.
  const pad = (x, y, w, h, r) => {
    g.save();
    g.translate(cx + x * s, cy + y * s);
    g.rotate(r);
    g.fillStyle = '#4a8a3a';
    g.beginPath();
    g.ellipse(0, 0, w * s, h * s, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2e5a24';
    g.lineWidth = s * 0.012;
    g.stroke();
    g.restore();
  };
  pad(0, 0.5, 0.12, 0.16, 0);
  pad(-0.2, 0.36, 0.1, 0.13, -0.5);
  pad(0.2, 0.36, 0.1, 0.13, 0.5);
  pad(-0.3, 0.16, 0.08, 0.11, -0.3);
  pad(0.3, 0.18, 0.08, 0.11, 0.4);
  g.fillStyle = '#c8283a';
  for (const [x, y] of [[-0.32, 0.03], [0.34, 0.05], [-0.25, 0.25], [0.26, 0.27]]) {
    g.beginPath();
    g.arc(cx + x * s, cy + y * s, s * 0.03, 0, Math.PI * 2);
    g.fill();
  }
  // The golden eagle, in profile facing left, one talon on the nopal.
  g.fillStyle = '#6a4220';
  g.beginPath();
  g.ellipse(cx + s * 0.02, cy - s * 0.05, s * 0.2, s * 0.3, -0.25, 0, Math.PI * 2);
  g.fill();
  // Raised wing (a fan of feathers).
  g.fillStyle = '#5a3818';
  for (let i = 0; i < 7; i++) {
    const a = -2.3 + i * 0.22;
    g.save();
    g.translate(cx + s * 0.1, cy - s * 0.18);
    g.rotate(a);
    g.beginPath();
    g.ellipse(s * 0.28, 0, s * 0.3, s * 0.06, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // Head, beak and eye.
  g.fillStyle = '#6a4220';
  g.beginPath();
  g.arc(cx - s * 0.16, cy - s * 0.34, s * 0.09, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8b020';
  g.beginPath();
  g.moveTo(cx - s * 0.24, cy - s * 0.37);
  g.lineTo(cx - s * 0.34, cy - s * 0.31);
  g.lineTo(cx - s * 0.23, cy - s * 0.29);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(cx - s * 0.17, cy - s * 0.36, s * 0.018, 0, Math.PI * 2);
  g.fill();
  // Tail and legs.
  g.fillStyle = '#4a2a10';
  g.beginPath();
  g.moveTo(cx + s * 0.1, cy + s * 0.18);
  g.lineTo(cx + s * 0.3, cy + s * 0.36);
  g.lineTo(cx + s * 0.06, cy + s * 0.3);
  g.fill();
  g.strokeStyle = '#e8b020';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(cx - s * 0.02, cy + s * 0.2);
  g.lineTo(cx - s * 0.02, cy + s * 0.33);
  g.moveTo(cx - s * 0.12, cy + s * 0.1);
  g.lineTo(cx - s * 0.28, cy + s * 0.0);
  g.stroke();
  // The snake, held in beak and talon.
  g.strokeStyle = '#4a7a2a';
  g.lineWidth = s * 0.035;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - s * 0.33, cy - s * 0.3);
  g.bezierCurveTo(cx - s * 0.5, cy - s * 0.18, cx - s * 0.2, cy - s * 0.1, cx - s * 0.4, cy + s * 0.0);
  g.bezierCurveTo(cx - s * 0.52, cy + s * 0.08, cx - s * 0.3, cy + s * 0.1, cx - s * 0.28, cy + s * 0.02);
  g.stroke();
}
function flagTexture() {
  return canvasTex(1750, 1000, (g, w, h) => {
    g.fillStyle = '#006847';
    g.fillRect(0, 0, w / 3 + 1, h);
    g.fillStyle = '#ffffff';
    g.fillRect(w / 3, 0, w / 3 + 1, h);
    g.fillStyle = '#ce1126';
    g.fillRect((2 * w) / 3, 0, w / 3, h);
    drawEmblem(g, w / 2, h / 2, h * 0.3);
  });
}

// ---------- toy icons for the backpack (drawn flat) ----------
export function toyIcon(key) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const stripes = (x, y, w, h, cols) => cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(x, y + (i * h) / cols.length, w, h / cols.length + 1); });
  if (key === 'trompo') {
    g.save();
    g.beginPath();
    g.moveTo(24, 40);
    g.quadraticCurveTo(64, 18, 104, 40);
    g.lineTo(64, 112);
    g.closePath();
    g.clip();
    stripes(20, 20, 90, 92, ['#e8417a', '#f2c14e', '#2f9a6a', '#3a6ad8', '#e8417a', '#f2c14e']);
    g.restore();
    g.fillStyle = '#8a5a2a';
    g.fillRect(60, 8, 8, 16);
    g.fillStyle = '#888';
    g.fillRect(61, 108, 6, 14);
  } else if (key === 'balero') {
    g.strokeStyle = '#a0703a';
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(64, 120); g.lineTo(64, 60); g.stroke();
    g.fillStyle = '#d83a3a';
    g.beginPath(); g.ellipse(64, 40, 28, 22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c14e';
    g.fillRect(36, 36, 56, 8);
    g.strokeStyle = '#444'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(64, 90); g.quadraticCurveTo(100, 80, 96, 64); g.stroke();
  } else if (key === 'yoyo') {
    g.fillStyle = '#3a6ad8';
    g.beginPath(); g.arc(64, 74, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.arc(64, 74, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8417a';
    g.beginPath(); g.arc(64, 74, 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#eee'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 74); g.lineTo(64, 4); g.stroke();
  } else if (key === 'loteria') {
    g.fillStyle = '#fff4e0'; g.fillRect(18, 10, 92, 108);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.strokeRect(18, 10, 92, 108);
    const cols = ['#e8417a', '#2f9a6a', '#f2a23a', '#3a6ad8'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = cols[(i + j) % 4]; g.fillRect(24 + i * 21, 16 + j * 25, 17, 21); }
    g.fillStyle = '#c8283a'; g.beginPath(); g.arc(55, 53, 6, 0, Math.PI * 2); g.fill();
  } else if (key === 'matraca') {
    g.fillStyle = '#a0703a'; g.fillRect(56, 70, 14, 50);
    g.fillStyle = '#e8417a'; g.fillRect(20, 30, 88, 40);
    g.fillStyle = '#f2c14e'; g.fillRect(20, 44, 88, 12);
    g.fillStyle = '#2f9a6a'; g.fillRect(60, 22, 8, 56);
  } else if (key === 'pinata') {
    const pts = 7;
    const cols = ['#e8417a', '#f2c14e', '#2f9a6a', '#3a6ad8', '#f2a23a', '#a64ad8', '#e8417a'];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = cols[i];
      g.beginPath();
      g.moveTo(64 + Math.cos(a - 0.3) * 26, 68 + Math.sin(a - 0.3) * 26);
      g.lineTo(64 + Math.cos(a) * 58, 68 + Math.sin(a) * 58);
      g.lineTo(64 + Math.cos(a + 0.3) * 26, 68 + Math.sin(a + 0.3) * 26);
      g.fill();
    }
    g.fillStyle = '#f4c4d8'; g.beginPath(); g.arc(64, 68, 30, 0, Math.PI * 2); g.fill();
  } else if (key === 'alebrije') {
    g.fillStyle = '#3a6ad8'; g.beginPath(); g.ellipse(60, 74, 34, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(98, 56, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8417a'; g.beginPath(); g.moveTo(52, 58); g.lineTo(40, 18); g.lineTo(72, 56); g.fill();
    g.strokeStyle = '#2f9a6a'; g.lineWidth = 7;
    for (const x of [40, 52, 70, 82]) { g.beginPath(); g.moveTo(x, 86); g.lineTo(x, 112); g.stroke(); }
    g.beginPath(); g.moveTo(28, 70); g.quadraticCurveTo(6, 60, 14, 36); g.stroke();
    g.fillStyle = '#fff'; for (const [x, y] of [[50, 72], [66, 80], [76, 68]]) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  } else if (key === 'luchador') {
    g.fillStyle = '#d83a3a'; g.beginPath(); g.arc(64, 30, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(56, 30, 6, 4, 0, 0, Math.PI * 2); g.ellipse(72, 30, 6, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8b890'; g.fillRect(44, 52, 40, 36);
    g.fillStyle = '#d83a3a'; g.fillRect(44, 80, 40, 14);
    g.fillStyle = '#e8b890'; g.fillRect(46, 94, 12, 26); g.fillRect(70, 94, 12, 26);
    g.fillRect(28, 54, 14, 30); g.fillRect(86, 54, 14, 30);
  } else if (key === 'matatena') {
    g.fillStyle = '#d83a3a'; g.beginPath(); g.arc(40, 50, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c8c8d0'; g.lineWidth = 6;
    for (const [x, y] of [[80, 40], [70, 86], [98, 76], [44, 96]]) {
      g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + 12, y); g.moveTo(x, y - 12); g.lineTo(x, y + 12); g.stroke();
    }
  }
  return c.toDataURL();
}

export function buildBandera(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const shadowLights = [];
  const api = { group, colliders, shadowLights, state: {} };
  const rand = T.rng(2402);
  const add = (p, o, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    p.add(o);
    return o;
  };
  const box = (p, m, w, h, d, x, y, z) => add(p, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z);
  const cyl = (p, m, rt, rb, h, x, y, z, n = 12) => add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m), x, y, z);
  const sph = (p, m, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const s = add(p, new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m), x, y, z);
    s.scale.set(sx, sy, sz);
    return s;
  };
  const node = (p, x = 0, y = 0, z = 0, yaw = 0) => {
    const n = add(p, new THREE.Group(), x, y, z);
    n.rotation.y = yaw;
    return n;
  };
  const cast = (...os) => os.forEach((o) => o.traverse((c) => c.isMesh && (c.castShadow = true)));
  const interact = (o, spec) => {
    o.userData.interact = spec;
    return o;
  };
  // A ground plane whose texture repeats per meter.
  function flat(mat, w, d, x, y, z) {
    const geo = new THREE.PlaneGeometry(w, d);
    const uv = geo.attributes.uv;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const m = add(group, new THREE.Mesh(geo, mat), x, y, z);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    return m;
  }

  const M = {
    paving: std({ map: T.paving(), color: 0xe8e2d8, roughness: 0.9 }),
    lawn: std({ map: T.grass(), color: 0x8aa860, roughness: 1 }),
    stone: std({ color: 0xb8b0a2, roughness: 0.8 }),
    darkStone: std({ color: 0x4a4640, roughness: 0.6 }),
    steel: std({ color: 0xc4c8cc, metalness: 0.8, roughness: 0.3 }),
    wood: std({ map: T.woodGrain(), color: 0xb07a4a, roughness: 0.75 }),
    darkWood: std({ color: 0x5a3a22, roughness: 0.8 }),
    bark: std({ color: 0x5a4632, roughness: 1 }),
    leaf: std({ color: 0xffffff, roughness: 0.95, flatShading: true }),
    iron: std({ color: 0x2a2c30, metalness: 0.5, roughness: 0.5 }),
    gold: std({ color: 0xd8b050, metalness: 0.9, roughness: 0.3 }),
  };

  // ---------- light: a high sun so the flag's shadow lands on the plaza ----------
  // The sun is behind and to the left of the pole as you arrive, so the
  // flag's shadow falls across the paving in front of you, to the right.
  const sunDir = new THREE.Vector3(-0.25, 0.85, -0.45).normalize();
  const sun = new THREE.DirectionalLight(0xfff2dc, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 400 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(8, 0, 10);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 180);
  group.add(sun, sun.target);
  shadowLights.push(sun);
  group.add(new THREE.HemisphereLight(0xd8e8ff, 0x9a8a70, 1.0));

  // ---------- ground: the plaza, lawns, trees and the city beyond ----------
  add(group, new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std({ color: 0x6f8a52, roughness: 1 })), 0, -0.02, 0).rotation.x = -Math.PI / 2;
  flat(M.lawn, 140, 140, 0, -0.01, 0);
  flat(M.paving, LIMIT * 2 + 2, LIMIT * 2 + 2, 0, 0, 0);
  // A darker ring of paving round the base.
  const ring = add(group, new THREE.Mesh(new THREE.RingGeometry(7.2, 10, 48), std({ color: 0x9a8e7e, roughness: 0.9 })), 0, 0.005, 0);
  ring.rotation.x = -Math.PI / 2;
  ring.receiveShadow = true;
  // Low curbs along the plaza edge.
  for (const [w, d, x, z] of [[LIMIT * 2 + 2, 0.4, 0, -LIMIT - 1], [LIMIT * 2 + 2, 0.4, 0, LIMIT + 1], [0.4, LIMIT * 2 + 2, -LIMIT - 1, 0], [0.4, LIMIT * 2 + 2, LIMIT + 1, 0]]) box(group, M.stone, w, 0.25, d, x, 0.12, z).receiveShadow = true;
  // Trees round the plaza (Chapultepec's woods), instanced.
  {
    const spots = [];
    for (let i = 0; i < 5000 && spots.length < 260; i++) {
      const x = -90 + rand() * 180;
      const z = -90 + rand() * 180;
      if (Math.max(Math.abs(x), Math.abs(z)) < LIMIT + 5) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 4)) continue;
      spots.push({ x, z, h: 5 + rand() * 6, s: 2.2 + rand() * 1.8 });
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 7).translate(0, 0.5, 0), M.bark, spots.length);
    const crowns = new THREE.InstancedMesh(mergeGeometries([new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(0.75, 1).translate(0.7, -0.25, 0.3), new THREE.IcosahedronGeometry(0.7, 1).translate(-0.6, -0.2, -0.4)]), M.leaf, spots.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(s.x, 0, s.z), q.identity(), new THREE.Vector3(1, s.h, 1)));
      crowns.setMatrixAt(i, m4.compose(new THREE.Vector3(s.x, s.h + s.s * 0.4, s.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(s.s, s.s * 0.85, s.s)));
      crowns.setColorAt(i, c.setHSL(0.26 + rand() * 0.07, 0.5, 0.22 + rand() * 0.1));
    });
    group.add(trunks, crowns);
    for (const o of [trunks, crowns]) o.raycast = () => {};
  }
  // The city skyline far off.
  {
    const bw = T.buildingWindows({ seed: 12 });
    const geoBy = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rand() * 0.05;
      const r = 150 + rand() * 60;
      const w = 14 + rand() * 18;
      const h = 18 + rand() * 60;
      geoBy.push(new THREE.BoxGeometry(w, h, w).rotateY(-a).translate(Math.cos(a) * r, h / 2, Math.sin(a) * r));
    }
    const city = new THREE.Mesh(mergeGeometries(geoBy), std({ color: 0xd8d0c4, map: bw.map, roughness: 0.9 }));
    bw.map.repeat.set(0.6, 0.6);
    city.raycast = () => {};
    group.add(city);
  }

  // ---------- the flagpole and its base ----------
  {
    // Three round steps up to the base.
    [[7, 0.3], [6, 0.6], [5, 0.9]].forEach(([r, y]) => {
      const st = cyl(group, M.stone, r, r, 0.3, 0, y - 0.15, 0, 48);
      st.receiveShadow = true;
      st.castShadow = true;
    });
    const pedestal = cyl(group, M.darkStone, 2.2, 2.6, 1.6, 0, 1.7, 0, 32);
    cast(pedestal);
    const pole = cyl(group, M.steel, 0.42, 0.85, POLE_H, 0, POLE_H / 2 + 0.9, 0, 24);
    cast(pole);
    sph(group, M.gold, 0.7, 0, POLE_H + 1.3, 0);
    // The plaque on the pedestal, facing the way you arrive.
    const plaque = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: canvasTex(720, 360, (g, w, h) => {
      g.fillStyle = '#2a2622';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d8b050';
      g.lineWidth = 8;
      g.strokeRect(12, 12, w - 24, h - 24);
      g.fillStyle = '#d8b050';
      g.textAlign = 'center';
      g.font = 'bold 50px Georgia, serif';
      g.fillText('BANDERA MONUMENTAL', w / 2, 100);
      g.font = '28px Georgia, serif';
      g.fillText('Asta de 50 m · Bandera de 25 × 14.3 m', w / 2, 170);
      g.fillText('Lábaro patrio de los Estados Unidos Mexicanos', w / 2, 220);
      g.font = 'italic 26px Georgia, serif';
      g.fillText('24 de febrero · Día de la Bandera', w / 2, 290);
    }), roughness: 0.4, metalness: 0.2 })), 0, 1.75, 2.52);
    plaque.rotation.x = -0.08;
    interact(plaque, {
      label: (h) => (h.distance < 6 ? 'Read the plaque' : null),
      act: () => {
        ctx.toast('Bandera Monumental: Mexico’s monumental flags fly from poles about 50 m tall. The flag is 25 m long and 14.3 m high, and weighs more than 200 kg. Green stands for hope, white for unity and red for the heroes; the eagle on the nopal comes from the founding of Tenochtitlan. February 24 is Flag Day.', 9000);
        ctx.complete('bnPlaque');
      },
    });
    colliders.push({ x: 0, z: 0, r: 2.8 });
  }
  const floorAt = (x, z) => {
    const r = Math.hypot(x, z);
    return r < 5 ? 0.9 : r < 6 ? 0.6 : r < 7 ? 0.3 : 0;
  };

  // ---------- the flag itself: a cloth that ripples in the wind ----------
  const SX = 50;
  const SY = 28;
  const flagGeo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, SX, SY).translate(FLAG_W / 2, -FLAG_H / 2, 0);
  const base = flagGeo.attributes.position.array.slice();
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.85 });
  const flag = add(group, new THREE.Mesh(flagGeo, flagMat), HOIST, POLE_H + 0.4, 0);
  flag.castShadow = true;
  flag.receiveShadow = true;
  flag.customDepthMaterial = undefined;
  interact(flag, { label: (h) => (h.distance < 70 ? 'Look up at the flag' : null), act: () => lookUp() });
  function waveFlag(t) {
    const p = flagGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const k = x / FLAG_W; // 0 at the pole, 1 at the fly end
      const amp = Math.pow(k, 0.8);
      // Big slow ripples running down the flag, with smaller fast ones on top.
      const z = (Math.sin(x * 0.32 - t * 2.1 + y * 0.05) * 1.1 + Math.sin(x * 0.85 - t * 3.6 + y * 0.18) * 0.3) * amp;
      p[i] = x - amp * (0.6 + Math.sin(t * 0.7) * 0.25); // the cloth bunches up a little
      p[i + 1] = y - amp * amp * (0.8 + Math.sin(t * 0.5 + x * 0.1) * 0.3); // and sags at the fly end
      p[i + 2] = z;
    }
    flagGeo.attributes.position.needsUpdate = true;
    flagGeo.computeVertexNormals();
  }
  waveFlag(0);
  function lookUp() {
    const p = ctx.player().pos;
    const yaw = Math.atan2(-(HOIST + FLAG_W * 0.45 - p.x), -(0 - p.z));
    const d = Math.hypot(p.x - FLAG_W * 0.45, p.z);
    ctx.sit({ eye: new THREE.Vector3(p.x, p.y + 1.6, p.z), yaw, pitch: Math.min(1.2, Math.atan2(POLE_H - 6, d)) });
    ctx.complete('bnFlag');
    ctx.toast('¡Qué impresionante! The flag is as long as a basketball court and ripples slowly in the wind, 50 m up.', 5200);
  }

  // ---------- benches round the base, facing the flag ----------
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const r = 13;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const yaw = Math.atan2(x, z); // the bench's back is away from the pole
    const b = node(group, x, 0, z, yaw);
    box(b, M.wood, 2.0, 0.07, 0.5, 0, 0.46, 0);
    box(b, M.wood, 2.0, 0.45, 0.06, 0, 0.78, 0.25).rotation.x = 0.15;
    for (const sx of [-0.85, 0.85]) box(b, M.iron, 0.07, 0.46, 0.5, sx, 0.23, 0);
    cast(b);
    colliders.push({ x, z, r: 0.9 });
    interact(b, {
      label: (h) => (h.distance < 4 ? 'Sit and look up at the flag' : null),
      act: () => {
        const eye = new THREE.Vector3(x, 1.15, z);
        const fx = HOIST + FLAG_W * 0.45;
        ctx.sit({ eye, yaw: Math.atan2(-(fx - x), -(0 - z)), pitch: Math.min(1.1, Math.atan2(POLE_H - 8, Math.hypot(fx - x, z))) });
        ctx.complete('bnBench');
      },
    });
  }

  // ---------- the toy stalls along the west side ----------
  const stripeTex = (a, b) => canvasTex(256, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect((i * w) / 8, 0, w / 8 + 1, h);
    }
  });
  const bought = new Set();
  function makeToy(key) {
    const g = new THREE.Group();
    const c = (hex) => std({ color: hex, roughness: 0.55 });
    if (key === 'trompo') {
      const t = canvasTex(64, 64, (x, w, h) => ['#e8417a', '#f2c14e', '#2f9a6a', '#3a6ad8'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, (i * h) / 4, w, h / 4 + 1); }));
      add(g, new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 18).rotateX(Math.PI), std({ map: t, roughness: 0.5 })), 0, 0.1, 0);
      sph(g, c(0xe8417a), 0.09, 0, 0.18, 0, 1, 0.35, 1);
      cyl(g, c(0x8a5a2a), 0.015, 0.015, 0.05, 0, 0.22, 0);
      cyl(g, c(0x999999), 0.004, 0.004, 0.03, 0, 0.012, 0);
    } else if (key === 'balero') {
      cyl(g, c(0xa0703a), 0.012, 0.012, 0.22, 0, 0.11, 0);
      const cup = cyl(g, c(0xd83a3a), 0.07, 0.07, 0.14, 0.12, 0.07, 0, 16);
      cup.rotation.z = Math.PI / 2;
      cyl(g, c(0xf2c14e), 0.071, 0.071, 0.03, 0.12, 0.07, 0, 16).rotation.z = Math.PI / 2;
    } else if (key === 'yoyo') {
      for (const s of [-1, 1]) cyl(g, c(s < 0 ? 0x3a6ad8 : 0xf2c14e), 0.08, 0.08, 0.03, 0, 0.085, s * 0.022, 20).rotation.x = Math.PI / 2;
      cyl(g, c(0xe8417a), 0.02, 0.02, 0.02, 0, 0.085, 0).rotation.x = Math.PI / 2;
    } else if (key === 'loteria') {
      const t = canvasTex(128, 160, (x, w, h) => {
        x.fillStyle = '#fff4e0';
        x.fillRect(0, 0, w, h);
        const cols = ['#e8417a', '#2f9a6a', '#f2a23a', '#3a6ad8'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = cols[(i + j) % 4]; x.fillRect(8 + i * 29, 10 + j * 36, 24, 30); }
        x.fillStyle = '#2a2a2a';
        x.font = 'bold 14px sans-serif';
        x.fillText('LOTERÍA', 34, 156);
      });
      const board = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.015), [c(0xf4ecd8), c(0xf4ecd8), c(0xf4ecd8), c(0xf4ecd8), std({ map: t }), c(0xf4ecd8)]), 0, 0.16, 0);
      board.rotation.x = -0.25;
    } else if (key === 'matraca') {
      cyl(g, c(0xa0703a), 0.015, 0.015, 0.14, 0, 0.07, 0);
      box(g, c(0xe8417a), 0.22, 0.1, 0.06, 0, 0.19, 0);
      box(g, c(0xf2c14e), 0.221, 0.03, 0.061, 0, 0.19, 0);
    } else if (key === 'pinata') {
      const body = sph(g, c(0xf4c4d8), 0.11, 0, 0.2, 0);
      const cols = [0xe8417a, 0xf2c14e, 0x2f9a6a, 0x3a6ad8, 0xf2a23a, 0xa64ad8, 0xe8417a];
      const dirs = [[0, 1, 0], [0.95, 0.3, 0], [-0.95, 0.3, 0], [0.6, -0.8, 0], [-0.6, -0.8, 0], [0, 0, 1], [0, 0, -1]];
      dirs.forEach((d, i) => {
        const v = new THREE.Vector3(...d).normalize();
        const cone = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10), c(cols[i])), v.x * 0.16, 0.2 + v.y * 0.16, v.z * 0.16);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      });
      body.userData.main = true;
    } else if (key === 'alebrije') {
      sph(g, c(0x3a6ad8), 0.08, 0, 0.12, 0, 1.5, 0.8, 0.9);
      sph(g, c(0xf2c14e), 0.05, 0.13, 0.17, 0);
      const wing = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), c(0xe8417a)), -0.02, 0.21, 0);
      wing.rotation.z = 0.5;
      for (const [x, z] of [[-0.07, -0.04], [-0.07, 0.04], [0.06, -0.04], [0.06, 0.04]]) cyl(g, c(0x2f9a6a), 0.012, 0.012, 0.08, x, 0.04, z);
      const tail = cyl(g, c(0x2f9a6a), 0.01, 0.015, 0.12, -0.15, 0.16, 0);
      tail.rotation.z = 0.9;
      for (const [x, y, z] of [[-0.02, 0.17, 0.065], [0.04, 0.15, 0.06], [-0.05, 0.12, -0.06]]) sph(g, c(0xffffff), 0.012, x, y, z);
    } else if (key === 'luchador') {
      sph(g, c(0xd83a3a), 0.045, 0, 0.27, 0);
      cyl(g, c(0xe8b890), 0.05, 0.045, 0.1, 0, 0.18, 0);
      cyl(g, c(0xd83a3a), 0.05, 0.05, 0.04, 0, 0.11, 0);
      for (const s of [-1, 1]) {
        cyl(g, c(0xe8b890), 0.016, 0.016, 0.09, s * 0.025, 0.045, 0);
        cyl(g, c(0xe8b890), 0.014, 0.014, 0.09, s * 0.07, 0.19, 0).rotation.z = s * 0.4;
      }
    } else if (key === 'matatena') {
      sph(g, c(0xd83a3a), 0.025, -0.05, 0.025, 0);
      for (const [x, z] of [[0.03, 0.02], [0.07, -0.03], [0.0, -0.05], [0.05, 0.06]]) {
        const j = node(g, x, 0.015, z, rand() * 3);
        for (const ax of ['x', 'y', 'z']) {
          const r = cyl(j, std({ color: 0xc8c8d0, metalness: 0.7, roughness: 0.3 }), 0.004, 0.004, 0.04, 0, 0, 0, 6);
          if (ax === 'x') r.rotation.z = Math.PI / 2;
          if (ax === 'z') r.rotation.x = Math.PI / 2;
        }
      }
    }
    g.scale.setScalar(1.6);
    return g;
  }
  function person(shirt, pants, skin = 0xc89a74) {
    const g = new THREE.Group();
    const m = (hex) => std({ color: hex, roughness: 0.8 });
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = node(g, s * 0.1, 0.85, 0);
      cyl(hip, m(pants), 0.065, 0.06, 0.85, 0, -0.42, 0, 8);
      legs.push(hip);
    }
    cyl(g, m(shirt), 0.19, 0.16, 0.6, 0, 1.15, 0, 10);
    sph(g, m(skin), 0.12, 0, 1.6, 0);
    sph(g, m(0x2a1e14), 0.125, 0, 1.65, -0.02, 1, 0.7, 1);
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = node(g, s * 0.23, 1.4, 0);
      cyl(sh, m(shirt), 0.05, 0.045, 0.55, 0, -0.27, 0, 8);
      arms.push(sh);
    }
    cast(g);
    return { g, legs, arms };
  }
  STALLS.forEach((st, si) => {
    // The stall faces +x, towards the flag.
    const s = node(group, -30, 0, st.z, Math.PI / 2);
    const top = std({ map: stripeTex(...st.stripe), roughness: 0.9, side: THREE.DoubleSide });
    // Table, back shelf, posts and a striped awning.
    box(s, M.wood, 3.4, 0.08, 1.0, 0, 0.9, 0);
    box(s, std({ map: stripeTex(st.stripe[0], '#f4e8d0'), roughness: 0.9 }), 3.4, 0.86, 0.04, 0, 0.45, 0.5);
    box(s, M.wood, 3.4, 1.2, 0.3, 0, 1.2, -1.5);
    box(s, M.wood, 3.4, 0.05, 0.32, 0, 1.4, -1.5);
    for (const x of [-1.7, 1.7]) for (const z of [0.55, -1.7]) cyl(s, M.darkWood, 0.04, 0.04, 2.6, x, 1.3, z, 8);
    const aw = add(s, new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.6), top), 0, 2.55, -0.55);
    aw.rotation.x = -Math.PI / 2 + 0.18;
    // Scalloped valance with the stall's name.
    const sign = add(s, new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.45), new THREE.MeshBasicMaterial({ map: T.boardSign(st.name, st.sub, { bg: st.stripe[0], fg: '#fff8e8' }), toneMapped: false })), 0, 2.55, 0.76);
    sign.rotation.x = -0.05;
    // Papel picado string along the front.
    const flags = [];
    const cols = ['#e8417a', '#f2c14e', '#2f9a6a', '#3a6ad8', '#a64ad8', '#f2a23a'];
    for (let i = 0; i < 9; i++) {
      const pp = add(s, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), std({ color: cols[(i + si) % cols.length], side: THREE.DoubleSide, roughness: 0.9 })), -1.6 + i * 0.4, 2.12, 0.78);
      flags.push(pp);
    }
    cast(s);
    // A vendor behind the table.
    const v = person([0xe8417a, 0x2f9a6a, 0xf2a23a][si], 0x2a3040, [0xc89a74, 0xa87a54, 0xd8b090][si]);
    s.add(v.g);
    v.g.position.set(0.9, 0, -0.75);
    v.arms[0].rotation.x = -0.6;
    v.arms[1].rotation.x = -0.6;
    api.state['vendor' + si] = v;
    // The toys on the table, each with a price tag.
    const toys = TOYS.filter((t) => t.stall === si);
    toys.forEach((toy, i) => {
      const x = -1.1 + i * 1.1;
      for (let k = 0; k < 3; k++) {
        const m = makeToy(toy.key);
        m.position.set(x + (k - 1) * 0.28, 0.94, 0.12 - (k % 2) * 0.22);
        m.rotation.y = rand() * 6;
        s.add(m);
        cast(m);
        interact(m, {
          label: (h) => (h.distance < 4 ? `Buy a ${toy.name.toLowerCase()} · $${toy.price}` : null),
          act: () => buy(toy),
        });
      }
      const tag = add(s, new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: T.sign(`$${toy.price}`, { bg: '#fff8e8', fg: '#2a2a2a', w: 256, h: 128, font: 'bold 72px sans-serif' }), toneMapped: false })), x, 1.08, 0.48);
      tag.rotation.x = -0.6;
      interact(tag, { label: (h) => (h.distance < 4 ? `Buy a ${toy.name.toLowerCase()} (${toy.en}) · $${toy.price}` : null), act: () => buy(toy) });
      // More on the back shelf.
      for (let k = 0; k < 2; k++) {
        const m = makeToy(toy.key);
        m.position.set(x + (k - 0.5) * 0.4, 1.43, -1.5);
        s.add(m);
      }
    });
    // Piñatas hang from the party stall's awning.
    if (si === 1) {
      for (const x of [-1.2, 0, 1.2]) {
        const p = makeToy('pinata');
        p.scale.setScalar(3.2);
        p.position.set(x, 1.55, 0.2);
        s.add(p);
        cyl(s, std({ color: 0xeeeeee }), 0.004, 0.004, 0.45, x, 2.25, 0.2, 4);
      }
    }
    // Solid: the table, the shelf and the posts.
    colliders.push({ x0: -30 - 1.9, x1: -30 + 0.65, z0: st.z - 1.9, z1: st.z + 1.9 });
  });
  function buy(toy) {
    if (!ctx.buy(toy.price)) {
      ctx.toast(`The ${toy.name.toLowerCase()} costs $${toy.price} (${toy.price / 5} coins of $5). Look for $5 coins around the plaza and the zoo, or trade a $20 bill at the ATM.`, 5200);
      return;
    }
    const first = !bought.has(toy.key);
    bought.add(toy.key);
    ctx.souvenir({ key: toy.key, name: toy.name, img: toyIcon(toy.key) });
    ctx.toast(`¡Gracias! You bought a ${toy.name.toLowerCase()} (${toy.en}) for $${toy.price}.`, 3800);
    ctx.complete('bnToy');
    if (bought.size >= 3) ctx.complete('bnThree');
    if (first) ctx.sound.coinDrop();
  }
  api.bought = bought;

  // ---------- visitors strolling round the plaza ----------
  const walkers = [];
  for (let i = 0; i < 10; i++) {
    const p = person([0x3a6ad8, 0xe8e2d0, 0xd83a3a, 0x2f9a6a, 0xf2c14e, 0x6a4ad8, 0x2a2a2a, 0xe87a3a, 0x8ad8e8, 0xb8b8b8][i], [0x2a3040, 0x4a3a2a, 0x2a2a2a][i % 3], [0xc89a74, 0xa87a54, 0xd8b090, 0x8a6040][i % 4]);
    group.add(p.g);
    walkers.push({ ...p, r: 16 + rand() * 10, a: rand() * Math.PI * 2, dir: rand() < 0.5 ? 1 : -1, speed: 0.9 + rand() * 0.5, phase: rand() * 6 });
  }

  // ---------- the flag's shadow on the ground ----------
  // Trace from where you stand towards the sun: if that ray passes through
  // the flag, you're standing in its shadow.
  const shadowState = { t: 0, told: false };
  function inFlagShadow(p) {
    const y0 = p.y + 1.2;
    const t = -p.z / sunDir.z; // where the ray reaches the flag's plane (z = 0)
    if (t <= 0) return false;
    const x = p.x + sunDir.x * t;
    const y = y0 + sunDir.y * t;
    return x > HOIST + 0.5 && x < HOIST + FLAG_W - 1.5 && y < POLE_H + 0.2 && y > POLE_H + 0.4 - FLAG_H - 1;
  }

  let time = 0;
  function update(dt) {
    time += dt;
    const t = time;
    waveFlag(t);
    for (const w of walkers) {
      w.a += (w.dir * w.speed * dt) / w.r;
      const x = Math.cos(w.a) * w.r;
      const z = Math.sin(w.a) * w.r;
      w.g.position.set(x, 0, z);
      w.g.rotation.y = Math.atan2(-Math.sin(w.a) * w.dir, Math.cos(w.a) * w.dir);
      const sw = Math.sin(t * w.speed * 5 + w.phase) * 0.45;
      w.legs[0].rotation.x = sw;
      w.legs[1].rotation.x = -sw;
      w.arms[0].rotation.x = -sw * 0.7;
      w.arms[1].rotation.x = sw * 0.7;
    }
    const p = ctx.player().pos;
    if (inFlagShadow(p)) {
      shadowState.t += dt;
      if (shadowState.t > 0.8 && !shadowState.told) {
        shadowState.told = true;
        ctx.complete('bnShadow');
        ctx.toast('You’re standing in the flag’s shadow! Watch it ripple across the paving as the flag waves.', 5200);
      }
    } else shadowState.t = 0;
  }

  const limit = (p, r) => {
    p.x = Math.max(-LIMIT + r, Math.min(LIMIT - r, p.x));
    p.z = Math.max(-LIMIT + r, Math.min(LIMIT - r, p.z));
  };
  return Object.assign(api, { floorAt, limit, update, inFlagShadow, sunDir, flag });
}
