// The bird trail at Chapultepec Zoo: a U-shaped path through the forest with
// five mini aviaries along it. Both ends of the U are closed off with
// "AUTHORIZED ACCESS ONLY" caution tape. Everything is in meters; north is -z.
//
//                    .------ curve ------.
//                  /       binoculars      \
//      macaws [=] |                         |
//                 |               [=] parrots
//   parakeets [=] |      ahuehuete          |
//                 |               [=] mixed |
//    peacocks [=] |                         |
//               ==tape==                ==tape==
//               you start here
//
// Walking the U from the start, the three aviaries on the left leg are on
// your left and the two on the right leg are on your right.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { meterUV } from './room.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const Y = new THREE.Vector3(0, 1, 0);

const LEG = 20; // the legs run along x = -20 and x = +20
const CZ = -20; // center of the curve; the legs run from here south to the tape
const HW = 1.8; // half-width of the path
const TAPE_Z = 28;
const PATH_END = TAPE_Z + 20; // the path carries on (off-limits) past the tape
const BINO = { x: 0, z: CZ - LEG - 1.3 }; // at the top of the U, on the outer edge
const BIG_TREE = { x: -8, z: 4 };
const TOUCAN_TREE = { x: 1.8, z: BINO.z - 10.7 };

export const AVIARY_SPAWN = { x: -LEG, z: TAPE_Z - 1.6, yaw: 0, pitch: -0.04 };
// Yaw that makes a forward-facing (-z) model or camera look from (x, z) toward (tx, tz).
const lookYaw = (x, z, tx, tz) => Math.atan2(x - tx, z - tz);

// Closest point on the U's centerline.
function nearestOnU(x, z, out) {
  if (z >= CZ) return out.set(x < 0 ? -LEG : LEG, 0, Math.min(z, PATH_END));
  const dz = z - CZ;
  const l = Math.hypot(x, dz) || 1;
  return out.set((x / l) * LEG, 0, CZ + (dz / l) * LEG);
}

export const BIRDS = {
  peacock: {
    name: 'Indian peacock',
    es: 'Pavo real',
    fact: 'Only the males have the famous train — about 200 feathers with shimmering “eyes”. They rattle it to show off.',
  },
  peacockWhite: {
    name: 'White peacock',
    es: 'Pavo real blanco',
    fact: 'White peacocks aren’t albino — it’s a color variation called leucism.',
  },
  peahen: {
    name: 'Peahen',
    es: 'Pava real',
    fact: 'The peahen is the female: brown and speckled, perfect camouflage while she sits on her eggs.',
  },
  budgie: {
    name: 'Budgerigar',
    es: 'Periquito australiano',
    fact: 'Budgies come from Australia, where wild flocks are always green and yellow.',
    size: 0.42,
    body: 0x7cc243, head: 0xf2d13a, beak: 0xe8c8a8, wing: 0x5a9a2a, wingMid: 0x3a6a22, wingTip: 0x1a1a1a, tail: 0x2a5fb0, tailLen: 0.3,
  },
  budgieBlue: {
    name: 'Blue budgerigar',
    es: 'Periquito azul',
    fact: 'Blue budgies come from a color mutation bred in captivity.',
    size: 0.42,
    body: 0x4f8ad8, head: 0xf4f1ea, beak: 0xe8c8a8, wing: 0x3a6ab0, wingMid: 0x24467a, wingTip: 0x1a1a1a, tail: 0x1f3d8c, tailLen: 0.3,
  },
  scarlet: {
    name: 'Scarlet macaw',
    es: 'Guacamaya roja',
    fact: 'Scarlet macaws live in the rainforests of southern Mexico and can live for decades. They mate for life.',
    size: 1,
    body: 0xd8262e, face: 0xf4efe6, beak: 0xe9dcc8, wing: 0xd8262e, wingMid: 0xf2c14e, wingTip: 0x2a5fb0, tail: 0xd8262e, tailTip: 0x2a5fb0, tailLen: 0.42,
  },
  military: {
    name: 'Military macaw',
    es: 'Guacamaya verde',
    fact: 'The green military macaw nests in Mexico’s canyons and dry forests. It’s a threatened species.',
    size: 1,
    body: 0x5e9a3a, face: 0xf4efe6, crest: 0xd8262e, beak: 0x333333, wing: 0x5e9a3a, wingMid: 0x5e9a3a, wingTip: 0x2a5fb0, tail: 0xb8503a, tailTip: 0x2a5fb0, tailLen: 0.4,
  },
  parrot: {
    name: 'Yellow-headed parrot',
    es: 'Loro cabeza amarilla',
    fact: 'Yellow-headed parrots are famous talkers — and endangered in the wild because of the pet trade.',
    size: 0.62,
    body: 0x4fa83a, head: 0xf2d13a, beak: 0xe9dcc8, wing: 0x4fa83a, wingMid: 0xd8262e, wingTip: 0x2a5fb0, tail: 0x4fa83a, tailLen: 0.16,
  },
  redcrown: {
    name: 'Red-crowned parrot',
    es: 'Loro tamaulipeco',
    fact: 'Red-crowned parrots come from northeastern Mexico and are endangered in the wild.',
    size: 0.6,
    body: 0x4fa83a, crest: 0xd8263e, beak: 0xe9dcc8, wing: 0x4fa83a, wingMid: 0xd8263e, wingTip: 0x2a5fb0, tail: 0x5ab84a, tailLen: 0.16,
  },
  monk: {
    name: 'Monk parakeet',
    es: 'Cotorra argentina',
    fact: 'Wild monk parakeets live all over Chapultepec forest and build huge shared stick nests.',
    size: 0.45,
    body: 0x6fbf4a, belly: 0xbfc6b8, face: 0xbfc6b8, beak: 0xf2b98a, wing: 0x6fbf4a, wingMid: 0x5aa83a, wingTip: 0x2a5fb0, tail: 0x6fbf4a, tailLen: 0.22,
  },
  toucan: {
    name: 'Keel-billed toucan',
    es: 'Tucán pico de canoa',
    fact: 'That rainbow bill is mostly hollow, so it’s surprisingly light. Toucans toss fruit in the air and catch it!',
    size: 0.75,
    body: 0x18181b, belly: 0xf2d13a, bill: 'toucan', wing: 0x18181b, tail: 0x18181b, tailLen: 0.22,
  },
};

