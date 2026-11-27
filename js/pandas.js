// The giant panda exhibit at Chapultepec Zoo (Pabellón del Panda), home to
// one panda, Xin Xin, who keeps to herself: munching bamboo, wandering,
// sitting by the pool and napping. Next door (but not part of it) is a
// flamingo lagoon. Everything is in meters; north is -z.
//
//               rock cliff · cave · bamboo
//           +--------------------------+
//   panda   |  tower         waterfall |
//   house   |                  pool    |     flamingo
//           |   Xin Xin's bamboo pile  |      lagoon
//  family   +=====glass====glass=======+   (fenced, with
//   tree ┃   keeper  photo  signs      ┃    a mud island)
//  wall  ┃  bench   ( terrace )  bench ┃ ..........fence.....
//        ┗━━━━━━━━┓          ┏━━━━━━━━━┛ ═══ boardwalk ═══
//          kiosk  ┃ (plaza)  ┃ coins
//                 you start here
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

const YARD = { x0: -11, x1: 11, z0: -20, z1: -1 }; // the panda's outdoor yard
const GLASS_Z = -1; // the glass wall along the front of the yard
const POOL = { x: 5, z: -8, a: 3.4, b: 2.4 };
const FALLS = { x: 5, z: POOL.z - POOL.b - 0.25 };
const TOWER = { x: -5.5, z: -11, half: 1.1, top: 2.6 }; // a climbing frame (scenery)
const PILE = { x: -1.2, z: -3.6 }; // the keepers' bamboo pile, near the glass
const TREE_WALL_X = -11.0; // the family tree is painted on this wall, facing the terrace
const PEN = { x0: 13.6, x1: 26, z0: -4.2, z1: 9 }; // the flamingos' enclosure
const LAGOON = { x: 19.8, z: 2.4, a: 5.0, b: 4.0 };
const BOUNDS = { x0: -10, x1: 10, z0: -18.6, z1: -2.2 }; // where the panda can walk
export const PANDA_SPAWN = { x: 0, z: 14.6, yaw: 0, pitch: -0.02 };

// Where visitors can walk (rectangles for the centre of the player).
const WALK = [
  { x0: -10.6, x1: 10.6, z0: GLASS_Z + 0.45, z1: 6.65 }, // terrace
  { x0: -4.1, x1: 4.1, z0: 6.4, z1: 16.1 }, // entrance plaza
  { x0: 4.0, x1: 24.6, z0: 9.7, z1: 11.5 }, // boardwalk to the flamingos
];

// Things the panda walks around (ellipses have a and b, circles r).
const OBST = [
  { x: POOL.x, z: POOL.z - 0.4, a: POOL.a + 0.7, b: POOL.b + 1.1 }, // pool and waterfall rocks
  { x: TOWER.x, z: TOWER.z, r: 1.8 },
  { x: -3, z: -15.5, r: 1.1 }, // boulders
  { x: 8, z: -14.6, r: 0.8 },
  { x: 1, z: -12.6, r: 1.0 }, // a fallen log
  { x: PILE.x, z: PILE.z + 0.15, r: 0.9 }, // the bamboo pile
  { x: -8.6, z: -7.4, r: 0.7 }, // trees
  { x: 8.9, z: -18, r: 0.7 },
  { x: 2.6, z: -17.3, r: 0.7 },
];
const GROVES = [[-10.1, -2.8], [-10.2, -14.6], [-8.6, -18.9], [-1, -19.1], [6.4, -19], [10.2, -14.4], [10.2, -4.2]];

const POSES = {
  stand: { hy: 0.55, pitch: 0, head: 0.08, fl: 0, fr: 0, hl: 0, hr: 0 },
  sit: { hy: 0.3, pitch: -1.05, head: 0.85, fl: -0.45, fr: -0.45, hl: -0.3, hr: -0.3 },
  eat: { hy: 0.3, pitch: -1.05, head: 0.8, fl: -0.95, fr: -1.15, hl: -0.3, hr: -0.3 },
  lie: { hy: 0.36, pitch: 0, head: 0.3, fl: -1.35, fr: -1.35, hl: 1.3, hr: 1.3 },
};
// Flamingo poses: body pitch, lower and upper neck, and both legs (hip, knee).
const FPOSES = {
  stand: { pitch: 0, nl: -0.15, nh: 0.3, ha: 0, ka: 0, hb: 0, kb: 0 },
  rest: { pitch: 0.05, nl: -0.5, nh: 0.95, ha: -0.35, ka: 2.5, hb: 0, kb: 0 },
  feed: { pitch: 0.35, nl: 2.5, nh: 0.5, ha: 0, ka: 0, hb: 0, kb: 0 },
  preen: { pitch: 0, nl: -0.35, nh: -2.1, ha: 0, ka: 0, hb: 0, kb: 0 },
};

