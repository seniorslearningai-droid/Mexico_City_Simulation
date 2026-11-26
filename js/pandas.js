// The giant panda exhibit at Chapultepec Zoo (Pabellón del Panda), home to
// one panda, Xin Xin. She keeps to herself: munching bamboo, wandering,
// sitting by the pool and napping. Everything is in meters; north is -z.
//
//         rock cliff · cave · bamboo
//   +----------------------------------+ . . . . . .
//   |  tower                waterfall  |   panda     .
//   |                         pool     |   house     .
//   |      Xin Xin's bamboo pile       |             .
//   +=====glass=====glass=====glass====+ . . . . . .
//     sign  keeper    photo   signs
//       bench      ( terrace )   bench
//                ====== gate ======
//          kiosk     ( plaza )     bench
//                  you start here
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { meterUV } from './room.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const Y = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const YARD = { x0: -16, x1: 15.5, z0: -28, z1: -1 }; // the panda's outdoor yard
const GLASS_Z = -1; // the glass wall along the front of the yard
const GATE_Z = 12;
const POOL = { x: 7, z: -10, a: 4.6, b: 3.2 };
const FALLS = { x: 7, z: -13.45 };
const TOWER = { x: -8, z: -13, half: 1.3, top: 3.0 }; // a climbing frame (scenery)
const PILE = { x: -1.5, z: -4.4 }; // the keepers' bamboo pile, near the glass
const BOUNDS = { x0: -14.4, x1: 14.2, z0: -26.2, z1: -2.3 }; // where the panda can walk
export const PANDA_SPAWN = { x: 0, z: 21.5, yaw: 0, pitch: -0.02 };

// Where visitors can walk (rectangles for the centre of the player).
const WALK = [
  { x0: -14.6, x1: 15.1, z0: GLASS_Z + 0.45, z1: GATE_Z - 0.3 }, // terrace
  { x0: -6.6, x1: 6.6, z0: GATE_Z - 0.4, z1: 24.6 }, // entrance plaza
];

// Things the panda walks around.
const OBST = [
  { x: POOL.x, z: POOL.z - 0.6, a: POOL.a + 0.8, b: POOL.b + 1.4 }, // pool and waterfall rocks
  { x: TOWER.x, z: TOWER.z, r: 2.1 },
  { x: -4.5, z: -20, r: 1.4 }, // boulders
  { x: 11, z: -19, r: 1.1 },
  { x: 1.5, z: -16.5, r: 1.3 }, // a fallen log
  { x: PILE.x, z: PILE.z + 0.15, r: 0.9 }, // the bamboo pile
  { x: -11.8, z: -9.5, r: 0.8 }, // trees
  { x: 12.4, z: -24.4, r: 0.8 },
  { x: 3.5, z: -23.5, r: 0.8 },
];
const GROVES = [[-14.2, -5.5], [-14.4, -15], [-12.5, -25.4], [-0.5, -26.2], [9.5, -26.1], [14.3, -21], [14.3, -13.6]];

const POSES = {
  stand: { hy: 0.55, pitch: 0, head: 0.08, fl: 0, fr: 0, hl: 0, hr: 0 },
  sit: { hy: 0.3, pitch: -1.05, head: 0.85, fl: -0.45, fr: -0.45, hl: -0.3, hr: -0.3 },
  eat: { hy: 0.3, pitch: -1.05, head: 0.8, fl: -0.95, fr: -1.15, hl: -0.3, hr: -0.3 },
  lie: { hy: 0.36, pitch: 0, head: 0.3, fl: -1.35, fr: -1.35, hl: 1.3, hr: 1.3 },
};

const KEEPER_FACTS = [
  '“Xin Xin eats bamboo almost all day — and she’s picky about which stalks she likes!” says the keeper.',
  '“Pandas are bears, but nearly everything they eat is bamboo.”',
  '“After a big meal she likes a nap — sprawled out flat on her tummy.”',
  '“Baby pandas are born pink, blind and tiny — about the size of a stick of butter!”',
];