export function buildAviary(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const shadowLights = [];
  const birdsGroup = new THREE.Group();
  group.add(birdsGroup);
  const rand = T.rng(777);
  const tmp = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const api = {
    group,
    birds: birdsGroup,
    colliders,
    shadowLights,
    dirty: true,
    floorAt: () => 0,
    limit,
    update,
    identify,
    state: { water: 0, mist: 0, calm: 0 },
  };

  // ---------- materials ----------
  const M = {
    floor: std({ map: T.forestFloor(), roughness: 1 }),
    path: std({ map: T.gravel(), color: 0xb8a07c, roughness: 1 }),
    grass: std({ map: T.grass(), roughness: 1 }),
    sand: std({ map: T.gravel(), color: 0xd8c49a, roughness: 1 }),
    wood: std({ map: T.woodGrain(), color: 0x8a6440, roughness: 0.7 }),
    darkWood: std({ map: T.woodGrain(), color: 0x5a3e28, roughness: 0.75 }),
    frame: std({ color: 0x2f4a32, roughness: 0.55, metalness: 0.35 }),
    roofSheet: std({ color: 0x3f6a42, roughness: 0.6, metalness: 0.2 }),
    bark: std({ map: T.woodGrain(), color: 0x4a3626, roughness: 1 }),
    moss: std({ color: 0x8a9a7a, roughness: 1 }),
    iron: std({ color: 0x2a2c2a, metalness: 0.5, roughness: 0.5 }),
    water: std({ color: 0x5fa8c8, roughness: 0.1, metalness: 0.2 }),
    seed: std({ color: 0xe8c86a, roughness: 0.7, flatShading: true }),
    yellow: std({ color: 0xf2c14e, roughness: 0.5 }),
    stake: std({ color: 0xf6d21a, roughness: 0.5 }),
    stakeBand: std({ color: 0x141414, roughness: 0.5 }),
    vertex: std({ vertexColors: true, roughness: 0.75 }),
    vertexFlat: std({ vertexColors: true, roughness: 0.9, flatShading: true }),
    leaf: std({ roughness: 0.85, flatShading: true }),
  };
  const meshTex = T.cageMesh();
  meshTex.repeat.set(9, 9);
  const meshMat = new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, color: 0x262826 });

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
  const post = (x, z, r) => colliders.push({ x, z, r, off: false });
  const interact = (objs, def) => {
    for (const o of [].concat(objs)) o.traverse((c) => (c.userData.interact = def));
    return def;
  };
  const cast = (...objs) => objs.forEach((o) => o.traverse((c) => (c.userData.cast = true)));
  const noRay = (...objs) => objs.forEach((o) => o.traverse((c) => (c.raycast = () => {})));
  // Color every vertex of a geometry, so many parts can share one material.
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

  // ---------- where you can walk ----------
  // Stay on the path, and don't cross the tape at either end.
  function limit(p, r) {
    nearestOnU(p.x, p.z, tmpN);
    const dx = p.x - tmpN.x;
    const dz = p.z - tmpN.z;
    const d = Math.hypot(dx, dz);
    const max = HW - r;
    if (d > max) {
      p.x = tmpN.x + (dx / d) * max;
      p.z = tmpN.z + (dz / d) * max;
    }
    p.z = Math.min(p.z, TAPE_Z - r - 0.15);
  }

  // ---------- sky, sun, ground ----------
  const sunDir = new THREE.Vector3(0.4, 0.82, 0.4).normalize();
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
          vec3 c = mix(vec3(0.8, 0.88, 0.82), vec3(0.32, 0.56, 0.86), pow(h, 0.55));
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
  sun.target.position.set(-3, 0, -7);
  sun.position.copy(sunDir).multiplyScalar(100).add(sun.target.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 30, far: 200 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  group.add(sun, sun.target);
  shadowLights.push(sun);
  group.add(new THREE.HemisphereLight(0xd2e4ff, 0x3a4a2a, 0.8));

  {
    const g = new THREE.PlaneGeometry(600, 600);
    const uv = g.attributes.uv;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const ground = new THREE.Mesh(g, M.floor);
    ground.rotation.x = -Math.PI / 2;
    group.add(ground);
  }

  // ---------- the U-shaped path ----------
  const center = [];
  for (let z = PATH_END; z > CZ; z -= 1) center.push([-LEG, z]);
  for (let i = 0; i <= 56; i++) {
    const th = Math.PI + (i / 56) * Math.PI;
    center.push([Math.cos(th) * LEG, CZ + Math.sin(th) * LEG]);
  }
  for (let z = CZ + 1; z <= PATH_END; z += 1) center.push([LEG, z]);
  {
    const pos = [];
    const nor = [];
    const uvs = [];
    const idx = [];
    const w = HW + 0.15;
    center.forEach(([x, z], i) => {
      const a = center[Math.max(0, i - 1)];
      const b = center[Math.min(center.length - 1, i + 1)];
      const tx = b[0] - a[0];
      const tz = b[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      const nx = -tz / l;
      const nz = tx / l;
      for (const s of [1, -1]) {
        const px = x + nx * w * s;
        const pz = z + nz * w * s;
        pos.push(px, 0.012, pz);
        nor.push(0, 1, 0);
        uvs.push(px, pz);
      }
      if (i < center.length - 1) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, M.path));
  }
  // Stones along both edges of the path.
  {
    const spots = [];
    let acc = 0;
    center.forEach(([x, z], i) => {
      if (i === 0) return;
      const [px, pz] = center[i - 1];
      acc += Math.hypot(x - px, z - pz);
      if (acc < 0.75) return;
      acc = 0;
      const l = Math.hypot(x - px, z - pz) || 1;
      const nx = -(z - pz) / l;
      const nz = (x - px) / l;
      for (const s of [1, -1]) if (rand() < 0.8) spots.push([x + nx * (HW + 0.25) * s, z + nz * (HW + 0.25) * s, 0.09 + rand() * 0.1]);
    });
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std({ color: 0x6a645a, roughness: 1, flatShading: true }), spots.length);
    spots.forEach(([x, z, s], i) => stones.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand() * 6, rand())), new THREE.Vector3(s * 1.3, s, s * 1.1))));
    group.add(stones);
    noRay(stones);
  }

  // ---------- caution tape across both ends ----------
  const tapeTex = T.cautionTape();
  tapeTex.repeat.set(2, 1);
  const tapeMat = std({ map: tapeTex, side: THREE.DoubleSide, roughness: 0.5 });
  const tapes = [];
  const tapeParts = [];
  const span = 2 * (HW + 0.4);
  for (const x0 of [-LEG, LEG]) {
    for (const s of [-1, 1]) {
      const sx = x0 + s * (HW + 0.4);
      const pole = cyl(group, M.stake, 0.05, 0.05, 1.3, sx, 0.65, TAPE_Z, 10);
      tapeParts.push(pole);
      for (const y of [0.25, 0.6, 0.95]) tapeParts.push(cyl(group, M.stakeBand, 0.052, 0.052, 0.12, sx, y, TAPE_Z, 10));
      cast(pole);
    }
    for (const [y, sag] of [[1.15, 0.14], [0.68, 0.1]]) {
      const geo = new THREE.PlaneGeometry(span, 0.08, 30, 1);
      const m = add(group, new THREE.Mesh(geo, tapeMat), x0, y, TAPE_Z);
      m.rotation.y = Math.PI; // readable from inside the trail
      tapes.push({ m, base: Float32Array.from(geo.attributes.position.array), sag, phase: rand() * 6 });
      tapeParts.push(m);
    }
    const board = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.28), new THREE.MeshStandardMaterial({ map: T.sign('AUTHORIZED ACCESS ONLY', { bg: '#f6d21a', fg: '#141414', w: 1024, h: 200, font: 'bold 62px Arial, sans-serif' }), side: THREE.DoubleSide, roughness: 0.5 })), x0, 0.88, TAPE_Z - 0.01);
    board.rotation.y = Math.PI;
    tapeParts.push(board);
  }
  interact(tapeParts, {
    label: () => 'Authorized access only',
    act: () => {
      ctx.toast('Sorry — past the tape is for zoo staff only. The trail carries on, but not for visitors!');
      ctx.complete('tape');
    },
  });

  // ---------- birds (shared builders) ----------
  function birdGeos(sp) {
    const parts = [part(new THREE.SphereGeometry(0.12, 12, 9), sp.body, [1, 1, 1.7])];
    if (sp.belly) parts.push(part(new THREE.SphereGeometry(0.1, 10, 8), sp.belly, [0.95, 0.9, 1.2], [0, -0.03, 0.08]));
    parts.push(part(new THREE.SphereGeometry(0.09, 12, 9), sp.head || sp.body, [1, 1, 1], [0, 0.06, 0.2]));
    if (sp.face) for (const s of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.05, 8, 6), sp.face, [0.5, 1, 1], [s * 0.07, 0.06, 0.23]));
    if (sp.crest) parts.push(part(new THREE.SphereGeometry(0.035, 8, 6), sp.crest, [1, 0.8, 1], [0, 0.1, 0.27]));
    for (const s of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.016, 6, 5), 0x111111, [1, 1, 1], [s * 0.075, 0.08, 0.25]));
    if (sp.bill === 'toucan') {
      parts.push(part(new THREE.CylinderGeometry(0.045, 0.055, 0.1, 10), 0x7cc243, [1, 1.35, 1], [0, 0.04, 0.32], [Math.PI / 2, 0, 0]));
      parts.push(part(new THREE.CylinderGeometry(0.035, 0.045, 0.1, 10), 0xf28a1d, [1, 1.35, 1], [0, 0.035, 0.42], [Math.PI / 2 + 0.06, 0, 0]));
      parts.push(part(new THREE.CylinderGeometry(0.01, 0.035, 0.09, 10), 0xd8263e, [1, 1.35, 1], [0, 0.028, 0.515], [Math.PI / 2 + 0.12, 0, 0]));
    } else {
      parts.push(part(new THREE.ConeGeometry(0.04, 0.1, 8), sp.beak, [1, 1.2, 1], [0, 0.03, 0.3], [Math.PI / 2 + 0.45, 0, 0]));
    }
    const tl = sp.tailLen;
    parts.push(part(new THREE.BoxGeometry(0.08, 0.02, tl * 0.6), sp.tail, [1, 1, 1], [0, -0.02, -0.17 - tl * 0.3], [-0.12, 0, 0]));
    if (sp.tailTip || tl > 0.2) parts.push(part(new THREE.BoxGeometry(0.06, 0.018, tl * 0.45), sp.tailTip || sp.tail, [1, 1, 1], [0, -0.06, -0.17 - tl * 0.8], [-0.12, 0, 0]));
    const wing = mergeGeometries([
      part(new THREE.BoxGeometry(0.16, 0.016, 0.15), sp.wing, [1, 1, 1], [0.08, 0, 0]),
      part(new THREE.BoxGeometry(0.14, 0.013, 0.13), sp.wingMid || sp.wing, [1, 1, 1], [0.23, 0, -0.01]),
      part(new THREE.BoxGeometry(0.13, 0.01, 0.1), sp.wingTip || sp.wing, [1, 1, 1], [0.36, 0, -0.03]),
    ]);
    return { body: mergeGeometries(parts), wing };
  }
  const geos = {};
  for (const k of ['budgie', 'budgieBlue', 'scarlet', 'military', 'parrot', 'redcrown', 'monk', 'toucan']) geos[k] = birdGeos(BIRDS[k]);
  const birdMat = std({ vertexColors: true, roughness: 0.55 });

  function makeBird(key) {
    const sp = BIRDS[key];
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const inner = new THREE.Group();
    inner.scale.setScalar(sp.size);
    g.add(inner);
    const body = new THREE.Mesh(geos[key].body, birdMat);
    const wl = new THREE.Mesh(geos[key].wing, birdMat);
    wl.position.set(0.09, 0.04, 0.03);
    const wr = new THREE.Mesh(geos[key].wing, birdMat);
    wr.position.set(-0.09, 0.04, 0.03);
    wr.scale.x = -1;
    inner.add(body, wl, wr);
    for (const m of [body, wl, wr]) m.userData.species = key;
    birdsGroup.add(g);
    return { g, wl, wr, key, sp, mode: 'perch', phase: rand() * 10, pos: new THREE.Vector3(), prev: new THREE.Vector3(), faceYaw: 0, small: sp.size < 0.5 };
  }
  function wings(b, flap, fold) {
    b.wl.rotation.set(0, fold, flap);
    b.wr.rotation.set(0, -fold, -flap);
  }
  function perchPose(b, t) {
    b.g.position.copy(b.pos);
    b.g.position.y += 0.12 * b.sp.size;
    const look = b.small ? Math.sin(t * 2.3 + b.phase) * 0.5 : Math.sin(t * 0.5 + b.phase) * 0.35;
    const bob = b.bobUntil > t ? Math.abs(Math.sin(t * 9)) * 0.25 : 0;
    b.g.rotation.set(-0.95 + bob, b.faceYaw + look, 0);
    const preen = Math.max(0, Math.sin(t * 0.3 + b.phase) - 0.9) * 8;
    wings(b, 0.1 + preen * 0.6, 1.35 - preen * 0.5);
  }

  // Peacocks walk on the ground and, when they feel like it, fan their tails.
  const fanMat = std({ map: T.peacockFan(), side: THREE.DoubleSide, roughness: 0.45, metalness: 0.1, alphaTest: 0.2 });
  const fanWhiteMat = std({ map: T.peacockFan(true), side: THREE.DoubleSide, roughness: 0.6, alphaTest: 0.2 });
  function makePeacock(kind) {
    const male = kind !== 'hen';
    const white = kind === 'white';
    const key = kind === 'hen' ? 'peahen' : white ? 'peacockWhite' : 'peacock';
    const breast = white ? 0xf4f4f0 : male ? 0x1f4fb8 : 0x8a7a62;
    const back = white ? 0xeeeeea : male ? 0x2f7a5a : 0x7a6a52;
    const wing = white ? 0xe8e8e4 : male ? 0xb89a6a : 0x6a5a44;
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    const body = new THREE.Mesh(
      mergeGeometries([
        part(new THREE.SphereGeometry(0.2, 14, 10), breast, [0.85, 1, 1.25], [0, 0.62, 0.06]),
        part(new THREE.SphereGeometry(0.2, 14, 10), back, [0.95, 0.85, 1.45], [0, 0.66, -0.14]),
        part(new THREE.SphereGeometry(0.12, 10, 8), wing, [0.5, 0.8, 1.6], [0.15, 0.64, -0.12]),
        part(new THREE.SphereGeometry(0.12, 10, 8), wing, [0.5, 0.8, 1.6], [-0.15, 0.64, -0.12]),
        part(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), 0x8a8a8a, [1, 1, 1], [0.07, 0.25, 0]),
        part(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), 0x8a8a8a, [1, 1, 1], [-0.07, 0.25, 0]),
        male
          ? part(new THREE.ConeGeometry(0.22, 1.35, 10), white ? 0xf0f0ec : 0x3a6a2a, [1, 1, 0.35], [0, 0.36, -0.95], [-Math.PI / 2 - 0.2, 0, 0])
          : part(new THREE.BoxGeometry(0.16, 0.05, 0.4), 0x6a5a44, [1, 1, 1], [0, 0.6, -0.42], [0.3, 0, 0]),
      ]),
      birdMat,
    );
    root.add(body);
    // Neck + head on a pivot, so the bird can peck.
    const neck = node(root, 0, 0.72, 0.16);
    const crest = [];
    for (let i = -2; i <= 2; i++) {
      crest.push(part(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), breast, [1, 1, 1], [i * 0.012, 0.5, 0.13], [-0.25, 0, i * 0.15]));
      crest.push(part(new THREE.SphereGeometry(0.016, 6, 5), breast, [1, 1, 1], [i * 0.022, 0.56, 0.12]));
    }
    neck.add(
      new THREE.Mesh(
        mergeGeometries([
          part(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 10), breast, [1, 1, 1], [0, 0.19, 0.06], [0.3, 0, 0]),
          part(new THREE.SphereGeometry(0.065, 10, 8), breast, [1, 1, 1.1], [0, 0.42, 0.14]),
          part(new THREE.SphereGeometry(0.02, 6, 5), 0xffffff, [1.6, 0.5, 1], [0.05, 0.44, 0.16]),
          part(new THREE.SphereGeometry(0.02, 6, 5), 0xffffff, [1.6, 0.5, 1], [-0.05, 0.44, 0.16]),
          part(new THREE.ConeGeometry(0.02, 0.07, 6), 0x9a8a7a, [1, 1, 1], [0, 0.41, 0.22], [Math.PI / 2 + 0.3, 0, 0]),
          ...crest,
        ]),
        birdMat,
      ),
    );
    let fan = null;
    if (male) {
      fan = add(root, new THREE.Mesh(new THREE.CircleGeometry(1.45, 40, 0, Math.PI), white ? fanWhiteMat : fanMat), 0, 0.5, -0.32);
      fan.visible = false;
    }
    root.traverse((o) => (o.userData.species = key));
    birdsGroup.add(root);
    return { root, neck, fan, body, male, kind, heading: rand() * 6, pos: new THREE.Vector3(), target: new THREE.Vector3(), pauseUntil: 0, displayUntil: 0, nextShow: 20 + rand() * 40, fanK: 0, phase: rand() * 6 };
  }

  // ---------- the five mini aviaries ----------
  const cages = [];
  const cageRects = [];
  function makeCage(def) {
    const { x, z, w, d, h = 3.4, yaw = Math.PI / 2 } = def;
    const g = node(group, x, 0, z, yaw);
    const origin = new THREE.Vector3(x, 0, z);
    const toWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(origin);
    const corners = [toWorld(-w / 2, 0, 0), toWorld(w / 2, 0, 0), toWorld(-w / 2, 0, -d), toWorld(w / 2, 0, -d)];
    cageRects.push({
      x0: Math.min(...corners.map((c) => c.x)),
      x1: Math.max(...corners.map((c) => c.x)),
      z0: Math.min(...corners.map((c) => c.z)),
      z1: Math.max(...corners.map((c) => c.z)),
    });
    const cage = { def, g, yaw, w, d, h, toWorld, perches: [], birds: [], peacocks: [], frontPt: toWorld(0, 0, 1.2), visited: false };
    const solidParts = [];

    // Floor, kick boards, frame and the wire mesh.
    add(g, new THREE.Mesh(meterUV(new THREE.BoxGeometry(w - 0.08, 0.04, d - 0.08)), def.floor || M.sand), 0, 0.02, -d / 2);
    const kb = 0.45;
    solidParts.push(box(g, M.darkWood, w, kb, 0.06, 0, kb / 2, 0), box(g, M.darkWood, w, kb, 0.06, 0, kb / 2, -d));
    solidParts.push(box(g, M.darkWood, 0.06, kb, d, -w / 2, kb / 2, -d / 2), box(g, M.darkWood, 0.06, kb, d, w / 2, kb / 2, -d / 2));
    const panel = (pw, ph, px, py, pz, ry, rx = 0) => {
      const geo = new THREE.PlaneGeometry(pw, ph);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * pw, uv.getY(i) * ph);
      const m = add(g, new THREE.Mesh(geo, meshMat), px, py, pz);
      m.rotation.set(rx, ry, 0);
      return m;
    };
    const wallH = h - kb;
    const front = panel(w, wallH, 0, kb + wallH / 2, 0, 0);
    panel(w, wallH, 0, kb + wallH / 2, -d, 0);
    panel(d, wallH, -w / 2, kb + wallH / 2, -d / 2, Math.PI / 2);
    panel(d, wallH, w / 2, kb + wallH / 2, -d / 2, Math.PI / 2);
    panel(w, d, 0, h, -d / 2, 0, -Math.PI / 2);
    solidParts.push(box(g, M.roofSheet, w + 0.3, 0.05, d * 0.5 + 0.2, 0, h + 0.06, -d * 0.75));
    const nx = Math.max(2, Math.round(w / 1.6));
    for (let i = 0; i <= nx; i++) {
      const lx = -w / 2 + (i * w) / nx;
      solidParts.push(box(g, M.frame, 0.08, h, 0.08, lx, h / 2, 0), box(g, M.frame, 0.08, h, 0.08, lx, h / 2, -d));
    }
    const nz = Math.max(2, Math.round(d / 1.6));
    for (let i = 1; i < nz; i++) {
      const lz = (-i * d) / nz;
      solidParts.push(box(g, M.frame, 0.08, h, 0.08, -w / 2, h / 2, lz), box(g, M.frame, 0.08, h, 0.08, w / 2, h / 2, lz));
    }
    solidParts.push(box(g, M.frame, w, 0.08, 0.08, 0, h, 0), box(g, M.frame, w, 0.08, 0.08, 0, h, -d));
    solidParts.push(box(g, M.frame, 0.08, 0.08, d, -w / 2, h, -d / 2), box(g, M.frame, 0.08, 0.08, d, w / 2, h, -d / 2));
    // A keeper's door on the side (shut).
    solidParts.push(box(g, M.frame, 0.06, 2.0, 0.9, w / 2 + 0.04, 1.0, -d + 0.9));
    // Name plate over the front.
    solidParts.push(box(g, M.darkWood, 3.0, 0.65, 0.06, 0, h + 0.42, 0.02));
    const plate = add(g, new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.52), new THREE.MeshBasicMaterial({ map: T.sign(def.title, { bg: '#2f5d3a', w: 1024, h: 190, font: 'bold 92px Georgia, serif' }), toneMapped: false })), 0, h + 0.42, 0.06);

    // Inside: a dead tree, nest boxes, water, and a feeding tray at the front.
    const tx = w * 0.3;
    const tz = -d * 0.62;
    const tree = [new THREE.CylinderGeometry(0.08, 0.14, h - 0.3, 8).translate(tx, (h - 0.3) / 2, tz)];
    for (const [a, y, len] of [[0.6, 1.4, 1.0], [2.4, 2.0, 0.9], [4.2, 2.5, 0.8]]) {
      const dir = new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a)).normalize();
      tree.push(new THREE.CylinderGeometry(0.03, 0.06, len, 6).translate(0, len / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir)).translate(tx, y, tz));
    }
    solidParts.push(add(g, new THREE.Mesh(mergeGeometries(tree), M.bark)));
    for (const lx of [-w * 0.3, -w * 0.05]) {
      solidParts.push(box(g, M.wood, 0.32, 0.38, 0.28, lx, h - 0.9, -d + 0.2));
      add(g, new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), std({ color: 0x120c08 })), lx, h - 0.85, -d + 0.341);
    }
    cyl(g, M.iron, 0.28, 0.24, 0.1, -w * 0.32, 0.09, -d * 0.4, 18);
    cyl(g, M.water, 0.25, 0.25, 0.02, -w * 0.32, 0.13, -d * 0.4, 18);
    const trayParts = [];
    const seeds = [];
    if (def.tray !== false) {
      trayParts.push(cyl(g, M.darkWood, 0.04, 0.04, 0.95, 0, 0.475, -0.55, 8), box(g, M.wood, 1.1, 0.06, 0.32, 0, 0.98, -0.55));
      for (let i = 0; i < 26; i++) seeds.push(add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), M.seed), (rand() - 0.5) * 0.95, 1.03, -0.55 + (rand() - 0.5) * 0.22));
    }
    seeds.forEach((s) => (s.visible = false));
    cage.showSeeds = (on) => seeds.forEach((s) => (s.visible = on));

    // Perch bars, with posts holding them up.
    if (def.spacing) {
      const bar = (lz, y, len, isFront) => {
        const c = cyl(g, M.bark, 0.035, 0.035, len, 0, y, lz, 8);
        c.rotation.z = Math.PI / 2;
        for (const s of [-1, 1]) cyl(g, M.bark, 0.04, 0.05, y, (s * len) / 2, y / 2, lz, 6);
        solidParts.push(c);
        for (let lx = -len / 2 + def.spacing / 2; lx <= len / 2 - def.spacing / 2 + 1e-6; lx += def.spacing) {
          cage.perches.push({ p: toWorld(lx, y + 0.035, lz), front: isFront, who: null, lx });
        }
      };
      bar(-d + 0.55, h - 0.75, w - 1.2, false);
      bar(-d * 0.52, h * 0.55, (w - 1.2) * 0.8, false);
      bar(-0.32, 1.5, (w - 1.2) * 0.75, true);
    }
    cast(...solidParts, ...trayParts);
    interact([front, plate, ...trayParts, ...solidParts], {
      label: () => def.action,
      act: () => def.onAct(cage),
    });

    // The sign in front.
    const sg = node(g, -w / 2 + 0.7, 0, 0.25);
    for (const dx of [-0.42, 0.42]) box(sg, M.darkWood, 0.06, 1.0, 0.06, dx, 0.5, -0.02);
    const board = add(sg, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), std({ map: T.birdSign(def.signTitle || def.title, def.sub, def.colors), roughness: 0.7 })), 0, 1.18, 0.02);
    board.rotation.x = -0.2;
    box(sg, M.darkWood, 1.08, 0.83, 0.04, 0, 1.18, -0.01).rotation.x = -0.2;
    cast(sg);
    interact(sg, {
      label: () => 'Read the sign',
      act: () => {
        ctx.toast(def.fact, 5600);
        ctx.complete('sign');
      },
    });
    cages.push(cage);
    return cage;
  }

  let time = 0;
  // Birds hop between perch slots; "front" slots are on the bar right by the mesh.
  function claim(b, slot) {
    if (b.slot) b.slot.who = null;
    b.slot = slot;
    slot.who = b;
  }
  function freeSlots(cage, front) {
    return cage.perches.filter((s) => !s.who && s.front === front);
  }
  function hopTo(b, slot, t, delay = 0) {
    claim(b, slot);
    b.mode = 'travel';
    b.from = b.pos.clone();
    b.to = slot.p.clone();
    b.t0 = t + delay;
    b.dur = 0.6 + b.from.distanceTo(b.to) * (b.small ? 0.18 : 0.3);
  }
  function addCageBird(cage, key) {
    const b = makeBird(key);
    b.cage = cage;
    const slots = freeSlots(cage, false);
    const slot = slots[Math.floor(rand() * slots.length)];
    claim(b, slot);
    b.pos.copy(slot.p);
    b.faceYaw = cage.yaw + (rand() - 0.5) * 0.9;
    b.nextHop = rand() * 8;
    b.holdUntil = 0;
    cage.birds.push(b);
    return b;
  }
  function updateCageBird(b, t) {
    if (b.mode === 'travel') {
      const u = Math.max(0, Math.min(1, (t - b.t0) / b.dur));
      const e = u * u * (3 - 2 * u);
      b.prev.copy(b.pos);
      b.pos.lerpVectors(b.from, b.to, e);
      b.pos.y += Math.sin(Math.PI * e) * (b.small ? 0.35 : 0.5);
      b.g.position.copy(b.pos);
      if (b.pos.distanceToSquared(b.prev) > 1e-8) b.g.lookAt(tmp.copy(b.pos).multiplyScalar(2).sub(b.prev));
      wings(b, Math.sin(t * (b.small ? 42 : 16) + b.phase) * 0.9, 0);
      if (u >= 1) {
        b.mode = 'perch';
        b.faceYaw = b.cage.yaw + (rand() - 0.5) * (b.slot.front ? 0.3 : 0.9);
        b.nextHop = t + (b.small ? 1.5 + rand() * 4 : 7 + rand() * 10);
        if (b.onArrive) {
          b.onArrive();
          b.onArrive = null;
        }
      }
    } else {
      perchPose(b, t);
      if (t > b.nextHop && t > b.holdUntil) {
        const slots = freeSlots(b.cage, false);
        if (slots.length) hopTo(b, slots[Math.floor(rand() * slots.length)], t);
        else b.nextHop = t + 3;
      }
    }
  }
  // Call some of a cage's birds down to the front bar, nearest the middle first.
  function summon(cage, count, filter) {
    const t = time;
    const slots = freeSlots(cage, true).sort((a, b) => Math.abs(a.lx) - Math.abs(b.lx));
    const birds = cage.birds.filter((b) => (!filter || filter(b)) && !(b.slot && b.slot.front)).slice(0, count);
    const sent = [];
    birds.forEach((b, i) => {
      if (!slots[i]) return;
      hopTo(b, slots[i], t, i * 0.25);
      b.holdUntil = t + 14;
      sent.push(b);
    });
    // Birds already at the front stay a while longer too.
    cage.birds.forEach((b) => {
      if (b.slot && b.slot.front) b.holdUntil = t + 14;
    });
    return sent;
  }

  function addPeacock(cage, kind) {
    const p = makePeacock(kind);
    p.cage = cage;
    p.pos.copy(randomFloorPoint(cage));
    p.target.copy(randomFloorPoint(cage));
    cage.peacocks.push(p);
    return p;
  }
  function randomFloorPoint(cage) {
    return cage.toWorld((rand() - 0.5) * (cage.w - 1.8), 0, -0.9 - rand() * (cage.d - 1.8));
  }
  function updatePeacock(p, t, dt) {
    const c = p.cage;
    if (p.male && t > p.nextShow && t > p.displayUntil) {
      p.displayUntil = t + 7;
      p.nextShow = t + 40 + rand() * 40;
    }
    const showing = t < p.displayUntil && !p.walkFront;
    const goal = showing ? c.yaw : Math.atan2(p.target.x - p.pos.x, p.target.z - p.pos.z);
    let diff = goal - p.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.heading += THREE.MathUtils.clamp(diff, -dt * 1.6, dt * 1.6);
    const dist = Math.hypot(p.target.x - p.pos.x, p.target.z - p.pos.z);
    let pecking = false;
    if (!showing) {
      if (t < p.pauseUntil) pecking = true;
      else if (dist > 0.15) {
        const sp = (p.walkFront ? 0.7 : 0.32) * Math.max(0, Math.cos(diff));
        p.pos.x += Math.sin(p.heading) * sp * dt;
        p.pos.z += Math.cos(p.heading) * sp * dt;
      } else if (p.walkFront) {
        p.walkFront = false;
        if (p.showOnArrive) {
          p.showOnArrive = false;
          p.displayUntil = t + 9;
          ctx.sound.peacock(1);
        } else p.pauseUntil = t + 8;
      } else {
        p.pauseUntil = t + 1.5 + rand() * 4;
        p.target.copy(randomFloorPoint(c));
      }
    }
    p.root.position.copy(p.pos);
    p.root.rotation.y = p.heading;
    p.neck.rotation.x = pecking ? Math.max(0, Math.sin(t * 3 + p.phase)) * 1.0 : Math.sin(t * 2 + p.phase) * 0.05;
    if (p.fan) {
      p.fanK = THREE.MathUtils.clamp(p.fanK + (showing ? dt * 1.6 : -dt * 1.2), 0, 1);
      const e = p.fanK * p.fanK * (3 - 2 * p.fanK);
      p.fan.visible = e > 0.02;
      p.fan.scale.setScalar(0.25 + 0.75 * e);
      p.fan.rotation.set(-(1 - e) * 1.35, 0, Math.sin(t * 45) * 0.03 * e);
    }
  }
  function callPeacock(cage, show) {
    const males = cage.peacocks.filter((p) => p.male);
    let p;
    if (show) {
      cage.turn = (cage.turn || 0) % Math.max(1, males.length);
      p = males[cage.turn++];
    } else p = cage.peacocks.slice().sort((a, b) => a.pos.distanceTo(cage.frontPt) - b.pos.distanceTo(cage.frontPt))[0];
    if (!p) return null;
    p.walkFront = true;
    p.showOnArrive = show;
    p.displayUntil = 0;
    p.pauseUntil = 0;
    p.target.copy(cage.toWorld((rand() - 0.5) * 1.2, 0, show ? -1.6 : -0.95));
    return p;
  }

  const westFront = -LEG - HW - 0.3;
  const eastFront = LEG - HW - 0.3;
  // Space the aviaries out along each leg: the gap between neighbours is
  // one aviary wide (the average of the two widths).
  function spread(start, dir, widths) {
    const centers = [];
    let edge = start;
    widths.forEach((w, i) => {
      centers.push(edge + (dir * w) / 2);
      edge += dir * (w + (i < widths.length - 1 ? (w + widths[i + 1]) / 2 : 0));
    });
    return centers;
  }
  // Left leg: starting right by the tape and heading north.
  const westZ = spread(TAPE_Z - 4, -1, [7.4, 6.4, 7.2]);
  // Right leg: starting a little after the curve and heading south.
  const eastZ = spread(CZ + 10.8, 1, [6.4, 9]);
  const SIGN = {
    peacock: { body: '#1f4fb8', head: '#1f4fb8', wing: '#b89a6a', tail: '#2f7a5a', tailLen: 110, beak: '#9a8a7a' },
    budgie: { body: '#7cc243', head: '#f2d13a', wing: '#5a9a2a', wingTip: '#1a1a1a', tail: '#2a5fb0', tailLen: 70, beak: '#e8c8a8' },
    macaw: { body: '#d8262e', wing: '#f2c14e', wingTip: '#2a5fb0', tail: '#d8262e', face: '#f4efe6', beak: '#e9dcc8', tailLen: 80 },
    parrot: { body: '#4fa83a', head: '#f2d13a', wing: '#4fa83a', wingTip: '#d8263e', tail: '#4fa83a', beak: '#e9dcc8', tailLen: 40 },
  };

  // 1. Peacocks (left).
  const peacockCage = makeCage({
    x: westFront, z: westZ[0], w: 7.4, d: 6, floor: M.grass, tray: false,
    title: 'PAVOS REALES', sub: 'Peacocks · Pavo cristatus', colors: SIGN.peacock,
    fact: `${BIRDS.peacock.fact} ${BIRDS.peacockWhite.fact}`,
    action: 'Whistle to the peacocks',
    onAct: (c) => {
      callPeacock(c, true);
      ctx.sound.whistleCall();
      ctx.complete('peacock');
      ctx.toast('You whistle… a peacock struts over and fans out his shimmering tail!');
    },
  });
  addPeacock(peacockCage, 'blue');
  addPeacock(peacockCage, 'white');
  addPeacock(peacockCage, 'hen');

  // 2. Parakeets (left).
  const parakeetCage = makeCage({
    x: westFront, z: westZ[1], w: 6.4, d: 5, spacing: 0.36,
    title: 'PERIQUITOS', sub: 'Parakeets · Budgies', colors: SIGN.budgie,
    fact: `${BIRDS.budgie.fact} ${BIRDS.budgieBlue.fact}`,
    action: 'Hold out a seed stick',
    onAct: (c) => {
      summon(c, 6);
      c.showSeeds(true);
      seedTimers.push([c, time + 14]);
      ctx.sound.chatter(1);
      ctx.complete('parakeets');
      ctx.toast('Chirp chirp chirp! A little flock of parakeets lands on the bar to nibble the millet.');
    },
  });
  for (let i = 0; i < 10; i++) addCageBird(parakeetCage, i < 6 ? 'budgie' : 'budgieBlue');

  // 3. Macaws (left).
  const macawCage = makeCage({
    x: westFront, z: westZ[2], w: 7.2, d: 5.5, h: 3.8, spacing: 0.75,
    title: 'GUACAMAYAS', sub: 'Macaws · Ara', colors: SIGN.macaw,
    fact: `${BIRDS.scarlet.fact} ${BIRDS.military.fact}`,
    action: 'Feed the macaws',
    onAct: (c) => {
      summon(c, 3);
      c.showSeeds(true);
      seedTimers.push([c, time + 14]);
      ctx.sound.squawk(1);
      ctx.complete('macaws');
      ctx.toast('You pour sunflower seeds into the tray… the macaws swoop down to crack them open.');
    },
  });
  ['scarlet', 'scarlet', 'military', 'military'].forEach((k) => addCageBird(macawCage, k));

  // 4. Parrots (right).
  const parrotCage = makeCage({
    x: eastFront, z: eastZ[0], w: 6.4, d: 5, spacing: 0.6,
    title: 'LOROS', sub: 'Parrots · Amazona', colors: SIGN.parrot,
    fact: `${BIRDS.parrot.fact} ${BIRDS.redcrown.fact}`,
    action: 'Say ¡hola! to the parrots',
    onAct: (c) => {
      const [b] = summon(c, 1);
      const talk = (bird) => {
        bird.bobUntil = time + 2.5;
        ctx.sound.hola();
        ctx.toast('“¡Hola! ¡Hola!” … *whistle* … “¿Qué onda?” The parrot bobs its head at you.');
      };
      const there = c.birds.find((x) => x.slot && x.slot.front && x.mode === 'perch');
      if (b) b.onArrive = () => talk(b);
      else if (there) talk(there);
      ctx.complete('parrot');
    },
  });
  ['parrot', 'parrot', 'redcrown', 'redcrown'].forEach((k) => addCageBird(parrotCage, k));

  // 5. A mix of all of them (right).
  const mixedCage = makeCage({
    x: eastFront, z: eastZ[1], w: 9, d: 6, h: 3.8, spacing: 0.55, floor: M.grass,
    title: 'AVIARIO MIXTO', sub: 'Peacocks, macaws, parrots & parakeets', colors: SIGN.parrot,
    fact: 'In the mixed aviary, peacocks share their home with macaws, parrots and parakeets — just like a busy forest.',
    action: 'Fill the feeder',
    onAct: (c) => {
      summon(c, 8);
      callPeacock(c, false);
      c.showSeeds(true);
      seedTimers.push([c, time + 14]);
      ctx.sound.squawk(0.8);
      ctx.sound.chatter(0.8);
      ctx.complete('mix');
      ctx.toast('Everyone comes to eat! Macaws, parrots and parakeets crowd the bar, and the peacock strolls over too.');
    },
  });
  ['scarlet', 'military', 'parrot', 'redcrown', 'budgie', 'budgie', 'budgieBlue', 'budgieBlue'].forEach((k) => addCageBird(mixedCage, k));
  addPeacock(mixedCage, 'blue');
  const seedTimers = [];

  // ---------- big ahuehuete trees ----------
  function ahuehuete(x, z) {
    const tg = node(group, x, 0, z);
    const parts = [
      new THREE.CylinderGeometry(1.25, 1.75, 2.2, 14).translate(0, 1.1, 0),
      new THREE.CylinderGeometry(0.95, 1.25, 3.0, 12).translate(0.1, 3.7, 0),
      new THREE.CylinderGeometry(0.62, 0.95, 3.0, 10).translate(0.25, 6.7, 0.1),
      new THREE.CylinderGeometry(0.3, 0.62, 2.4, 8).translate(0.35, 9.4, 0.15),
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      parts.push(new THREE.ConeGeometry(0.45, 1.6, 6).rotateZ(Math.PI / 2 - 0.6).rotateY(-a).translate(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5));
    }
    const ends = [];
    const at = [];
    for (const [a, y, len, r] of [[0.4, 4.6, 3.4, 0.5], [2.3, 5.4, 3.6, 0.45], [3.9, 6.2, 3.2, 0.4], [5.4, 7.0, 3.0, 0.4], [1.3, 7.6, 2.6, 0.32], [4.6, 8.4, 2.4, 0.3], [2.9, 9.4, 2.0, 0.26]]) {
      const dir = new THREE.Vector3(Math.cos(a), 0.45, Math.sin(a)).normalize();
      parts.push(new THREE.CylinderGeometry(r * 0.5, r, len, 8).translate(0, len / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir)).translate(0.2, y, 0));
      ends.push(new THREE.Vector3(0.2, y, 0).addScaledVector(dir, len + 0.8));
      at.push((u) => new THREE.Vector3(0.2, y, 0).addScaledVector(dir, len * u).add(new THREE.Vector3(x, r * (1 - u * 0.5), z)));
    }
    tg.add(new THREE.Mesh(mergeGeometries(parts), M.bark));
    const foliage = [];
    const moss = [];
    [...ends, new THREE.Vector3(0.4, 11.2, 0.1), new THREE.Vector3(-0.8, 10.2, 0.8), new THREE.Vector3(1.2, 10.4, -1.0)].forEach((c, i) => {
      for (let k = 0; k < 2; k++) {
        const g = new THREE.IcosahedronGeometry(1.3 + rand() * 0.7, 1);
        const p = g.attributes.position;
        for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.9 + rand() * 0.2), p.getY(v) * (0.7 + rand() * 0.15), p.getZ(v) * (0.9 + rand() * 0.2));
        foliage.push(tint(g.translate(c.x + (rand() - 0.5) * 1.4, c.y + 0.4 + rand() * 0.6, c.z + (rand() - 0.5) * 1.4), i % 2 ? 0x2f5a2c : 0x3a6a32));
      }
      for (let k = 0; k < 6; k++) {
        const len = 0.8 + rand() * 1.2;
        moss.push(new THREE.ConeGeometry(0.07, len, 5).rotateX(Math.PI).translate(c.x + (rand() - 0.5) * 2.4, c.y - 0.3 - len / 2, c.z + (rand() - 0.5) * 2.4));
      }
    });
    tg.add(new THREE.Mesh(mergeGeometries(foliage), M.vertexFlat));
    tg.add(new THREE.Mesh(mergeGeometries(moss), M.moss));
    cast(tg);
    return { at };
  }
  ahuehuete(BIG_TREE.x, BIG_TREE.z);
  const toucanTree = ahuehuete(TOUCAN_TREE.x, TOUCAN_TREE.z);

  // ---------- the forest ----------
  function treeOK(x, z, r) {
    nearestOnU(x, z, tmpN);
    if (Math.hypot(x - tmpN.x, z - tmpN.z) < HW + 0.9 + r) return false;
    if (cageRects.some((c) => x > c.x0 - 1.2 - r && x < c.x1 + 1.2 + r && z > c.z0 - 1.2 - r && z < c.z1 + 1.2 + r)) return false;
    if (x > BINO.x - 3.5 && x < BINO.x + 6.5 && z > TOUCAN_TREE.z + 2 && z < BINO.z + 0.3) return false; // the binoculars' view
    if (Math.hypot(x - BIG_TREE.x, z - BIG_TREE.z) < 5 || Math.hypot(x - TOUCAN_TREE.x, z - TOUCAN_TREE.z) < 4.5) return false;
    return true;
  }
  const trees = [];
  for (let tries = 0; tries < 9000 && trees.length < 650; tries++) {
    const x = -62 + rand() * 124;
    const z = CZ - LEG - 36 + rand() * (PATH_END - (CZ - LEG - 36));
    const r = 0.22 + rand() * 0.35;
    if (!treeOK(x, z, r)) continue;
    if (trees.some((t) => Math.hypot(x - t.x, z - t.z) < 2.6 + (r + t.r) * 2)) continue;
    trees.push({ x, z, r, pine: rand() < 0.3, h: 8 + rand() * 8 });
  }
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
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.r, t.h * (t.pine ? 0.55 : 0.75), t.r)));
    });
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
  }
  group.add(trunks, crowns, pineTops);
  cast(trunks, crowns, pineTops);
  noRay(trunks, crowns, pineTops);

  // Ferns and bushes along the trail, plus some fallen logs.
  const fernGeo = (() => {
    const fronds = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fronds.push(new THREE.BoxGeometry(0.16, 0.02, 0.9).translate(0, 0, 0.45).rotateX(-0.7 - (i % 2) * 0.25).rotateY(a));
    }
    return mergeGeometries(fronds);
  })();
  const fernSpots = [];
  for (let tries = 0; tries < 9000 && fernSpots.length < 900; tries++) {
    const x = -LEG - 12 + rand() * (2 * LEG + 24);
    const z = CZ - LEG - 10 + rand() * (TAPE_Z + 10 - (CZ - LEG - 10));
    nearestOnU(x, z, tmpN);
    const d = Math.hypot(x - tmpN.x, z - tmpN.z);
    if (d < HW + 0.45 || (d > HW + 4 && rand() < 0.7)) continue;
    if (cageRects.some((c) => x > c.x0 - 0.2 && x < c.x1 + 0.2 && z > c.z0 - 0.2 && z < c.z1 + 0.2)) continue;
    if (Math.abs(z - TAPE_Z) < 0.8 && Math.abs(Math.abs(x) - LEG) < HW + 1) continue;
    fernSpots.push([x, z, 0.6 + rand() * 0.7]);
  }
  const ferns = new THREE.InstancedMesh(fernGeo, M.leaf, fernSpots.length);
  fernSpots.forEach(([x, z, s], i) => {
    ferns.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.05, z), new THREE.Quaternion().setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(s, s, s)));
    ferns.setColorAt(i, new THREE.Color().setHSL(0.27 + rand() * 0.06, 0.6, 0.1 + rand() * 0.08));
  });
  group.add(ferns);
  noRay(ferns);
  const logGeo = new THREE.CylinderGeometry(0.28, 0.32, 1, 10);
  for (const [x, z, len, a] of [[-24.6, 32.5, 4, 0.3], [6, -28, 3.6, 1.1], [-8, -27, 3.2, 2.2], [24.5, 2.0, 3.8, 0.1], [-25.5, -22, 3.4, 0.7], [-6, 14, 3.6, 1.6], [7, 20, 3.2, 0.4]]) {
    const log = add(group, new THREE.Mesh(logGeo, M.bark), x, 0.28, z);
    log.scale.y = len;
    log.rotation.set(0, a, Math.PI / 2);
    cast(log);
    const mossy = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.moss), x, 0.5, z);
    mossy.scale.set(len * 0.35, 0.3, 0.9);
    mossy.rotation.y = a;
  }

  // ---------- binoculars at the top of the U ----------
  const bino = node(group, BINO.x, 0, BINO.z);
  const binoParts = [cyl(bino, M.iron, 0.06, 0.09, 1.1, 0, 0.55, 0, 10), box(bino, M.yellow, 0.34, 0.2, 0.26, 0, 1.22, 0)];
  for (const dx of [-0.08, 0.08]) {
    const tube = cyl(bino, M.iron, 0.055, 0.055, 0.22, dx, 1.24, -0.2, 12);
    tube.rotation.x = Math.PI / 2;
    binoParts.push(tube);
  }
  cast(bino);
  post(BINO.x, BINO.z, 0.25);
  const toucanPerch = toucanTree.at[4](0.42).add(new THREE.Vector3(0, 0.16, 0));
  interact(binoParts, {
    label: () => 'Look through the binoculars',
    act: () => {
      const eye = new THREE.Vector3(BINO.x, 1.58, BINO.z + 0.5);
      const dx = toucanPerch.x - eye.x;
      const dz = toucanPerch.z - eye.z;
      ctx.sit({ eye, yaw: lookYaw(eye.x, eye.z, toucanPerch.x + 2.5, toucanPerch.z), pitch: Math.atan2(toucanPerch.y - 1.58, Math.hypot(dx, dz)) - 0.05, binoculars: true });
      ctx.complete('binoculars');
      ctx.toast('Look up into the trees — can you spot the wild toucan? Point at a bird and press E to identify it.', 5200);
    },
  });

  // A bench at the top of the U, facing the forest.
  {
    const x = 0;
    const z = CZ - LEG + 1.25; // just inside the top of the U
    const yaw = 0;
    const bg = node(group, x, 0, z, yaw);
    for (let i = 0; i < 4; i++) box(bg, M.wood, 1.7, 0.04, 0.1, 0, 0.45, -0.18 + i * 0.12);
    for (let i = 0; i < 3; i++) box(bg, M.wood, 1.7, 0.1, 0.035, 0, 0.62 + i * 0.13, 0.24);
    for (const dx of [-0.7, 0.7]) {
      box(bg, M.iron, 0.05, 0.45, 0.5, dx, 0.225, 0);
      box(bg, M.iron, 0.05, 0.42, 0.04, dx, 0.66, 0.24);
    }
    cast(bg);
    post(x - 0.5, z, 0.4);
    post(x + 0.5, z, 0.4);
    interact(bg, {
      label: () => 'Sit and listen to the birds',
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(x, 1.15, z + 0.08), yaw, pitch: 0.12, calm: true });
        ctx.complete('bench');
        ctx.toast('You sit and listen: parakeets chattering, macaws squawking, wind in the trees.');
      },
    });
  }

  // ---------- photo spot, facing the mixed aviary ----------
  const PHOTO = { x: LEG + HW + 0.35, z: mixedCage.def.z + 2 };
  const ps = node(group, PHOTO.x, 0, PHOTO.z, -Math.PI / 2);
  const photoParts = [cyl(ps, M.darkWood, 0.06, 0.06, 1.5, 0, 0.75, 0, 8)];
  photoParts.push(add(ps, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), new THREE.MeshBasicMaterial({ map: T.sign('📷 FOTO', { bg: '#d9447a', font: 'bold 56px sans-serif' }), toneMapped: false, side: THREE.DoubleSide })), 0, 1.6, -0.07));
  cast(ps);
  post(PHOTO.x, PHOTO.z, 0.2);
  interact(photoParts, {
    label: () => 'Take a photo',
    act: () => {
      const eye = new THREE.Vector3(LEG + 0.9, 1.62, mixedCage.def.z);
      const look = mixedCage.toWorld(0, 0, -mixedCage.d / 2);
      ctx.sit({ eye, yaw: lookYaw(eye.x, eye.z, look.x, look.z), pitch: 0.02, photo: true });
    },
  });

  // ---------- wild birds: monk parakeets overhead, a toucan in the trees ----------
  const flyers = [];
  for (let i = 0; i < 6; i++) {
    const b = makeBird('monk');
    b.mode = 'loop';
    b.loop = { a: LEG + 2 + rand() * 5, b: 30 + rand() * 6, cx: (rand() - 0.5) * 4, cz: -6 + (rand() - 0.5) * 6, h: 10 + rand() * 3, w: (0.22 + rand() * 0.08) * (i % 2 ? 1 : -1), p: rand() * 6.28, q: rand() * 6.28 };
    flyers.push(b);
  }
  const loopPos = (b, t, out) => {
    const L = b.loop;
    return out.set(L.cx + L.a * Math.cos(L.w * t + L.p), L.h + 1.2 * Math.sin(2 * L.w * t + L.q), L.cz + L.b * Math.sin(L.w * t + L.p));
  };
  const toucan = makeBird('toucan');
  toucan.pos.copy(toucanPerch);
  toucan.faceYaw = Math.atan2(BINO.x - toucanPerch.x, BINO.z - toucanPerch.z);

  // ---------- binocular identification ----------
  const seen = new Set();
  function identify(key) {
    const sp = BIRDS[key];
    if (!sp) return;
    seen.add(key);
    ctx.toast(`${sp.name} (${sp.es}). ${sp.fact}  ·  Spotted ${seen.size} of ${Object.keys(BIRDS).length} kinds of bird.`, 6000);
    if (key === 'toucan') ctx.complete('toucan');
  }

  // ---------- per frame ----------
  const names = ['Pavos reales (peacocks)', 'Periquitos (parakeets)', 'Guacamayas (macaws)', 'Loros (parrots)', 'Aviario mixto (a bit of everything)'];
  let nextAmbient = 3;
  function update(dt, t) {
    time = t;
    for (const c of cages) {
      for (const b of c.birds) updateCageBird(b, t);
      for (const p of c.peacocks) updatePeacock(p, t, dt);
    }
    for (const b of flyers) {
      b.prev.copy(b.pos);
      loopPos(b, t, b.pos);
      loopPos(b, t + 0.15, tmp);
      b.g.position.copy(b.pos);
      b.g.lookAt(tmp);
      b.g.rotateZ(-Math.sign(b.loop.w) * 0.35);
      const glide = Math.max(0, Math.sin(t * 0.7 + b.phase));
      wings(b, Math.sin(t * 14 + b.phase) * (0.3 + 0.7 * glide), 0);
    }
    perchPose(toucan, t);
    for (let i = seedTimers.length - 1; i >= 0; i--) {
      if (t > seedTimers[i][1]) {
        seedTimers[i][0].showSeeds(false);
        seedTimers.splice(i, 1);
      }
    }

    // Caution tape flutters in the breeze.
    for (const tp of tapes) {
      const pos = tp.m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = tp.base[i * 3];
        const u = bx / (span / 2);
        const sagY = -tp.sag * (1 - u * u);
        pos.setY(i, tp.base[i * 3 + 1] + sagY + Math.sin(t * 4 + bx * 3 + tp.phase) * 0.015 * (1 - u * u));
        pos.setZ(i, Math.sin(t * 3 + bx * 2 + tp.phase) * 0.05 * (1 - u * u));
      }
      pos.needsUpdate = true;
    }

    // Visiting the aviaries.
    const pl = ctx.player();
    const pp = pl.pos;
    cages.forEach((c, i) => {
      if (c.visited || Math.hypot(pp.x - c.frontPt.x, pp.z - c.frontPt.z) > 3.4) return;
      c.visited = true;
      const n = cages.filter((k) => k.visited).length;
      ctx.toast(`Aviary ${n} of 5 · ${names[i]}`, 2600);
      if (n === cages.length) ctx.complete('all5');
    });

    // Now and then a bird nearby makes itself heard.
    if (t > nextAmbient) {
      nextAmbient = t + 2.5 + rand() * 5;
      const c = cages[Math.floor(rand() * cages.length)];
      const dist = Math.hypot(pp.x - c.frontPt.x, pp.z - c.frontPt.z);
      const vol = Math.max(0, 1 - dist / 22);
      if (vol > 0.05) {
        if (c === peacockCage) rand() < 0.4 && ctx.sound.peacock(vol * 0.8);
        else if (c === parakeetCage) ctx.sound.chatter(vol * 0.6);
        else ctx.sound.squawk(vol * 0.5);
      }
    }
    api.state.calm = pl.seat && pl.seat.calm ? 1 : 0;
  }

  return api;
}