const KEEPER_FACTS = [
  '“Xin Xin eats bamboo almost all day — and she’s picky about which stalks she likes!” says the keeper.',
  '“Pandas are bears, but nearly everything they eat is bamboo.”',
  '“After a big meal she likes a nap — sprawled out flat on her tummy.”',
  '“Baby pandas are born pink, blind and tiny — about the size of a stick of butter!”',
  '“See the family tree on the wall? Xin Xin’s grandparents, Pe Pe and Ying Ying, came here from China in 1975.”',
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
    flamingos: null,
  };

  // ---------- materials ----------
  const M = {
    floor: std({ map: T.forestFloor(), roughness: 1 }),
    grass: std({ map: T.grass(), roughness: 1 }),
    paving: std({ map: T.paving(), color: 0xbab3a6, roughness: 0.9 }),
    dirt: std({ map: T.gravel(), color: 0x9a7a55, roughness: 1 }),
    sand: std({ map: T.gravel(), color: 0xd8c49a, roughness: 1 }),
    mud: std({ map: T.gravel(), color: 0x7a6248, roughness: 1 }),
    deck: std({ map: T.woodGrain(), color: 0x9a7650, roughness: 0.85 }),
    red: std({ color: 0xb02428, roughness: 0.45 }),
    gold: std({ color: 0xe0b040, roughness: 0.35, metalness: 0.5 }),
    tile: std({ map: T.roofTiles(), roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
    tileTrim: std({ color: 0x1f4d36, roughness: 0.4 }),
    wall: std({ map: T.plaster(), color: 0xf2ece0, roughness: 0.95 }),
    stone: std({ map: T.paving(), color: 0xc8c0b0, roughness: 0.9 }),
    wood: std({ map: T.woodGrain(), color: 0x8a6440, roughness: 0.7 }),
    darkWood: std({ map: T.woodGrain(), color: 0x5a3e28, roughness: 0.75 }),
    fence: std({ map: T.woodGrain(), color: 0x7a5a3a, roughness: 0.8 }),
    log: std({ map: T.woodGrain(), color: 0x6e5034, roughness: 0.9 }),
    bark: std({ map: T.woodGrain(), color: 0x4a3626, roughness: 1 }),
    iron: std({ color: 0x2a2c2a, metalness: 0.5, roughness: 0.5 }),
    hedge: std({ color: 0x3f6a32, roughness: 0.9, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0xd8eef2, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    vertex: std({ vertexColors: true, roughness: 0.75 }),
    vertexDS: std({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }),
    fur: std({ vertexColors: true, roughness: 0.95 }),
    feathers: std({ vertexColors: true, roughness: 0.8 }),
    rock: std({ vertexColors: true, roughness: 0.95, flatShading: true }),
    leaf: std({ roughness: 0.85, flatShading: true }),
    bamboo: std({ map: T.bamboo(), roughness: 0.55 }),
    bambooLeaf: std({ color: 0x5f9a3a, roughness: 0.8, side: THREE.DoubleSide }),
    black: std({ color: 0x0c0a08, roughness: 1 }),
  };
  const meshTex = T.cageMesh();
  meshTex.repeat.set(9, 9);
  const meshMat = new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, color: 0x262826 });
  const waterTex = T.waterNormals();
  const waterMat = std({ color: 0x2f6f73, roughness: 0.08, metalness: 0.2, normalMap: waterTex, normalScale: new THREE.Vector2(0.5, 0.5), transparent: true, opacity: 0.9 });
  const lagoonMat = std({ color: 0x5a8a86, roughness: 0.1, metalness: 0.15, normalMap: waterTex, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.82 });
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
  // Post-and-rail fence along a polyline of [x, z] points (one merged mesh).
  function fence(pts, h, rails, mat = M.fence, step = 2) {
    const geos = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / step));
      for (let k = 0; k <= n; k++) geos.push(meterUV(new THREE.BoxGeometry(0.1, h, 0.1).translate(lerp(x0, x1, k / n), h / 2, lerp(z0, z1, k / n))));
      const ang = Math.atan2(z1 - z0, x1 - x0);
      for (const y of rails) geos.push(meterUV(new THREE.BoxGeometry(len + 0.05, 0.07, 0.05).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2)));
    }
    const m = add(group, new THREE.Mesh(mergeGeometries(geos), mat));
    cast(m);
    return m;
  }

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
    add(r, new THREE.Mesh(roofGeo(w, d, h), M.tile));
    const rz = Math.max(0.05, d / 2 - (w / 2) * 0.9);
    box(r, M.tileTrim, 0.22, 0.2, rz * 2 + 0.4, 0, h + 0.05, 0);
    for (const s of [-1, 1]) {
      const tip = add(r, new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), M.gold), 0, h + 0.3, s * (rz + 0.2));
      tip.rotation.x = s * 0.4;
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = add(r, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 6), M.tileTrim), (sx * w) / 2, 0.12, (sz * d) / 2);
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
  function signPost(x, z, yaw, tex, fact, task) {
    const sg = node(group, x, 0, z, yaw);
    for (const dx of [-0.42, 0.42]) box(sg, M.darkWood, 0.06, 1.0, 0.06, dx, 0.5, -0.02);
    const board = add(sg, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), std({ map: tex, roughness: 0.7 })), 0, 1.18, 0.02);
    board.rotation.x = -0.2;
    box(sg, M.red, 1.08, 0.83, 0.04, 0, 1.18, -0.01).rotation.x = -0.2;
    cast(sg);
    aabb(x - 0.5, x + 0.5, z - 0.1, z + 0.1);
    interact(sg, {
      label: () => 'Read the sign',
      act: () => {
        ctx.toast(fact, 6000);
        if (task) ctx.complete(task);
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
          const r = 0.7 + rand() * 0.5;
          const off = r * 0.45 + rand() * 0.35;
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
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 30, far: 220 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  sun.target.position.set(3.5, 0, -2);
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
  rect(group, M.paving, -11.2, 11.3, -0.8, 7.3, 0.012); // terrace
  rect(group, M.paving, -5, 5, 7, 17, 0.013); // plaza
  rect(group, M.grass, YARD.x0, YARD.x1, YARD.z0 - 1, YARD.z1, 0.01);
  rect(group, M.grass, 5, 13.6, 7.3, 9.3, 0.011); // planting by the boardwalk
  rect(group, M.grass, 11.3, 13.6, -1.5, 7.3, 0.011);
  ellipse(group, M.dirt, 2.0, 1.4, PILE.x, 0.015, PILE.z - 0.5);
  ellipse(group, M.dirt, 2.4, 1.9, TOWER.x, 0.015, TOWER.z);

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
    for (let x = YARD.x0; x <= YARD.x1 + 0.01; x += len / 8) posts.push(new THREE.BoxGeometry(0.07, 1.25, 0.07).translate(x, 1.4, GLASS_Z));
    posts.push(new THREE.BoxGeometry(len, 0.06, 0.09).translate(cx, 2.0, GLASS_Z));
    cast(add(group, new THREE.Mesh(mergeGeometries(posts), M.iron)));
  }

  // ---------- rock walls around the yard ----------
  rockPile([[-11.6, -12], [-11.7, -20.3]], 3.2, -1);
  rockPile([[-11.6, -20.6], [11.6, -20.6]], (x) => 4 + Math.sin(x * 0.5) * 0.7, -1, (x, y) => x > -3.7 && x < -1.0 && y < 2.2);
  rockPile([[11.6, -20.3], [11.6, -1.3]], (x, z) => lerp(1.6, 3.2, clamp(-z / 8, 0, 1)), -1);
  {
    box(group, M.black, 2.4, 2.2, 1.4, -2.35, 1.1, -21.5);
    const arch = [];
    for (let i = 0; i < 4; i++) arch.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i], [1.0, 0.7, 1.0], [-3.5 + i * 0.75, 2.6 + Math.sin(i) * 0.12, -20.9], [i, i * 2, 0]));
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
  GROVES.forEach(([x, z]) => grove(x, z, 14, 1.4));
  for (let x = -14; x <= 14; x += 2.6) grove(x + (rand() - 0.5), -23.2 - rand() * 1.5, 7, 1.3, 6, 9);
  for (let z = -20; z <= -13; z += 2.4) grove(-14 - rand(), z, 6, 1.2, 5, 8);
  for (let z = -20; z <= -6; z += 2.6) grove(13.8 + rand() * 0.6, z, 5, 1.0, 5, 8);
  for (let x = 14; x <= 26; x += 2.4) grove(x + (rand() - 0.5), -5.8 - rand(), 6, 1.1, 5, 8);
  for (let z = -4; z <= 9; z += 2.6) grove(27.2 + rand() * 0.5, z, 5, 0.9, 4, 7);
  for (const [x, z] of [[12.4, 0.6], [12.4, 6.4], [7, 8.2], [9.6, 8.3], [6, 15.5], [-6, 15.2], [-6, 8.4], [-19.6, -4], [-19.6, -9]]) grove(x, z, 5, 0.55, 3.5, 6);
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
  ellipse(group, M.dirt, POOL.a + 0.5, POOL.b + 0.5, POOL.x, 0.02, POOL.z);
  ellipse(group, waterMat, POOL.a, POOL.b, POOL.x, 0.05, POOL.z);
  {
    const rim = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = 0.3 + rand() * 0.22;
      rim.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i % 5], [r * 1.3, r * 0.7, r], [POOL.x + Math.cos(a) * (POOL.a + 0.22), r * 0.3, POOL.z + Math.sin(a) * (POOL.b + 0.22)], [rand(), rand() * 6, rand()]));
    }
    for (let i = 0; i < 9; i++) {
      const r = 0.7 + rand() * 0.4;
      rim.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[i % 5], [r * 1.2, r, r], [FALLS.x - 1.7 + (i % 3) * 1.7 + (rand() - 0.5) * 0.4, 0.35 + Math.floor(i / 3) * 0.75, FALLS.z - 1.1 - rand() * 0.3], [rand(), rand() * 6, rand()]));
    }
    cast(add(group, new THREE.Mesh(mergeGeometries(rim), M.rock)));
    const falls = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), fallsMat), FALLS.x, 1.05, FALLS.z);
    falls.rotation.x = -0.12;
    noRay(falls);
  }
  const foam = add(group, new THREE.Mesh(new THREE.RingGeometry(0.2, 0.8, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })), FALLS.x, 0.07, FALLS.z + 0.3);
  noRay(foam);
  // A wooden climbing tower with a tire swing (just scenery — Xin Xin prefers the ground).
  {
    const tg = node(group);
    const h = TOWER.top;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(tg, M.log, 0.12, 0.15, h + 1.1, TOWER.x + sx * TOWER.half, (h + 1.1) / 2, TOWER.z + sz * TOWER.half, 10);
    for (let i = 0; i < 8; i++) box(tg, M.wood, TOWER.half * 2 + 0.3, 0.08, 0.26, TOWER.x, h - 0.04, TOWER.z - TOWER.half + 0.14 + i * 0.28);
    for (const sz of [-1, 1]) box(tg, M.log, TOWER.half * 2 + 0.3, 0.15, 0.15, TOWER.x, h - 0.15, TOWER.z + sz * TOWER.half);
    cyl(tg, M.iron, 0.01, 0.01, 1.3, TOWER.x, h - 0.8, TOWER.z, 4);
    const tire = add(tg, new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 8, 18), std({ color: 0x1a1a1a, roughness: 0.9 })), TOWER.x, h - 1.55, TOWER.z);
    tire.rotation.y = 0.5;
    cast(tg);
  }
  {
    const bl = [];
    for (const [x, z, r] of [[-3, -15.5, 1.0], [8, -14.6, 0.75], [-7.5, -16, 0.6], [9.2, -2.6, 0.5]]) bl.push(part(new THREE.DodecahedronGeometry(1, 0), rockShades[Math.floor(rand() * 5)], [r * 1.3, r * 0.8, r], [x, r * 0.45, z], [rand(), rand() * 6, rand()]));
    cast(add(group, new THREE.Mesh(mergeGeometries(bl), M.rock)));
    const log = cyl(group, M.log, 0.3, 0.34, 2.6, 1, 0.31, -12.6, 12);
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

  // ---------- the panda house (her indoor den, keepers only), west of the yard ----------
  {
    const hg = node(group);
    const H = 3.4;
    const wall = (x0, x1, z0, z1) => occluders.push(box(hg, M.wall, x1 - x0, H, z1 - z0, (x0 + x1) / 2, H / 2, (z0 + z1) / 2));
    wall(-11.3, -11.0, -12, -1);
    wall(-18.5, -11, -12, -11.7);
    wall(-18.5, -18.2, -12, -1);
    wall(-18.5, -11, -1.3, -1);
    // Her door out into the yard (dark inside), and the keepers' red doors facing the terrace side.
    box(hg, M.black, 0.04, 2.2, 2.0, -10.98, 1.1, -5.5);
    box(hg, M.darkWood, 0.08, 0.12, 2.2, -10.96, 2.26, -5.5);
    for (const s of [-1, 1]) {
      box(hg, M.red, 1.0, 2.4, 0.06, -14.75 + s * 0.51, 1.2, -0.96);
      add(hg, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), M.gold), -14.75 + s * 0.12, 1.2, -0.92);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) add(hg, new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), M.gold), -14.75 + s * (0.3 + j * 0.4), 0.5 + i * 0.5, -0.92);
    }
    box(hg, M.darkWood, 2.2, 0.12, 0.1, -14.75, 2.46, -0.95);
    for (const x of [-18.55, -16.2, -13.3]) cyl(hg, M.red, 0.16, 0.18, H, x, H / 2, -0.88, 12);
    for (const z of [-12, -8.6, -6.6, -4.4, -1.2]) cyl(hg, M.red, 0.16, 0.18, H, -10.88, H / 2, z, 12);
    box(hg, M.red, 7.8, 0.3, 0.12, -14.75, H - 0.15, -0.88);
    box(hg, M.red, 0.12, 0.3, 11.2, -10.88, H - 0.15, -6.5);
    box(hg, M.gold, 7.8, 0.05, 0.13, -14.75, H - 0.3, -0.87);
    box(hg, M.gold, 0.13, 0.05, 11.2, -10.87, H - 0.3, -6.5);
    roof(group, 8.6, 12.2, 2.0, -14.75, H + 0.1, -6.5);
    add(hg, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: T.boardSign('熊猫馆', 'CASA DEL PANDA'), toneMapped: false })), -14.75, 2.95, -0.86);
    for (const x of [-16.0, -13.5]) lantern(hg, x, 2.55, -0.7, 0.8);
    cast(hg);
  }

  // ---------- the family tree wall, on the west side of the terrace ----------
  {
    const tw = node(group);
    occluders.push(box(tw, M.wall, 0.4, 4.4, 8.3, TREE_WALL_X - 0.2, 2.2, 3.15));
    box(tw, M.tileTrim, 0.62, 0.14, 8.5, TREE_WALL_X - 0.2, 4.47, 3.15);
    box(tw, M.red, 0.5, 0.18, 8.32, TREE_WALL_X - 0.2, 4.31, 3.15);
    const MW = 5.6;
    const MH = (MW * 1400) / 2048;
    const muralParts = [];
    const mural = add(tw, new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), std({ map: T.pandaFamilyTree(), roughness: 0.85 })), TREE_WALL_X + 0.015, 2.25, 3.15);
    mural.rotation.y = Math.PI / 2;
    muralParts.push(mural);
    for (const [dz, dy, w, h] of [[0, MH / 2 + 0.05, MW + 0.2, 0.1], [0, -MH / 2 - 0.05, MW + 0.2, 0.1], [MW / 2 + 0.05, 0, 0.1, MH], [-MW / 2 - 0.05, 0, 0.1, MH]]) {
      muralParts.push(box(tw, M.red, 0.06, h, w, TREE_WALL_X + 0.02, 2.25 + dy, 3.15 + dz));
    }
    cast(tw);
    aabb(TREE_WALL_X - 0.4, TREE_WALL_X, -1, 7.3);
    interact(muralParts, {
      label: () => 'Look at the panda family tree',
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(TREE_WALL_X + 3.5, 2.2, 3.15), yaw: Math.PI / 2, pitch: 0.02 });
        ctx.complete('pTree');
        ctx.toast('The family of Chapultepec’s pandas: Pe Pe and Ying Ying came from China in 1975 and had seven cubs here. Their daughter Tohui and Chia Chia had Xin Xin in 1990 — the panda living here today!', 7000);
      },
    });
  }

  // ---------- low walls, hedges, a signpost ----------
  {
    const wg = node(group);
    const w = (x0, x1, z0, z1, h = 1.1) => {
      box(wg, M.wall, x1 - x0, h, z1 - z0, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
      box(wg, M.tileTrim, x1 - x0 + 0.1, 0.1, z1 - z0 + 0.1, (x0 + x1) / 2, h + 0.05, (z0 + z1) / 2);
    };
    w(-11.4, -4.5, 7, 7.3);
    w(4.5, 11.3, 7, 7.3);
    w(11, 11.3, -1, 7);
    // Stone posts with lanterns either side of the way in.
    for (const s of [-1, 1]) {
      box(wg, M.stone, 0.5, 1.4, 0.5, s * 4.55, 0.7, 7.15);
      lantern(wg, s * 4.55, 1.75, 7.15, 0.7);
      post(s * 4.55, 7.15, 0.3);
    }
    cast(wg);
    const hedges = [];
    const hb = (x0, x1, z0, z1) => hedges.push(new THREE.BoxGeometry(x1 - x0, 1.0, z1 - z0).translate((x0 + x1) / 2, 0.5, (z0 + z1) / 2));
    hb(-5.4, -4.5, 7.3, 9.9);
    hb(-5.4, -4.5, 13.1, 16.9);
    hb(4.5, 5.4, 7.3, 9.3);
    hb(4.5, 5.4, 11.9, 16.9);
    hb(-5.4, 5.4, 16.9, 17.8);
    hb(5.4, 13.6, 9.0, 9.3);
    cast(add(group, new THREE.Mesh(mergeGeometries(hedges), M.hedge)));
    // Signpost: pandas ahead, flamingos to the right.
    const sp = node(group, 1.8, 0, 8.7);
    cyl(sp, M.darkWood, 0.06, 0.07, 2.4, 0, 1.2, 0, 8);
    add(sp, new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.26), new THREE.MeshBasicMaterial({ map: T.sign('↑ PANDA GIGANTE', { bg: '#1f5a3a', fg: '#f2c14e', w: 640, h: 144, font: 'bold 62px Georgia, serif' }), toneMapped: false, side: THREE.DoubleSide })), 0, 2.05, 0.08);
    add(sp, new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.26), new THREE.MeshBasicMaterial({ map: T.sign('FLAMENCOS →', { bg: '#c8406a', fg: '#fff6ea', w: 640, h: 144, font: 'bold 62px Georgia, serif' }), toneMapped: false, side: THREE.DoubleSide })), 0.18, 1.72, 0.08);
    cast(sp);
    post(1.8, 8.7, 0.12);
  }

  // ---------- lanterns, benches ----------
  lanternPost(-4.1, 7.75, Math.PI / 2);
  lanternPost(4.1, 7.75, -Math.PI / 2);
  lanternPost(-4.1, 16.3, Math.PI / 2);
  lanternPost(4.1, 16.3, -Math.PI / 2);
  lanternPost(10.5, 1.5, -Math.PI / 2);
  lanternPost(10.5, 5.6, -Math.PI / 2);
  bench(-6.5, 5.5, 0, 'Sit and watch Xin Xin', 'You sit and watch Xin Xin for a while. Listen for the crunch of bamboo!');
  bench(6.5, 5.5, 0, 'Sit and watch Xin Xin', 'You sit and watch Xin Xin for a while. Listen for the crunch of bamboo!');
  bench(-3.75, 15.4, -Math.PI / 2, 'Sit on the bench', 'You sit by the lanterns and people-watch. Everyone’s heading in to see the panda!');

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
      const z = front ? lerp(-11, BOUNDS.z1, rand()) : lerp(BOUNDS.z0, BOUNDS.z1, rand());
      if (!inObst(x, z, 0.6)) return [x, z];
    }
    return [0, -7];
  }
  // Spots where she sits to eat: in front of each grove, and at the bamboo pile.
  const EAT_SPOTS = [
    [PILE.x, PILE.z - 0.95, 0],
    ...GROVES.map(([x, z]) => {
      const dx = -1 - x;
      const dz = -9 - z;
      const l = Math.hypot(dx, dz);
      return [x + (dx / l) * 2.1, z + (dz / l) * 2.1, (rand() - 0.5) * 1.2];
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
    if (kind === 'pool') return [{ go: [POOL.x + (rand() - 0.5) * 2.4, POOL.z + POOL.b + 1.0] }, { face: Math.PI }, { pose: 'sit', dur: 8 + rand() * 4 }];
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
    const g = node(group, -3.2, 0, 0.15, 0.5);
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
  post(-3.2, 0.15, 0.3);
  const cart = node(group, -4.5, 0, 0.55, 0.15);
  box(cart, std({ color: 0x2f6a4a, roughness: 0.6 }), 1.1, 0.5, 0.7, 0, 0.6, 0);
  for (const sx of [-0.4, 0.4]) cyl(cart, M.iron, 0.18, 0.18, 0.06, sx, 0.18, 0.38, 14).rotation.x = Math.PI / 2;
  box(cart, M.iron, 0.04, 0.5, 0.04, 0.55, 0.9, 0);
  for (let i = 0; i < 10; i++) {
    const s = cyl(cart, M.bamboo, 0.03, 0.03, 1.6, (rand() - 0.5) * 0.15, 0.9 + (i % 3) * 0.06, -0.28 + (i % 5) * 0.12, 6);
    s.rotation.z = Math.PI / 2 + (rand() - 0.5) * 0.1;
  }
  aabb(-5.1, -3.9, 0.15, 0.95);
  cast(keeper.g, cart);
  interact([keeper.g, cart], {
    label: () => 'Chat with the keeper',
    act: () => {
      keeper.waveT = time;
      ctx.toast(KEEPER_FACTS[keeper.fact++ % KEEPER_FACTS.length], 5200);
      ctx.complete('pKeeper');
    },
  });

  // ---------- souvenir kiosk (west side of the plaza) ----------
  let plushes = 0;
  {
    const kiosk = node(group, -4.15, 0, 11.5, Math.PI / 2);
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
        if (ctx.souvenir) ctx.souvenir('plush');
        ctx.toast(plushes === 1 ? 'You bought a fluffy panda plushie. ¡Qué suave! *squeak*' : `Another one? That’s ${plushes} plush pandas in your backpack!`);
      },
    });
    aabb(-5.85, -4.05, 9.9, 13.1);
  }

  // ---------- souvenir coin machine (east side of the plaza) ----------
  // Pick the panda or the flamingo, drop in two coins, turn the crank three
  // times and a squashed copper coin with that animal pressed into it drops
  // into the tray.
  const COINS = [
    { emoji: '🐼', name: 'Panda', es: 'Panda gigante' },
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
  const COIN_AT = { x: 4.15, z: 14.05 };
  const cm = node(group, COIN_AT.x, 0, COIN_AT.z, -Math.PI / 2);
  {
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
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), std({ map: T.coinSteps(), roughness: 0.7 })), -0.16, 0.68, 0.002);
    const poster = add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.375), std({ map: T.pandaSign('MONEDAS RECUERDO', 'Souvenir zoo coins'), roughness: 0.7 })), -0.402, 0.62, -0.275);
    poster.rotation.y = -Math.PI / 2;
    box(cm, CM.dark, 0.74, 0.31, 0.012, 0, 1.755, 0.006);
    cast(cm);
  }
  aabb(COIN_AT.x - 0.15, COIN_AT.x + 0.6, COIN_AT.z - 0.47, COIN_AT.z + 0.62);

  const cmState = { sel: 0, coins: 0, turns: 0, turnT: -1, base: 0, angle: 0, blankT: -1, dropT: -1, ready: false, collected: new Set(), inserts: [] };
  const busyPressing = () => cmState.turns > 0 || cmState.turnT >= 0 || cmState.dropT >= 0 || cmState.ready;
  // The two designs, side by side in big oval windows.
  const designX = (i) => (i === 0 ? -0.175 : 0.175);
  const DESIGN_Y = 1.755;
  const ovalGeo = new THREE.PlaneGeometry(0.31, 0.194);
  const rimGeo = new THREE.RingGeometry(0.93, 1.06, 40).scale(0.158, 0.1, 1);
  COINS.forEach((c, i) => {
    const face = add(cm, new THREE.Mesh(ovalGeo, std({ map: coinTex[i], alphaTest: 0.5, metalness: 0.45, roughness: 0.35 })), designX(i), DESIGN_Y, 0.014);
    const rim = add(cm, new THREE.Mesh(rimGeo, M.gold), designX(i), DESIGN_Y, 0.016);
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
  const selRing = add(cm, new THREE.Mesh(new THREE.RingGeometry(1.07, 1.24, 40).scale(0.158, 0.1, 1), new THREE.MeshBasicMaterial({ color: 0xffe14a, toneMapped: false })), 0, 0, 0.017);
  noRay(selRing);

  const led = T.ledPanel();
  box(cm, CM.dark, 0.43, 0.15, 0.008, -0.08, 1.49, 0.004);
  add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.125), new THREE.MeshBasicMaterial({ map: led, toneMapped: false })), -0.08, 1.49, 0.009);
  const slotParts = [
    box(cm, CM.chrome, 0.12, 0.13, 0.025, 0.27, 1.5, 0.012),
    box(cm, CM.dark, 0.014, 0.07, 0.01, 0.27, 1.51, 0.026),
    add(cm, new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshBasicMaterial({ map: T.sign('$5 × 2', { bg: '#1a1a1c', fg: '#f2c14e', w: 256, h: 84, font: 'bold 46px Arial, sans-serif' }), toneMapped: false })), 0.27, 1.408, 0.003),
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
      if (ctx.pay && !ctx.pay()) return ctx.toast('You need $5 peso coins for this machine (2 per coin). Look for shiny coins lying around the zoo, the shops and Arena México!', 5200);
      cmState.coins++;
      const n = cmState.coins;
      cmState.inserts.push({ mesh: pesos[n - 1], t0: time, last: n === 2 });
      ctx.toast(n === 1 ? 'You drop a $5 peso coin in the slot… one more to go.' : 'Clink! Two coins in. Now turn the crank!', 3000);
    },
  });
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
      const img = coinTex[cmState.sel].image.toDataURL();
      if (ctx.showCoin) ctx.showCoin(img, `${c.es} · Chapultepec`);
      if (ctx.souvenir) ctx.souvenir('coin', { key: c.name, name: `${c.name} coin`, img });
      const n = cmState.collected.size;
      ctx.toast(n === COINS.length ? `You got the ${c.name} coin — that’s both designs! ¡Felicidades, coin collector!` : `You got the ${c.name} coin! Try the ${COINS[1 - cmState.sel].name.toLowerCase()} design too.`, 4500);
      if (c.name === 'Panda') ctx.complete('pCoin');
    },
  });
  const smooth = (k) => k * k * (3 - 2 * k);
  function updateCoinMachine(t) {
    const S = cmState;
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
      blank.position.y = lerp(1.3, ANVIL_TOP + 0.028 * blank.scale.y, u * u);
    }
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
    selRing.position.set(designX(S.sel), DESIGN_Y, 0.017);
    selRing.material.color.setHSL(0.14, 1, 0.5 + Math.sin(t * 5) * 0.12);
    const c = COINS[S.sel];
    if (S.ready) led.set('¡LISTO!', 'TAKE YOUR COIN');
    else if (S.dropT >= 0) led.set('KA-CHUNK!', 'PRESSING...');
    else if (S.coins < 2) led.set(c.es.toUpperCase(), S.coins === 0 ? 'INSERT 2 COINS' : 'INSERT 1 MORE');
    else led.set(c.es.toUpperCase(), `TURN CRANK ${S.turns}/3`);
  }

  // ---------- signs and the photo spot ----------
  signPost(-8.4, -0.45, 0, T.pandaSign('PANDAS EN MÉXICO', 'Desde 1975 · Since 1975'), 'In 1975 China gave Mexico two giant pandas, Pe Pe and Ying Ying. In 1981 their cub Tohui was born right here — the first giant panda born and raised in a zoo outside China!', 'pSign');
  signPost(5.0, -0.45, 0, T.pandaSign('XIN XIN', 'Nuestra panda · Our panda'), 'Xin Xin was born right here at Chapultepec Zoo in 1990. She lives alone — giant pandas like their own space, and in the wild they wander the bamboo forests by themselves.', 'pSign');
  signPost(8.4, -0.45, 0, T.pandaSign('PANDA GIGANTE', 'Ailuropoda melanoleuca'), 'Giant pandas spend up to 14 hours a day eating — 12 to 38 kg of bamboo! A special wrist bone works like a thumb to hold the stalks.', 'pSign');
  const PHOTO = { x: 1.8, z: -0.45 };
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

  // ---------- the flamingo lagoon, next door ----------
  rect(group, M.deck, 4.5, 25.2, 9.3, 11.9, 0.03); // the boardwalk
  fence([[5.4, 11.95], [25.2, 11.95], [25.2, 9.3]], 1.0, [0.5, 0.95], M.darkWood, 1.8);
  rect(group, M.sand, PEN.x0, PEN.x1, PEN.z0, PEN.z1, 0.012);
  ellipse(group, M.mud, LAGOON.a + 0.9, LAGOON.b + 0.8, LAGOON.x, 0.018, LAGOON.z);
  ellipse(group, lagoonMat, LAGOON.a, LAGOON.b, LAGOON.x, 0.045, LAGOON.z);
  {
    // Low fence all round, with wire mesh along the boardwalk.
    fence([[PEN.x0, PEN.z1], [PEN.x1, PEN.z1], [PEN.x1, PEN.z0], [PEN.x0, PEN.z0], [PEN.x0, PEN.z1]], 1.0, [0.45, 0.95]);
    const mp = add(group, new THREE.Mesh(new THREE.PlaneGeometry(PEN.x1 - PEN.x0, 0.85), meshMat), (PEN.x0 + PEN.x1) / 2, 0.5, PEN.z1);
    const uv = mp.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (PEN.x1 - PEN.x0), uv.getY(i) * 0.85);
    noRay(mp);
    // A mud island with flamingo nests (little mud cones).
    ellipse(group, M.mud, 1.5, 1.1, LAGOON.x + 1.6, 0.06, LAGOON.z - 0.6);
    const nests = [];
    for (const [dx, dz] of [[1.1, -0.9], [2.0, -0.3], [1.5, -1.3]]) nests.push(part(new THREE.CylinderGeometry(0.18, 0.3, 0.22, 10), 0x6a5240, [1, 1, 1], [LAGOON.x + dx, 0.17, LAGOON.z + dz]));
    cast(add(group, new THREE.Mesh(mergeGeometries(nests), M.vertex)));
    // Reeds along the back of the water.
    const reedSpots = [];
    for (let i = 0; i < 120; i++) {
      const a = Math.PI + rand() * Math.PI;
      const k = 0.95 + rand() * 0.12;
      reedSpots.push([LAGOON.x + Math.cos(a) * LAGOON.a * k, LAGOON.z + Math.sin(a) * LAGOON.b * k, 0.7 + rand() * 0.7]);
    }
    const reeds = new THREE.InstancedMesh(
      mergeGeometries([part(new THREE.CylinderGeometry(0.012, 0.018, 1, 4).translate(0, 0.5, 0), 0x5a7a3a), part(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6).translate(0, 0.85, 0), 0x5a3a22)]),
      M.vertex,
      reedSpots.length,
    );
    reedSpots.forEach(([x, z, h], i) => reeds.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2)), new THREE.Vector3(1, h, 1))));
    group.add(reeds);
    noRay(reeds);
  }
  signPost(16.6, 9.4, 0, T.zooSign('FLAMENCOS', 'Flamenco del Caribe · Phoenicopterus ruber', '🦩'), 'Flamingo chicks are born grey! They turn pink from the shrimp and algae they eat. Flamingos often rest standing on one leg, and they nest on little mounds of mud.', null);
  bench(21.5, 11.62, 0, 'Sit and watch the flamingos', 'You sit on the boardwalk and watch the flamingos wade and honk. One is balancing on one leg!');

  // Flamingos: pink, long-legged, and often on one leg.
  const FPINK = 0xf3869b;
  const FDEEP = 0xe86a84;
  const FPALE = 0xf9c3cc;
  const FLEG = 0xe9919d;
  const FG = {
    body: mergeGeometries([
      part(new THREE.SphereGeometry(0.17, 14, 10), FPINK, [0.85, 0.75, 1.45]),
      part(new THREE.SphereGeometry(0.12, 10, 8), FDEEP, [0.5, 0.5, 1.35], [0.1, 0.03, -0.05]),
      part(new THREE.SphereGeometry(0.12, 10, 8), FDEEP, [0.5, 0.5, 1.35], [-0.1, 0.03, -0.05]),
      part(new THREE.BoxGeometry(0.05, 0.03, 0.16), 0x18181b, [1, 1, 1], [0.11, 0.03, -0.2]),
      part(new THREE.BoxGeometry(0.05, 0.03, 0.16), 0x18181b, [1, 1, 1], [-0.11, 0.03, -0.2]),
      part(new THREE.ConeGeometry(0.07, 0.16, 8), FPINK, [1, 0.5, 1], [0, 0.01, -0.28], [-Math.PI / 2 + 0.25, 0, 0]),
    ]),
    neckLow: part(new THREE.CylinderGeometry(0.022, 0.03, 0.36, 8).translate(0, 0.18, 0), FPINK),
    neckHigh: mergeGeometries([
      part(new THREE.CylinderGeometry(0.019, 0.022, 0.34, 8).translate(0, 0.17, 0), FPINK),
      part(new THREE.SphereGeometry(0.045, 10, 8), FPALE, [0.9, 0.9, 1.15], [0, 0.36, 0.02]),
      part(new THREE.ConeGeometry(0.022, 0.08, 8), 0xf4e4d0, [1, 1, 1], [0, 0.345, 0.085], [Math.PI / 2 + 0.6, 0, 0]),
      part(new THREE.ConeGeometry(0.013, 0.045, 8), 0x18181b, [1, 1, 1], [0, 0.31, 0.12], [Math.PI / 2 + 1.1, 0, 0]),
      part(new THREE.SphereGeometry(0.008, 6, 4), 0xf2d13a, [1, 1, 1], [0.03, 0.375, 0.04]),
      part(new THREE.SphereGeometry(0.008, 6, 4), 0xf2d13a, [1, 1, 1], [-0.03, 0.375, 0.04]),
    ]),
    legHigh: part(new THREE.CylinderGeometry(0.011, 0.012, 0.42, 6).translate(0, -0.21, 0), FLEG),
    legLow: mergeGeometries([
      part(new THREE.SphereGeometry(0.018, 6, 5), FLEG),
      part(new THREE.CylinderGeometry(0.01, 0.011, 0.46, 6).translate(0, -0.23, 0), FLEG),
      part(new THREE.BoxGeometry(0.05, 0.012, 0.08), FDEEP, [1, 1, 1], [0, -0.465, 0.02]),
    ]),
  };
  const inLagoon = (x, z, k = 1) => ((x - LAGOON.x) / (LAGOON.a + 0.8)) ** 2 + ((z - LAGOON.z) / (LAGOON.b + 0.7)) ** 2 < k;
  function lagoonSpot() {
    for (let i = 0; i < 20; i++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 0.95;
      const x = LAGOON.x + Math.cos(a) * (LAGOON.a + 0.8) * rr;
      const z = LAGOON.z + Math.sin(a) * (LAGOON.b + 0.7) * rr;
      if (Math.hypot(x - LAGOON.x - 1.6, (z - LAGOON.z + 0.6) * 1.3) > 1.8) return [x, z];
    }
    return [LAGOON.x - 2, LAGOON.z + 1];
  }
  const flamingos = [];
  api.flamingos = flamingos;
  for (let i = 0; i < 14; i++) {
    const root = new THREE.Group();
    const inner = node(root);
    inner.scale.setScalar(0.85);
    const body = node(inner, 0, 0.9, 0);
    body.add(new THREE.Mesh(FG.body, M.feathers));
    const nl = node(body, 0, 0.05, 0.2);
    nl.add(new THREE.Mesh(FG.neckLow, M.feathers));
    const nh = node(nl, 0, 0.36, 0);
    nh.add(new THREE.Mesh(FG.neckHigh, M.feathers));
    const legs = [-1, 1].map((s) => {
      const hip = node(inner, s * 0.05, 0.9, 0);
      hip.add(new THREE.Mesh(FG.legHigh, M.feathers));
      const knee = node(hip, 0, -0.42, 0);
      knee.add(new THREE.Mesh(FG.legLow, M.feathers));
      return { hip, knee };
    });
    group.add(root);
    noRay(root);
    const [x, z] = lagoonSpot();
    const kinds = ['rest', 'feed', 'stand', 'rest', 'feed', 'preen'];
    flamingos.push({
      root, body, nl, nh, legs,
      pos: new THREE.Vector3(x, 0, z),
      heading: rand() * Math.PI * 2,
      mode: kinds[i % kinds.length],
      until: rand() * 15,
      target: lagoonSpot(),
      cur: { ...FPOSES.stand },
      phase: rand() * 6,
      walk: 0,
    });
  }
  function updateFlamingos(dt, t) {
    for (const f of flamingos) {
      if (t > f.until) {
        const r = rand();
        f.mode = r < 0.35 ? 'rest' : r < 0.7 ? 'feed' : r < 0.9 ? 'walk' : 'preen';
        f.until = t + (f.mode === 'rest' ? 10 + rand() * 15 : f.mode === 'feed' ? 8 + rand() * 7 : f.mode === 'walk' ? 6 + rand() * 4 : 3 + rand() * 3);
        f.target = lagoonSpot();
      }
      let speed = 0;
      if (f.mode === 'feed' || f.mode === 'walk') {
        const dx = f.target[0] - f.pos.x;
        const dz = f.target[1] - f.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.2) f.target = lagoonSpot();
        else {
          const diff = wrapAngle(Math.atan2(dx, dz) - f.heading);
          f.heading += clamp(diff, -dt * 1.2, dt * 1.2);
          speed = (f.mode === 'feed' ? 0.12 : 0.32) * Math.max(0, Math.cos(diff));
          f.pos.x += Math.sin(f.heading) * speed * dt;
          f.pos.z += Math.cos(f.heading) * speed * dt;
        }
      }
      if (!inLagoon(f.pos.x, f.pos.z, 1.05)) f.target = [LAGOON.x, LAGOON.z];
      const P = FPOSES[f.mode === 'walk' ? 'stand' : f.mode];
      const k = 1 - Math.exp(-dt * 2.5);
      for (const key in P) f.cur[key] += (P[key] - f.cur[key]) * k;
      f.walk = damp(f.walk, speed > 0.02 ? 1 : 0, 5, dt);
      f.phase += speed * dt * 9;
      const sw = Math.sin(f.phase) * 0.35 * f.walk;
      f.body.rotation.x = f.cur.pitch;
      f.nl.rotation.x = f.cur.nl + (f.mode === 'feed' ? Math.sin(t * 3 + f.phase) * 0.08 : 0);
      f.nh.rotation.x = f.cur.nh;
      f.nh.rotation.y = f.mode === 'stand' || f.mode === 'walk' ? Math.sin(t * 0.7 + f.phase) * 0.5 : 0;
      f.legs[0].hip.rotation.x = f.cur.ha + sw;
      f.legs[0].knee.rotation.x = f.cur.ka + Math.max(0, sw) * 0.8;
      f.legs[1].hip.rotation.x = f.cur.hb - sw;
      f.legs[1].knee.rotation.x = f.cur.kb + Math.max(0, -sw) * 0.8;
      f.root.position.set(f.pos.x, Math.sin(t * 1.2 + f.phase) * 0.004, f.pos.z);
      f.root.rotation.y = f.heading;
    }
    // Keep them from walking through each other.
    for (let i = 0; i < flamingos.length; i++) {
      for (let j = i + 1; j < flamingos.length; j++) {
        const a = flamingos[i].pos;
        const b = flamingos[j].pos;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.55) {
          const push = (0.55 - d) * 0.5;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
        }
      }
    }
  }

  // ---------- the forest all around ----------
  {
    const inSite = (x, z, pad) =>
      (x > -20 - pad && x < 12.2 + pad && z > -22 - pad && z < 7.6 + pad) ||
      (x > -5.8 - pad && x < 5.8 + pad && z > 5 && z < 18 + pad) ||
      (x > 4 - pad && x < 27.8 + pad && z > -6.5 - pad && z < 12.4 + pad);
    const trees = [];
    for (let tries = 0; tries < 9000 && trees.length < 420; tries++) {
      const x = -75 + rand() * 150;
      const z = -85 + rand() * 140;
      const r = 0.22 + rand() * 0.35;
      if (inSite(x, z, 1.2 + r * 4)) continue;
      if (trees.some((t) => Math.abs(t.x - x) < 3.2 && Math.abs(t.z - z) < 3.2)) continue;
      trees.push({ x, z, r, pine: rand() < 0.35, h: 8 + rand() * 8 });
    }
    for (const [x, z, pine] of [[-8.6, -7.4, true], [8.9, -18, true], [2.6, -17.3, false]]) trees.push({ x, z, r: 0.35, pine, h: pine ? 9 : 8 });
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
  spotRay.far = 40;
  const C0 = new THREE.Vector2(0, 0);
  const spotTargets = [m.root, ...occluders];
  const seen = { spot: false, eat: false, nap: false, flamingo: false };
  let lastNews = -99;
  let nextSnore = 0;
  let nextHonk = 4;
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
    updateFlamingos(dt, t);

    const kt = t - keeper.waveT;
    keeper.g.rotation.y = damp(keeper.g.rotation.y, 0.5 + Math.sin(t * 0.3) * 0.3, 2, dt);
    keeper.armR.rotation.z = kt < 2 ? -0.08 - 2.4 * Math.sin(Math.min(1, kt / 0.4) * Math.PI * 0.5) : damp(keeper.armR.rotation.z, -0.08, 5, dt);
    keeper.armR.rotation.x = kt < 2 ? Math.sin(kt * 10) * 0.25 : 0;
    updateCoinMachine(t);

    waterTex.offset.set(t * 0.015, t * 0.011);
    fallsTex.offset.y = t * 0.9;
    foam.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    foam.material.opacity = 0.35 + Math.sin(t * 5) * 0.08;

    m.head.getWorldPosition(headPos);
    zs.forEach((sp, i) => {
      sp.visible = panda.napping;
      if (!sp.visible) return;
      const u = (t * 0.22 + i / 3) % 1;
      sp.position.set(headPos.x + Math.sin(u * 6 + i) * 0.15, headPos.y + 0.3 + u * 1.0, headPos.z);
      sp.scale.setScalar(0.18 + u * 0.24);
      sp.material.opacity = Math.sin(u * Math.PI) * 0.9;
    });

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
    // Flamingos honk now and then.
    if (t > nextHonk) {
      nextHonk = t + 6 + rand() * 9;
      const v = Math.max(0, 1 - Math.hypot(pp.x - LAGOON.x, pp.z - LAGOON.z) / 24);
      if (v > 0.05) ctx.sound.honk('goose', v * 0.45);
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
    // Walking out along the boardwalk to the flamingos.
    if (!seen.flamingo && pp.x > 13.5 && pp.z > 9) {
      seen.flamingo = true;
      ctx.complete('pFlamingo');
      ctx.toast('Next door to the pandas: a lagoon full of Caribbean flamingos! Spot the ones balancing on one leg.', 5200);
    }

    api.state.water = Math.max(0, 1 - Math.hypot(pp.x - FALLS.x, pp.z - FALLS.z) / 18) * 0.7;
    api.state.calm = pl.seat && pl.seat.calm ? 1 : 0;
  }

  return api;
}