export function buildPandas(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const shadowLights = [];
  const occluders = []; // solid things that block your view of the panda
  const rand = T.rng(2024);
  const api = {
    group,
    colliders,
    shadowLights,
    dirty: true,
    floorAt: () => 0,
    limit,
    update,
    state: { water: 0, mist: 0, calm: 0 },
    panda: null,
  };

  // ---------- materials ----------
  const M = {
    floor: std({ map: T.forestFloor(), roughness: 1 }),
    grass: std({ map: T.grass(), roughness: 1 }),
    paving: std({ map: T.paving(), color: 0xbab3a6, roughness: 0.9 }),
    dirt: std({ map: T.gravel(), color: 0x9a7a55, roughness: 1 }),
    red: std({ color: 0xb02428, roughness: 0.45 }),
    gold: std({ color: 0xe0b040, roughness: 0.35, metalness: 0.5 }),
    tile: std({ map: T.roofTiles(), roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
    tileTrim: std({ color: 0x1f4d36, roughness: 0.4 }),
    wall: std({ map: T.plaster(), color: 0xf2ece0, roughness: 0.95 }),
    stone: std({ map: T.paving(), color: 0xc8c0b0, roughness: 0.9 }),
    wood: std({ map: T.woodGrain(), color: 0x8a6440, roughness: 0.7 }),
    darkWood: std({ map: T.woodGrain(), color: 0x5a3e28, roughness: 0.75 }),
    log: std({ map: T.woodGrain(), color: 0x6e5034, roughness: 0.9 }),
    bark: std({ map: T.woodGrain(), color: 0x4a3626, roughness: 1 }),
    iron: std({ color: 0x2a2c2a, metalness: 0.5, roughness: 0.5 }),
    hedge: std({ color: 0x3f6a32, roughness: 0.9, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0xd8eef2, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    vertex: std({ vertexColors: true, roughness: 0.75 }),
    vertexDS: std({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }),
    fur: std({ vertexColors: true, roughness: 0.95 }),
    rock: std({ vertexColors: true, roughness: 0.95, flatShading: true }),
    leaf: std({ roughness: 0.85, flatShading: true }),
    bamboo: std({ map: T.bamboo(), roughness: 0.55 }),
    bambooLeaf: std({ color: 0x5f9a3a, roughness: 0.8, side: THREE.DoubleSide }),
    black: std({ color: 0x0c0a08, roughness: 1 }),
  };
  const waterTex = T.waterNormals();
  const waterMat = std({ color: 0x2f6f73, roughness: 0.08, metalness: 0.2, normalMap: waterTex, normalScale: new THREE.Vector2(0.5, 0.5), transparent: true, opacity: 0.9 });
  const fallsTex = T.waterfall();
  const fallsMat = new THREE.MeshStandardMaterial({ map: fallsTex, transparent: true, opacity: 0.85, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const shadowMat = new THREE.MeshBasicMaterial({ map: T.blobShadow(), transparent: true, depthWrite: false });

  // ---------- helpers ----------
  const add = (p, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    p.add(mesh);
    return mesh;
  };
  const box = (p, mat, w, h, d, x, y, z) => add(p, new THREE.Mesh(meterUV(new THREE.BoxGeometry(w, h, d)), mat), x, y, z);
  const cyl = (p, mat, rt, rb, h, x, y, z, seg = 12) => add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z);
  const node = (p, x = 0, y = 0, z = 0, ry = 0) => {
    const g = add(p, new THREE.Group(), x, y, z);
    g.rotation.y = ry;
    return g;
  };
  const aabb = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1, off: false });
  const post = (x, z, r) => colliders.push({ x, z, r, off: false });
  const interact = (objs, def) => {
    for (const o of [].concat(objs)) o.traverse((c) => (c.userData.interact = def));
    return def;
  };
  const cast = (...objs) => objs.forEach((o) => o.traverse((c) => (c.userData.cast = true)));
  const noRay = (...objs) => objs.forEach((o) => o.traverse((c) => (c.raycast = () => {})));
  const lookYaw = (x, z, tx, tz) => Math.atan2(x - tx, z - tz);
  function tint(geo, hex) {
    const c = new THREE.Color(hex);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }
  const part = (geo, hex, s = [1, 1, 1], t = [0, 0, 0], r = [0, 0, 0]) =>
    tint(geo.scale(s[0], s[1], s[2]).rotateX(r[0]).rotateY(r[1]).rotateZ(r[2]).translate(t[0], t[1], t[2]), hex);
  // A flat shape lying on the ground, UVs in meters.
  function flat(parent, mat, geo, x, y, z) {
    const uv = geo.attributes.uv;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const m = add(parent, new THREE.Mesh(geo, mat), x, y, z);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  const rect = (parent, mat, x0, x1, z0, z1, y = 0.01) => flat(parent, mat, new THREE.PlaneGeometry(x1 - x0, z1 - z0).translate((x0 + x1) / 2, -(z0 + z1) / 2, 0), 0, y, 0);
  const ellipse = (parent, mat, a, b, x, y, z) => flat(parent, mat, new THREE.CircleGeometry(1, 48).scale(a, b, 1), x, y, z);

  // A Chinese-style hip roof: base at y = 0, ridge along z. Tiles run up the slopes.
  function roofGeo(w, d, h) {
    const hw = w / 2;
    const hd = d / 2;
    const rz = Math.max(0.05, hd - hw * 0.9);
    const sw = Math.hypot(hw, h);
    const sd = Math.hypot(hd - rz, h);
    const A = [-hw, 0, -hd];
    const B = [hw, 0, -hd];
    const C = [hw, 0, hd];
    const D = [-hw, 0, hd];
    const R1 = [0, h, -rz];
    const R2 = [0, h, rz];
    const pos = [];
    const uv = [];
    const tri = (a, b, c, ua, ub, uc) => {
      pos.push(...a, ...b, ...c);
      uv.push(...ua, ...ub, ...uc);
    };
    tri(B, R1, R2, [-hd, 0], [-rz, sw], [rz, sw]);
    tri(B, R2, C, [-hd, 0], [rz, sw], [hd, 0]);
    tri(D, R2, R1, [hd, 0], [rz, sw], [-rz, sw]);
    tri(D, R1, A, [hd, 0], [-rz, sw], [-hd, 0]);
    tri(A, R1, B, [-hw, 0], [0, sd], [hw, 0]);
    tri(C, R2, D, [hw, 0], [0, sd], [-hw, 0]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  // Roof with upturned corners and a ridge beam; ridge along z unless alongX.
  function roof(parent, w, d, h, x, y, z, alongX = false) {
    const r = node(parent, x, y, z, alongX ? Math.PI / 2 : 0);
    const W2 = w; // across the ridge
    const D2 = d; // along the ridge
    add(r, new THREE.Mesh(roofGeo(W2, D2, h), M.tile));
    const rz = Math.max(0.05, D2 / 2 - (W2 / 2) * 0.9);
    box(r, M.tileTrim, 0.22, 0.2, rz * 2 + 0.4, 0, h + 0.05, 0);
    for (const s of [-1, 1]) {
      const tip = add(r, new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), M.gold), 0, h + 0.3, s * (rz + 0.2));
      tip.rotation.x = s * 0.4;
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = add(r, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 6), M.tileTrim), (sx * W2) / 2, 0.12, (sz * D2) / 2);
        horn.rotation.set(sz * 0.6, 0, -sx * 0.6);
      }
    }
    cast(r);
    return r;
  }
  // Red paper lantern with gold caps and a tassel.
  function lantern(parent, x, y, z, s = 1) {
    const l = node(parent, x, y, z);
    l.scale.setScalar(s);
    const body = add(l, new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), std({ color: 0xd0282a, emissive: 0x5a0a08, roughness: 0.6 })));
    body.scale.y = 1.2;
    cyl(l, M.gold, 0.12, 0.14, 0.06, 0, 0.29, 0, 10);
    cyl(l, M.gold, 0.14, 0.12, 0.06, 0, -0.29, 0, 10);
    add(l, new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.26, 6), M.gold), 0, -0.44, 0).rotation.x = Math.PI;
    return l;
  }
  function lanternPost(x, z, facing = 0) {
    const p = node(group, x, 0, z, facing);
    cyl(p, M.darkWood, 0.06, 0.08, 2.9, 0, 1.45, 0, 8);
    box(p, M.darkWood, 0.06, 0.06, 0.6, 0, 2.85, 0.28);
    cyl(p, M.iron, 0.008, 0.008, 0.22, 0, 2.72, 0.55, 4);
    lantern(p, 0, 2.32, 0.55, 0.9);
    cast(p);
    post(x, z, 0.12);
  }
  function bench(x, z, yaw, label, toastMsg) {
    const bg = node(group, x, 0, z, yaw);
    for (let i = 0; i < 4; i++) box(bg, M.wood, 1.7, 0.04, 0.1, 0, 0.45, -0.18 + i * 0.12);
    for (let i = 0; i < 3; i++) box(bg, M.wood, 1.7, 0.1, 0.035, 0, 0.62 + i * 0.13, 0.24);
    for (const dx of [-0.7, 0.7]) {
      box(bg, M.iron, 0.05, 0.45, 0.5, dx, 0.225, 0);
      box(bg, M.iron, 0.05, 0.42, 0.04, dx, 0.66, 0.24);
    }
    cast(bg);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    if (Math.abs(c) > 0.5) aabb(x - 0.9, x + 0.9, z - 0.3, z + 0.3);
    else aabb(x - 0.3, x + 0.3, z - 0.9, z + 0.9);
    interact(bg, {
      label: () => label,
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(x - sn * 0.08, 1.15, z - c * 0.08), yaw, pitch: -0.05, calm: true });
        ctx.toast(toastMsg);
      },
    });
  }
  function signPost(x, z, yaw, title, sub, fact) {
    const sg = node(group, x, 0, z, yaw);
    for (const dx of [-0.42, 0.42]) box(sg, M.darkWood, 0.06, 1.0, 0.06, dx, 0.5, -0.02);
    const board = add(sg, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), std({ map: T.pandaSign(title, sub), roughness: 0.7 })), 0, 1.18, 0.02);
    board.rotation.x = -0.2;
    box(sg, M.red, 1.08, 0.83, 0.04, 0, 1.18, -0.01).rotation.x = -0.2;
    cast(sg);
    aabb(x - 0.5, x + 0.5, z - 0.1, z + 0.1);
    interact(sg, {
      label: () => 'Read the sign',
      act: () => {
        ctx.toast(fact, 6000);
        ctx.complete('pSign');
      },
    });
  }
  // A wall of piled-up boulders along a line (one merged mesh).
  const rockShades = [0x8a8274, 0x7a7266, 0x9a9284, 0x6e675c, 0xa09886];
  function rockPile(pts, height, out, skip) {
    const geos = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const nx = (-(z1 - z0) / len) * out;
      const nz = ((x1 - x0) / len) * out;
      for (let d = 0; d < len; d += 1.25) {
        const k = d / len;
        const x = x0 + (x1 - x0) * k;
        const z = z0 + (z1 - z0) * k;
        const h = typeof height === 'function' ? height(x, z) : height;
        for (let y = 0; y < h; y += 1.0) {
          if (skip && skip(x, y, z)) continue;
          const r = 0.75 + rand() * 0.55;
          const off = r * 0.45 + rand() * 0.4;
          geos.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[Math.floor(rand() * rockShades.length)], [r * 1.25, r * 0.95, r * 1.1], [x + nx * off + (rand() - 0.5) * 0.3, y + r * 0.55, z + nz * off + (rand() - 0.5) * 0.3], [rand() * 3, rand() * 3, rand() * 3]));
        }
      }
    }
    const m = add(group, new THREE.Mesh(mergeGeometries(geos), M.rock));
    cast(m);
    occluders.push(m);
    return m;
  }

  // ---------- where you can walk ----------
  function limit(p) {
    let bx = 0;
    let bz = 0;
    let bd = Infinity;
    for (const w of WALK) {
      const cx = clamp(p.x, w.x0, w.x1);
      const cz = clamp(p.z, w.z0, w.z1);
      const d = (p.x - cx) ** 2 + (p.z - cz) ** 2;
      if (d === 0) return;
      if (d < bd) {
        bd = d;
        bx = cx;
        bz = cz;
      }
    }
    p.x = bx;
    p.z = bz;
  }

  // ---------- sky, sun, ground ----------
  const sunDir = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { sunDir: { value: sunDir } },
      vertexShader: `varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 sunDir; varying vec3 vDir;
        void main() {
          float h = max(vDir.y, 0.0);
          vec3 c = mix(vec3(0.82, 0.88, 0.84), vec3(0.34, 0.58, 0.88), pow(h, 0.55));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          c += vec3(1.0, 0.95, 0.8) * (pow(s, 700.0) * 6.0 + pow(s, 10.0) * 0.18);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  group.add(sky);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 30, far: 220 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  sun.target.position.set(4, 0, -3);
  sun.position.copy(sunDir).multiplyScalar(110).add(sun.target.position);
  group.add(sun, sun.target);
  shadowLights.push(sun);
  group.add(new THREE.HemisphereLight(0xd2e4ff, 0x4a4a32, 0.85));
  {
    const g = new THREE.PlaneGeometry(800, 800);
    const uv = g.attributes.uv;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const ground = new THREE.Mesh(g, M.floor);
    ground.rotation.x = -Math.PI / 2;
    group.add(ground);
  }
  // Paving for the terrace and plaza, grass in the yard.
  rect(group, M.paving, -15, 15.5, -0.8, GATE_Z + 0.2, 0.012);
  rect(group, M.paving, -7.2, 7.2, GATE_Z - 0.2, 25.4, 0.013);
  rect(group, M.grass, YARD.x0, YARD.x1, YARD.z0 - 1, YARD.z1, 0.01);
  ellipse(group, M.dirt, 2.4, 1.6, PILE.x, 0.015, PILE.z - 0.6);
  ellipse(group, M.dirt, 3.2, 2.4, TOWER.x + 1, 0.015, TOWER.z);

  // ---------- the yard's front: low stone wall topped with glass ----------
  {
    const len = YARD.x1 - YARD.x0;
    const cx = (YARD.x0 + YARD.x1) / 2;
    const base = box(group, M.stone, len, 0.75, 0.4, cx, 0.375, GLASS_Z);
    box(group, M.darkWood, len, 0.08, 0.5, cx, 0.79, GLASS_Z);
    cast(base);
    const glass = add(group, new THREE.Mesh(new THREE.PlaneGeometry(len, 1.15), M.glass), cx, 1.4, GLASS_Z);
    noRay(glass);
    const posts = [];
    for (let x = YARD.x0; x <= YARD.x1 + 0.01; x += len / 12) posts.push(new THREE.BoxGeometry(0.07, 1.25, 0.07).translate(x, 1.4, GLASS_Z));
    posts.push(new THREE.BoxGeometry(len, 0.06, 0.09).translate(cx, 2.0, GLASS_Z));
    cast(add(group, new THREE.Mesh(mergeGeometries(posts), M.iron)));
  }

  // ---------- rock walls around the yard ----------
  rockPile([[-16.6, -1.3], [-16.8, -15], [-16.6, -28.6]], (x, z) => lerp(1.6, 3.6, clamp(-z / 10, 0, 1)), -1);
  rockPile([[-16.6, -28.9], [16.8, -28.9]], (x) => 5 + Math.sin(x * 0.4) * 0.8, -1, (x, y) => x > -4.8 && x < -1.7 && y < 2.4);
  rockPile([[16.6, -28.6], [16.4, -9.3]], 3.6, -1);
  // The cave in the cliff.
  {
    box(group, M.black, 2.6, 2.3, 1.6, -3.25, 1.15, -30.0);
    const arch = [];
    for (let i = 0; i < 4; i++) arch.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i], [1.2, 0.8, 1.1], [-4.6 + i * 0.9, 2.9 + Math.sin(i) * 0.15, -29.2], [i, i * 2, 0]));
    cast(add(group, new THREE.Mesh(mergeGeometries(arch), M.rock)));
  }

  // ---------- bamboo ----------
  const stalks = []; // [x, z, height, radius, tiltX, tiltZ]
  function grove(cx, cz, n, rad, hMin = 4, hMax = 7) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rad;
      stalks.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, hMin + rand() * (hMax - hMin), 0.03 + rand() * 0.035, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12]);
    }
  }
  GROVES.forEach(([x, z]) => grove(x, z, 16, 1.6));
  // Behind the rock walls and around the terrace.
  for (let x = -20; x <= 20; x += 2.6) grove(x + (rand() - 0.5), -31.5 - rand() * 2, 7, 1.4, 6, 9);
  for (let z = -28; z <= -2; z += 2.6) grove(-19.5 - rand() * 1.5, z, 6, 1.3, 5, 8);
  for (let z = -28; z <= -10; z += 2.6) grove(19 + rand(), z, 6, 1.3, 5, 8);
  for (let z = 1; z <= 11; z += 2.2) grove(-16.2, z, 5, 0.6, 3.5, 6);
  for (let z = 6.8; z <= 11.5; z += 1.6) grove(16.4, z, 5, 0.5, 3.5, 6);
  for (const sx of [-1, 1]) grove(sx * 6.25, GATE_Z, 6, 0.55, 3, 5);
  {
    const stalkGeo = new THREE.CylinderGeometry(1, 1, 1, 7, 1, true).translate(0, 0.5, 0);
    const sm = new THREE.InstancedMesh(stalkGeo, M.bamboo, stalks.length);
    const spray = mergeGeometries(
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return new THREE.PlaneGeometry(0.07, 0.5).translate(0, -0.25, 0).rotateX(-1.1 - (i % 2) * 0.3).rotateY(a);
      }),
    );
    const sprays = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    stalks.forEach(([x, z, h, r, tx, tz], i) => {
      q.setFromEuler(new THREE.Euler(tx, 0, tz));
      sm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(r, h, r)));
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      for (let k = 0; k < 5; k++) {
        const u = 0.5 + k * 0.12 + rand() * 0.05;
        sprays.push([x + up.x * h * u, h * u * up.y, z + up.z * h * u, 0.8 + rand() * 0.6, rand() * 6]);
      }
    });
    const lm = new THREE.InstancedMesh(spray, M.bambooLeaf, sprays.length);
    const c = new THREE.Color();
    sprays.forEach(([x, y, z, s, a], i) => {
      lm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(Y, a), new THREE.Vector3(s, s, s)));
      lm.setColorAt(i, c.setHSL(0.24 + rand() * 0.06, 0.5, 0.3 + rand() * 0.15));
    });
    group.add(sm, lm);
    cast(sm, lm);
    noRay(sm, lm);
  }

  // ---------- inside the yard ----------
  // Pool with a waterfall tumbling off a pile of rocks.
  ellipse(group, M.dirt, POOL.a + 0.5, POOL.b + 0.5, POOL.x, 0.02, POOL.z);
  ellipse(group, waterMat, POOL.a, POOL.b, POOL.x, 0.05, POOL.z);
  {
    const rim = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2;
      const r = 0.35 + rand() * 0.25;
      rim.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i % 5], [r * 1.3, r * 0.7, r], [POOL.x + Math.cos(a) * (POOL.a + 0.25), r * 0.3, POOL.z + Math.sin(a) * (POOL.b + 0.25)], [rand(), rand() * 6, rand()]));
    }
    for (let i = 0; i < 9; i++) {
      const r = 0.8 + rand() * 0.5;
      rim.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i % 5], [r * 1.2, r, r], [FALLS.x - 2 + (i % 3) * 2 + (rand() - 0.5) * 0.4, 0.4 + Math.floor(i / 3) * 0.85, FALLS.z - 1.3 - rand() * 0.4], [rand(), rand() * 6, rand()]));
    }
    cast(add(group, new THREE.Mesh(mergeGeometries(rim), M.rock)));
    const falls = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), fallsMat), FALLS.x, 1.2, FALLS.z);
    falls.rotation.x = -0.12;
    noRay(falls);
  }
  const foam = add(group, new THREE.Mesh(new THREE.RingGeometry(0.2, 0.9, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })), FALLS.x, 0.07, FALLS.z + 0.35);
  noRay(foam);

  // A wooden climbing tower with a tire swing (just scenery — Xin Xin prefers the ground).
  {
    const tg = node(group);
    const h = TOWER.top;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(tg, M.log, 0.13, 0.16, h + 1.2, TOWER.x + sx * TOWER.half, (h + 1.2) / 2, TOWER.z + sz * TOWER.half, 10);
    for (let i = 0; i < 9; i++) box(tg, M.wood, TOWER.half * 2 + 0.3, 0.08, 0.27, TOWER.x, h - 0.04, TOWER.z - TOWER.half + 0.15 + i * 0.29);
    for (const sz of [-1, 1]) box(tg, M.log, TOWER.half * 2 + 0.3, 0.16, 0.16, TOWER.x, h - 0.16, TOWER.z + sz * TOWER.half);
    cyl(tg, M.iron, 0.01, 0.01, 1.6, TOWER.x, h - 1.0, TOWER.z, 4);
    const tire = add(tg, new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 18), std({ color: 0x1a1a1a, roughness: 0.9 })), TOWER.x, h - 1.9, TOWER.z);
    tire.rotation.y = 0.5;
    cast(tg);
  }
  // Boulders, a fallen log, and the keepers' bamboo pile by the glass.
  {
    const bl = [];
    for (const [x, z, r] of [[-4.5, -20, 1.2], [11, -19, 0.9], [-10.5, -21, 0.7], [12.8, -4, 0.6]]) bl.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[Math.floor(rand() * 5)], [r * 1.3, r * 0.8, r], [x, r * 0.45, z], [rand(), rand() * 6, rand()]));
    cast(add(group, new THREE.Mesh(mergeGeometries(bl), M.rock)));
    const log = cyl(group, M.log, 0.32, 0.36, 3.2, 1.5, 0.33, -16.5, 12);
    log.rotation.set(0, 0.6, Math.PI / 2);
    cast(log);
    const pile = node(group, PILE.x, 0, PILE.z + 0.15, 0.25);
    for (let i = 0; i < 14; i++) {
      const s = cyl(pile, M.bamboo, 0.03, 0.03, 1.5 + rand() * 0.4, (rand() - 0.5) * 0.3, 0.04 + Math.floor(i / 5) * 0.055, (i % 5) * 0.07 - 0.14, 6);
      s.rotation.set(0, (rand() - 0.5) * 0.4, Math.PI / 2);
    }
    for (let i = 0; i < 5; i++) {
      const lf = add(pile, new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), M.bambooLeaf), (i - 2) * 0.35, 0.12, (rand() - 0.5) * 0.3);
      lf.scale.set(1.4, 0.4, 1);
    }
    cast(pile);
  }

  // ---------- the panda house (her indoor den; keepers only) ----------
  {
    const hg = node(group);
    const H = 3.4;
    const wall = (x0, x1, z0, z1) => {
      const m = box(hg, M.wall, x1 - x0, H, z1 - z0, (x0 + x1) / 2, H / 2, (z0 + z1) / 2);
      occluders.push(m);
    };
    wall(15.5, 15.8, -9, 6);
    wall(15.5, 27, -9, -8.7);
    wall(26.7, 27, -9, 6);
    wall(15.5, 27, 5.7, 6);
    // Her door out into the yard (dark inside), and the keepers' red doors on the terrace side.
    box(hg, M.black, 0.04, 2.3, 2.2, 15.48, 1.15, -4.8);
    box(hg, M.darkWood, 0.08, 0.12, 2.4, 15.46, 2.36, -4.8);
    const doorParts = [];
    for (const s of [-1, 1]) {
      doorParts.push(box(hg, M.red, 0.06, 2.4, 1.0, 15.46, 1.2, 3 + s * 0.51));
      doorParts.push(add(hg, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), M.gold), 15.42, 1.2, 3 + s * 0.12));
      doorParts[doorParts.length - 1].rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) doorParts.push(add(hg, new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), M.gold), 15.42, 0.5 + i * 0.5, 3 + (j - 1) * 0.6));
    box(hg, M.darkWood, 0.1, 0.12, 2.2, 15.45, 2.46, 3);
    interact(doorParts, {
      label: () => 'Knock on the panda house door',
      act: () => ctx.toast('The panda house is for keepers only. Xin Xin goes in there to sleep at night.'),
    });
    // Red columns, a painted frieze under the eaves and the green tiled roof.
    const cols = [];
    for (const z of [-9, -4.8 - 1.25, -4.8 + 1.25, 1.6, 4.4, 6]) cols.push([15.38, z]);
    for (const x of [19.3, 23.1, 27.1]) cols.push([x, 6.12]);
    cols.push([27.12, -9.1]);
    for (const [x, z] of cols) cyl(hg, M.red, 0.17, 0.19, H, x, H / 2, z, 12);
    box(hg, M.red, 0.12, 0.3, 15.3, 15.36, H - 0.15, -1.5);
    box(hg, M.red, 11.8, 0.3, 0.12, 21.25, H - 0.15, 6.12);
    box(hg, M.gold, 0.13, 0.05, 15.3, 15.35, H - 0.3, -1.5);
    box(hg, M.gold, 11.8, 0.05, 0.13, 21.25, H - 0.3, 6.13);
    roof(group, 13.4, 16.9, 2.3, 21.25, H + 0.1, -1.5);
    const sign = add(hg, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: T.boardSign('熊猫馆', 'CASA DEL PANDA'), toneMapped: false })), 15.3, 3.0, 3);
    sign.rotation.y = -Math.PI / 2;
    for (const z of [1.6, 4.4]) lantern(hg, 15.0, 2.6, z, 0.8);
    cast(hg);
  }

  // ---------- the entrance gate (paifang) ----------
  {
    const gg = node(group, 0, 0, GATE_Z);
    for (const [x, h] of [[-5, 3.8], [-2.2, 4.6], [2.2, 4.6], [5, 3.8]]) {
      cyl(gg, M.red, 0.2, 0.22, h, x, h / 2, 0, 14);
      box(gg, M.stone, 0.62, 0.45, 0.62, x, 0.225, 0);
      post(x, GATE_Z, 0.33);
    }
    box(gg, M.red, 5.2, 0.32, 0.3, 0, 4.15, 0);
    box(gg, M.red, 4.4, 0.24, 0.26, 0, 3.45, 0);
    box(gg, M.gold, 5.2, 0.07, 0.31, 0, 4.0, 0);
    for (const s of [-1, 1]) {
      box(gg, M.red, 3.2, 0.26, 0.26, s * 3.6, 3.35, 0);
      box(gg, M.red, 2.8, 0.2, 0.22, s * 3.6, 2.85, 0);
      box(gg, M.gold, 3.2, 0.05, 0.27, s * 3.6, 3.23, 0);
    }
    const board = new THREE.MeshBasicMaterial({ map: T.boardSign('大熊猫', 'PANDA GIGANTE'), toneMapped: false });
    add(gg, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), board), 0, 3.8, 0.16);
    add(gg, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), board), 0, 3.8, -0.16).rotation.y = Math.PI;
    roof(gg, 1.5, 6.0, 0.9, 0, 4.32, 0, true);
    for (const s of [-1, 1]) roof(gg, 1.3, 3.7, 0.65, s * 3.6, 3.48, 0, true);
    for (const x of [-1.3, 0, 1.3]) {
      cyl(gg, M.iron, 0.006, 0.006, 0.3, x, 3.2, 0, 4);
      lantern(gg, x, x === 0 ? 2.85 : 2.95, 0, 0.85);
    }
    cast(gg);
    // Planters with bamboo either side.
    for (const s of [-1, 1]) {
      box(group, M.stone, 1.9, 0.5, 1.2, s * 6.25, 0.25, GATE_Z);
      aabb(s > 0 ? 5.3 : -7.2, s > 0 ? 7.2 : -5.3, GATE_Z - 0.6, GATE_Z + 0.6);
    }
  }
  // Low walls closing off the terrace, hedges along the plaza.
  {
    const wg = node(group);
    const w = (x0, x1, z0, z1, h = 1.1) => {
      box(wg, M.wall, x1 - x0, h, z1 - z0, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
      box(wg, M.tileTrim, x1 - x0 + 0.1, 0.1, z1 - z0 + 0.1, (x0 + x1) / 2, h + 0.05, (z0 + z1) / 2);
    };
    w(-15.4, -7.2, GATE_Z - 0.15, GATE_Z + 0.15);
    w(7.2, 15.8, GATE_Z - 0.15, GATE_Z + 0.15);
    w(-15.4, -15.1, -1.2, GATE_Z + 0.15);
    w(15.5, 15.8, 6, GATE_Z + 0.15);
    cast(wg);
    const hedges = [];
    for (const s of [-1, 1]) hedges.push(new THREE.BoxGeometry(0.9, 1.0, 13.4).translate(s * 7.65, 0.5, GATE_Z + 6.8));
    hedges.push(new THREE.BoxGeometry(16.2, 1.0, 0.9).translate(0, 0.5, 25.8));
    cast(add(group, new THREE.Mesh(mergeGeometries(hedges), M.hedge)));
  }

  // ---------- lanterns, benches ----------
  lanternPost(-6.6, GATE_Z + 1.6, Math.PI / 2);
  lanternPost(6.6, GATE_Z + 1.6, -Math.PI / 2);
  lanternPost(-6.6, 22.6, Math.PI / 2);
  lanternPost(6.6, 22.6, -Math.PI / 2);
  lanternPost(-14.4, 3, Math.PI / 2);
  lanternPost(-14.4, 9.5, Math.PI / 2);
  lanternPost(14.8, 9.5, -Math.PI / 2);
  bench(-8.5, 8.4, 0, 'Sit and watch Xin Xin', 'You sit and watch Xin Xin for a while. Listen for the crunch of bamboo!');
  bench(5.5, 8.4, 0, 'Sit and watch Xin Xin', 'You sit and watch Xin Xin for a while. Listen for the crunch of bamboo!');
  bench(6.2, 18.2, Math.PI / 2, 'Sit on the bench', 'You sit by the lanterns and people-watch. Everyone’s heading in to see the panda!');

  // ---------- the panda model ----------
  const FW = 0xf3f1ea;
  const FB = 0x1d1c20;
  const PG = {
    body: mergeGeometries([
      part(new THREE.SphereGeometry(0.42, 18, 14), FW, [1, 0.95, 1.55], [0, 0.02, 0.32]),
      part(new THREE.SphereGeometry(0.44, 18, 12), FB, [0.88, 0.86, 0.42], [0, 0.04, 0.68]),
      part(new THREE.SphereGeometry(0.075, 8, 6), FW, [1, 0.8, 1], [0, 0.14, -0.31]),
    ]),
    head: mergeGeometries([
      part(new THREE.SphereGeometry(0.3, 18, 14), FW, [1.05, 0.95, 0.95], [0, 0.06, 0.16]),
      part(new THREE.SphereGeometry(0.14, 12, 10), FW, [1, 0.75, 1], [0, -0.04, 0.39]),
      part(new THREE.SphereGeometry(0.045, 8, 6), FB, [1.3, 0.8, 1], [0, 0.0, 0.52]),
      ...[-1, 1].flatMap((s) => [
        part(new THREE.SphereGeometry(0.1, 10, 8), FB, [1, 1, 0.55], [s * 0.21, 0.31, 0.06]),
        part(new THREE.SphereGeometry(0.085, 10, 8), FB, [0.85, 1.25, 0.55], [s * 0.115, 0.09, 0.395], [0, 0, s * 0.5]),
        part(new THREE.SphereGeometry(0.022, 8, 6), 0x3a2a1a, [1, 1, 1], [s * 0.118, 0.1, 0.435]),
        part(new THREE.SphereGeometry(0.008, 6, 4), 0xffffff, [1, 1, 1], [s * 0.11, 0.113, 0.454]),
      ]),
    ]),
    front: mergeGeometries([
      part(new THREE.SphereGeometry(0.15, 10, 8), FB),
      part(new THREE.CylinderGeometry(0.115, 0.1, 0.42, 10), FB, [1, 1, 1], [0, -0.22, 0]),
      part(new THREE.SphereGeometry(0.12, 10, 8), FB, [1, 0.6, 1.25], [0, -0.44, 0.04]),
    ]),
    hind: mergeGeometries([
      part(new THREE.SphereGeometry(0.17, 10, 8), FB, [0.8, 1.1, 1.1], [0, -0.05, 0]),
      part(new THREE.CylinderGeometry(0.12, 0.105, 0.38, 10), FB, [1, 1, 1], [0, -0.24, 0.02]),
      part(new THREE.SphereGeometry(0.125, 10, 8), FB, [1, 0.6, 1.3], [0, -0.43, 0.06]),
    ]),
    stalk: mergeGeometries([
      part(new THREE.CylinderGeometry(0.022, 0.026, 0.95, 7), 0x7aa84a),
      ...[0, 1, 2, 3].map((i) => part(new THREE.PlaneGeometry(0.05, 0.24), 0x5f9a3a, [1, 1, 1], [0, 0.42 + i * 0.03, 0.1], [0.5 + i * 0.3, i * 1.6, 0.3])),
    ]),
  };
  function makePandaModel(scale = 1) {
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    const inner = node(root);
    inner.scale.setScalar(scale);
    const hips = node(inner, 0, 0.55, 0);
    const torso = node(hips);
    torso.add(new THREE.Mesh(PG.body, M.fur));
    const head = node(torso, 0, 0.18, 0.92);
    head.rotation.order = 'YXZ';
    head.add(new THREE.Mesh(PG.head, M.fur));
    const leg = (geo, x, y, z) => {
      const n = node(torso, x, y, z);
      n.add(new THREE.Mesh(geo, M.fur));
      return n;
    };
    const m = {
      root, hips, torso, head,
      fl: leg(PG.front, 0.24, -0.08, 0.66),
      fr: leg(PG.front, -0.24, -0.08, 0.66),
      hl: leg(PG.hind, 0.25, -0.1, 0.02),
      hr: leg(PG.hind, -0.25, -0.1, 0.02),
    };
    m.stalk = add(m.fr, new THREE.Mesh(PG.stalk, M.vertexDS), 0.2, -0.46, 0.12);
    m.stalk.rotation.set(0.3, 0, Math.PI / 2 - 0.45);
    m.stalk.visible = false;
    return m;
  }
  function applyPose(m, c, sw = 0, ex = {}) {
    m.hips.position.y = c.hy + (ex.bob || 0);
    m.torso.rotation.x = c.pitch;
    m.head.rotation.x = c.head + (ex.head || 0);
    m.head.rotation.y = ex.yaw || 0;
    m.fl.rotation.x = c.fl + sw + (ex.fl || 0);
    m.hr.rotation.x = c.hr + sw;
    m.fr.rotation.x = c.fr - sw + (ex.fr || 0);
    m.hl.rotation.x = c.hl - sw;
  }

  // ---------- Xin Xin ----------
  const m = makePandaModel(1);
  m.root.traverse((o) => (o.userData.panda = true));
  const blob = add(m.root, new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8).rotateX(-Math.PI / 2), shadowMat), 0, 0.03, 0.3);
  noRay(blob);
  group.add(m.root);
  const panda = {
    m,
    pos: new THREE.Vector3(PILE.x, 0, PILE.z - 0.95),
    heading: 0,
    plan: [],
    cur: { ...POSES.eat },
    phase: 0,
    walk: 0,
    eatT: 0,
    eating: false,
    napping: false,
    nextCrunch: 0,
    nextBleat: 40,
  };
  api.panda = panda;
  const inObst = (x, z, pad = 0) => OBST.some((o) => Math.hypot((x - o.x) / ((o.a || o.r) + pad), (z - o.z) / ((o.b || o.r) + pad)) < 1);
  function randomYard(front = false) {
    for (let k = 0; k < 30; k++) {
      const x = lerp(BOUNDS.x0, BOUNDS.x1, rand());
      const z = front ? lerp(-15, BOUNDS.z1, rand()) : lerp(BOUNDS.z0, BOUNDS.z1, rand());
      if (!inObst(x, z, 0.6)) return [x, z];
    }
    return [0, -8];
  }
  // Spots where she sits to eat: in front of each grove, and at the bamboo pile.
  const EAT_SPOTS = [
    [PILE.x, PILE.z - 0.95, 0],
    ...GROVES.map(([x, z]) => {
      const dx = -1 - x;
      const dz = -12 - z;
      const l = Math.hypot(dx, dz);
      return [x + (dx / l) * 2.3, z + (dz / l) * 2.3, (rand() - 0.5) * 1.2];
    }),
  ];
  // A walking route from a to b that steps around obstacles. Obstacles are
  // ellipses (radii a, b; circles just have r), worked out in a squashed
  // space where each one is a unit circle.
  function blocking(a, b) {
    for (const o of OBST) {
      const ea = o.a || o.r;
      const eb = o.b || o.r;
      const pad = 0.3 / Math.min(ea, eb);
      const ax = (a[0] - o.x) / ea;
      const az = (a[1] - o.z) / eb;
      const bx = (b[0] - o.x) / ea;
      const bz = (b[1] - o.z) / eb;
      if (Math.hypot(ax, az) < 1 + pad || Math.hypot(bx, bz) < 1 + pad) continue;
      const dx = bx - ax;
      const dz = bz - az;
      const L2 = dx * dx + dz * dz || 1e-6;
      const k = clamp((-ax * dx - az * dz) / L2, 0, 1);
      const cx = ax + dx * k;
      const cz = az + dz * k;
      if (Math.hypot(cx, cz) < 1 + pad) return { o, cx, cz, ea, eb };
    }
    return null;
  }
  function route(from, to) {
    const pending = [[to[0], to[1]]];
    const out = [];
    let cur = [from.x, from.z];
    for (let guard = 0; pending.length && guard < 10; guard++) {
      const nxt = pending[0];
      const hit = blocking(cur, nxt);
      if (hit) {
        const { o, ea, eb } = hit;
        let nx = hit.cx;
        let nz = hit.cz;
        let l = Math.hypot(nx, nz);
        if (l < 1e-3) {
          nx = -(nxt[1] - cur[1]) / eb;
          nz = (nxt[0] - cur[0]) / ea;
          l = Math.hypot(nx, nz) || 1;
        }
        const R = 1 + 0.9 / Math.min(ea, eb);
        pending.unshift([clamp(o.x + (nx / l) * R * ea, BOUNDS.x0, BOUNDS.x1), clamp(o.z + (nz / l) * R * eb, BOUNDS.z0, BOUNDS.z1)]);
        continue;
      }
      cur = pending.shift();
      out.push(cur);
    }
    return out.concat(pending);
  }
  // Her day, on a loop: eat, potter about, nap, eat, sit by the pool, nap…
  const CYCLE = ['eat', 'wander', 'nap', 'eat', 'pool', 'nap'];
  let cycleI = 0;
  function nextPlan() {
    const kind = CYCLE[cycleI++ % CYCLE.length];
    if (kind === 'eat') {
      const [x, z, face] = EAT_SPOTS[rand() < 0.35 ? 0 : Math.floor(rand() * EAT_SPOTS.length)];
      return [{ go: [x, z] }, { face }, { pose: 'eat', dur: 18 + rand() * 8 }];
    }
    if (kind === 'wander') return [{ go: randomYard() }, { face: (rand() - 0.5) * 1.4 }, { pose: 'sit', dur: 6 + rand() * 5 }];
    if (kind === 'pool') return [{ go: [POOL.x + (rand() - 0.5) * 3, POOL.z + POOL.b + 1.1] }, { face: Math.PI }, { pose: 'sit', dur: 8 + rand() * 4 }];
    return [{ go: randomYard(true) }, { face: (rand() - 0.5) * 2 }, { pose: 'lie', dur: 22 + rand() * 8, nap: true }];
  }
  // She starts the day munching at the bamboo pile, right by the glass.
  panda.plan = [{ pose: 'eat', dur: 20 }];

  function walkTo(tx, tz, speed, dt) {
    const p = panda;
    const dx = tx - p.pos.x;
    const dz = tz - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.12) return -1;
    const diff = wrapAngle(Math.atan2(dx, dz) - p.heading);
    p.heading += clamp(diff, -dt * 1.6, dt * 1.6);
    const sp = speed * Math.max(0, Math.cos(diff)) * Math.min(1, d / 0.4 + 0.3);
    p.pos.x += Math.sin(p.heading) * sp * dt;
    p.pos.z += Math.cos(p.heading) * sp * dt;
    return sp;
  }
  function updatePanda(dt, t) {
    const p = panda;
    if (!p.plan.length) p.plan = nextPlan();
    const s = p.plan[0];
    if (!s.started) {
      s.started = true;
      s.t0 = t;
      if (s.go) s.pts = route(p.pos, s.go);
    }
    let speed = 0;
    let want = 'stand';
    let done = false;
    const ex = {};
    p.eating = false;
    p.napping = false;
    if (s.pts) {
      const [tx, tz] = s.pts[0];
      const sp = walkTo(tx, tz, 0.5, dt);
      if (sp < 0) {
        s.pts.shift();
        if (!s.pts.length) done = true;
      } else speed = sp;
    } else if (s.face !== undefined) {
      const diff = wrapAngle(s.face - p.heading);
      p.heading += clamp(diff, -dt * 1.4, dt * 1.4);
      speed = Math.min(0.25, Math.abs(diff));
      done = Math.abs(diff) < 0.04;
    } else if (s.pose) {
      want = s.pose;
      const settled = t - s.t0 > 1.5;
      if (s.pose === 'eat') {
        p.eating = settled;
        p.eatT += dt;
        ex.head = Math.sin(t * 7) * 0.05;
        ex.fr = Math.sin(t * 3.5) * 0.12;
        ex.fl = Math.sin(t * 3.5 + 1) * 0.08;
      }
      if (s.nap) {
        p.napping = settled;
        const br = Math.sin(t * 1.3);
        p.m.torso.scale.set(1 + br * 0.015, 1 + br * 0.025, 1);
      }
      done = t - s.t0 > s.dur;
      if (done) p.m.torso.scale.set(1, 1, 1);
    }
    if (done) p.plan.shift();

    // Ease toward the wanted pose.
    const P = POSES[want];
    const k = 1 - Math.exp(-dt * 3.2);
    for (const key in P) p.cur[key] += (P[key] - p.cur[key]) * k;
    p.walk = damp(p.walk, speed > 0.02 ? 1 : 0, 6, dt);
    p.phase += speed * dt * 6;
    const sw = Math.sin(p.phase) * 0.45 * p.walk;
    ex.bob = Math.abs(Math.sin(p.phase)) * 0.02 * p.walk;
    if (want === 'stand' && speed < 0.02) ex.yaw = Math.sin(t * 0.6) * 0.35;
    applyPose(p.m, p.cur, sw, ex);
    p.m.stalk.visible = want === 'eat' && t - s.t0 > 0.8;
    p.m.stalk.scale.set(1, 1 - ((p.eatT % 9) / 9) * 0.6, 1);
    p.m.root.position.set(p.pos.x, 0, p.pos.z);
    p.m.root.rotation.y = p.heading;
  }

  // Sleepy z's above her head while she naps.
  const zs = [0, 1, 2].map(() => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.letter('z'), transparent: true, depthWrite: false }));
    sp.visible = false;
    group.add(sp);
    return sp;
  });

  // ---------- the keeper (on the terrace, happy to chat) ----------
  const keeper = (() => {
    const g = node(group, -2.6, 0, 0.15, 0.5);
    const KH = 0x8a7a52;
    const SH = 0x5a6b3a;
    const SKIN = 0xb5835a;
    g.add(
      new THREE.Mesh(
        mergeGeometries([
          part(new THREE.CapsuleGeometry(0.075, 0.7, 4, 10), KH, [1, 1, 1], [0.1, 0.45, 0]),
          part(new THREE.CapsuleGeometry(0.075, 0.7, 4, 10), KH, [1, 1, 1], [-0.1, 0.45, 0]),
          part(new THREE.BoxGeometry(0.13, 0.08, 0.28), 0x3a2a1a, [1, 1, 1], [0.1, 0.04, 0.04]),
          part(new THREE.BoxGeometry(0.13, 0.08, 0.28), 0x3a2a1a, [1, 1, 1], [-0.1, 0.04, 0.04]),
          part(new THREE.CapsuleGeometry(0.18, 0.42, 6, 12), SH, [1, 1, 0.65], [0, 1.13, 0]),
          part(new THREE.BoxGeometry(0.09, 0.06, 0.01), 0xf2c14e, [1, 1, 1], [0.08, 1.28, 0.12]),
          part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), SKIN, [1, 1, 1], [0, 1.45, 0]),
          part(new THREE.SphereGeometry(0.115, 16, 12), SKIN, [0.92, 1.08, 1], [0, 1.59, 0]),
          part(new THREE.CylinderGeometry(0.12, 0.125, 0.09, 16), 0x2f4a2a, [1, 1, 1], [0, 1.69, 0]),
          part(new THREE.BoxGeometry(0.2, 0.02, 0.14), 0x2f4a2a, [1, 1, 1], [0, 1.655, 0.13]),
          part(new THREE.SphereGeometry(0.014, 6, 5), 0x1a1a1a, [1, 1, 1], [0.04, 1.61, 0.105]),
          part(new THREE.SphereGeometry(0.014, 6, 5), 0x1a1a1a, [1, 1, 1], [-0.04, 1.61, 0.105]),
        ]),
        M.vertex,
      ),
    );
    const arm = (s) => {
      const pv = node(g, s * 0.24, 1.36, 0);
      pv.add(new THREE.Mesh(mergeGeometries([part(new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), SH, [1, 1, 1], [0, -0.28, 0]), part(new THREE.SphereGeometry(0.055, 8, 6), SKIN, [1, 1, 1], [0, -0.6, 0])]), M.vertex));
      pv.rotation.z = s * 0.08;
      return pv;
    };
    return { g, armL: arm(1), armR: arm(-1), waveT: -99, fact: 0 };
  })();
  post(-2.6, 0.15, 0.3);
  const cart = node(group, -3.9, 0, 0.55, 0.15);
  box(cart, std({ color: 0x2f6a4a, roughness: 0.6 }), 1.1, 0.5, 0.7, 0, 0.6, 0);
  for (const sx of [-0.4, 0.4]) cyl(cart, M.iron, 0.18, 0.18, 0.06, sx, 0.18, 0.38, 14).rotation.x = Math.PI / 2;
  box(cart, M.iron, 0.04, 0.5, 0.04, 0.55, 0.9, 0);
  for (let i = 0; i < 10; i++) {
    const s = cyl(cart, M.bamboo, 0.03, 0.03, 1.6, (rand() - 0.5) * 0.15, 0.9 + (i % 3) * 0.06, -0.28 + (i % 5) * 0.12, 6);
    s.rotation.z = Math.PI / 2 + (rand() - 0.5) * 0.1;
  }
  aabb(-4.5, -3.3, 0.15, 0.95);
  cast(keeper.g, cart);
  interact([keeper.g, cart], {
    label: () => 'Chat with the keeper',
    act: () => {
      keeper.waveT = time;
      ctx.toast(KEEPER_FACTS[keeper.fact++ % KEEPER_FACTS.length], 5200);
      ctx.complete('pKeeper');
    },
  });

  // ---------- souvenir kiosk ----------
  let plushes = 0;
  {
    const kiosk = node(group, -6.25, 0, 17.5, Math.PI / 2);
    const kParts = [];
    kParts.push(box(kiosk, M.wood, 3.0, 1.05, 0.6, 0, 0.525, -0.3));
    box(kiosk, M.red, 3.04, 0.08, 0.64, 0, 1.08, -0.3);
    box(kiosk, M.wall, 3.0, 2.6, 0.1, 0, 1.3, -1.5);
    for (const s of [-1, 1]) box(kiosk, M.wall, 0.08, 2.6, 1.5, s * 1.5, 1.3, -0.8);
    for (const [x, z] of [[-1.5, 0], [1.5, 0], [-1.5, -1.55], [1.5, -1.55]]) cyl(kiosk, M.red, 0.07, 0.07, 2.6, x, 1.3, z, 8);
    roof(kiosk, 2.4, 4.0, 0.8, 0, 2.6, -0.75, true);
    kParts.push(add(kiosk, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.44), new THREE.MeshBasicMaterial({ map: T.boardSign('纪念品', 'RECUERDOS', { bg: '#b02428', w: 1024, h: 256 }), toneMapped: false })), 0, 2.38, 0.03));
    for (const y of [1.45, 2.0]) box(kiosk, M.wood, 2.8, 0.05, 0.3, 0, y, -1.35);
    const plushAt = (x, y, z, s, yaw) => {
      const pm = makePandaModel(s);
      applyPose(pm, POSES.sit);
      pm.root.position.set(x, y, z);
      pm.root.rotation.y = yaw;
      kiosk.add(pm.root);
      kParts.push(pm.root);
    };
    for (const y of [1.475, 2.025]) for (let i = 0; i < 5; i++) plushAt(-1.1 + i * 0.55, y, -1.42, 0.22, (rand() - 0.5) * 0.4);
    for (let i = 0; i < 3; i++) plushAt(-0.8 + i * 0.8, 1.12, -0.35, 0.3, (rand() - 0.5) * 0.6);
    cast(kiosk);
    interact(kParts, {
      label: () => 'Buy a panda plushie',
      act: () => {
        plushes++;
        ctx.sound.squeak();
        ctx.complete('pPlush');
        ctx.toast(plushes === 1 ? 'You bought a fluffy panda plushie. ¡Qué suave! *squeak*' : `Another one? That’s ${plushes} plush pandas in your backpack!`);
      },
    });
    aabb(-7.9, -6.0, 15.9, 19.1);
  }

  // ---------- souvenir coin machine (on the plaza, across from the kiosk) ----------
  // Pick an animal, drop in two coins, turn the crank three times and a
  // squashed copper coin with that animal pressed into it drops into the tray.
  const COINS = [
    { emoji: '🐼', name: 'Panda', es: 'Panda gigante' },
    { emoji: '🦁', name: 'Lion', es: 'León' },
    { emoji: '🐘', name: 'Elephant', es: 'Elefante' },
    { emoji: '🦒', name: 'Giraffe', es: 'Jirafa' },
    { emoji: '🦓', name: 'Zebra', es: 'Cebra' },
    { emoji: '🐯', name: 'Tiger', es: 'Tigre' },
    { emoji: '🐧', name: 'Penguin', es: 'Pingüino' },
    { emoji: '🦩', name: 'Flamingo', es: 'Flamenco' },
  ];
  const coinTex = COINS.map((c) => T.zooCoin(c.emoji, c.es));
  const CM = {
    chrome: std({ color: 0xd8dce0, metalness: 0.9, roughness: 0.25 }),
    brass: std({ color: 0xc8a040, metalness: 0.85, roughness: 0.3 }),
    copper: std({ color: 0xc87a4a, metalness: 0.8, roughness: 0.35 }),
    peso: std({ color: 0xd8c890, metalness: 0.9, roughness: 0.3 }),
    inside: std({ color: 0x1f3a2c, roughness: 0.8 }),
    dark: std({ color: 0x141414, roughness: 0.7 }),
    knob: std({ color: 0xd0282a, roughness: 0.35 }),
  };
  // A toothed gear, facing +z, centred on the origin.
  function gearGeo(teeth, r, depth, thick) {
    const s = new THREE.Shape();
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = i % 4 < 2 ? r : r - depth;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.16, 0, Math.PI * 2, true);
    s.holes.push(hole);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.17, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    return new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -thick / 2);
  }
  const COIN_AT = { x: 6.3, z: 15.4 };
  const cm = node(group, COIN_AT.x, 0, COIN_AT.z, -Math.PI / 2);
  {
    // Cabinet: a red lower box, an upper box with a window, a green header.
    box(cm, CM.dark, 0.9, 0.12, 0.66, 0, 0.06, -0.27);
    box(cm, M.red, 0.8, 0.85, 0.55, 0, 0.545, -0.275);
    for (const s of [-1, 1]) box(cm, M.red, 0.04, 0.95, 0.5, s * 0.38, 1.445, -0.25);
    box(cm, M.red, 0.8, 0.95, 0.04, 0, 1.445, -0.48);
    box(cm, M.red, 0.8, 0.56, 0.04, 0, 1.64, -0.02);
    for (const s of [-1, 1]) box(cm, M.red, 0.09, 0.36, 0.04, s * 0.355, 1.18, -0.02);
    box(cm, M.red, 0.8, 0.03, 0.04, 0, 0.985, -0.02);
    box(cm, CM.inside, 0.72, 0.38, 0.02, 0, 1.18, -0.3);
    for (const y of [1.0, 1.36]) box(cm, M.gold, 0.66, 0.025, 0.03, 0, y, 0.005);
    for (const s of [-1, 1]) box(cm, M.gold, 0.025, 0.385, 0.03, s * 0.32, 1.18, 0.005);
    box(cm, M.gold, 0.82, 0.03, 0.03, 0, 0.97, 0.002);
    const glass = add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), M.glass), 0, 1.18, 0.0);
    noRay(glass);
    box(cm, M.tileTrim, 0.88, 0.32, 0.56, 0, 2.08, -0.25);
    for (const y of [1.92, 2.24]) box(cm, M.gold, 0.9, 0.03, 0.58, 0, y, -0.25);
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.26), new THREE.MeshBasicMaterial({ map: T.boardSign('纪念币', 'MONEDAS RECUERDO'), toneMapped: false })), 0, 2.08, 0.032);
    add(cm, new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.gold), 0, 2.31, -0.25);
    // How-to plate on the front, a panda poster on the side.
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), std({ map: T.coinSteps(), roughness: 0.7 })), -0.16, 0.68, 0.002);
    const poster = add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.375), std({ map: T.pandaSign('MONEDAS RECUERDO', 'Souvenir zoo coins'), roughness: 0.7 })), -0.402, 0.62, -0.275);
    poster.rotation.y = -Math.PI / 2;
    box(cm, CM.dark, 0.74, 0.31, 0.012, 0, 1.755, 0.006);
    cast(cm);
  }
  aabb(COIN_AT.x - 0.15, COIN_AT.x + 0.6, COIN_AT.z - 0.47, COIN_AT.z + 0.62);

  const cmState = { sel: 0, coins: 0, turns: 0, turnT: -1, base: 0, angle: 0, blankT: -1, dropT: -1, ready: false, collected: new Set(), inserts: [] };
  const busyPressing = () => cmState.turns > 0 || cmState.turnT >= 0 || cmState.dropT >= 0 || cmState.ready;

  // The eight designs, in two rows of little oval windows.
  const ovalGeo = new THREE.PlaneGeometry(0.16, 0.1);
  const rimGeo = new THREE.RingGeometry(0.93, 1.06, 36).scale(0.082, 0.052, 1);
  COINS.forEach((c, i) => {
    const x = -0.27 + (i % 4) * 0.18;
    const y = i < 4 ? 1.83 : 1.68;
    const face = add(cm, new THREE.Mesh(ovalGeo, std({ map: coinTex[i], alphaTest: 0.5, metalness: 0.45, roughness: 0.35 })), x, y, 0.014);
    const rim = add(cm, new THREE.Mesh(rimGeo, M.gold), x, y, 0.016);
    interact([face, rim], {
      label: () => (cmState.sel === i ? `${c.name} coin · selected` : `Choose the ${c.name} coin`),
      act: () => {
        if (cmState.sel === i) return;
        if (busyPressing()) {
          ctx.toast('Too late to switch — this coin is already being pressed!');
          return;
        }
        cmState.sel = i;
        ctx.toast(`You picked the ${c.name} design (${c.es}).`, 2400);
      },
    });
  });
  const selRing = add(cm, new THREE.Mesh(new THREE.RingGeometry(1.08, 1.3, 36).scale(0.082, 0.052, 1), new THREE.MeshBasicMaterial({ color: 0xffe14a, toneMapped: false })), 0, 0, 0.017);
  noRay(selRing);

  // LED screen and the coin slot.
  const led = T.ledPanel();
  box(cm, CM.dark, 0.43, 0.15, 0.008, -0.08, 1.49, 0.004);
  add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.125), new THREE.MeshBasicMaterial({ map: led, toneMapped: false })), -0.08, 1.49, 0.009);
  const slotParts = [
    box(cm, CM.chrome, 0.12, 0.13, 0.025, 0.27, 1.5, 0.012),
    box(cm, CM.dark, 0.014, 0.07, 0.01, 0.27, 1.51, 0.026),
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshBasicMaterial({ map: T.sign('$10 × 2', { bg: '#1a1a1c', fg: '#f2c14e', w: 256, h: 84, font: 'bold 46px Arial, sans-serif' }), toneMapped: false })), 0.27, 1.408, 0.003),
  ];
  cast(...slotParts);
  const pesoGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.004, 20).rotateZ(Math.PI / 2);
  const pesos = [0, 1].map(() => {
    const p = add(cm, new THREE.Mesh(pesoGeo, CM.peso));
    p.visible = false;
    noRay(p);
    return p;
  });
  interact(slotParts, {
    label: () => (cmState.ready ? 'Take your coin from the tray first' : cmState.coins < 2 ? `Insert a coin (${cmState.coins}/2)` : 'Coins in · now turn the crank'),
    act: () => {
      if (cmState.ready) return ctx.toast('Take your coin from the tray first!');
      if (cmState.coins >= 2) return ctx.toast('That’s enough coins — now turn the crank!');
      cmState.coins++;
      const n = cmState.coins;
      cmState.inserts.push({ mesh: pesos[n - 1], t0: time, last: n === 2 });
      ctx.toast(n === 1 ? 'You drop a 10-peso coin in the slot… one more to go.' : 'Clink! Two coins in. Now turn the crank!', 3000);
    },
  });

  // Behind the glass: two meshing gears and a little press.
  const bigGear = add(cm, new THREE.Mesh(gearGeo(16, 0.115, 0.018, 0.02), CM.brass), -0.14, 1.17, -0.2);
  const smallGear = add(cm, new THREE.Mesh(gearGeo(10, 0.07, 0.016, 0.02), CM.chrome), -0.14 + 0.167 * Math.cos(0.44), 1.17 + 0.167 * Math.sin(0.44), -0.2);
  for (const g of [bigGear, smallGear]) cyl(cm, CM.dark, 0.012, 0.012, 0.12, g.position.x, g.position.y, -0.24, 10).rotation.x = Math.PI / 2;
  box(cm, CM.chrome, 0.11, 0.04, 0.07, 0.2, 1.06, -0.15);
  box(cm, CM.chrome, 0.012, 0.2, 0.012, 0.2, 1.3, -0.15);
  const stamp = box(cm, CM.chrome, 0.08, 0.05, 0.06, 0.2, 1.27, -0.15);
  const blank = add(cm, new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.005, 24).rotateX(Math.PI / 2), CM.copper), 0.2, 1.108, -0.13);
  blank.visible = false;
  noRay(blank);
  const ANVIL_TOP = 1.08;

  // The crank: a brass gear wheel on the side with a red knob.
  cyl(cm, CM.chrome, 0.02, 0.02, 0.1, 0.43, 1.17, -0.2, 10).rotation.z = Math.PI / 2;
  const crank = node(cm, 0.47, 1.17, -0.2);
  const crankParts = [
    add(crank, new THREE.Mesh(gearGeo(14, 0.16, 0.025, 0.03).rotateY(Math.PI / 2), CM.brass)),
    cyl(crank, CM.chrome, 0.035, 0.035, 0.05, 0.01, 0, 0, 12),
    box(crank, CM.brass, 0.025, 0.17, 0.035, 0.025, 0.085, 0),
    cyl(crank, CM.knob, 0.024, 0.024, 0.11, 0.08, 0.16, 0, 12),
    add(crank, new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.gold), 0.14, 0.16, 0),
  ];
  crankParts[1].rotation.z = Math.PI / 2;
  crankParts[3].rotation.z = Math.PI / 2;
  cast(crank, bigGear, smallGear);
  interact([...crankParts, bigGear, smallGear, stamp], {
    label: () => (cmState.ready ? 'Take your coin from the tray first' : cmState.coins < 2 ? 'Turn the crank (insert 2 coins first)' : `Turn the crank (${cmState.turns}/3)`),
    act: () => {
      if (cmState.turnT >= 0 || cmState.dropT >= 0) return;
      if (cmState.ready) return ctx.toast('Take your coin from the tray first!');
      if (cmState.coins < 2) return ctx.toast(cmState.coins === 0 ? 'Insert 2 coins first — the slot is next to the little screen.' : 'One more coin, then turn the crank!');
      cmState.turnT = time;
      ctx.sound.ratchet();
    },
  });

  // The tray at the bottom, where the finished coin lands.
  const trayParts = [
    box(cm, CM.chrome, 0.26, 0.015, 0.14, 0, 0.235, 0.07),
    box(cm, CM.chrome, 0.012, 0.07, 0.14, -0.124, 0.265, 0.07),
    box(cm, CM.chrome, 0.012, 0.07, 0.14, 0.124, 0.265, 0.07),
    box(cm, CM.chrome, 0.26, 0.045, 0.012, 0, 0.26, 0.14),
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.06), CM.dark), 0, 0.35, 0.002),
  ];
  cast(...trayParts);
  const trayCoin = add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.056), std({ map: coinTex[0], alphaTest: 0.5, metalness: 0.45, roughness: 0.35 })), 0, 0.25, 0.065);
  trayCoin.rotation.x = -Math.PI / 2 + 0.3;
  trayCoin.visible = false;
  trayParts.push(trayCoin);
  interact(trayParts, {
    label: () => (cmState.ready ? `Take your ${COINS[cmState.sel].name} coin` : null),
    act: () => {
      if (!cmState.ready) return;
      const c = COINS[cmState.sel];
      cmState.ready = false;
      cmState.coins = 0;
      cmState.turns = 0;
      trayCoin.visible = false;
      cmState.collected.add(cmState.sel);
      if (ctx.showCoin) ctx.showCoin(coinTex[cmState.sel].image.toDataURL(), `${c.es} · Chapultepec`);
      const n = cmState.collected.size;
      ctx.toast(n === COINS.length ? `You got the ${c.name} coin — that’s every design! ¡Felicidades, coin collector!` : `You got the ${c.name} coin! You’ve collected ${n} of ${COINS.length} designs.`, 4500);
      if (c.name === 'Panda') ctx.complete('pCoin');
    },
  });

  const smooth = (k) => k * k * (3 - 2 * k);
  function updateCoinMachine(t) {
    const S = cmState;
    // Coins sliding into the slot.
    for (let i = S.inserts.length - 1; i >= 0; i--) {
      const it = S.inserts[i];
      const u = (t - it.t0) / 0.35;
      it.mesh.visible = u < 1;
      it.mesh.position.set(0.27, 1.51, lerp(0.22, 0.0, Math.min(1, u)));
      if (u >= 1) {
        S.inserts.splice(i, 1);
        ctx.sound.coinIn();
        if (it.last) S.blankT = t;
      }
    }
    // The copper blank drops onto the anvil once both coins are in.
    let squish = S.turns;
    let press = 0;
    if (S.turnT >= 0) {
      const u = Math.min(1, (t - S.turnT) / 0.95);
      const e = smooth(u);
      S.angle = S.base + e * Math.PI * 2;
      press = Math.sin(Math.PI * e);
      squish += smooth(clamp((e - 0.4) / 0.2, 0, 1));
      if (u >= 1) {
        S.base += Math.PI * 2;
        S.turnT = -1;
        S.turns++;
        if (S.turns === 3) {
          ctx.sound.coinPress();
          S.dropT = t;
        }
      }
    }
    bigGear.rotation.z = S.angle;
    smallGear.rotation.z = -S.angle * 1.6 + Math.PI / 10;
    crank.rotation.x = -S.angle;
    stamp.position.y = 1.27 - 0.1 * press;
    if (S.blankT >= 0 && S.dropT < 0) {
      const u = Math.min(1, (t - S.blankT) / 0.25);
      blank.visible = true;
      blank.scale.set(1 + 0.25 * squish, 1 - 0.13 * squish, 1);
      const rest = ANVIL_TOP + 0.028 * blank.scale.y;
      blank.position.y = lerp(1.3, rest, u * u);
    }
    // After the last turn the squashed coin falls out of sight, then into the tray.
    if (S.dropT >= 0) {
      const u = (t - S.dropT) / 0.35;
      blank.position.y = ANVIL_TOP + 0.017 - Math.min(1, u) * 0.25;
      blank.visible = u < 1;
      if (t - S.dropT > 0.7) {
        S.dropT = -1;
        S.blankT = -1;
        blank.visible = false;
        blank.scale.set(1, 1, 1);
        S.ready = true;
        trayCoin.material.map = coinTex[S.sel];
        trayCoin.material.needsUpdate = true;
        trayCoin.visible = true;
        ctx.sound.coinDrop();
        ctx.toast(`Ka-chunk! A squashed ${COINS[S.sel].name.toLowerCase()} coin drops into the tray. Take it!`, 3800);
      }
    }
    // The selected design gets a glowing ring.
    const sx = -0.27 + (S.sel % 4) * 0.18;
    const sy = S.sel < 4 ? 1.83 : 1.68;
    selRing.position.set(sx, sy, 0.017);
    selRing.material.color.setHSL(0.14, 1, 0.5 + Math.sin(t * 5) * 0.12);
    // What the little screen says.
    const c = COINS[S.sel];
    if (S.ready) led.set('¡LISTO!', 'TAKE YOUR COIN');
    else if (S.dropT >= 0) led.set('KA-CHUNK!', 'PRESSING...');
    else if (S.coins < 2) led.set(c.es.toUpperCase(), S.coins === 0 ? 'INSERT 2 COINS' : 'INSERT 1 MORE');
    else led.set(c.es.toUpperCase(), `TURN CRANK ${S.turns}/3`);
  }

  // ---------- signs and the photo spot ----------
  signPost(-11.8, -0.45, 0, 'PANDAS EN MÉXICO', 'Desde 1975 · Since 1975', 'In 1975 China gave Mexico two giant pandas, Pe Pe and Ying Ying. In 1981 their cub Tohui was born right here — the first giant panda born and raised in a zoo outside China!');
  signPost(7.6, -0.45, 0, 'XIN XIN', 'Nuestra panda · Our panda', 'Xin Xin was born right here at Chapultepec Zoo in 1990. She lives alone — giant pandas like their own space, and in the wild they wander the bamboo forests by themselves.');
  signPost(12.2, -0.45, 0, 'PANDA GIGANTE', 'Ailuropoda melanoleuca', 'Giant pandas spend up to 14 hours a day eating — 12 to 38 kg of bamboo! A special wrist bone works like a thumb to hold the stalks.');
  const PHOTO = { x: 2.4, z: -0.45 };
  const ps = node(group, PHOTO.x, 0, PHOTO.z);
  const photoParts = [cyl(ps, M.darkWood, 0.06, 0.06, 1.5, 0, 0.75, 0, 8)];
  photoParts.push(add(ps, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), new THREE.MeshBasicMaterial({ map: T.sign('📷 FOTO', { bg: '#d9447a', font: 'bold 56px sans-serif' }), toneMapped: false, side: THREE.DoubleSide })), 0, 1.6, 0.04));
  cast(ps);
  post(PHOTO.x, PHOTO.z, 0.2);
  interact(photoParts, {
    label: () => 'Take a photo of Xin Xin',
    act: () => {
      const eye = new THREE.Vector3(PHOTO.x + 0.6, 1.65, PHOTO.z + 0.05);
      const pp = panda.pos;
      ctx.sit({ eye, yaw: lookYaw(eye.x, eye.z, pp.x, pp.z), pitch: Math.atan2(0.6 - 1.65, Math.hypot(pp.x - eye.x, pp.z - eye.z)), photo: true, task: 'pPhoto', caption: 'Xin Xin · Chapultepec' });
    },
  });

  // ---------- the forest all around ----------
  {
    const inSite = (x, z, pad) => (x > -18 - pad && x < 29 + pad && z > -31.5 - pad && z < GATE_Z + 1 + pad) || (x > -8.6 - pad && x < 8.6 + pad && z > GATE_Z - 1 && z < 27 + pad);
    const trees = [];
    for (let tries = 0; tries < 9000 && trees.length < 420; tries++) {
      const x = -80 + rand() * 160;
      const z = -90 + rand() * 150;
      const r = 0.22 + rand() * 0.35;
      if (inSite(x, z, 1.5 + r * 4)) continue;
      if (trees.some((t) => Math.abs(t.x - x) < 3.2 && Math.abs(t.z - z) < 3.2)) continue;
      trees.push({ x, z, r, pine: rand() < 0.35, h: 8 + rand() * 8 });
    }
    for (const [x, z, pine] of [[-11.8, -9.5, true], [12.4, -24.4, true], [3.5, -23.5, false]]) trees.push({ x, z, r: 0.35, pine, h: pine ? 10 : 9 });
    const broad = trees.filter((t) => !t.pine);
    const pines = trees.filter((t) => t.pine);
    const trunkGeo = new THREE.CylinderGeometry(0.7, 1, 1, 7).translate(0, 0.5, 0);
    const crownGeo = mergeGeometries([
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.IcosahedronGeometry(0.75, 1).translate(0.7, -0.25, 0.3),
      new THREE.IcosahedronGeometry(0.7, 1).translate(-0.6, -0.2, -0.4),
    ]);
    const pineGeo = mergeGeometries([
      new THREE.ConeGeometry(1, 1.4, 8).translate(0, 0.7, 0),
      new THREE.ConeGeometry(0.8, 1.2, 8).translate(0, 1.35, 0),
      new THREE.ConeGeometry(0.55, 1.0, 8).translate(0, 1.95, 0),
    ]);
    const trunks = new THREE.InstancedMesh(trunkGeo, M.bark, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeo, M.leaf, broad.length);
    const pineTops = new THREE.InstancedMesh(pineGeo, M.leaf, pines.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    trees.forEach((t, i) => trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.r, t.h * (t.pine ? 0.55 : 0.75), t.r))));
    broad.forEach((t, i) => {
      const s = 2.4 + rand() * 1.8;
      crowns.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h * 0.75 + s * 0.5, t.z), q.setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(s, s * 0.8, s)));
      crowns.setColorAt(i, c.setHSL(0.26 + rand() * 0.07, 0.55, 0.08 + rand() * 0.08));
    });
    pines.forEach((t, i) => {
      const s = 1.8 + rand() * 1.0;
      pineTops.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h * 0.35, t.z), q.setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(s, t.h * 0.33, s)));
      pineTops.setColorAt(i, c.setHSL(0.33 + rand() * 0.04, 0.45, 0.05 + rand() * 0.05));
    });
    group.add(trunks, crowns, pineTops);
    cast(trunks, crowns, pineTops);
    noRay(trunks, crowns, pineTops);
  }

  // ---------- per frame ----------
  let time = 0;
  let frameN = 0;
  const spotRay = new THREE.Raycaster();
  spotRay.far = 45;
  const C0 = new THREE.Vector2(0, 0);
  const spotTargets = [m.root, ...occluders];
  const seen = { spot: false, eat: false, nap: false, gate: false };
  let lastNews = -99;
  let nextSnore = 0;
  const headPos = new THREE.Vector3();
  function news(key, task, msg) {
    if (seen[key] || time - lastNews < 5) return;
    seen[key] = true;
    lastNews = time;
    ctx.complete(task);
    ctx.toast(msg, 5200);
  }
  function update(dt, t) {
    time = t;
    frameN++;
    updatePanda(dt, t);

    // The keeper waves when you chat, otherwise looks around.
    const kt = t - keeper.waveT;
    keeper.g.rotation.y = damp(keeper.g.rotation.y, 0.5 + Math.sin(t * 0.3) * 0.3, 2, dt);
    keeper.armR.rotation.z = kt < 2 ? -0.08 - 2.4 * Math.sin(Math.min(1, kt / 0.4) * Math.PI * 0.5) : damp(keeper.armR.rotation.z, -0.08, 5, dt);
    keeper.armR.rotation.x = kt < 2 ? Math.sin(kt * 10) * 0.25 : 0;
    updateCoinMachine(t);

    waterTex.offset.set(t * 0.015, t * 0.011);
    fallsTex.offset.y = t * 0.9;
    foam.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    foam.material.opacity = 0.35 + Math.sin(t * 5) * 0.08;

    // z's while she naps.
    m.head.getWorldPosition(headPos);
    zs.forEach((sp, i) => {
      sp.visible = panda.napping;
      if (!sp.visible) return;
      const u = (t * 0.22 + i / 3) % 1;
      sp.position.set(headPos.x + Math.sin(u * 6 + i) * 0.15, headPos.y + 0.3 + u * 1.0, headPos.z);
      sp.scale.setScalar(0.18 + u * 0.24);
      sp.material.opacity = Math.sin(u * Math.PI) * 0.9;
    });

    // Sounds: crunching, the odd bleat, snoring.
    const pl = ctx.player();
    const pp = pl.pos;
    const closeness = (range) => Math.max(0, 1 - Math.hypot(pp.x - panda.pos.x, pp.z - panda.pos.z) / range);
    if (panda.eating && t > panda.nextCrunch) {
      panda.nextCrunch = t + 1.0 + rand() * 0.6;
      const v = closeness(18);
      if (v > 0.02) ctx.sound.crunch(v);
    }
    if (panda.napping && t > nextSnore) {
      nextSnore = t + 3.4;
      const v = closeness(14);
      if (v > 0.05) ctx.sound.snore(v);
    }
    if (!panda.napping && t > panda.nextBleat) {
      panda.nextBleat = t + 40 + rand() * 40;
      const v = closeness(22);
      if (v > 0.05) ctx.sound.bleat(v * 0.7);
    }

    // Look right at her to spot her (and catch her eating or napping).
    if (frameN % 5 === 0 && !(pl.seat && pl.seat.photo)) {
      ctx.camera.updateMatrixWorld();
      spotRay.setFromCamera(C0, ctx.camera);
      const hit = spotRay.intersectObjects(spotTargets, true)[0];
      if (hit && hit.object.userData.panda) {
        if (!seen.spot) news('spot', 'pSpot', 'There she is — that’s Xin Xin, Chapultepec’s giant panda!');
        else if (panda.eating) news('eat', 'pEat', 'Crunch, crunch! Xin Xin holds the bamboo in her paws and nibbles it like a snack.');
        else if (panda.napping) news('nap', 'pNap', 'Shhh… Xin Xin is having a nap. Pandas love a snooze after a big meal.');
      }
    }

    // Walking under the gate.
    if (!seen.gate && pp.z < GATE_Z - 0.6) {
      seen.gate = true;
      ctx.complete('pGate');
      ctx.toast('You walk under the red gate into the Pabellón del Panda. Look for Xin Xin behind the glass!', 4800);
    }

    api.state.water = Math.max(0, 1 - Math.hypot(pp.x - FALLS.x, pp.z - FALLS.z) / 20) * 0.7;
    api.state.calm = pl.seat && pl.seat.calm ? 1 : 0;
  }

  return api;
}
