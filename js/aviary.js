// The walk-through aviary at Chapultepec Zoo: a netted dome over a tropical
// garden with a pond, a waterfall, an old ahuehuete tree, and birds flying
// overhead. Everything here is in meters; the entrance is south (+z).
//
//                    north
//          .-----------------------.
//        /   ahuehuete    palm      \
//       |        (toucan)   rocks    |
//       |  deck   ~~~~pond~~~~ fall  |   feeder
//       | binocs  ~~~|bridge|~~      |   (macaws)
//        \  hummingbirds    bench   /
//          '------[ entrance ]-----'
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { meterUV } from './room.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const clamp = THREE.MathUtils.clamp;

const A = 24; // dome half-width (x)
const B = 17; // dome half-depth (z)
const H = 15; // dome height
const LA = 22.6; // walkable ellipse
const LB = 15.6;
const POND = { x: 0, z: -1, a: 7.2, b: 4.4 };
const BRIDGE = { x0: -0.8, x1: 0.8, z0: -5.9, z1: 3.9, h: 0.6, rail: 0.62 };
const DECK = { x0: -13.0, x1: -9.4, z0: 0.6, z1: 4.2, h: 1.5 };
const RAMP = { x0: -9.4, x1: -4.4, z0: 2.8, z1: 4.2 };
const PATH = { a: 16, b: 11, w: 1.2 };
const FALLS = { x: 7.15, z: -1, top: 3.45 };
const FEEDER = { x: 11.8, z: 4.5 };
const HUMMER = { x: -8.6, z: 11.3 };
const DUCKFOOD = { x: 3.4, z: 4.6 };

export const AVIARY_SPAWN = { x: 0, z: 14.6, yaw: 0, pitch: -0.04 };
const domeH = (x, z) => {
  const k = 1 - (x / A) ** 2 - (z / B) ** 2;
  return k > 0 ? H * Math.sqrt(k) : 0;
};
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// Yaw that makes a forward-facing (-z) model look from (x, z) toward (tx, tz).
const lookYaw = (x, z, tx, tz) => Math.atan2(x - tx, z - tz);

export const BIRDS = {
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
  toucan: {
    name: 'Keel-billed toucan',
    es: 'Tucán pico de canoa',
    fact: 'That rainbow bill is mostly hollow, so it’s surprisingly light. Toucans toss fruit in the air and catch it!',
    size: 0.75,
    body: 0x18181b, belly: 0xf2d13a, bill: 'toucan', wing: 0x18181b, tail: 0x18181b, tailLen: 0.22,
  },
  hummingbird: {
    name: 'Hummingbird',
    es: 'Colibrí',
    fact: 'Mexico has more than 50 kinds of hummingbird. Their wings beat up to 80 times a second.',
    size: 0.3,
    body: 0x2f9a6a, belly: 0xd8263e, bill: 'long', wing: 0x45584c, tail: 0x2f6a4a, tailLen: 0.12,
  },
  duck: {
    name: 'Black-bellied whistling duck',
    es: 'Pijije',
    fact: 'Pijijes whistle instead of quacking — listen for their “pi-ji-ji!” call.',
  },
  spoonbill: {
    name: 'Roseate spoonbill',
    es: 'Espátula rosada',
    fact: 'Roseate spoonbills get their pink color from the shrimp and algae they sweep up with that spoon-shaped bill.',
  },
};

