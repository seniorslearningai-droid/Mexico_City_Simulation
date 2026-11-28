// Everything outside the room: sky, sun, the hotel facade, Paseo de la
// Reforma with traffic and jacaranda trees, the Ángel de la Independencia,
// a few thousand buildings, and the two volcanoes on the horizon.
// The suite's floor is at y = 0. Outside, elevations are relative to it.
import * as THREE from 'three';
import * as T from './textures.js';

const SUITE_FLOOR = 6;
const HOTEL_FLOOR_HEIGHT = 3.15;
export const GROUND = -SUITE_FLOOR * HOTEL_FLOOR_HEIGHT;
const HOTEL_ROOF = GROUND + 59;
const HOTEL_FRONT = -5.15; // facade plane (z)
const AVE_NEAR = -5; // avenue cross-section starts at the facade...
const AVE_W = 47; // ...and runs 47 m north
const aveZ = (d) => AVE_NEAR - d; // distance from facade -> world z

const SUN_DIR = new THREE.Vector3(-0.35, 0.55, -0.76).normalize();

const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

export function buildWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const r = T.rng(99);
  const dyn = []; // per-frame updaters
  const nightFns = []; // called with night factor 0..1

  // ---------- sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color() },
        horizon: { value: new THREE.Color() },
        bottom: { value: new THREE.Color() },
        sunColor: { value: new THREE.Color() },
        sunDir: { value: SUN_DIR.clone() },
        sharp: { value: 900 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top, horizon, bottom, sunColor, sunDir;
        uniform float sharp;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 c = h > 0.0
            ? mix(horizon, top, pow(min(h * 1.7, 1.0), 0.6))
            : mix(horizon, bottom, min(-h * 8.0, 1.0));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunColor * (pow(s, sharp) * 8.0 + pow(s, 14.0) * 0.22);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  group.add(sky);

  const starPos = new Float32Array(1600 * 3);
  for (let i = 0; i < 1600; i++) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 0.9 + 0.08, r() * 2 - 1).normalize().multiplyScalar(8500);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  scene.fog = new THREE.Fog(0xe5dccd, 180, 4200);

  // ---------- lights ----------
  const sun = new THREE.DirectionalLight(0xfff0d6, 3);
  sun.position.copy(SUN_DIR).multiplyScalar(40).add(new THREE.Vector3(-2.8, 0, -1.5));
  sun.target.position.set(-2.8, 0, -1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd6e4ff, 0x9c8068, 0.8);
  scene.add(hemi);

  // ---------- ground + avenue ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND;
  group.add(ground);

  const aveTex = T.avenue();
  aveTex.wrapT = THREE.ClampToEdgeWrapping;
  aveTex.repeat.set(300, 1);
  const avenue = new THREE.Mesh(
    new THREE.PlaneGeometry(3000, AVE_W),
    new THREE.MeshStandardMaterial({ map: aveTex, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, GROUND + 0.2, aveZ(AVE_W / 2));
  group.add(avenue);

  // ---------- buildings (one merged mesh) ----------
  const bTex = T.buildingWindows({ seed: 31 });
  const pos = [];
  const nor = [];
  const uvs = [];
  const col = [];
  const idx = [];
  const tmpC = new THREE.Color();
  function quad(a, b, c, d, n, ua, color) {
    const base = pos.length / 3;
    for (const [p, uv] of [[a, ua[0]], [b, ua[1]], [c, ua[2]], [d, ua[3]]]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      uvs.push(uv[0], uv[1]);
      col.push(color.r, color.g, color.b);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Windows line up with each building's corners; offsets shuffle which ones are lit.
  function building(x0, z0, x1, z1, h, hex, y0 = GROUND) {
    const y1 = y0 + h;
    const color = tmpC.set(hex).clone();
    const uo = Math.floor(r() * 8) * 3;
    const vo = Math.floor(r() * 8) * 3.5;
    const W = x1 - x0;
    const D = z1 - z0;
    const v0 = vo;
    const v1 = vo + h;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[uo, v0], [uo + W, v0], [uo + W, v1], [uo, v1]], color);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[uo, v0], [uo + W, v0], [uo + W, v1], [uo, v1]], color);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[uo, v0], [uo + D, v0], [uo + D, v1], [uo, v1]], color);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[uo, v0], [uo + D, v0], [uo + D, v1], [uo, v1]], color);
    const ru = [0.15, 0.15];
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [ru, ru, ru, ru], color.clone().multiplyScalar(0.8));
  }
  const palette = [0xe9dcc6, 0xd9c2a0, 0xe4b9a6, 0xcfc8be, 0xf0e6d6, 0xc98f6c, 0xe6c88f, 0xbfc6cc, 0xe8a9b5, 0xd8d0c4];
  const glassTints = [0x7f9bb8, 0x6d88a6, 0x92a7b8, 0x5f7a92];
  const rooftops = [];

  // Across the avenue: Reforma's front row of towers, then dense blocks.
  for (let bz = aveZ(AVE_W) - 6; bz > -780; bz -= 26) {
    for (let bx = -640; bx < 640; bx += 26) {
      const colIdx = Math.round((bx + 640) / 26);
      if (colIdx % 6 === 0) continue; // cross streets
      if (r() < 0.1) continue;
      const w = 12 + r() * 11;
      const d = 12 + r() * 11;
      const front = bz > -80;
      let h = front ? 30 + r() * 70 : 10 + r() * 26;
      if (!front && r() < 0.08) h += 30 + r() * 40;
      const glassy = h > 55 && r() < 0.6;
      const hex = glassy ? glassTints[Math.floor(r() * glassTints.length)] : palette[Math.floor(r() * palette.length)];
      const x0 = bx + r() * (26 - w);
      const z1 = bz - r() * (26 - d);
      building(x0, z1 - d, x0 + w, z1, h, hex);
      if (h < 40 && r() < 0.6) rooftops.push([x0 + 2 + r() * (w - 4), GROUND + h, z1 - 2 - r() * (d - 4)]);
    }
  }
  // Neighbours on the hotel's own side of the avenue.
  for (const side of [-1, 1]) {
    for (let bx = 28; bx < 640; bx += 24) {
      if (Math.round(bx / 24) % 6 === 0) continue;
      const w = 14 + r() * 8;
      const x0 = side > 0 ? bx : -bx - w;
      const h = 20 + r() * 60;
      const hex = h > 60 && r() < 0.5 ? glassTints[Math.floor(r() * 4)] : palette[Math.floor(r() * palette.length)];
      building(x0, HOTEL_FRONT - 1 - r() * 2, x0 + w, 40, h, hex);
    }
  }
  // Landmark towers along Reforma.
  building(-262, -95, -226, -60, 236, 0x6f8fb0);
  building(-120, -92, -92, -62, 150, 0x7f9bb8);
  building(176, -104, 206, -64, 182, 0x5f7a92);
  building(330, -100, 360, -66, 160, 0x92a7b8);
  building(520, -96, 552, -64, 205, 0x6d88a6);
  // Torre Latinoamericana-style stepped tower in the old centre.
  const tl = [-170, -560];
  building(tl[0] - 17, tl[1] - 17, tl[0] + 17, tl[1] + 17, 100, 0x7d8ea5);
  building(tl[0] - 14, tl[1] - 14, tl[0] + 14, tl[1] + 14, 40, 0x7d8ea5, GROUND + 100);
  building(tl[0] - 10, tl[1] - 10, tl[0] + 10, tl[1] + 10, 22, 0x7d8ea5, GROUND + 140);
  building(tl[0] - 6, tl[1] - 6, tl[0] + 6, tl[1] + 6, 12, 0x7d8ea5, GROUND + 162);
  // The sprawl that runs to the mountains.
  for (let bz = -800; bz > -2800; bz -= 46) {
    for (let bx = -2800; bx < 2800; bx += 46) {
      if (r() < 0.3) continue;
      const w = 18 + r() * 24;
      const d = 18 + r() * 24;
      const h = 6 + r() * 18 + (r() < 0.05 ? 40 : 0);
      building(bx, bz - d, bx + w, bz, h, palette[Math.floor(r() * palette.length)]);
    }
  }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  bGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bGeo.setIndex(idx);
  bGeo.computeBoundingSphere();
  const bMat = new THREE.MeshStandardMaterial({
    map: bTex.map,
    emissiveMap: bTex.emissive,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.05,
  });
  group.add(new THREE.Mesh(bGeo, bMat));
  nightFns.push((n) => (bMat.emissiveIntensity = 1.3 * n * n));

  // Antenna on the stepped tower.
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 44, 8), new THREE.MeshStandardMaterial({ color: 0x8c96a6, metalness: 0.6, roughness: 0.4 }));
  ant.position.set(tl[0], GROUND + 174 + 22, tl[1]);
  group.add(ant);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), beaconMat);
  beacon.position.set(tl[0], GROUND + 219, tl[1]);
  group.add(beacon);
  dyn.push((dt, t) => (beacon.visible = Math.sin(t * 3) > 0));

  // Black rooftop water tanks (tinacos), a classic CDMX skyline detail.
  const tank = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.7, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.7 }), rooftops.length);
  const m4 = new THREE.Matrix4();
  rooftops.forEach(([x, y, z], i) => tank.setMatrixAt(i, m4.makeTranslation(x, y + 0.75, z)));
  group.add(tank);

  // ---------- hotel facade around our room ----------
  const fTex = T.buildingWindows({ seed: 77, bayW: 3.5, floorH: HOTEL_FLOOR_HEIGHT, warm: true });
  const fMat = new THREE.MeshStandardMaterial({ map: fTex.map, emissiveMap: fTex.emissive, emissive: 0xffffff, emissiveIntensity: 0, color: 0xe0cdb0, roughness: 0.85 });
  nightFns.push((n) => (fMat.emissiveIntensity = 1.1 * n * n));
  function facadeBox(x0, y0, z0, x1, y1, z1) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    for (let i = 0; i < uv.count; i++) {
      const f = Math.floor(i / 4);
      const x = p.getX(i) + cx;
      const y = p.getY(i) + cy;
      const z = p.getZ(i) + cz;
      if (f < 2) uv.setXY(i, z, y + 0.6);
      else if (f < 4) uv.setXY(i, 0.1, 0.1);
      else uv.setXY(i, x + 1.75, y + 0.6);
    }
    const m = new THREE.Mesh(g, fMat);
    m.position.set(cx, cy, cz);
    group.add(m);
  }
  // A hole in the building for our suite (x -10.75 .. 5.15, z to 9.15), and
  // behind it the open-air atrium (x -10 .. 9.4, z 9.15 .. 18.95), which
  // js/atrium.js fills with galleries, a lobby and the sky.
  facadeBox(-26, GROUND, HOTEL_FRONT, -10.75, HOTEL_ROOF, 9.15);
  facadeBox(5.15, GROUND, HOTEL_FRONT, 26, HOTEL_ROOF, 9.15);
  facadeBox(-10.75, GROUND, HOTEL_FRONT, 5.15, -0.26, 9.15);
  facadeBox(-10.75, 2.95, HOTEL_FRONT, 5.15, HOTEL_ROOF, 9.15);
  facadeBox(-26, GROUND, 18.95, 26, HOTEL_ROOF, 30);
  facadeBox(-26, GROUND, 9.15, -10, HOTEL_ROOF, 18.95);
  facadeBox(9.4, GROUND, 9.15, 26, HOTEL_ROOF, 18.95);
  // Neighbouring balconies above, below and beside ours.
  const balc = [];
  const lastBalcony = Math.floor((HOTEL_ROOF - 2.95) / HOTEL_FLOOR_HEIGHT);
  for (let k = 1 - SUITE_FLOOR; k <= lastBalcony; k++) {
    for (const x of [-14, 0, 14]) {
      if (k === 0 && x === 0) continue;
      balc.push([x, k * HOTEL_FLOOR_HEIGHT]);
    }
  }
  const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(6.6, 0.25, 1.45), new THREE.MeshStandardMaterial({ color: 0xcdb89a, roughness: 0.9 }), balc.length);
  const railG = new THREE.InstancedMesh(new THREE.BoxGeometry(6.6, 1.0, 0.04), new THREE.MeshStandardMaterial({ color: 0xa9c4d0, transparent: true, opacity: 0.35, roughness: 0.1 }), balc.length);
  const railT = new THREE.InstancedMesh(new THREE.BoxGeometry(6.6, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.5 }), balc.length);
  balc.forEach(([x, y], i) => {
    slab.setMatrixAt(i, m4.makeTranslation(x, y - 0.125, HOTEL_FRONT - 0.725));
    railG.setMatrixAt(i, m4.makeTranslation(x, y + 0.55, HOTEL_FRONT - 1.4));
    railT.setMatrixAt(i, m4.makeTranslation(x, y + 1.03, HOTEL_FRONT - 1.4));
  });
  group.add(slab, railG, railT);

  // ---------- Ángel de la Independencia ----------
  const angel = new THREE.Group();
  angel.position.set(60, GROUND, aveZ(25.9));
  group.add(angel);
  const stone = new THREE.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.85 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b03a, metalness: 1, roughness: 0.28, emissive: 0x6a4a10, emissiveIntensity: 0 });
  nightFns.push((n) => (gold.emissiveIntensity = 1.6 * n));
  const part = (geo, mat, y, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.rotation.y = ry;
    angel.add(m);
    return m;
  };
  part(new THREE.CylinderGeometry(4.8, 5, 0.6, 32), stone, 0.5);
  part(new THREE.BoxGeometry(8, 1.2, 8), stone, 1.3);
  part(new THREE.BoxGeometry(6.5, 5, 6.5), stone, 4.4);
  part(new THREE.BoxGeometry(7.2, 0.6, 7.2), stone, 7.1);
  part(new THREE.CylinderGeometry(1.25, 1.5, 30, 24), stone, 22.4);
  for (const y of [12, 18, 24, 30]) part(new THREE.TorusGeometry(1.42, 0.16, 8, 24), gold, y).rotation.x = Math.PI / 2;
  part(new THREE.BoxGeometry(3.4, 1.6, 3.4), stone, 38.2);
  part(new THREE.CylinderGeometry(1.1, 1.3, 0.8, 16), gold, 39.4);
  part(new THREE.CylinderGeometry(0.35, 0.95, 3.6, 12), gold, 41.6);
  part(new THREE.SphereGeometry(0.42, 12, 10), gold, 43.8);
  for (const s of [-1, 1]) {
    const wing = part(new THREE.BoxGeometry(0.15, 3.4, 1.6), gold, 42.8);
    wing.position.set(s * 0.6, 42.8, 0.6);
    wing.rotation.set(-0.35, s * 0.6, s * 0.35);
  }
  const armR = part(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6), gold, 44.6);
  armR.position.x = 0.5;
  armR.rotation.z = -0.35;
  const laurel = part(new THREE.TorusGeometry(0.45, 0.09, 6, 16), gold, 45.7);
  laurel.position.x = 0.85;
  // Floodlights at night.
  const angelGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 32, 24, 1, true), angelGlowMat);
  glow.position.y = 22.4;
  angel.add(glow);
  nightFns.push((n) => (angelGlowMat.opacity = 0.12 * n));

  // ---------- trees: jacarandas and ash trees ----------
  const treeSpots = [];
  for (let x = -720; x <= 720; x += 9) {
    for (const d of [23.4, 28.4]) if (Math.abs(x - 60) > 9) treeSpots.push([x + r() * 3, aveZ(d)]);
  }
  for (let x = -720; x <= 720; x += 11) {
    if (Math.abs(x) > 7) treeSpots.push([x + r() * 3, aveZ(6.5)]);
    treeSpots.push([x + r() * 3, aveZ(45)]);
  }
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), treeSpots.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 5, 6), new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 }), treeSpots.length);
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const tp = new THREE.Vector3();
  treeSpots.forEach(([x, z], i) => {
    const s = 3 + r() * 1.8;
    trunk.setMatrixAt(i, m4.makeTranslation(x, GROUND + 2.5, z));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6);
    canopy.setMatrixAt(i, m4.compose(tp.set(x, GROUND + 5 + s * 0.6, z), q, sc.set(s, s * 0.8, s)));
    const jac = r() < 0.35;
    canopy.setColorAt(i, new THREE.Color(jac ? 0x9a74cf : [0x4f7a3a, 0x5e8a40, 0x456d36][Math.floor(r() * 3)]));
  });
  group.add(canopy, trunk);

  // ---------- street lamps ----------
  const lampSpots = [];
  for (let x = -720; x <= 720; x += 30) {
    lampSpots.push([x, aveZ(8.6)], [x + 15, aveZ(42.9)], [x + 7, aveZ(21.3)], [x + 22, aveZ(30.5)]);
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 9, 6), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6 }), lampSpots.length);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, emissive: 0xffc77a, emissiveIntensity: 0 });
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    poles.setMatrixAt(i, m4.makeTranslation(x, GROUND + 4.5, z));
    heads.setMatrixAt(i, m4.makeTranslation(x, GROUND + 9.1, z));
  });
  group.add(poles, heads);
  nightFns.push((n) => (lampMat.emissiveIntensity = 4 * n));

  // ---------- traffic ----------
  const lanes = [
    { z: aveZ(11.25), dir: 1, speed: 13 },
    { z: aveZ(14.95), dir: 1, speed: 11 },
    { z: aveZ(18.65), dir: 1, speed: 9 },
    { z: aveZ(33.15), dir: -1, speed: 9.5 },
    { z: aveZ(36.85), dir: -1, speed: 11.5 },
    { z: aveZ(40.55), dir: -1, speed: 13.5 },
  ];
  const cars = [];
  for (const lane of lanes) {
    let x = -700 + r() * 20;
    while (x < 700) {
      cars.push({ lane, x });
      x += 12 + r() * 45;
    }
  }
  const N = cars.length;
  const carCols = [0xf4f4f4, 0xb9bec4, 0x26282c, 0xb8252f, 0x2a4f8f, 0xe0457b, 0xe0457b, 0xf4f4f4, 0x3f6f4a, 0xd9a520];
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(4.3, 1.0, 1.8).translate(0, 0.7, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), N);
  const cabins = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.7, 1.6).translate(-0.2, 1.55, 0), new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: 0.1, metalness: 0.6 }), N);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, fog: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, fog: false });
  const heads2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.3, 1.5).translate(2.2, 0.8, 0), headMat, N);
  const tails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.25, 1.5).translate(-2.2, 0.85, 0), tailMat, N);
  cars.forEach((c, i) => bodies.setColorAt(i, new THREE.Color(carCols[Math.floor(r() * carCols.length)])));
  for (const im of [bodies, cabins, heads2, tails]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    group.add(im);
  }
  const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const noRot = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  dyn.push((dt) => {
    cars.forEach((c, i) => {
      c.x += c.lane.dir * c.lane.speed * dt;
      if (c.x > 720) c.x -= 1440;
      if (c.x < -720) c.x += 1440;
      m4.compose(tp.set(c.x, GROUND + 0.2, c.lane.z), c.lane.dir > 0 ? noRot : flip, one);
      bodies.setMatrixAt(i, m4);
      cabins.setMatrixAt(i, m4);
      heads2.setMatrixAt(i, m4);
      tails.setMatrixAt(i, m4);
    });
    for (const im of [bodies, cabins, heads2, tails]) im.instanceMatrix.needsUpdate = true;
  });
  nightFns.push((n) => {
    headMat.opacity = tailMat.opacity = Math.min(1, n * 1.5);
    heads2.visible = tails.visible = n > 0.02;
  });

  // ---------- volcanoes ----------
  const volcMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  function shade(geo, snowLine) {
    geo.computeVertexNormals();
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    const c = [];
    const rock = new THREE.Color(0x8e97ae);
    const snow = new THREE.Color(0xf3f5fb);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(n.getX(i), n.getY(i), n.getZ(i));
      const light = 0.78 + 0.3 * Math.max(0, v.dot(SUN_DIR));
      const s = p.getY(i) > snowLine + Math.sin(p.getX(i) * 0.01) * 40 ? snow : rock;
      c.push(s.r * light, s.g * light, s.b * light);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return geo;
  }
  // Lathe points run bottom-to-top so the faces point outward.
  const popoPts = [];
  for (let i = 24; i >= 0; i--) {
    const t = i / 24;
    popoPts.push(new THREE.Vector2(60 + 2700 * Math.pow(t, 1.5), 900 * (1 - t)));
  }
  popoPts.push(new THREE.Vector2(0, 870));
  const popo = new THREE.Mesh(shade(new THREE.LatheGeometry(popoPts, 48), 620), volcMat);
  popo.position.set(1400, GROUND, -6600);
  group.add(popo);
  const izta = new THREE.Group();
  izta.position.set(-1100, GROUND, -7200);
  for (const [x, sx, sy, sz] of [[0, 3200, 560, 1100], [-1400, 900, 700, 700], [-200, 1100, 760, 800], [1100, 1000, 690, 700]]) {
    const m = new THREE.Mesh(shade(new THREE.SphereGeometry(1, 36, 18).scale(sx, sy, sz), 470), volcMat);
    m.position.x = x;
    izta.add(m);
  }
  group.add(izta);
  // A plume of steam from Popocatépetl.
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, fog: false, depthWrite: false });
  const plume = new THREE.Group();
  plume.position.set(1400, GROUND + 900, -6600);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(90 + i * 30, 12, 8), plumeMat);
    p.position.set(-i * 90, i * 70, 0);
    plume.add(p);
  }
  group.add(plume);

  // ---------- day / night ----------
  const C = {
    dayTop: 0x3f7fcc,
    dayHorizon: 0xe8dcc8,
    dayBottom: 0xb6aa98,
    nightTop: 0x040817,
    nightHorizon: 0x3a2b45,
    nightBottom: 0x16111c,
  };
  let night = -1;
  function setNight(n) {
    if (Math.abs(n - night) < 1e-4) return;
    night = n;
    const u = sky.material.uniforms;
    u.top.value.copy(lerpColor(C.dayTop, C.nightTop, n));
    u.horizon.value.copy(lerpColor(C.dayHorizon, C.nightHorizon, n));
    u.bottom.value.copy(lerpColor(C.dayBottom, C.nightBottom, n));
    u.sunColor.value.copy(lerpColor(0xfff1c9, 0xb8c8ff, n)).multiplyScalar(1 - 0.75 * n);
    u.sharp.value = 900 + 3000 * n;
    scene.fog.color.copy(lerpColor(C.dayHorizon, C.nightHorizon, n));
    starMat.opacity = Math.max(0, n * 1.2 - 0.2);
    sun.color.copy(lerpColor(0xfff0d6, 0x9db4ff, n));
    sun.intensity = 3.2 * (1 - n) + 0.35 * n;
    hemi.intensity = 0.85 * (1 - n) + 0.06 * n;
    scene.environmentIntensity = 0.4 * (1 - n) + 0.05 * n;
    volcMat.color.setScalar(1 - 0.8 * n);
    plumeMat.opacity = 0.35 * (1 - 0.8 * n);
    for (const f of nightFns) f(n);
  }
  setNight(0);

  const fog = scene.fog;
  return {
    sun,
    setNight,
    update(dt, t) {
      for (const f of dyn) f(dt, t);
    },
    // Hide the whole outdoors (and its sun) while we're inside the arena.
    setActive(on) {
      group.visible = on;
      sun.visible = on;
      hemi.visible = on;
      scene.fog = on ? fog : null;
      if (on) {
        const n = night;
        night = -1;
        setNight(Math.max(0, n));
      }
    },
  };
}