export function buildAviary(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const updaters = [];
  const shadowLights = [];
  const birdsGroup = new THREE.Group();
  group.add(birdsGroup);
  const rand = T.rng(777);
  const api = {
    group,
    birds: birdsGroup,
    colliders,
    shadowLights,
    dirty: true,
    floorAt,
    limit,
    update,
    identify,
    state: { water: 0, mist: 0, calm: 0 },
  };

  // ---------- materials ----------
  const grassTex = T.grass();
  const M = {
    grass: std({ map: grassTex, roughness: 1 }),
    gravel: std({ map: T.gravel(), roughness: 1 }),
    wood: std({ map: T.woodGrain(), color: 0x8a6440, roughness: 0.7 }),
    darkWood: std({ map: T.woodGrain(), color: 0x5a3e28, roughness: 0.75 }),
    bark: std({ map: T.woodGrain(), color: 0x4a3626, roughness: 1 }),
    steel: std({ color: 0xe6e8ea, metalness: 0.6, roughness: 0.35 }),
    iron: std({ color: 0x2a2c2a, metalness: 0.5, roughness: 0.5 }),
    concrete: std({ color: 0xb8b2a6, map: T.plaster(), roughness: 0.95 }),
    leaf: std({ color: 0x3f7a3a, roughness: 0.8, flatShading: true }),
    leafDark: std({ color: 0x2e5a2c, roughness: 0.85, flatShading: true }),
    moss: std({ color: 0x8a9a7a, roughness: 1 }),
    red: std({ color: 0xd8263e, roughness: 0.5 }),
    yellow: std({ color: 0xf2c14e, roughness: 0.5 }),
    white: std({ color: 0xf4f1ea, roughness: 0.6 }),
    vertex: std({ vertexColors: true, roughness: 0.75 }),
    vertexFlat: std({ vertexColors: true, roughness: 0.9, flatShading: true }),
  };

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
  const solid = (x0, z0, x1, z1) => colliders.push({ x0, z0, x1, z1, off: false });
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
  // Flat shape on the ground with UVs in meters.
  function groundShape(geo, mat, y) {
    const p = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    group.add(m);
    return m;
  }
  function ellipseRing(a, b, w, seg = 160) {
    const pos = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      pos.push((a - w) * c, (b - w) * s, 0, (a + w) * c, (b + w) * s, 0);
      if (i < seg) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ---------- floor height and boundaries ----------
  function floorAt(x, z) {
    if (inRect(BRIDGE, x, z)) return BRIDGE.h * Math.sin((Math.PI * (z - BRIDGE.z0)) / (BRIDGE.z1 - BRIDGE.z0));
    if (inRect(DECK, x, z)) return DECK.h;
    if (inRect(RAMP, x, z)) return (DECK.h * (RAMP.x1 - x)) / (RAMP.x1 - RAMP.x0);
    return 0;
  }
  // Keeps you inside the net, out of the pond, and between the bridge rails.
  function limit(p, r) {
    if (Math.abs(p.x) < 1.4 && p.z > 15.2) {
      p.x = clamp(p.x, -1.4 + r, 1.4 - r);
      p.z = Math.min(p.z, 18.9);
    } else {
      const ex = p.x / (LA - r);
      const ez = p.z / (LB - r);
      const k = ex * ex + ez * ez;
      if (k > 1) {
        const s = 1 / Math.sqrt(k);
        p.x *= s;
        p.z *= s;
      }
    }
    const dx = p.x - POND.x;
    const dz = p.z - POND.z;
    const pa = POND.a + r * 0.4;
    const pb = POND.b + r * 0.4;
    const k = (dx / pa) ** 2 + (dz / pb) ** 2;
    if (k < 1) {
      if (Math.abs(p.x) < 1.0) p.x = clamp(p.x, -BRIDGE.rail + r, BRIDGE.rail - r);
      else {
        const s = 1 / Math.sqrt(k);
        p.x = POND.x + dx * s;
        p.z = POND.z + dz * s;
      }
    }
  }

  // ---------- sky, sun, outdoors ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { sunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() } },
      vertexShader: `varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 sunDir; varying vec3 vDir;
        void main() {
          float h = max(vDir.y, 0.0);
          vec3 c = mix(vec3(0.86, 0.92, 0.9), vec3(0.32, 0.56, 0.86), pow(h, 0.55));
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
  const sunDir = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
  const sun = new THREE.DirectionalLight(0xfff2dc, 3.0);
  sun.position.copy(sunDir).multiplyScalar(70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 150 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  group.add(sun, sun.target);
  shadowLights.push(sun);
  group.add(new THREE.HemisphereLight(0xcfe6ff, 0x5d7a3a, 0.9));

  const groundGeo = new THREE.PlaneGeometry(500, 500);
  groundShape(groundGeo, M.grass, 0);

  // Chapultepec forest around the aviary, and the castle on its hill.
  const forestSpots = [];
  for (let i = 0; i < 320; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 1.18 + rand() * 2.6;
    const x = Math.cos(a) * A * rr;
    const z = Math.sin(a) * B * rr * 1.4;
    if (z > 15 && Math.abs(x) < 9) continue;
    forestSpots.push([x, z, 0.8 + rand() * 1.2]);
  }
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M.leafDark, forestSpots.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 1, 6), M.bark, forestSpots.length);
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    forestSpots.forEach(([x, z, s], i) => {
      const h = 5 + s * 5;
      trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(s, h, s)));
      crowns.setMatrixAt(i, m4.compose(new THREE.Vector3(x, h + s * 2, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(3.2 * s, 3.6 * s, 3.2 * s)));
      crowns.setColorAt(i, c.setHSL(0.28 + rand() * 0.06, 0.45, 0.32 + rand() * 0.15));
    });
  }
  group.add(crowns, trunks);
  const hill = add(group, new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std({ color: 0x4f6f3a, roughness: 1 })), -80, -14, -160);
  hill.scale.set(70, 40, 45);
  const castle = node(group, -80, 25, -160);
  const cream = std({ color: 0xe8dcc4, roughness: 0.8 });
  box(castle, cream, 34, 7, 14, 0, 3.5, 0);
  box(castle, cream, 10, 11, 10, -12, 5.5, 0);
  cyl(castle, cream, 2.4, 2.4, 14, 10, 7, 2, 16);
  box(castle, std({ color: 0x8a5a3a }), 34, 0.8, 14, 0, 7.4, 0);
  cyl(castle, M.iron, 0.12, 0.12, 6, -12, 14, 0, 6);
  const flag = add(castle, new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), -10.3, 15.8, 0);
  {
    // Green, white and red.
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 54;
    const g = c.getContext('2d');
    ['#1f7a48', '#f4f1ea', '#c8282e'].forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(i * 32, 0, 32, 54);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    flag.material.map = t;
  }

  // ---------- the aviary structure ----------
  const netTex = T.netting();
  netTex.repeat.set(170, 34);
  const net = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 28, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, color: 0x6a706a }),
  );
  net.scale.set(A, H, B);
  group.add(net);
  noRay(net);
  const curb = add(group, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 96, 1, true), std({ color: 0x9a948a, roughness: 0.95, side: THREE.DoubleSide })), 0, 0.25, 0);
  curb.scale.set(A, 1, B);
  noRay(curb);
  // White masts holding the net up.
  for (const [x, z] of [[13.5, -6.5], [-15.5, -4.5], [-4.5, 13.0], [5.5, -12.5]]) {
    const h = domeH(x, z) - 0.05;
    const m = cyl(group, M.steel, 0.14, 0.2, h, x, h / 2, z, 12);
    cyl(group, M.concrete, 0.45, 0.5, 0.4, x, 0.2, z, 16);
    cast(m);
    post(x, z, 0.5);
  }

  // Entrance hall with a chain curtain to keep the birds in.
  const hall = node(group, 0, 0, 0);
  box(hall, M.darkWood, 0.2, 3.1, 3.6, -1.9, 1.55, 17.9);
  box(hall, M.darkWood, 0.2, 3.1, 3.6, 1.9, 1.55, 17.9);
  box(hall, M.darkWood, 4.2, 0.25, 3.8, 0, 3.2, 17.9);
  box(hall, M.darkWood, 4.0, 0.4, 0.2, 0, 2.9, 16.1);
  cast(hall);
  const chain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 2.7, 4), M.iron, 90);
  for (let i = 0; i < 90; i++) chain.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-1.75 + i * 0.039, 1.4, 16.15 + (i % 2) * 0.03));
  group.add(chain);
  noRay(chain);
  const exitDoors = [];
  for (const s of [-1, 1]) exitDoors.push(box(group, M.wood, 1.75, 2.6, 0.08, s * 0.9, 1.3, 19.7));
  const exitSign = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: T.sign('SALIDA', { bg: '#1f7a48' }), toneMapped: false })), 0, 2.75, 19.64);
  exitSign.rotation.y = Math.PI;
  interact([...exitDoors, exitSign], { label: () => 'Leave the aviary (back to the hotel)', act: () => ctx.travel('hotel') });
  add(group, new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.7), new THREE.MeshBasicMaterial({ map: T.sign('AVIARIO · ZOOLÓGICO DE CHAPULTEPEC', { bg: '#2f5d3a', w: 1024, h: 200, font: 'bold 60px Georgia, serif' }), toneMapped: false })), 0, 2.85, 15.98).rotation.y = Math.PI;

  // ---------- paths, pond, waterfall ----------
  const pathMat = M.gravel;
  groundShape(ellipseRing(PATH.a, PATH.b, PATH.w), pathMat, 0.012);
  // (Shapes are drawn in the XY plane; once laid flat, +y points to -z.)
  groundShape(new THREE.PlaneGeometry(2.2, 14.6).translate(0, -11.2, 0), pathMat, 0.013); // entrance to bridge
  groundShape(new THREE.PlaneGeometry(2.2, 4.6).translate(0, 8.15, 0), pathMat, 0.013); // bridge to the north loop
  groundShape(new THREE.PlaneGeometry(3.4, 1.4).translate(-2.75, -3.5, 0), pathMat, 0.013); // to the lookout ramp

  const pondBed = groundShape(new THREE.CircleGeometry(1, 64).scale(POND.a + 0.25, POND.b + 0.25, 1), std({ color: 0x2c3a2e, roughness: 1 }), 0.016);
  pondBed.position.set(POND.x, 0.016, POND.z);
  const wn = T.waterNormals();
  const water = groundShape(
    new THREE.CircleGeometry(1, 64).scale(POND.a, POND.b, 1),
    std({ color: 0x2f6f73, roughness: 0.08, metalness: 0.2, normalMap: wn, normalScale: new THREE.Vector2(0.5, 0.5), transparent: true, opacity: 0.88 }),
    0.035,
  );
  water.position.set(POND.x, 0.035, POND.z);
  water.userData.pond = true;
  // Rocks around the pond's edge.
  const rimSpots = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = POND.x + Math.cos(t) * (POND.a + 0.15);
    const z = POND.z + Math.sin(t) * (POND.b + 0.15);
    if (Math.abs(x) < 1.3) continue;
    rimSpots.push([x, z, 0.18 + rand() * 0.22]);
  }
  const rim = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std({ color: 0x5a524a, roughness: 1, flatShading: true }), rimSpots.length);
  rimSpots.forEach(([x, z, s], i) => rim.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, s * 0.4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand() * 6, rand())), new THREE.Vector3(s * 1.4, s, s * 1.2))));
  group.add(rim);

  // Waterfall: a pile of rocks with water pouring off the top.
  const rockParts = [];
  const rockSpots = [
    [8.0, 0.8, -1, 1.6], [9.4, 1.0, -2.4, 1.7], [9.2, 0.9, 0.6, 1.5], [8.6, 2.4, -1.4, 1.3], [9.8, 2.6, -0.2, 1.2],
    [10.2, 1.0, -3.4, 1.2], [10.4, 1.2, 1.2, 1.1], [9.6, 3.6, -1.6, 0.9], [8.4, 2.9, -0.2, 0.9], [8.4, 3.0, -2.2, 0.8],
    [7.7, 0.5, 1.0, 0.8], [7.8, 0.5, -3.0, 0.8], [10.8, 2.6, -2.0, 1.0], [9.0, 4.1, -1.0, 0.6],
  ];
  for (const [x, y, z, s] of rockSpots) {
    const g = new THREE.DodecahedronGeometry(s, 0).rotateY(rand() * 6).rotateX(rand());
    const c = new THREE.Color().setHSL(0.07, 0.15, 0.05 + rand() * 0.05);
    rockParts.push(tint(g.translate(x, y, z), c.getHex()));
  }
  for (let i = 0; i < 10; i++) rockParts.push(part(new THREE.IcosahedronGeometry(0.35 + rand() * 0.3, 0), 0x4f7a3a, [1, 0.6, 1], [8.4 + rand() * 2.4, 3.0 + rand() * 1.4, -3 + rand() * 4]));
  const rocks = new THREE.Mesh(mergeGeometries(rockParts), M.vertexFlat);
  group.add(rocks);
  cast(rocks);
  solid(7.1, -4.2, 11.4, 2.0);
  const fallTex = T.waterfall();
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, depthWrite: false, color: 0xe6f6ff, side: THREE.DoubleSide });
  const fall = add(group, new THREE.Mesh(new THREE.PlaneGeometry(2.4, FALLS.top), fallMat), FALLS.x, FALLS.top / 2, FALLS.z);
  fall.rotation.y = -Math.PI / 2;
  const fallBack = add(group, new THREE.Mesh(new THREE.PlaneGeometry(2.4, FALLS.top), std({ color: 0x9fd0e0, transparent: true, opacity: 0.35, roughness: 0.1 })), FALLS.x + 0.06, FALLS.top / 2, FALLS.z);
  fallBack.rotation.y = -Math.PI / 2;
  const stream = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), std({ color: 0x5fa8b8, roughness: 0.1, metalness: 0.2 })), FALLS.x + 0.8, FALLS.top - 0.02, FALLS.z);
  stream.rotation.x = -Math.PI / 2;
  noRay(fall, fallBack, stream);
  const foam = add(group, new THREE.Mesh(new THREE.RingGeometry(0.2, 1.4, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })), FALLS.x - 0.6, 0.045, FALLS.z);
  foam.rotation.x = -Math.PI / 2;
  noRay(foam);
  const splashN = 140;
  const splashPos = new Float32Array(splashN * 3);
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false }));
  group.add(splash);
  noRay(splash);
  const splashSeed = Array.from({ length: splashN }, () => [rand(), rand(), rand()]);

  // Arched wooden bridge over the pond.
  const bridge = new THREE.Group();
  group.add(bridge);
  const planks = [];
  const nPlanks = 38;
  for (let i = 0; i < nPlanks; i++) {
    const u = (i + 0.5) / nPlanks;
    const z = BRIDGE.z0 + u * (BRIDGE.z1 - BRIDGE.z0);
    const y = BRIDGE.h * Math.sin(Math.PI * u);
    const slope = Math.atan2(BRIDGE.h * Math.PI * Math.cos(Math.PI * u), BRIDGE.z1 - BRIDGE.z0);
    const g = new THREE.BoxGeometry(1.6, 0.06, 0.24).rotateX(slope).translate(0, y - 0.03, z);
    planks.push(meterUV(g));
  }
  bridge.add(new THREE.Mesh(mergeGeometries(planks), M.wood));
  const railParts = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const z = BRIDGE.z0 + u * (BRIDGE.z1 - BRIDGE.z0);
      const y = BRIDGE.h * Math.sin(Math.PI * u);
      railParts.push(new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(s * 0.72, y + 0.5, z));
      if (i < 10) {
        const u2 = (i + 1) / 10;
        const z2 = BRIDGE.z0 + u2 * (BRIDGE.z1 - BRIDGE.z0);
        const y2 = BRIDGE.h * Math.sin(Math.PI * u2);
        const len = Math.hypot(z2 - z, y2 - y);
        railParts.push(new THREE.BoxGeometry(0.07, 0.07, len).rotateX(-Math.atan2(y2 - y, z2 - z)).translate(s * 0.72, (y + y2) / 2 + 1.0, (z + z2) / 2));
      }
    }
  }
  bridge.add(new THREE.Mesh(mergeGeometries(railParts), M.darkWood));
  cast(bridge);

  // ---------- the old ahuehuete (Montezuma cypress) ----------
  const TREE = { x: -9.5, z: -7 };
  const treeG = node(group, TREE.x, 0, TREE.z);
  const trunkParts = [
    new THREE.CylinderGeometry(1.25, 1.75, 2.2, 14).translate(0, 1.1, 0),
    new THREE.CylinderGeometry(0.95, 1.25, 3.0, 12).translate(0.1, 3.7, 0),
    new THREE.CylinderGeometry(0.62, 0.95, 3.0, 10).translate(0.25, 6.7, 0.1),
    new THREE.CylinderGeometry(0.3, 0.62, 2.4, 8).translate(0.35, 9.4, 0.15),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    trunkParts.push(new THREE.ConeGeometry(0.45, 1.6, 6).rotateZ(Math.PI / 2 - 0.6).rotateY(-a).translate(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5));
  }
  const branchEnds = [];
  const branchMids = [];
  const branchAt = []; // (u) => point u (0..1) along each branch
  const branchDefs = [[0.4, 4.6, 3.4, 0.5], [2.3, 5.4, 3.6, 0.45], [3.9, 6.2, 3.2, 0.4], [5.4, 7.0, 3.0, 0.4], [1.3, 7.6, 2.6, 0.32], [4.6, 8.4, 2.4, 0.3], [2.9, 9.4, 2.0, 0.26]];
  for (const [a, y, len, r] of branchDefs) {
    const dir = new THREE.Vector3(Math.cos(a), 0.45, Math.sin(a)).normalize();
    const g = new THREE.CylinderGeometry(r * 0.5, r, len, 8).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate(0.2, y, 0);
    trunkParts.push(g);
    branchEnds.push(new THREE.Vector3(0.2, y, 0).addScaledVector(dir, len + 0.8));
    branchMids.push(new THREE.Vector3(0.2, y, 0).addScaledVector(dir, len * 0.55).add(new THREE.Vector3(0, r * 0.5, 0)));
    branchAt.push((u) => new THREE.Vector3(0.2, y, 0).addScaledVector(dir, len * u).add(new THREE.Vector3(0, r * (1 - u * 0.5), 0)));
  }
  const trunkMesh = new THREE.Mesh(mergeGeometries(trunkParts), M.bark);
  treeG.add(trunkMesh);
  const foliage = [];
  const mossParts = [];
  const clumps = [...branchEnds, new THREE.Vector3(0.4, 11.2, 0.1), new THREE.Vector3(-0.8, 10.2, 0.8), new THREE.Vector3(1.2, 10.4, -1.0)];
  clumps.forEach((c, i) => {
    for (let k = 0; k < 2; k++) {
      const r = 1.3 + rand() * 0.7;
      const g = new THREE.IcosahedronGeometry(r, 1);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.9 + rand() * 0.2), p.getY(v) * (0.7 + rand() * 0.15), p.getZ(v) * (0.9 + rand() * 0.2));
      const off = new THREE.Vector3((rand() - 0.5) * 1.4, 0.4 + rand() * 0.6, (rand() - 0.5) * 1.4);
      foliage.push(tint(g.translate(c.x + off.x, c.y + off.y, c.z + off.z), i % 2 ? 0x2f5a2c : 0x3a6a32));
    }
    // Spanish moss (heno) hanging from the branches.
    for (let k = 0; k < 6; k++) {
      const len = 0.8 + rand() * 1.2;
      mossParts.push(new THREE.ConeGeometry(0.07, len, 5).rotateX(Math.PI).translate(c.x + (rand() - 0.5) * 2.4, c.y - 0.3 - len / 2, c.z + (rand() - 0.5) * 2.4));
    }
  });
  treeG.add(new THREE.Mesh(mergeGeometries(foliage), M.vertexFlat));
  treeG.add(new THREE.Mesh(mergeGeometries(mossParts), M.moss));
  cast(treeG);
  post(TREE.x, TREE.z, 1.7);
  // The toucan sits on the branch that points toward the lookout deck, so you can find it with the binoculars.
  const toucanPerch = branchAt[4](0.42).add(new THREE.Vector3(TREE.x, 0.16, TREE.z));
  const macawPerches = [branchMids[0], branchMids[1]].map((v) => v.clone().add(new THREE.Vector3(TREE.x, 0.05, TREE.z)));

  // ---------- palms, bushes, flowers ----------
  const palmParts = [part(new THREE.CylinderGeometry(0.13, 0.2, 6, 8).translate(0, 3, 0), 0x7a5a3a)];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    palmParts.push(part(new THREE.BoxGeometry(0.42, 0.03, 2.3).translate(0, 0, 1.15).rotateX(0.55 + (i % 2) * 0.25).rotateY(a), i % 2 ? 0x4f8a3a : 0x3f7a32, [1, 1, 1], [0, 6, 0]));
  }
  const palmGeo = mergeGeometries(palmParts);
  const palmSpots = [[4.5, -8.8, 1.0], [12.3, 2.4, 0.85], [-6.3, 6.6, 0.9], [18.3, 4.0, 0.9], [-19.0, -3.0, 0.95], [8.2, 13.2, 0.75], [-14.0, -10.6, 0.85], [15.6, -7.6, 0.8]];
  const palms = new THREE.InstancedMesh(palmGeo, M.vertex, palmSpots.length);
  palmSpots.forEach(([x, z, s], i) => {
    palms.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(s, s, s)));
    post(x, z, 0.3);
  });
  group.add(palms);
  cast(palms);
  const palmCrowns = palmSpots.map(([x, z, s]) => new THREE.Vector3(x, 6 * s, z));

  // Somewhere clear to put a plant? (Not on paths, the pond, the deck or features.)
  const features = [[FEEDER.x, FEEDER.z, 1.6], [HUMMER.x, HUMMER.z, 1.4], [DUCKFOOD.x, DUCKFOOD.z, 1.2], [TREE.x, TREE.z, 2.4], [5, 12.3, 1.4], [12.4, -9.4, 1.4], [2.2, 15, 1], [-3.2, 13.2, 1.2], ...palmSpots.map(([x, z]) => [x, z, 1])];
  function clear(x, z, r) {
    if ((x / (LA - 0.6)) ** 2 + (z / (LB - 0.6)) ** 2 > 1) return false;
    const inner = (x / (PATH.a - PATH.w - r)) ** 2 + (z / (PATH.b - PATH.w - r)) ** 2;
    const outer = (x / (PATH.a + PATH.w + r)) ** 2 + (z / (PATH.b + PATH.w + r)) ** 2;
    if (inner > 1 && outer < 1) return false;
    if (Math.abs(x) < 1.4 + r && (z > BRIDGE.z1 || z < BRIDGE.z0)) return false;
    if (((x - POND.x) / (POND.a + 0.8)) ** 2 + ((z - POND.z) / (POND.b + 0.8)) ** 2 < 1) return false;
    if (x > DECK.x0 - 1 && x < RAMP.x1 + 0.8 && z > DECK.z0 - 1 && z < DECK.z1 + 1.6) return false;
    if (x > 6.6 && x < 11.6 && z > -4.6 && z < 2.4) return false;
    if (z > 14 && Math.abs(x) < 3) return false;
    if (x > -5 && x < 1 && z > -5 && z < -2) return false;
    return !features.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + r);
  }
  const bushSpots = [];
  for (let tries = 0; tries < 900 && bushSpots.length < 70; tries++) {
    const x = (rand() * 2 - 1) * LA;
    const z = (rand() * 2 - 1) * LB;
    const r = 0.6 + rand() * 0.8;
    if (!clear(x, z, r)) continue;
    if (bushSpots.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + r * 0.6)) continue;
    bushSpots.push([x, z, r]);
  }
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std({ roughness: 0.85, flatShading: true }), bushSpots.length);
  const flowerSpots = [];
  bushSpots.forEach(([x, z, r], i) => {
    bushes.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, r * 0.55, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(r, r * 0.8, r)));
    bushes.setColorAt(i, new THREE.Color().setHSL(0.27 + rand() * 0.07, 0.65, 0.06 + rand() * 0.06));
    if (r > 0.9) post(x, z, r * 0.7);
    const n = 3 + Math.floor(rand() * 6);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const up = 0.3 + rand() * 0.6;
      flowerSpots.push([x + Math.cos(a) * r * 0.8, r * 0.55 + up * r * 0.6, z + Math.sin(a) * r * 0.8]);
    }
  });
  group.add(bushes);
  const flowerCols = [0xd9447a, 0xe8403e, 0xf28a1d, 0xf2d13a, 0xc84ac8, 0xffffff];
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), std({ roughness: 0.6, flatShading: true }), flowerSpots.length);
  flowerSpots.forEach(([x, y, z], i) => {
    flowers.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, z));
    flowers.setColorAt(i, new THREE.Color(flowerCols[Math.floor(rand() * flowerCols.length)]));
  });
  group.add(flowers);
  noRay(bushes, flowers);

  // ---------- macaw feeding station ----------
  const feeder = node(group, FEEDER.x, 0, FEEDER.z, -Math.PI / 2);
  const feederParts = [];
  feederParts.push(cyl(feeder, M.wood, 0.07, 0.09, 2.1, 0, 1.05, 0, 10));
  const bar = cyl(feeder, M.darkWood, 0.04, 0.04, 1.9, 0, 1.95, 0, 8);
  bar.rotation.z = Math.PI / 2;
  feederParts.push(bar);
  feederParts.push(box(feeder, M.darkWood, 0.7, 0.08, 0.45, 0, 1.1, -0.25));
  for (let i = 0; i < 18; i++) feederParts.push(add(feeder, new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), M.yellow), -0.25 + rand() * 0.5, 1.16, -0.1 - rand() * 0.3));
  const feederSign = add(feeder, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.24), new THREE.MeshBasicMaterial({ map: T.sign('COMEDERO', { bg: '#2f5d3a' }), toneMapped: false })), 0, 1.55, -0.1);
  feederSign.rotation.y = Math.PI;
  feederParts.push(feederSign);
  cast(feeder);
  post(FEEDER.x, FEEDER.z, 0.35);
  const feederPerches = [-0.65, 0, 0.65].map((dz) => new THREE.Vector3(FEEDER.x, 2.04, FEEDER.z + dz));
  let feedingUntil = 0;
  interact(feederParts, {
    label: () => (time < feedingUntil ? 'The macaws are eating…' : 'Fill the feeder for the macaws'),
    act: () => {
      if (time < feedingUntil) {
        ctx.toast('Crunch, crunch. Give them a minute — they’re busy with the seeds.');
        return;
      }
      feedingUntil = time + 18;
      const macaws = flyers.filter((b) => (b.key === 'scarlet' || b.key === 'military') && b.mode === 'loop').slice(0, 3);
      macaws.forEach((b, i) => flyTo(b, feederPerches[i], 16 + i, Math.PI / 2));
      ctx.sound.squawk();
      ctx.complete('feed');
      ctx.toast('You pour in sunflower seeds… here come the macaws!');
    },
  });

  // ---------- hummingbird garden ----------
  const hg = node(group, HUMMER.x, 0, HUMMER.z);
  const hummerParts = [];
  hummerParts.push(cyl(hg, M.iron, 0.03, 0.04, 2.0, 0, 1.0, 0, 8));
  const arm = box(hg, M.iron, 0.5, 0.03, 0.03, 0.25, 1.95, 0);
  hummerParts.push(arm);
  const bottle = cyl(hg, std({ color: 0xff7a8a, transparent: true, opacity: 0.55, roughness: 0.1 }), 0.06, 0.06, 0.22, 0.48, 1.6, 0, 16);
  const base = cyl(hg, M.red, 0.13, 0.11, 0.05, 0.48, 1.47, 0, 20);
  hummerParts.push(bottle, base);
  const ports = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(0.48 + Math.cos(a) * 0.11, 1.5, Math.sin(a) * 0.11);
    hummerParts.push(add(hg, new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), M.yellow), p.x, p.y, p.z));
    ports.push(p.add(new THREE.Vector3(HUMMER.x, 0, HUMMER.z)));
  }
  // Heliconias: big paddle leaves and zig-zag red flowers.
  const heliParts = [];
  for (const [hx, hz] of [[-1.4, 0.6], [1.5, 0.9], [-0.6, 1.7], [0.9, -1.2]]) {
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      heliParts.push(part(new THREE.BoxGeometry(0.32, 0.02, 1.1).translate(0, 0, 0.55).rotateX(-0.9).rotateY(a), 0x3f8a3a, [1, 1, 1], [hx, 0.9, hz]));
      heliParts.push(part(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5).translate(0, 0.45, 0), 0x3f6a32, [1, 1, 1], [hx, 0, hz]));
    }
    for (let k = 0; k < 6; k++) {
      heliParts.push(part(new THREE.ConeGeometry(0.06, 0.22, 5).rotateZ((k % 2 ? 1 : -1) * 1.2), k % 3 === 0 ? 0xf2c14e : 0xe8303e, [1, 1, 1], [hx + (k % 2 ? 0.08 : -0.08), 1.05 - k * 0.1, hz]));
    }
  }
  hg.add(new THREE.Mesh(mergeGeometries(heliParts), M.vertexFlat));
  cast(hg);
  post(HUMMER.x, HUMMER.z, 0.2);
  const flowerVisits = [[-1.4, 1.1, 0.6], [1.5, 1.1, 0.9], [-0.6, 1.0, 1.7], [0.9, 1.1, -1.2]].map(([x, y, z]) => new THREE.Vector3(HUMMER.x + x, y, HUMMER.z + z));
  let hummerFeedUntil = 0;
  interact(hummerParts, {
    label: () => 'Stand still by the hummingbird feeder',
    act: () => {
      hummerFeedUntil = time + 7;
      hummers[0].feedPort = ports[Math.floor(rand() * ports.length)];
      ctx.complete('hummingbird');
      ctx.toast('Bzzzz! A hummingbird zips in to sip nectar — its wings are a blur.');
    },
  });

  // ---------- info signs ----------
  const SIGNS = [
    { x: 10.9, z: 6.6, at: [13.6, 8.0], title: 'GUACAMAYAS', sub: 'Macaws · Ara macao', colors: { body: '#d8262e', wing: '#f2c14e', wingTip: '#2a5fb0', tail: '#d8262e', face: '#f4efe6', beak: '#e9dcc8', tailLen: 80 }, fact: BIRDS.scarlet.fact },
    { x: -2.4, z: -8.4, at: [0, -8.4], title: 'TUCÁN', sub: 'Keel-billed toucan', colors: { body: '#18181b', belly: '#f2d13a', beak: '#f28a1d', beakLen: 46, tailLen: 40 }, fact: 'Look for me high up in the ahuehuete tree — the binoculars on the lookout deck help!' },
    { x: -6.6, z: 12.6, at: [-4.8, 10.6], title: 'COLIBRÍES', sub: 'Hummingbirds', colors: { body: '#2f9a6a', belly: '#d8263e', beak: '#111111', beakLen: 50, tailLen: 30 }, fact: BIRDS.hummingbird.fact },
    { x: 2.4, z: 5.1, at: [0, 6.5], title: 'AVES ACUÁTICAS', sub: 'Pijijes & spoonbills', colors: { body: '#a0522d', belly: '#18181b', head: '#8a7a6a', beak: '#ff5a7a', tailLen: 20 }, fact: `${BIRDS.duck.fact} ${BIRDS.spoonbill.fact}` },
  ];
  for (const s of SIGNS) {
    const g = node(group, s.x, 0, s.z, Math.atan2(s.at[0] - s.x, s.at[1] - s.z));
    for (const dx of [-0.45, 0.45]) box(g, M.darkWood, 0.07, 1.1, 0.07, dx, 0.55, -0.02);
    const board = add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), std({ map: T.birdSign(s.title, s.sub, s.colors), roughness: 0.7 })), 0, 1.3, 0.02);
    board.rotation.x = -0.25;
    box(g, M.darkWood, 1.25, 0.95, 0.04, 0, 1.3, -0.01).rotation.x = -0.25;
    cast(g);
    post(s.x, s.z, 0.35);
    interact(g, {
      label: () => 'Read the sign',
      act: () => {
        ctx.toast(s.fact, 5200);
        ctx.complete('sign');
      },
    });
  }

  // ---------- benches ----------
  function bench(x, z, tx, tz) {
    const yaw = lookYaw(x, z, tx, tz);
    const g = node(group, x, 0, z, yaw);
    for (let i = 0; i < 4; i++) box(g, M.wood, 1.7, 0.04, 0.1, 0, 0.45, -0.18 + i * 0.12);
    for (let i = 0; i < 3; i++) box(g, M.wood, 1.7, 0.1, 0.035, 0, 0.62 + i * 0.13, 0.24);
    for (const dx of [-0.7, 0.7]) {
      box(g, M.iron, 0.05, 0.45, 0.5, dx, 0.225, 0);
      box(g, M.iron, 0.05, 0.42, 0.04, dx, 0.66, 0.24);
    }
    cast(g);
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    for (const k of [-0.5, 0.5]) post(x + side.x * k, z + side.z * k, 0.4);
    interact(g, {
      label: () => 'Sit and listen to the birds',
      act: () => {
        const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.08);
        ctx.sit({ eye: new THREE.Vector3(x + back.x, 1.15, z + back.z), yaw, pitch: 0.12, calm: true });
        ctx.complete('bench');
        ctx.toast('You sit back and listen. Chirps, whistles and the waterfall all around.');
      },
    });
  }
  bench(5, 12.6, 3, 0);
  bench(12.6, -9.6, 5, -2);

  // ---------- duck food dispenser ----------
  const df = node(group, DUCKFOOD.x, 0, DUCKFOOD.z, Math.atan2(0 - DUCKFOOD.x, 2 - DUCKFOOD.z));
  const dfParts = [cyl(df, M.iron, 0.05, 0.05, 1.0, 0, 0.5, 0, 8), box(df, std({ color: 0x2f8a88, roughness: 0.5 }), 0.32, 0.4, 0.26, 0, 1.15, 0), box(df, M.yellow, 0.12, 0.08, 0.04, 0, 1.08, 0.14)];
  cast(df);
  post(DUCKFOOD.x, DUCKFOOD.z, 0.25);
  const duckFeedPoint = new THREE.Vector3(2.6, 0.04, 1.9);
  let duckFeedUntil = 0;
  const pellets = [];
  for (let i = 0; i < 10; i++) {
    const m = add(group, new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), std({ color: 0xa0784a })), 0, -5, 0);
    noRay(m);
    pellets.push({ m, t: 99, from: new THREE.Vector3(), to: new THREE.Vector3() });
  }
  interact(dfParts, {
    label: () => 'Toss some food to the ducks',
    act: () => {
      duckFeedUntil = time + 9;
      pellets.forEach((p, i) => {
        p.t = -i * 0.05;
        p.from.set(DUCKFOOD.x, 1.2, DUCKFOOD.z);
        p.to.copy(duckFeedPoint).add(new THREE.Vector3((rand() - 0.5) * 1.2, 0, (rand() - 0.5) * 0.8));
      });
      ctx.sound.whistle();
      ctx.complete('ducks');
      ctx.toast('Pi-ji-ji! The whistling ducks paddle over for a snack.');
    },
  });

  // ---------- misting rain ----------
  const mp = node(group, 2.2, 0, 15.0, 0);
  const mistParts = [cyl(mp, M.iron, 0.06, 0.06, 1.2, 0, 0.6, 0, 8), box(mp, M.white, 0.3, 0.3, 0.12, 0, 1.25, 0)];
  const mistBtnMat = std({ color: 0x2a6fd6, emissive: 0x2a6fd6, emissiveIntensity: 0.2 });
  mistParts.push(cyl(mp, mistBtnMat, 0.07, 0.07, 0.05, 0, 1.25, -0.07, 16));
  mistParts[2].rotation.x = Math.PI / 2;
  const mistLabel = add(mp, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: T.sign('LLUVIA', { bg: '#2a6fd6' }), toneMapped: false })), 0, 1.5, -0.07);
  mistLabel.rotation.y = Math.PI;
  mistParts.push(mistLabel);
  cast(mp);
  post(2.2, 15.0, 0.25);
  const mist = { on: false, k: 0 };
  const mistN = 2200;
  const mistPos = new Float32Array(mistN * 3);
  const mistSpeed = new Float32Array(mistN);
  for (let i = 0; i < mistN; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand());
    mistPos.set([Math.cos(a) * rr * 18, rand() * 12, Math.sin(a) * rr * 12], i * 3);
    mistSpeed[i] = 1 + rand() * 1.2;
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
  const mistPts = new THREE.Points(mistGeo, mistMat);
  mistPts.visible = false;
  group.add(mistPts);
  noRay(mistPts);
  const rainbowMat = new THREE.MeshBasicMaterial({ map: T.rainbow(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const bow = add(group, new THREE.Mesh(new THREE.RingGeometry(9.1, 10.4, 64, 1, 0, Math.PI), rainbowMat), 1.5, -0.6, -12.6);
  bow.scale.setScalar(0.8);
  noRay(bow);
  interact(mistParts, {
    label: () => (mist.on ? 'Stop the misting rain' : 'Start the misting rain'),
    act: () => {
      mist.on = !mist.on;
      mistBtnMat.emissiveIntensity = mist.on ? 1.2 : 0.2;
      if (mist.on) {
        ctx.complete('mist');
        ctx.toast('Psssh… a fine tropical mist falls, and a rainbow appears over the pond!');
      }
    },
  });

  // ---------- photo spot ----------
  const PHOTO = { x: -3.2, z: 13.2 };
  const ps = node(group, PHOTO.x, 0, PHOTO.z, 0);
  const photoParts = [cyl(ps, M.darkWood, 0.06, 0.06, 1.5, 0, 0.75, 0, 8)];
  const photoBoard = add(ps, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), new THREE.MeshBasicMaterial({ map: T.sign('📷 FOTO', { bg: '#d9447a', font: 'bold 56px sans-serif' }), toneMapped: false, side: THREE.DoubleSide })), 0, 1.6, -0.07);
  photoBoard.rotation.y = Math.PI;
  photoParts.push(photoBoard);
  cast(ps);
  post(PHOTO.x, PHOTO.z, 0.2);
  // Footprints painted on the path: "stand here".
  for (const s of [-1, 1]) {
    const fp = add(group, new THREE.Mesh(new THREE.CircleGeometry(0.1, 12).scale(0.7, 1.4, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })), PHOTO.x + 0.6 + s * 0.12, 0.02, PHOTO.z - 0.4);
    fp.rotation.x = -Math.PI / 2;
    noRay(fp);
  }
  interact(photoParts, {
    label: () => 'Take a photo',
    act: () => {
      const eye = new THREE.Vector3(PHOTO.x + 0.6, 1.62, PHOTO.z - 0.5);
      ctx.sit({ eye, yaw: lookYaw(eye.x, eye.z, 1.5, -3), pitch: 0.08, photo: true });
    },
  });

  // ---------- lookout deck with binoculars ----------
  const deck = new THREE.Group();
  group.add(deck);
  box(deck, M.darkWood, DECK.x1 - DECK.x0, DECK.h - 0.06, DECK.z1 - DECK.z0, (DECK.x0 + DECK.x1) / 2, (DECK.h - 0.06) / 2, (DECK.z0 + DECK.z1) / 2);
  box(deck, M.wood, DECK.x1 - DECK.x0 + 0.1, 0.08, DECK.z1 - DECK.z0 + 0.1, (DECK.x0 + DECK.x1) / 2, DECK.h - 0.04, (DECK.z0 + DECK.z1) / 2);
  const rampLen = Math.hypot(RAMP.x1 - RAMP.x0, DECK.h);
  const rampAngle = Math.atan2(DECK.h, RAMP.x1 - RAMP.x0);
  const ramp = box(deck, M.wood, rampLen, 0.08, RAMP.z1 - RAMP.z0, (RAMP.x0 + RAMP.x1) / 2, DECK.h / 2 - 0.04, (RAMP.z0 + RAMP.z1) / 2);
  ramp.rotation.z = -rampAngle;
  // Railings.
  const rail = (x0, z0, x1, z1, y0, y1) => {
    const len = Math.hypot(x1 - x0, z1 - z0, y1 - y0);
    const m = box(deck, M.darkWood, len, 0.07, 0.07, (x0 + x1) / 2, (y0 + y1) / 2 + 1.0, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    m.rotation.z = Math.atan2(y1 - y0, Math.hypot(x1 - x0, z1 - z0));
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const y = y0 + (y1 - y0) * u;
      box(deck, M.darkWood, 0.07, 1.0, 0.07, x0 + (x1 - x0) * u, y + 0.5, z0 + (z1 - z0) * u);
    }
  };
  rail(DECK.x0, DECK.z0, DECK.x1, DECK.z0, DECK.h, DECK.h);
  rail(DECK.x0, DECK.z0, DECK.x0, DECK.z1, DECK.h, DECK.h);
  rail(DECK.x0, DECK.z1, DECK.x1, DECK.z1, DECK.h, DECK.h);
  rail(DECK.x1, DECK.z0, DECK.x1, RAMP.z0, DECK.h, DECK.h);
  rail(RAMP.x0, RAMP.z0, RAMP.x1 - 0.8, RAMP.z0, DECK.h, DECK.h * 0.16);
  rail(RAMP.x0, RAMP.z1, RAMP.x1 - 0.8, RAMP.z1, DECK.h, DECK.h * 0.16);
  cast(deck);
  solid(DECK.x0, DECK.z0 - 0.06, DECK.x1, DECK.z0 + 0.06);
  solid(DECK.x0 - 0.06, DECK.z0, DECK.x0 + 0.06, DECK.z1);
  solid(DECK.x0, DECK.z1 - 0.06, DECK.x1, DECK.z1 + 0.06);
  solid(DECK.x1 - 0.06, DECK.z0, DECK.x1 + 0.06, RAMP.z0);
  solid(RAMP.x0, RAMP.z0 - 0.06, RAMP.x1 - 0.8, RAMP.z0 + 0.06);
  solid(RAMP.x0, RAMP.z1 - 0.06, RAMP.x1 - 0.8, RAMP.z1 + 0.06);
  const bino = node(group, -11.2, DECK.h, 0.85);
  const binoParts = [cyl(bino, M.iron, 0.06, 0.09, 1.1, 0, 0.55, 0, 10), box(bino, std({ color: 0xf2c14e, roughness: 0.4 }), 0.34, 0.2, 0.26, 0, 1.22, 0)];
  for (const dx of [-0.08, 0.08]) {
    const tube = cyl(bino, M.iron, 0.055, 0.055, 0.22, dx, 1.24, -0.2, 12);
    tube.rotation.x = Math.PI / 2;
    binoParts.push(tube);
  }
  cast(bino);
  interact(binoParts, {
    label: () => 'Look through the binoculars',
    act: () => {
      ctx.sit({ eye: new THREE.Vector3(-11.2, DECK.h + 1.48, 1.15), yaw: -0.2, pitch: 0.3, binoculars: true });
      ctx.complete('binoculars');
      ctx.toast('Point the binoculars at a bird and press E to identify it. Can you find the toucan?', 5200);
    },
  });

  // ---------- birds ----------
  function birdGeos(sp) {
    const parts = [part(new THREE.SphereGeometry(0.12, 12, 9), sp.body, [1, 1, 1.7])];
    if (sp.belly) parts.push(part(new THREE.SphereGeometry(0.1, 10, 8), sp.belly, [0.95, 0.9, 1.2], [0, -0.03, 0.08]));
    parts.push(part(new THREE.SphereGeometry(0.09, 12, 9), sp.head || sp.body, [1, 1, 1], [0, 0.06, 0.2]));
    if (sp.face) for (const s of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.05, 8, 6), sp.face, [0.5, 1, 1], [s * 0.07, 0.06, 0.23]));
    if (sp.crest) parts.push(part(new THREE.SphereGeometry(0.03, 8, 6), sp.crest, [1, 0.8, 1], [0, 0.1, 0.27]));
    for (const s of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.016, 6, 5), 0x111111, [1, 1, 1], [s * 0.075, 0.08, 0.25]));
    if (sp.bill === 'toucan') {
      parts.push(part(new THREE.CylinderGeometry(0.045, 0.055, 0.1, 10), 0x7cc243, [1, 1.35, 1], [0, 0.04, 0.32], [Math.PI / 2, 0, 0]));
      parts.push(part(new THREE.CylinderGeometry(0.035, 0.045, 0.1, 10), 0xf28a1d, [1, 1.35, 1], [0, 0.035, 0.42], [Math.PI / 2 + 0.06, 0, 0]));
      parts.push(part(new THREE.CylinderGeometry(0.01, 0.035, 0.09, 10), 0xd8263e, [1, 1.35, 1], [0, 0.028, 0.515], [Math.PI / 2 + 0.12, 0, 0]));
    } else if (sp.bill === 'long') {
      parts.push(part(new THREE.ConeGeometry(0.012, 0.24, 6), 0x111111, [1, 1, 1], [0, 0.05, 0.4], [Math.PI / 2, 0, 0]));
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
  for (const k of ['scarlet', 'military', 'parrot', 'toucan', 'hummingbird']) geos[k] = birdGeos(BIRDS[k]);
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
    return { g, wl, wr, key, sp, mode: 'loop', phase: rand() * 10, pos: new THREE.Vector3(), prev: new THREE.Vector3() };
  }
  function wings(b, flap, fold) {
    b.wl.rotation.set(0, fold, flap);
    b.wr.rotation.set(0, -fold, -flap);
  }

  // Flyers circle the dome on gentle looping paths.
  const flyers = [];
  ['scarlet', 'scarlet', 'scarlet', 'military', 'military', 'parrot', 'parrot', 'parrot', 'scarlet', 'military'].forEach((key, i) => {
    const b = makeBird(key);
    b.loop = {
      a: 8 + rand() * 7,
      b: 5 + rand() * 4.5,
      cx: (rand() - 0.5) * 4,
      cz: (rand() - 0.5) * 3,
      h: 6 + rand() * 3.5,
      w: (0.18 + rand() * 0.1) * (i % 2 ? 1 : -1),
      p: rand() * 6.28,
      q: rand() * 6.28,
    };
    flyers.push(b);
  });
  function loopPos(b, t, out) {
    const L = b.loop;
    const x = L.cx + L.a * Math.cos(L.w * t + L.p);
    const z = L.cz + L.b * Math.sin(L.w * t + L.p);
    const y = Math.min(L.h + 1.2 * Math.sin(2 * L.w * t + L.q), domeH(x, z) - 1.8);
    return out.set(x, Math.max(2.5, y), z);
  }
  // Send a bird to a perch for a while, then back to its loop.
  function flyTo(b, perch, stay, faceYaw) {
    b.mode = 'travel';
    b.from = b.pos.clone();
    b.to = perch.clone();
    b.t0 = time;
    b.dur = 2.4 + b.from.distanceTo(b.to) * 0.08;
    b.stay = stay;
    b.faceYaw = faceYaw;
  }
  // Birds that just sit on a branch.
  const sitters = [];
  const sit = (key, p, yaw) => {
    const b = makeBird(key);
    b.mode = 'perch';
    b.perch = p.clone();
    b.until = Infinity;
    b.faceYaw = yaw;
    b.pos.copy(p);
    sitters.push(b);
    return b;
  };
  sit('toucan', toucanPerch, Math.atan2(-11.2 - toucanPerch.x, 1.15 - toucanPerch.z));
  sit('scarlet', macawPerches[0], 1.2);
  sit('military', macawPerches[1], 2.0);
  sit('parrot', palmCrowns[1].clone().add(new THREE.Vector3(0.35, -0.15, 0)), -1.2);
  sit('parrot', palmCrowns[0].clone().add(new THREE.Vector3(-0.3, -0.15, 0.2)), 0.6);

  // Hummingbirds flit between the heliconias and the feeder.
  const hummers = [0, 1, 2].map(() => {
    const b = makeBird('hummingbird');
    b.mode = 'hover';
    b.spot = flowerVisits[Math.floor(rand() * flowerVisits.length)].clone();
    b.pos.copy(b.spot);
    b.next = rand() * 3;
    return b;
  });

  // Whistling ducks on the pond.
  const duckGeo = mergeGeometries([
    part(new THREE.SphereGeometry(0.16, 12, 9), 0xa0522d, [1, 0.7, 1.5], [0, 0.06, 0]),
    part(new THREE.SphereGeometry(0.15, 12, 9), 0x18181b, [0.95, 0.5, 1.2], [0, 0.0, 0.02]),
    part(new THREE.BoxGeometry(0.05, 0.02, 0.26), 0xf4f1ea, [1, 1, 1], [0.13, 0.1, -0.02]),
    part(new THREE.BoxGeometry(0.05, 0.02, 0.26), 0xf4f1ea, [1, 1, 1], [-0.13, 0.1, -0.02]),
    part(new THREE.CylinderGeometry(0.045, 0.06, 0.2, 8), 0x9a7a62, [1, 1, 1], [0, 0.18, 0.18], [0.4, 0, 0]),
    part(new THREE.SphereGeometry(0.065, 10, 8), 0x8a7a6a, [1, 1, 1.1], [0, 0.28, 0.24]),
    part(new THREE.BoxGeometry(0.04, 0.025, 0.09), 0xff4a6a, [1, 1, 1], [0, 0.26, 0.33]),
    part(new THREE.SphereGeometry(0.012, 6, 5), 0x111111, [1, 1, 1], [0.05, 0.3, 0.28]),
    part(new THREE.SphereGeometry(0.012, 6, 5), 0x111111, [1, 1, 1], [-0.05, 0.3, 0.28]),
    part(new THREE.ConeGeometry(0.05, 0.12, 6), 0x5a3a22, [1, 0.5, 1], [0, 0.08, -0.26], [-Math.PI / 2, 0, 0]),
  ]);
  const ducks = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(duckGeo, birdMat);
    m.userData.species = 'duck';
    const g = new THREE.Group();
    g.add(m);
    birdsGroup.add(g);
    const a = rand() * 6.28;
    const d = { g, pos: new THREE.Vector3(POND.x + Math.cos(a) * 4, 0.03, POND.z + Math.sin(a) * 2.5), target: new THREE.Vector3(), heading: rand() * 6.28, phase: rand() * 6 };
    newDuckTarget(d);
    ducks.push(d);
  }
  function newDuckTarget(d) {
    const a = rand() * 6.28;
    const rr = Math.sqrt(rand()) * 0.8;
    d.target.set(POND.x + Math.cos(a) * POND.a * rr, 0.03, POND.z + Math.sin(a) * POND.b * rr);
  }

  // Roseate spoonbills wading at the shallow end.
  const spoonGeo = mergeGeometries([
    part(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), 0xd8506a, [1, 1, 1], [0.04, 0.3, 0]),
    part(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), 0xd8506a, [1, 1, 1], [-0.04, 0.3, 0]),
    part(new THREE.SphereGeometry(0.15, 12, 9), 0xf2a0b8, [0.9, 0.85, 1.5], [0, 0.72, 0]),
    part(new THREE.SphereGeometry(0.1, 10, 8), 0xd8406a, [1, 0.5, 1.2], [0, 0.78, -0.08]),
    part(new THREE.CylinderGeometry(0.03, 0.04, 0.34, 8), 0xf8dce4, [1, 1, 1], [0, 0.9, 0.18], [0.6, 0, 0]),
    part(new THREE.SphereGeometry(0.055, 10, 8), 0xe2e4b0, [1, 1, 1.1], [0, 1.05, 0.29]),
    part(new THREE.BoxGeometry(0.03, 0.014, 0.2), 0x7a7a72, [1, 1, 1], [0, 1.03, 0.42], [0.25, 0, 0]),
    part(new THREE.SphereGeometry(0.03, 8, 6), 0x7a7a72, [1.6, 0.35, 1.3], [0, 1.0, 0.53]),
  ]);
  const spoonbills = [[-6.0, -0.4, 1.4], [-5.4, -2.3, 2.3]].map(([x, z, yaw], i) => {
    const m = new THREE.Mesh(spoonGeo, birdMat);
    m.userData.species = 'spoonbill';
    const g = node(birdsGroup, x, 0.03, z, yaw);
    g.add(m);
    return { g, phase: i * 3.3 };
  });

  // ---------- identify through the binoculars ----------
  const seen = new Set();
  function identify(key) {
    const sp = BIRDS[key];
    if (!sp) return;
    seen.add(key);
    ctx.toast(`${sp.name} (${sp.es}). ${sp.fact}  ·  Spotted ${seen.size} of ${Object.keys(BIRDS).length} species.`, 6000);
    if (key === 'toucan') ctx.complete('toucan');
  }

  // ---------- per frame ----------
  let time = 0;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let bridgeFrom = null;
  function placeBird(b, faceTo, roll = 0) {
    b.g.position.copy(b.pos);
    b.g.lookAt(faceTo);
    b.g.rotateZ(roll);
  }
  function update(dt, t) {
    time = t;
    for (const u of updaters) u(dt);

    // Flyers.
    for (const b of flyers) {
      b.prev.copy(b.pos);
      if (b.mode === 'loop') {
        loopPos(b, t, b.pos);
        loopPos(b, t + 0.15, tmp);
        placeBird(b, tmp, -Math.sign(b.loop.w) * 0.35);
        const glide = Math.max(0, Math.sin(t * 0.6 + b.phase));
        wings(b, Math.sin(t * 9 + b.phase) * (0.25 + 0.8 * glide), 0);
      } else if (b.mode === 'travel' || b.mode === 'return') {
        const u = Math.min(1, (t - b.t0) / b.dur);
        const e = u * u * (3 - 2 * u);
        const target = b.mode === 'return' ? loopPos(b, b.t0 + b.dur, tmp2) : b.to;
        const mid = tmp.copy(b.from).add(target).multiplyScalar(0.5);
        mid.y += 2;
        // Quadratic Bezier from -> mid -> target.
        b.pos.set(0, 0, 0).addScaledVector(b.from, (1 - e) * (1 - e)).addScaledVector(mid, 2 * (1 - e) * e).addScaledVector(target, e * e);
        if (b.pos.distanceToSquared(b.prev) > 1e-6) placeBird(b, tmp.copy(b.pos).add(b.pos).sub(b.prev));
        wings(b, Math.sin(t * 14 + b.phase) * 0.9, 0);
        if (u >= 1) {
          if (b.mode === 'travel') {
            b.mode = 'perch';
            b.perch = b.to.clone();
            b.until = t + b.stay;
            ctx.sound.squawk();
          } else b.mode = 'loop';
        }
      }
      if (b.mode === 'perch') perchPose(b, t);
      if (b.mode === 'perch' && t > b.until) {
        b.mode = 'return';
        b.from = b.pos.clone();
        b.t0 = t;
        b.dur = 3.5;
      }
    }
    for (const b of sitters) perchPose(b, t);

    // Hummingbirds.
    hummers.forEach((b, i) => {
      if (i === 0 && t < hummerFeedUntil && b.feedPort) b.spot.copy(b.feedPort).add(tmp.set(0.12, 0.02, 0));
      else if (t > b.next) {
        b.spot.copy(flowerVisits[Math.floor(rand() * flowerVisits.length)]).add(tmp.set((rand() - 0.5) * 0.6, rand() * 0.4, (rand() - 0.5) * 0.6));
        b.next = t + 1.5 + rand() * 2.5;
      }
      b.prev.copy(b.pos);
      b.pos.lerp(b.spot, 1 - Math.exp(-dt * 4));
      b.pos.y += Math.sin(t * 7 + i) * 0.004;
      b.g.position.copy(b.pos);
      b.g.rotation.set(-0.5, (i * 2.1 + Math.sin(t * 0.8 + i)) % 6.28, 0);
      if (i === 0 && t < hummerFeedUntil && b.feedPort) b.g.rotation.y = Math.atan2(-1, 0);
      wings(b, Math.sin(t * 95 + i) * 1.1, 0);
    });

    // Ducks paddle around (or toward food).
    for (const d of ducks) {
      const feeding = t < duckFeedUntil;
      if (feeding) d.target.copy(duckFeedPoint);
      tmp.subVectors(d.target, d.pos);
      tmp.y = 0;
      const dist = tmp.length();
      if (!feeding && dist < 0.3) newDuckTarget(d);
      const want = Math.atan2(tmp.x, tmp.z);
      let diff = want - d.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      d.heading += clamp(diff, -dt * 1.5, dt * 1.5);
      const speed = dist > 0.5 ? (feeding ? 0.8 : 0.35) : 0;
      d.pos.x += Math.sin(d.heading) * speed * dt;
      d.pos.z += Math.cos(d.heading) * speed * dt;
      // Stay inside the pond.
      const k = ((d.pos.x - POND.x) / (POND.a - 0.4)) ** 2 + ((d.pos.z - POND.z) / (POND.b - 0.4)) ** 2;
      if (k > 1) {
        d.pos.x = POND.x + (d.pos.x - POND.x) / Math.sqrt(k);
        d.pos.z = POND.z + (d.pos.z - POND.z) / Math.sqrt(k);
      }
      d.g.position.set(d.pos.x, 0.03 + Math.sin(t * 2 + d.phase) * 0.012, d.pos.z);
      d.g.rotation.set(0, d.heading, Math.sin(t * 1.7 + d.phase) * 0.04);
      if (feeding && dist < 0.8) d.g.rotation.x = Math.max(0, Math.sin(t * 6 + d.phase)) * 0.5;
    }
    // Food pellets arcing into the pond.
    for (const p of pellets) {
      if (p.t > 1) continue;
      p.t += dt * 1.6;
      const u = clamp(p.t, 0, 1);
      p.m.position.lerpVectors(p.from, p.to, u);
      p.m.position.y += Math.sin(Math.PI * u) * 0.8;
      if (p.t >= 1) p.m.position.y = -5;
    }

    // Spoonbills sweep their bills through the water.
    for (const s of spoonbills) {
      const dip = Math.max(0, Math.sin(t * 0.7 + s.phase));
      s.g.rotation.x = dip * 0.55;
      s.g.rotation.z = Math.sin(t * 3 + s.phase) * 0.06 * dip;
    }

    // Water.
    wn.offset.x = t * 0.015;
    wn.offset.y = t * 0.011;
    fallTex.offset.y = t * 1.4;
    foam.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
    for (let i = 0; i < splashN; i++) {
      const [a, b, c] = splashSeed[i];
      const u = (t * (0.8 + a) + b) % 1;
      splashPos[i * 3] = FALLS.x - 0.2 - u * 1.2 * c;
      splashPos[i * 3 + 1] = 0.05 + Math.sin(u * Math.PI) * (0.3 + a * 0.4);
      splashPos[i * 3 + 2] = FALLS.z + (b - 0.5) * 2.2;
    }
    splashGeo.attributes.position.needsUpdate = true;

    // Mist and rainbow.
    mist.k = clamp(mist.k + (mist.on ? dt : -dt) * 0.5, 0, 1);
    mistPts.visible = mist.k > 0.01;
    mistMat.opacity = 0.55 * mist.k;
    rainbowMat.opacity = 0.32 * mist.k;
    if (mistPts.visible) {
      for (let i = 0; i < mistN; i++) {
        let y = mistPos[i * 3 + 1] - mistSpeed[i] * dt;
        if (y < 0) y += 12;
        mistPos[i * 3 + 1] = y;
        mistPos[i * 3] += Math.sin(t + i) * dt * 0.1;
      }
      mistGeo.attributes.position.needsUpdate = true;
    }

    // Crossing the bridge.
    const pl = ctx.player();
    const pp = pl.pos;
    if (Math.abs(pp.x) < 0.9) {
      if (pp.z > BRIDGE.z1 - 0.6 && pp.z < BRIDGE.z1 + 0.6) {
        if (bridgeFrom === 'N') ctx.complete('bridge');
        bridgeFrom = 'S';
      } else if (pp.z < BRIDGE.z0 + 0.6 && pp.z > BRIDGE.z0 - 0.6) {
        if (bridgeFrom === 'S') ctx.complete('bridge');
        bridgeFrom = 'N';
      }
    } else if (Math.abs(pp.x) > 3) bridgeFrom = null;

    const cam = ctx.camera.position;
    api.state.water = clamp(1 - Math.hypot(cam.x - FALLS.x, cam.z - FALLS.z) / 16, 0, 1);
    api.state.mist = mist.k;
    api.state.calm = pl.seat && pl.seat.calm ? 1 : 0;
  }
  function perchPose(b, t) {
    b.pos.copy(b.perch);
    b.g.position.copy(b.pos);
    b.g.position.y += 0.12 * b.sp.size;
    b.g.rotation.set(-0.95, b.faceYaw + Math.sin(t * 0.5 + b.phase) * 0.35, 0);
    const preen = Math.max(0, Math.sin(t * 0.3 + b.phase) - 0.9) * 8;
    wings(b, 0.1 + preen * 0.6, 1.35 - preen * 0.5);
  }

  return api;
}
