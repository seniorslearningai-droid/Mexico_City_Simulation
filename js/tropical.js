// Chapultepec Zoo's tropical forest section: a loop of jungle paths with
// big cats, monkeys, a bear, a hyena, a sloth, a bat house and a crocodile,
// laid out roughly like the zoo's own map. Everything is in meters; north is -z.
//
//        jaguar negro   ocelote     jaguar        siamang
//   agutí  ┌───────────────────────────────────────┐
//          │  temazate   capuchino   capuchino   macaco
//  mono    │             garganta    de cuernos         │ capuchino
//  araña   ├────────────── centre path ─────────────────┤ cara blanca
//  lémur   │  tigrillo   perezoso  tití        hiena   │ oso de
//          │  murciélagos                              │ antifaz
//  cocodrilo└──────────────┬──────────────────────────┘
//                león      │entrance  leopardo   mono patas
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

export const TROPICAL_SPAWN = { x: 0, z: 27, yaw: 0, pitch: -0.03 };
const HW = 1.8; // half-width of the paths
const PATHS = [
  [[-28, 16], [-28, -14], [-24, -19], [-10, -21], [10, -21], [24, -18], [28, -13], [28, 13], [24, 18], [10, 20], [-10, 20], [-24, 19], [-28, 16]],
  [[-28, 1], [-12, 2], [0, 0], [12, 2], [28, 1]],
  [[0, 20], [0, 28.5]],
];
const SEGS = [];
for (const line of PATHS) for (let i = 0; i < line.length - 1; i++) SEGS.push([line[i], line[i + 1]]);

// side: which side of the enclosure the path is on (s = +z, n = -z, e = +x, w = -x).
const YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const EXHIBITS = [
  { key: 'croc', es: 'Cocodrilo', en: 'Crocodile', sci: 'Crocodylus moreletii', emoji: '🐊', at: [-34.5, 11], w: 9, d: 9, side: 'e', type: 'pool', fact: 'Crocodiles can hold their breath underwater for over an hour, and their family has been around since the time of the dinosaurs.' },
  { key: 'lemur', es: 'Lémur de cola anillada', en: 'Ring-tailed lemurs', sci: 'Lemur catta', emoji: '🐒', at: [-34, 1.5], w: 7, d: 8, side: 'e', type: 'cage', fact: 'Ring-tailed lemurs come from Madagascar. They hold their striped tails up high like flags to keep the group together.' },
  { key: 'spider', es: 'Mono araña', en: 'Spider monkeys', sci: 'Ateles geoffroyi', emoji: '🐒', at: [-34.5, -6.5], w: 8, d: 9, side: 'e', type: 'cage', fact: 'Spider monkeys swing through the trees with their long arms and a tail that grips like a fifth hand.' },
  { key: 'agouti', es: 'Agutí dorado', en: 'Golden agouti', sci: 'Dasyprocta leporina', emoji: '🐹', at: [-34, -15], w: 6, d: 8, side: 'e', type: 'yard', fact: 'Agoutis bury seeds to eat later — the ones they forget grow into new trees!' },
  { key: 'blackjag', es: 'Jaguar negro', en: 'Black jaguar', sci: 'Panthera onca', emoji: '🐆', at: [-17, -28], w: 10, d: 9, side: 's', type: 'glass', fact: 'A black jaguar isn’t a different species — it’s a jaguar with extra-dark fur. Look closely and you can still see its rosettes.' },
  { key: 'ocelot', es: 'Ocelote', en: 'Ocelot', sci: 'Leopardus pardalis', emoji: '🐆', at: [-4, -28.5], w: 8, d: 9, side: 's', type: 'glass', fact: 'Ocelots are wild cats from Mexico’s forests. They hunt at night and are great climbers and swimmers.' },
  { key: 'jaguar', es: 'Jaguar', en: 'Jaguar', sci: 'Panthera onca', emoji: '🐆', at: [8, -28.5], w: 10, d: 9, side: 's', type: 'glass', fact: 'The jaguar is the biggest wild cat in the Americas — and unlike most cats, it loves to swim.' },
  { key: 'siamang', es: 'Siamang', en: 'Siamang', sci: 'Symphalangus syndactylus', emoji: '🐒', at: [21, -26], w: 9, d: 9, side: 's', type: 'cage', fact: 'Siamangs are the biggest gibbons. They puff up a throat sac to sing loud, booming songs.' },
  { key: 'whiteface', es: 'Capuchino de cara blanca', en: 'White-faced capuchin', sci: 'Cebus imitator', emoji: '🐒', at: [34.5, -7], w: 8, d: 9, side: 'w', type: 'cage', fact: 'White-faced capuchins rub crushed plants on their fur — it works like bug spray!' },
  { key: 'bear', es: 'Oso de antifaz', en: 'Spectacled bear', sci: 'Tremarctos ornatus', emoji: '🐻', at: [35, 4.5], w: 10, d: 10, side: 'w', type: 'glass', fact: 'The spectacled bear is the only bear in South America. Each one has its own pattern of pale “glasses” on its face.' },
  { key: 'patas', es: 'Mono patas', en: 'Patas monkeys', sci: 'Erythrocebus patas', emoji: '🐒', at: [17.5, 25], w: 9, d: 8, side: 'n', type: 'yardTall', fact: 'Patas monkeys are the fastest primates on the ground: they can run at about 55 km/h.' },
  { key: 'leopard', es: 'Leopardo', en: 'Leopard', sci: 'Panthera pardus', emoji: '🐆', at: [8, 26.5], w: 9, d: 9, side: 'n', type: 'glass', fact: 'Leopards are so strong they can drag their food up into a tree to keep it safe.' },
  { key: 'lion', es: 'León', en: 'Lion', sci: 'Panthera leo', emoji: '🦁', at: [-9, 27.3], w: 12, d: 10, side: 'n', type: 'glass', fact: 'A lion’s roar can be heard up to 8 km away. Lions are the only cats that live in groups, called prides.' },
  { key: 'temazate', es: 'Temazate', en: 'Red brocket deer', sci: 'Mazama temama', emoji: '🦌', at: [-18, -9], w: 8, d: 7, side: 's', type: 'yard', fact: 'The temazate is a small deer from Mexico’s tropical forests. The males have short, spiky antlers.' },
  { key: 'throat', es: 'Capuchino de garganta blanca', en: 'White-throated capuchin', sci: 'Cebus capucinus', emoji: '🐒', at: [-5, -9], w: 8, d: 8, side: 's', type: 'cage', fact: 'Capuchins are clever: some use stones as tools to crack open hard nuts.' },
  { key: 'tufted', es: 'Capuchino de cuernos', en: 'Tufted capuchin', sci: 'Sapajus apella', emoji: '🐒', at: [6, -10], w: 8, d: 8, side: 's', type: 'cage', fact: 'Tufted capuchins are named for the two tufts of fur on their heads that look like little horns.' },
  { key: 'macaque', es: 'Macaco cola de muñón', en: 'Stump-tailed macaques', sci: 'Macaca arctoides', emoji: '🐵', at: [18, -8.5], w: 9, d: 8, side: 's', type: 'cage', fact: 'Stump-tailed macaques have bright red faces and only a tiny stump of a tail.' },
  { key: 'margay', es: 'Tigrillo', en: 'Margay', sci: 'Leopardus wiedii', emoji: '🐆', at: [-18, 8], w: 7, d: 7, side: 'n', type: 'glass', fact: 'The tigrillo (margay) can turn its back ankles around, so it can climb down trees head-first!' },
  { key: 'sloth', es: 'Perezoso', en: 'Sloth', sci: 'Choloepus hoffmanni', emoji: '🦥', at: [-5, 8], w: 7, d: 7, side: 'n', type: 'cage', fact: 'Sloths move so slowly that tiny green algae grow in their fur. They climb down only about once a week.' },
  { key: 'tamarin', es: 'Tití cabeza de algodón', en: 'Cotton-top tamarins', sci: 'Saguinus oedipus', emoji: '🐒', at: [6, 8], w: 6, d: 7, side: 'n', type: 'cage', fact: 'Cotton-top tamarins weigh less than half a kilo and are named for their fluffy white crests.' },
  { key: 'hyena', es: 'Hiena moteada', en: 'Spotted hyena', sci: 'Crocuta crocuta', emoji: '🐾', at: [17, 8.5], w: 9, d: 8, side: 'n', type: 'glass', fact: 'Spotted hyenas live in big clans led by females, and their famous “laugh” is how they talk to each other.' },
  { key: 'bats', es: 'Murciélagos', en: 'Bats', sci: 'Chiroptera', emoji: '🦇', at: [-14, 14.8], w: 8, d: 5, side: 's', type: 'house', fact: 'Bats are the only mammals that can really fly. Many eat insects, and others help plants by spreading pollen and seeds.' },
];

// Fur patterns painted on a canvas.
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function furTex(base, kind, ink = '#2a1a0a', seed = 1) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 * r()})`;
      g.fillRect(r() * w, r() * h, 2, 5);
    }
    if (kind === 'plain') return;
    const n = kind === 'smallRosette' ? 90 : kind === 'spots' ? 55 : 45;
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h;
      const rr = kind === 'smallRosette' ? 7 + r() * 4 : kind === 'spots' ? 6 + r() * 5 : 10 + r() * 7;
      g.strokeStyle = ink;
      g.fillStyle = ink;
      if (kind === 'spots') {
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.fill();
      } else {
        // A rosette (or an ocelot blotch): broken ring around a darker middle.
        g.lineWidth = kind === 'blotch' ? 5 : 4;
        for (let k = 0; k < 4; k++) {
          const a = k * 1.6 + r();
          g.beginPath();
          g.arc(x, y, rr, a, a + 1.1);
          g.stroke();
        }
        g.globalAlpha = 0.25;
        g.beginPath();
        g.ellipse(x, y, rr * 0.6, rr * (kind === 'blotch' ? 0.9 : 0.6), 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
    }
  }, [2, 2]);
}

export function buildTropical(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const shadowLights = [];
  const rand = T.rng(4242);
  const api = { group, colliders, shadowLights, dirty: true, floorAt: () => 0, limit, update, state: { water: 0, mist: 0, calm: 0 }, exhibits: null };

  // ---------- materials ----------
  const M = {
    floor: std({ map: T.forestFloor(), roughness: 1 }),
    grass: std({ map: T.grass(), roughness: 1 }),
    path: std({ map: T.gravel(), color: 0xc8b48e, roughness: 1 }),
    dirt: std({ map: T.gravel(), color: 0x8a6a48, roughness: 1 }),
    sand: std({ map: T.gravel(), color: 0xd8c49a, roughness: 1 }),
    stone: std({ map: T.paving(), color: 0xb8ae9c, roughness: 0.9 }),
    wood: std({ map: T.woodGrain(), color: 0x8a6440, roughness: 0.7 }),
    darkWood: std({ map: T.woodGrain(), color: 0x5a3e28, roughness: 0.75 }),
    bark: std({ map: T.woodGrain(), color: 0x4a3626, roughness: 1 }),
    iron: std({ color: 0x2a2c2a, metalness: 0.5, roughness: 0.5 }),
    rope: std({ color: 0xb8a074, roughness: 1 }),
    rock: std({ vertexColors: true, roughness: 0.95, flatShading: true }),
    leaf: std({ roughness: 0.85, flatShading: true }),
    leafDS: std({ color: 0x3f7a32, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0xd8eef2, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    house: std({ map: T.plaster(), color: 0x6a5a48, roughness: 0.95 }),
    roof: std({ color: 0x3a4a2a, roughness: 0.9 }),
    darkGlass: new THREE.MeshStandardMaterial({ color: 0x101018, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }),
    batRoom: std({ color: 0x2a1418, roughness: 1, emissive: 0x3a0808, emissiveIntensity: 0.6 }),
    vertex: std({ vertexColors: true, roughness: 0.8 }),
    eye: std({ color: 0x1a1208, roughness: 0.3 }),
    nose: std({ color: 0x1a1a1a, roughness: 0.4 }),
  };
  const meshTex = T.cageMesh();
  meshTex.repeat.set(9, 9);
  const meshMat = new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, color: 0x262826 });
  const waterTex = T.waterNormals();
  const waterMat = std({ color: 0x3a6a5a, roughness: 0.08, metalness: 0.2, normalMap: waterTex, normalScale: new THREE.Vector2(0.4, 0.4), transparent: true, opacity: 0.88 });

  // ---------- helpers ----------
  const add = (p, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    p.add(mesh);
    return mesh;
  };
  const box = (p, mat, w, h, d, x, y, z) => add(p, new THREE.Mesh(meterUV(new THREE.BoxGeometry(w, h, d)), mat), x, y, z);
  const cyl = (p, mat, rt, rb, h, x, y, z, seg = 10) => add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z);
  const sph = (p, mat, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) => {
    const m = add(p, new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat), x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const node = (p, x = 0, y = 0, z = 0, ry = 0) => {
    const g = add(p, new THREE.Group(), x, y, z);
    g.rotation.y = ry;
    return g;
  };
  const interact = (objs, def) => {
    for (const o of [].concat(objs)) o.traverse((c) => (c.userData.interact = def));
    return def;
  };
  const cast = (...objs) => objs.forEach((o) => o.traverse((c) => (c.userData.cast = true)));
  const noRay = (...objs) => objs.forEach((o) => o.traverse((c) => (c.raycast = () => {})));
  function tint(geo, hex) {
    const c = new THREE.Color(hex);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }
  const rockShades = [0x8a8274, 0x7a7266, 0x9a9284, 0x6e675c];
  function rocks(parent, list) {
    const geos = list.map(([x, z, r]) => tint(new THREE.DodecahedronGeometry(1, 0).scale(r * 1.3, r * 0.8, r).rotateY(rand() * 6).translate(x, r * 0.4, z), rockShades[Math.floor(rand() * 4)]));
    const m = add(parent, new THREE.Mesh(mergeGeometries(geos), M.rock));
    cast(m);
    return m;
  }
  function flat(parent, mat, geo, x, y, z) {
    const uv = geo.attributes.uv;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    const m = add(parent, new THREE.Mesh(geo, mat), x, y, z);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  // A jungle tree: a trunk, a few branches and leafy clumps. Returns branch perches.
  function jungleTree(parent, x, z, h = 4.5, s = 1) {
    const g = node(parent, x, 0, z);
    cyl(g, M.bark, 0.12 * s, 0.2 * s, h, 0, h / 2, 0, 8);
    const perches = [];
    const leaves = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + rand();
      const y = h * (0.45 + i * 0.13);
      const len = (1.0 + rand() * 0.6) * s;
      const dir = new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize();
      const b = cyl(g, M.bark, 0.04, 0.07, len, 0, 0, 0, 6);
      b.position.set(dir.x * len * 0.5, y + dir.y * len * 0.5, dir.z * len * 0.5);
      b.quaternion.setFromUnitVectors(Y, dir);
      perches.push(new THREE.Vector3(x + dir.x * len * 0.7, y + dir.y * len * 0.7 + 0.04, z + dir.z * len * 0.7));
      leaves.push(tint(new THREE.IcosahedronGeometry(0.7 * s, 1).scale(1, 0.7, 1).translate(dir.x * len, y + dir.y * len + 0.3, dir.z * len), i % 2 ? 0x2f6a2c : 0x3f8a3a));
    }
    leaves.push(tint(new THREE.IcosahedronGeometry(1.1 * s, 1).scale(1, 0.75, 1).translate(0, h + 0.3, 0), 0x2f7a34));
    add(g, new THREE.Mesh(mergeGeometries(leaves), std({ vertexColors: true, roughness: 0.85, flatShading: true })));
    cast(g);
    return perches;
  }


  // Merge an object's meshes that share a material into one mesh each, so the
  // forest draws in far fewer calls. Interactive and moving parts stay apart.
  function bake(root, { deep = true } = {}) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const groups = new Map();
    const victims = [];
    const visit = (o) => {
      for (const c of [...o.children]) {
        if (c.userData.keep || c.userData.interact || c.isLight || c.isSprite) continue;
        if (c.isMesh && !c.isInstancedMesh) {
          const key = c.material.uuid + (c.userData.cast ? '|c' : '');
          if (!groups.has(key)) groups.set(key, { mat: c.material, cast: !!c.userData.cast, geos: [] });
          const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
          const keep = c.material.vertexColors ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv'];
          for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
          if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
          g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld));
          groups.get(key).geos.push(g);
          victims.push(c);
        }
        if (deep && c.children.length) visit(c);
      }
    };
    visit(root);
    for (const v of victims) v.parent.remove(v);
    for (const { mat, cast: cs, geos } of groups.values()) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.userData.cast = cs;
      if (mat === meshMat || mat.transparent) m.raycast = () => {};
      root.add(m);
    }
  }
  // Same for an animal, but only within each moving part (pivot).
  function bakeAnimal(root) {
    const pivots = [];
    root.traverse((o) => {
      if (o.children.some((c) => c.isMesh)) pivots.push(o);
    });
    for (const p of pivots) bake(p, { deep: false });
    root.traverse((c) => (c.userData.animal = root.userData.animal));
  }

  // ---------- where you can walk: along the paths ----------
  const tmpP = new THREE.Vector2();
  function nearestOnPaths(x, z, out) {
    let best = Infinity;
    for (const [[x0, z0], [x1, z1]] of SEGS) {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const k = clamp(((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz), 0, 1);
      const px = x0 + dx * k;
      const pz = z0 + dz * k;
      const d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < best) {
        best = d;
        out.set(px, pz);
      }
    }
    return Math.sqrt(best);
  }
  function limit(p, r) {
    const d = nearestOnPaths(p.x, p.z, tmpP);
    const max = HW - r;
    if (d > max) {
      p.x = tmpP.x + ((p.x - tmpP.x) / d) * max;
      p.z = tmpP.y + ((p.z - tmpP.y) / d) * max;
    }
  }

  // ---------- sky, sun, ground ----------
  const sunDir = new THREE.Vector3(0.4, 0.82, 0.35).normalize();
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
          vec3 c = mix(vec3(0.8, 0.88, 0.8), vec3(0.32, 0.56, 0.86), pow(h, 0.55));
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
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 30, far: 240 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  sun.target.position.set(0, 0, 0);
  sun.position.copy(sunDir).multiplyScalar(120);
  group.add(sun, sun.target);
  shadowLights.push(sun);
  group.add(new THREE.HemisphereLight(0xd2e4ff, 0x3a4a2a, 0.9));
  {
    const ground = flat(group, M.floor, new THREE.PlaneGeometry(400, 400), 0, 0, 0);
    ground.receiveShadow = true;
    flat(group, M.grass, new THREE.PlaneGeometry(66, 56), 0, 0.005, 3);
  }
  // Paths: a strip per segment and a disc at every corner.
  {
    const geos = [];
    for (const [[x0, z0], [x1, z1]] of SEGS) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const g = new THREE.PlaneGeometry(HW * 2 + 0.2, len).rotateX(-Math.PI / 2).rotateY(Math.atan2(x1 - x0, z1 - z0)).translate((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
      geos.push(g);
    }
    for (const line of PATHS) for (const [x, z] of line) geos.push(new THREE.CircleGeometry(HW + 0.1, 20).rotateX(-Math.PI / 2).translate(x, 0.013, z));
    const merged = mergeGeometries(geos);
    const p = merged.attributes.position;
    const uv = merged.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    group.add(new THREE.Mesh(merged, M.path));
  }

  // ---------- animals ----------
  const animals = [];
  const furMats = {};
  const fur = (key, base, kind, ink) => furMats[key] || (furMats[key] = std({ map: furTex(base, kind, ink, key.length * 7), roughness: 0.9 }));
  const plain = (hex) => std({ color: hex, roughness: 0.9 });

  // A four-legged animal. Its parts are built facing +z with the body centred.
  function makeQuad(o) {
    const root = new THREE.Group();
    const inner = node(root);
    inner.scale.setScalar(o.size || 1);
    const L = o.long || 1;
    const legF = o.legF || 0.34;
    const legH = o.legH || 0.34;
    const body = node(inner, 0, 0, 0);
    sph(body, o.mat, 0.26, 0, Math.max(legF, legH) + 0.16, 0, 0.9 * (o.wide || 1), 0.85, 2.0 * L);
    const head = node(body, 0, legF + 0.3 + (o.neck || 0), 0.52 * L + 0.04);
    sph(head, o.headMat || o.mat, 0.17, 0, 0, 0, 1, 0.92, 1.05);
    sph(head, o.muzzle || o.mat, 0.09, 0, -0.045, 0.14, 0.95, 0.75, o.snout || 1.1);
    sph(head, M.nose, 0.028, 0, -0.02, 0.14 + 0.09 * (o.snout || 1.1), 1.3, 0.8, 1);
    for (const s of [-1, 1]) {
      sph(head, M.eye, 0.018, s * 0.075, 0.04, 0.13);
      const ear = sph(head, o.earMat || o.mat, o.ear || 0.05, s * 0.1, 0.12, -0.03, 1, o.earTall || 1, 0.5);
      if (o.earTilt) ear.rotation.z = -s * o.earTilt;
    }
    if (o.mane) sph(head, o.mane, 0.25, 0, -0.02, -0.08, 1.05, 1.1, 0.9);
    if (o.face) o.face(head);
    if (o.antlers) for (const s of [-1, 1]) cyl(head, plain(0x6a5a40), 0.008, 0.015, 0.12, s * 0.06, 0.18, -0.02, 5).rotation.z = -s * 0.25;
    const legs = [];
    for (const [sx, sz, lh] of [[-1, 1, legF], [1, 1, legF], [-1, -1, legH], [1, -1, legH]]) {
      const hip = node(body, sx * 0.12 * (o.wide || 1), lh, sz * 0.38 * L);
      cyl(hip, o.legMat || o.mat, 0.05 * (o.thick || 1.5), 0.04 * (o.thick || 1.5), lh, 0, -lh / 2, 0, 8);
      sph(hip, o.legMat || o.mat, 0.055 * (o.thick || 1.5), 0, -lh + 0.02, 0.02, 1, 0.6, 1.3);
      legs.push(hip);
    }
    const tail = node(body, 0, legH + 0.24, -0.5 * L);
    let t = tail;
    const segs = [];
    const tl = (o.tail ?? 0.6) / 3;
    for (let i = 0; i < 3 && tl > 0.01; i++) {
      const sgm = node(t, 0, 0, i ? -tl : 0);
      cyl(sgm, o.tailMat || o.mat, 0.03 * (o.tailThick || 1), 0.035 * (o.tailThick || 1), tl, 0, 0, -tl / 2, 6).rotation.x = Math.PI / 2;
      segs.push(sgm);
      t = sgm;
    }
    if (o.tuft) sph(t, o.tuft, 0.05, 0, 0, -tl, 1, 1, 1.4);
    tail.rotation.x = -0.9;
    // Hyenas have a sloping back.
    body.rotation.x = (legH - legF) * 0.6;
    root.traverse((c) => (c.userData.animal = o.key));
    return { root, inner, body, head, legs, tail, segs, legF, legH, o };
  }
  // A monkey (or lemur, gibbon...). Sits on the origin; arms and legs pivot.
  function makePrimate(o) {
    const root = new THREE.Group();
    const inner = node(root);
    inner.scale.setScalar(o.size || 1);
    const body = node(inner);
    sph(body, o.mat, 0.16, 0, 0.24, 0, 0.9, 1.25, 0.8);
    if (o.chest) sph(body, o.chest, 0.12, 0, 0.3, 0.06, 0.85, 1, 0.6);
    const head = node(body, 0, 0.47, 0.03);
    sph(head, o.headMat || o.mat, 0.11, 0, 0, 0, 1, 1, 0.95);
    sph(head, o.faceMat || plain(0xc8a080), 0.075, 0, -0.015, 0.06, 1, 0.95, 0.55);
    for (const s of [-1, 1]) {
      sph(head, M.eye, 0.014, s * 0.032, 0.01, 0.1);
      sph(head, o.headMat || o.mat, 0.03, s * 0.1, 0.02, -0.01, 0.6, 1, 0.8);
    }
    if (o.crest) sph(head, o.crest, 0.07, 0, 0.09, -0.02, 1, 1.2, 1.3);
    if (o.tufts) for (const s of [-1, 1]) sph(head, o.tufts, 0.03, s * 0.05, 0.1, 0.01, 0.8, 1.6, 0.8);
    if (o.sac) sph(head, o.sac, 0.07, 0, -0.1, 0.05);
    const limb = (x, y, len, mat) => {
      const p = node(body, x, y, 0);
      cyl(p, mat, 0.03, 0.025, len, 0, -len / 2, 0, 6);
      sph(p, mat, 0.03, 0, -len, 0, 1, 1, 1.2);
      return p;
    };
    const armL = o.arm || 0.36;
    const arms = [limb(-0.13, 0.36, armL, o.limbMat || o.mat), limb(0.13, 0.36, armL, o.limbMat || o.mat)];
    const legs = [limb(-0.08, 0.1, o.leg || 0.28, o.limbMat || o.mat), limb(0.08, 0.1, o.leg || 0.28, o.limbMat || o.mat)];
    const tail = node(body, 0, 0.08, -0.1);
    let t = tail;
    const segs = [];
    const n = o.tail ? 6 : 0;
    for (let i = 0; i < n; i++) {
      const sgm = node(t, 0, i ? -o.tail / n : 0, 0);
      const mat = o.rings && i % 2 ? o.rings : o.tailMat || o.mat;
      cyl(sgm, mat, 0.022, 0.026, o.tail / n, 0, -o.tail / n / 2, 0, 6);
      segs.push(sgm);
      t = sgm;
    }
    tail.rotation.x = o.tailUp ? 2.6 : 0.4;
    root.traverse((c) => (c.userData.animal = o.key));
    return { root, inner, body, head, arms, legs, tail, segs, o };
  }

  const SPECIES = {
    jaguar: () => ({ kind: 'quad', size: 1.25, mat: fur('jag', '#d8a24a', 'rosette'), muzzle: plain(0xf0e0c0) }),
    blackjag: () => ({ kind: 'quad', size: 1.25, mat: fur('bjag', '#22201e', 'rosette', '#0c0b0a') }),
    ocelot: () => ({ kind: 'quad', size: 0.75, mat: fur('oce', '#c89a5a', 'blotch', '#3a2410'), muzzle: plain(0xf0e6d0) }),
    margay: () => ({ kind: 'quad', size: 0.55, mat: fur('mar', '#b88a50', 'blotch', '#3a2410'), tail: 0.8, ear: 0.055 }),
    leopard: () => ({ kind: 'quad', size: 1.15, mat: fur('leo', '#e0b060', 'smallRosette'), muzzle: plain(0xf0e0c0) }),
    lion: (i) => ({ kind: 'quad', size: 1.45, mat: plain(0xc89a5a), muzzle: plain(0xe8d0a0), mane: i === 0 ? plain(0x6a4020) : null, tuft: plain(0x4a2a14), tail: 0.7 }),
    hyena: () => ({ kind: 'quad', size: 1.0, mat: fur('hye', '#b89a6a', 'spots', '#4a3420'), legF: 0.5, legH: 0.36, ear: 0.06, earTall: 1.1, tail: 0.3, muzzle: plain(0x5a4630) }),
    bear: () => ({ kind: 'quad', size: 1.5, mat: plain(0x1e1a18), thick: 1.8, wide: 1.25, legF: 0.36, legH: 0.36, tail: 0.08, ear: 0.045, muzzle: plain(0xd8c8a0), face: (h) => { for (const s of [-1, 1]) sph(h, plain(0xe8dcb8), 0.045, s * 0.07, 0.035, 0.12, 1.3, 0.8, 0.4); } }),
    temazate: () => ({ kind: 'quad', size: 0.95, mat: plain(0x9a4a28), muzzle: plain(0x6a3a20), legF: 0.55, legH: 0.55, neck: 0.18, ear: 0.07, earTall: 1.5, tail: 0.12, long: 0.85, antlers: true, snout: 1.4 }),
    agouti: () => ({ kind: 'quad', size: 0.5, mat: plain(0xc87a30), legF: 0.3, legH: 0.32, tail: 0.03, ear: 0.04, snout: 1.3 }),
    spider: () => ({ kind: 'prim', size: 1.1, mat: plain(0x3a2a1e), faceMat: plain(0x8a6a50), arm: 0.55, leg: 0.42, tail: 0.75, swing: true }),
    siamang: () => ({ kind: 'prim', size: 1.2, mat: plain(0x141414), faceMat: plain(0x2a2422), arm: 0.62, leg: 0.32, sac: plain(0x5a4a44), swing: true }),
    lemur: () => ({ kind: 'prim', size: 0.85, mat: plain(0x9a9690), chest: plain(0xe8e4dc), faceMat: plain(0xf0ece4), headMat: plain(0x3a3a3a), tail: 0.7, tailMat: plain(0xf2f0ea), rings: plain(0x1e1e1e), tailUp: true }),
    throat: () => ({ kind: 'prim', size: 0.85, mat: plain(0x1e1a16), chest: plain(0xf0e6d0), faceMat: plain(0xe8c8a8), tail: 0.5 }),
    tufted: () => ({ kind: 'prim', size: 0.85, mat: plain(0x6a4a2a), faceMat: plain(0xd8b890), tufts: plain(0x1e1610), headMat: plain(0x3a2a1a), tail: 0.5 }),
    whiteface: () => ({ kind: 'prim', size: 0.85, mat: plain(0x1a1816), chest: plain(0xf2ece0), headMat: plain(0xf2ece0), faceMat: plain(0xe8b8a0), tail: 0.5 }),
    macaque: () => ({ kind: 'prim', size: 1.0, mat: plain(0x6a4a30), faceMat: plain(0xd85040), tail: 0 }),
    tamarin: () => ({ kind: 'prim', size: 0.5, mat: plain(0x3a2a1a), chest: plain(0xf2ece0), crest: plain(0xfaf8f2), faceMat: plain(0x2a2a2a), tail: 0.4 }),
    patas: () => ({ kind: 'prim', size: 1.05, mat: plain(0xb8582a), chest: plain(0xece4d4), faceMat: plain(0x2a2a2a), tail: 0.55, ground: true }),
  };

  // Quadrupeds wander their enclosure, stop to look about, and lie down.
  function updateQuad(a, dt, t) {
    if (t > a.until) {
      const r = rand();
      if (r < 0.3) {
        a.mode = 'lie';
        a.until = t + 10 + rand() * 15;
      } else if (r < 0.55) {
        a.mode = 'look';
        a.until = t + 3 + rand() * 4;
      } else {
        a.mode = 'walk';
        a.until = t + 12;
        const b = a.bounds;
        // Big cats like to pace along the glass.
        const front = a.pacer && rand() < 0.5;
        a.target.set(lerp(b.x0, b.x1, rand()), 0, front ? b.z1 - 0.3 : lerp(b.z0, b.z1, rand()));
      }
    }
    let speed = 0;
    if (a.mode === 'walk') {
      const dx = a.target.x - a.pos.x;
      const dz = a.target.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) a.until = t;
      else {
        const diff = wrapAngle(Math.atan2(dx, dz) - a.heading);
        a.heading += clamp(diff, -dt * 1.8, dt * 1.8);
        speed = a.speed * Math.max(0, Math.cos(diff));
        a.pos.x += Math.sin(a.heading) * speed * dt;
        a.pos.z += Math.cos(a.heading) * speed * dt;
      }
    }
    const m = a.m;
    a.lie = damp(a.lie, a.mode === 'lie' ? 1 : 0, 3, dt);
    a.walk = damp(a.walk, speed > 0.02 ? 1 : 0, 6, dt);
    a.phase += speed * dt * 7 / (m.o.size || 1);
    const sw = Math.sin(a.phase) * 0.5 * a.walk;
    m.legs[0].rotation.x = sw - a.lie * 1.4;
    m.legs[3].rotation.x = sw + a.lie * 1.3;
    m.legs[1].rotation.x = -sw - a.lie * 1.4;
    m.legs[2].rotation.x = -sw + a.lie * 1.3;
    m.inner.position.y = -a.lie * Math.min(m.legF, m.legH) * 0.85 * (m.o.size || 1);
    m.head.rotation.y = a.mode === 'look' ? Math.sin(t * 0.8 + a.phase) * 0.6 : 0;
    m.head.rotation.x = a.lie * 0.25;
    m.tail.rotation.y = Math.sin(t * 1.5 + a.phase) * 0.35;
    a.m.root.position.set(a.pos.x, 0, a.pos.z);
    a.m.root.rotation.y = a.heading;
  }
  // Primates sit on perches and leap between them; swingers swing along ropes.
  function updatePrimate(a, dt, t) {
    const m = a.m;
    if (a.mode === 'sit' && t > a.until) {
      if (a.swing && a.ropes.length && rand() < 0.4) {
        const rp = a.ropes[Math.floor(rand() * a.ropes.length)];
        a.mode = 'swing';
        a.from.copy(rp[0]);
        a.to.copy(rp[1]);
        a.t0 = t;
        a.dur = a.from.distanceTo(a.to) / 0.9;
        a.swung = true;
      } else {
        a.mode = 'leap';
        a.from.copy(a.pos);
        a.to.copy(a.perches[Math.floor(rand() * a.perches.length)]);
        a.t0 = t;
        a.dur = 0.5 + a.from.distanceTo(a.to) * 0.18;
      }
    }
    let hang = 0;
    let leap = 0;
    if (a.mode === 'leap' || a.mode === 'swing') {
      const u = Math.min(1, (t - a.t0) / a.dur);
      a.pos.lerpVectors(a.from, a.to, u);
      if (a.mode === 'leap') {
        a.pos.y += Math.sin(Math.PI * u) * (0.4 + a.from.distanceTo(a.to) * 0.25);
        leap = 1;
      } else {
        hang = 1;
        a.pos.y += Math.sin(u * Math.PI * 6) * 0.08;
      }
      const dx = a.to.x - a.from.x;
      const dz = a.to.z - a.from.z;
      if (Math.hypot(dx, dz) > 0.05) a.heading = damp(a.heading, a.heading + wrapAngle(Math.atan2(dx, dz) - a.heading), 8, dt);
      if (u >= 1) {
        a.mode = 'sit';
        a.until = t + 2.5 + rand() * 6;
        if (a.swung && a.onSwing) a.onSwing();
        a.swung = false;
        if (hang) {
          a.from.copy(a.pos);
          a.to.copy(a.perches[Math.floor(rand() * a.perches.length)]);
          a.mode = 'leap';
          a.t0 = t;
          a.dur = 0.6 + a.from.distanceTo(a.to) * 0.18;
        }
      }
    }
    a.hang = damp(a.hang, hang, 8, dt);
    a.leap = damp(a.leap, leap, 10, dt);
    const sit = 1 - Math.max(a.hang, a.leap);
    const size = m.o.size || 1;
    m.arms.forEach((arm, i) => (arm.rotation.x = -0.3 * sit - 1.3 * a.leap + Math.PI * a.hang + (i ? 0.1 : -0.1) * Math.sin(t * 6) * a.hang));
    m.legs.forEach((leg, i) => (leg.rotation.x = -1.4 * sit + 0.6 * a.leap + Math.sin(t * 5 + i) * 0.2 * a.hang));
    m.body.rotation.x = 0.15 * sit + 0.5 * a.leap;
    m.head.rotation.y = sit * Math.sin(t * 0.9 + a.phase) * 0.7;
    m.tail.rotation.x = (m.o.tailUp ? 2.6 : 0.4) * sit + 1.2 * (1 - sit);
    m.segs.forEach((s, i) => (s.rotation.z = Math.sin(t * 1.2 + i + a.phase) * 0.12));
    // Hanging: the hands hold the rope, so the body hangs below it.
    const drop = a.hang * ((m.o.arm || 0.36) + 0.36) * size;
    a.m.root.position.set(a.pos.x, a.pos.y - drop, a.pos.z);
    a.m.root.rotation.y = a.heading;
  }

  // ---------- exhibits ----------
  const exhibits = [];
  const signTex = (e) => T.zooSign(e.es.toUpperCase().length > 16 ? e.es.toUpperCase().replace(' DE ', ' ') : e.es.toUpperCase(), `${e.en} · ${e.sci}`, e.emoji, { head: '#2f6a3a', ink: '#1f3a1f', sky: ['#dff0d0', '#f4f0d8'] });
  function signPost(parent, x, z, e) {
    const sg = node(parent, x, 0, z);
    for (const dx of [-0.42, 0.42]) box(sg, M.darkWood, 0.06, 1.0, 0.06, dx, 0.5, -0.02);
    const board = add(sg, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), std({ map: signTex(e), roughness: 0.7 })), 0, 1.18, 0.02);
    board.rotation.x = -0.2;
    box(sg, M.darkWood, 1.08, 0.83, 0.04, 0, 1.18, -0.01).rotation.x = -0.2;
    cast(sg);
    interact(sg, {
      label: () => 'Read the sign',
      act: () => {
        ctx.toast(`${e.es} (${e.en}). ${e.fact}`, 6500);
        ctx.complete('trSign');
      },
    });
  }
  function meshWall(parent, x0, z0, x1, z1, y0, y1) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.PlaneGeometry(len, y1 - y0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * (y1 - y0));
    const m = add(parent, new THREE.Mesh(geo, meshMat), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    noRay(m);
    return m;
  }
  function frame(parent, w, d, h, step = 2) {
    const posts = [];
    const pts = [];
    for (let x = -w / 2; x <= w / 2 + 0.01; x += w / Math.max(1, Math.round(w / step))) pts.push([x, d / 2], [x, -d / 2]);
    for (let z = -d / 2; z <= d / 2 + 0.01; z += d / Math.max(1, Math.round(d / step))) pts.push([-w / 2, z], [w / 2, z]);
    for (const [x, z] of pts) posts.push(new THREE.BoxGeometry(0.1, h, 0.1).translate(x, h / 2, z));
    for (const z of [-d / 2, d / 2]) posts.push(new THREE.BoxGeometry(w, 0.08, 0.08).translate(0, h, z));
    for (const x of [-w / 2, w / 2]) posts.push(new THREE.BoxGeometry(0.08, 0.08, d).translate(x, h, 0));
    const m = add(parent, new THREE.Mesh(mergeGeometries(posts), M.iron));
    cast(m);
    return m;
  }
  for (const e of EXHIBITS) {
    const yaw = YAW[e.side];
    const g = node(group, e.at[0], 0, e.at[1], yaw);
    const { w, d } = e;
    const toWorld = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(Y, yaw).add(new THREE.Vector3(e.at[0], 0, e.at[1]));
    const c0 = toWorld(-w / 2, -d / 2);
    const c1 = toWorld(w / 2, d / 2);
    colliders.push({ x0: Math.min(c0.x, c1.x), x1: Math.max(c0.x, c1.x), z0: Math.min(c0.z, c1.z), z1: Math.max(c0.z, c1.z), off: false });
    const ex = { e, g, toWorld, visit: toWorld(0, d / 2 + 1.6), visited: false, perches: [], ropes: [], animals: [] };
    exhibits.push(ex);
    const inside = flat(g, e.type === 'pool' ? M.sand : e.type === 'house' ? M.batRoom : M.grass, new THREE.PlaneGeometry(w - 0.1, d - 0.1), 0, 0.015, 0);
    inside.receiveShadow = true;
    if (e.type !== 'house') flat(g, M.dirt, new THREE.CircleGeometry(1, 20).scale(w * 0.3, d * 0.25, 1), -w * 0.1, 0.02, -d * 0.1);
    signPost(g, -w / 2 + 0.8, d / 2 + 0.45, e);
    const tall = e.type === 'cage' ? 5 : e.type === 'glass' ? 3.4 : e.type === 'yardTall' ? 3 : 2.2;

    if (e.type === 'glass' || e.type === 'pool') {
      // Low stone wall with glass on top along the front; mesh fence round the rest.
      const fh = e.type === 'pool' ? 1.0 : 0.7;
      cast(box(g, M.stone, w, fh, 0.35, 0, fh / 2, d / 2));
      const gl = add(g, new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), M.glass), 0, fh + 0.75, d / 2);
      noRay(gl);
      box(g, M.iron, w, 0.06, 0.08, 0, fh + 1.5, d / 2);
      for (const [x0, z0, x1, z1] of [[w / 2, d / 2, w / 2, -d / 2], [w / 2, -d / 2, -w / 2, -d / 2], [-w / 2, -d / 2, -w / 2, d / 2]]) meshWall(g, x0, z0, x1, z1, 0, tall);
      frame(g, w, d, tall);
      rocks(g, [[w * 0.3, -d * 0.3, 0.9], [-w * 0.32, -d * 0.25, 0.7], [w * 0.15, d * 0.15, 0.5]]);
    } else if (e.type === 'cage' || e.type === 'yardTall') {
      for (const [x0, z0, x1, z1] of [[-w / 2, d / 2, w / 2, d / 2], [w / 2, d / 2, w / 2, -d / 2], [w / 2, -d / 2, -w / 2, -d / 2], [-w / 2, -d / 2, -w / 2, d / 2]]) meshWall(g, x0, z0, x1, z1, 0, tall);
      if (e.type === 'cage') {
        const roof = add(g, new THREE.Mesh(new THREE.PlaneGeometry(w, d), meshMat), 0, tall, 0);
        roof.rotation.x = -Math.PI / 2;
        noRay(roof);
      }
      frame(g, w, d, tall);
      box(g, M.stone, w, 0.3, 0.12, 0, 0.15, d / 2);
    } else if (e.type === 'yard') {
      const rails = [];
      for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) rails.push(new THREE.BoxGeometry(0.1, 1.1, 0.1).translate(x, 0.55, d / 2));
      for (const y of [0.4, 0.95]) rails.push(new THREE.BoxGeometry(w, 0.07, 0.06).translate(0, y, d / 2));
      cast(add(g, new THREE.Mesh(mergeGeometries(rails), M.wood)));
      for (const [x0, z0, x1, z1] of [[w / 2, d / 2, w / 2, -d / 2], [w / 2, -d / 2, -w / 2, -d / 2], [-w / 2, -d / 2, -w / 2, d / 2]]) meshWall(g, x0, z0, x1, z1, 0, tall);
      frame(g, w, d, tall, 3);
      rocks(g, [[w * 0.3, -d * 0.3, 0.5]]);
    } else if (e.type === 'house') {
      // A dark little house with a big window, dimly lit red for the bats.
      const H = 3.2;
      for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2, w / 2, -d / 2 + 0.2], [-w / 2, -d / 2, -w / 2 + 0.2, d / 2], [w / 2 - 0.2, -d / 2, w / 2, d / 2]]) cast(box(g, M.house, x1 - x0, H, z1 - z0, (x0 + x1) / 2, H / 2, (z0 + z1) / 2));
      cast(box(g, M.house, w, 0.9, 0.2, 0, 0.45, d / 2 - 0.1));
      cast(box(g, M.house, w, 0.5, 0.2, 0, H - 0.25, d / 2 - 0.1));
      for (const s of [-1, 1]) cast(box(g, M.house, 0.8, H, 0.2, s * (w / 2 - 0.4), H / 2, d / 2 - 0.1));
      cast(box(g, M.roof, w + 0.6, 0.2, d + 0.6, 0, H + 0.1, 0));
      box(g, M.batRoom, w - 0.4, 0.05, d - 0.4, 0, H - 0.05, 0);
      for (const z of [-d / 2 + 0.25]) box(g, M.batRoom, w - 0.4, H, 0.02, 0, H / 2, z + 0.01);
      const win = add(g, new THREE.Mesh(new THREE.PlaneGeometry(w - 1.6, H - 1.4), M.darkGlass), 0, 0.9 + (H - 1.4) / 2, d / 2 - 0.1);
      win.userData.window = true;
      win.userData.keep = true;
      const redLight = new THREE.PointLight(0xff4a3a, 3, 6, 2);
      redLight.position.set(0, H - 0.5, 0);
      g.add(redLight);
      interact(win, {
        label: () => 'Peek into the bat house',
        act: () => {
          ctx.complete('trBats');
          ctx.toast('It’s dim and red in there so the bats think it’s night. Dozens hang upside down, and a few flit about!', 5200);
        },
      });
      for (let i = 0; i < 3; i++) cyl(g, M.darkWood, 0.03, 0.03, w - 0.6, 0, H - 0.25, -d / 2 + 0.7 + i * 0.9, 6).rotation.z = Math.PI / 2;
    }

    // Trees, platforms and ropes for the climbers.
    const bounds = { x0: -w / 2 + 0.8, x1: w / 2 - 0.8, z0: -d / 2 + 0.8, z1: d / 2 - 0.8 };
    if (e.type === 'cage' || e.type === 'yardTall') {
      const trH = e.type === 'cage' ? 4.2 : 2.8;
      const tl = jungleTree(g, -w * 0.25, -d * 0.2, trH, e.type === 'cage' ? 1 : 0.8);
      const tr = jungleTree(g, w * 0.28, -d * 0.1, trH * 0.85, 0.85);
      const local = (v) => v.clone().sub(new THREE.Vector3(e.at[0], 0, e.at[1])).applyAxisAngle(Y, -yaw);
      ex.perches.push(...tl.map(local), ...tr.map(local));
      for (const [px, pz, ph] of [[0, -d * 0.3, 1.6], [w * 0.15, d * 0.15, 0.9]]) {
        cast(box(g, M.wood, 1.0, 0.08, 0.8, px, ph, pz));
        for (const sx of [-0.4, 0.4]) cyl(g, M.darkWood, 0.04, 0.04, ph, px + sx, ph / 2, pz, 6);
        ex.perches.push(new THREE.Vector3(px - 0.2, ph + 0.04, pz), new THREE.Vector3(px + 0.25, ph + 0.04, pz));
      }
      for (let i = 0; i < 3; i++) ex.perches.push(new THREE.Vector3(lerp(bounds.x0, bounds.x1, rand()), 0, lerp(bounds.z0, bounds.z1, rand())));
      if (e.type === 'cage') {
        const a = new THREE.Vector3(-w * 0.25, 3.2, -d * 0.2);
        const b = new THREE.Vector3(w * 0.28, 2.9, -d * 0.1);
        const mid = new THREE.Vector3(0, 3.0, d * 0.2);
        for (const [p0, p1] of [[a, mid], [mid, b]]) {
          const len = p0.distanceTo(p1);
          const r = cyl(g, M.rope, 0.02, 0.02, len, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, 5);
          r.quaternion.setFromUnitVectors(Y, p1.clone().sub(p0).normalize());
          ex.ropes.push([p0.clone(), p1.clone()], [p1.clone(), p0.clone()]);
        }
      }
    } else if (e.type !== 'house') {
      jungleTree(g, -w * 0.32, -d * 0.32, 4.5, 1);
      if (e.type === 'glass') {
        // A log platform for the cats.
        const lg = cyl(g, M.bark, 0.25, 0.28, w * 0.4, w * 0.18, 0.5, -d * 0.15, 10);
        lg.rotation.z = Math.PI / 2;
        cast(lg);
      }
    }
    ex.bounds = bounds;
  }
  for (const ex of exhibits) bake(ex.g);
  api.exhibits = exhibits;

  // ---------- put the animals in ----------
  const exhibitOf = (key) => exhibits.find((x) => x.e.key === key);
  const COUNTS = { jaguar: 1, blackjag: 1, ocelot: 1, margay: 1, leopard: 1, lion: 2, hyena: 2, bear: 1, temazate: 2, agouti: 3, spider: 3, siamang: 2, lemur: 4, throat: 3, tufted: 3, whiteface: 3, macaque: 3, tamarin: 4, patas: 3 };
  for (const [key, n] of Object.entries(COUNTS)) {
    const ex = exhibitOf(key);
    for (let i = 0; i < n; i++) {
      const o = { ...SPECIES[key](i), key };
      const b = ex.bounds;
      if (o.kind === 'quad') {
        const m = makeQuad(o);
        m.root.userData.animal = key;
        bakeAnimal(m.root);
        ex.g.add(m.root);
        const a = { kind: 'quad', m, ex, bounds: b, pos: new THREE.Vector3(lerp(b.x0, b.x1, rand()), 0, lerp(b.z0, b.z1, rand())), target: new THREE.Vector3(), heading: rand() * 6, mode: 'look', until: rand() * 6, lie: 0, walk: 0, phase: rand() * 6, speed: 0.6 * (o.size || 1), pacer: ['jaguar', 'blackjag', 'leopard', 'lion', 'ocelot'].includes(key) };
        animals.push(a);
        ex.animals.push(a);
      } else {
        const m = makePrimate(o);
        m.root.userData.animal = key;
        bakeAnimal(m.root);
        ex.g.add(m.root);
        const perches = o.ground ? ex.perches.filter((p) => p.y < 1.8) : ex.perches;
        const start = perches[Math.floor(rand() * perches.length)];
        const a = { kind: 'prim', m, ex, perches, ropes: o.swing ? ex.ropes : [], swing: !!o.swing, pos: start.clone(), from: new THREE.Vector3(), to: new THREE.Vector3(), heading: rand() * 6, mode: 'sit', until: rand() * 5, hang: 0, leap: 0, phase: rand() * 6 };
        if (key === 'spider') a.onSwing = () => near(ex, 14) && ctx.complete('trSpider');
        animals.push(a);
        ex.animals.push(a);
      }
    }
  }
  const near = (ex, range) => {
    const p = ctx.player().pos;
    return Math.hypot(p.x - ex.visit.x, p.z - ex.visit.z) < range;
  };

  // The crocodile: basks on the sand, then slides into the water.
  const croc = (() => {
    const ex = exhibitOf('croc');
    const { w, d } = ex.e;
    flat(ex.g, std({ map: T.gravel(), color: 0x5a4a38, roughness: 1 }), new THREE.CircleGeometry(1, 32).scale(w * 0.38, d * 0.32, 1), 0, 0.02, -d * 0.12);
    const water = flat(ex.g, waterMat, new THREE.CircleGeometry(1, 32).scale(w * 0.36, d * 0.3, 1), 0, 0.05, -d * 0.12);
    water.receiveShadow = true;
    const skin = std({ color: 0x4a5a32, roughness: 0.8, flatShading: true });
    const belly = std({ color: 0x9a9a6a, roughness: 0.8 });
    const root = node(ex.g);
    const body = node(root);
    sph(body, skin, 0.3, 0, 0.2, 0, 1.2, 0.6, 2.6);
    sph(body, belly, 0.28, 0, 0.13, 0, 1.1, 0.4, 2.4);
    const head = node(body, 0, 0.2, 0.8);
    sph(head, skin, 0.17, 0, 0.02, 0.15, 1.1, 0.55, 1.6);
    const jaw = node(head, 0, -0.03, 0.05);
    sph(jaw, belly, 0.15, 0, -0.03, 0.22, 1, 0.35, 2.0);
    sph(head, skin, 0.1, 0, 0.02, 0.5, 0.9, 0.45, 2.2);
    for (const s of [-1, 1]) sph(head, std({ color: 0xc8b030, roughness: 0.3 }), 0.035, s * 0.09, 0.1, 0.1);
    let t = node(body, 0, 0.2, -0.75);
    const tailSegs = [];
    for (let i = 0; i < 4; i++) {
      const sg = node(t, 0, 0, i ? -0.35 : 0);
      sph(sg, skin, 0.22 - i * 0.045, 0, 0, -0.17, 0.9, 0.55, 1.7);
      for (let k = 0; k < 2; k++) cyl(sg, skin, 0.0, 0.04, 0.08, 0, 0.12 - i * 0.02, -0.1 - k * 0.15, 4);
      tailSegs.push(sg);
      t = sg;
    }
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = cyl(body, skin, 0.06, 0.05, 0.25, sx * 0.33, 0.1, sz * 0.45, 6);
      leg.rotation.z = sx * 1.1;
    }
    root.traverse((c) => (c.userData.animal = 'croc'));
    const bank = new THREE.Vector3(w * 0.25, 0.02, d * 0.3);
    const swim = new THREE.Vector3(-w * 0.1, -0.12, -d * 0.12);
    return { ex, root, body, head, jaw, tailSegs, bank, swim, pos: bank.clone(), heading: -0.6, mode: 'bask', until: 15, t0: 0 };
  })();
  function updateCroc(dt, t) {
    const c = croc;
    if (t > c.until) {
      c.mode = c.mode === 'bask' ? 'in' : c.mode === 'swim' ? 'out' : c.mode;
      c.t0 = t;
      c.until = t + 1e9;
    }
    if (c.mode === 'in' || c.mode === 'out') {
      const u = Math.min(1, (t - c.t0) / 4);
      const [a, b] = c.mode === 'in' ? [c.bank, c.swim] : [c.swim, c.bank];
      c.pos.lerpVectors(a, b, u);
      c.heading = Math.atan2(b.x - a.x, b.z - a.z);
      if (u >= 1) {
        c.mode = c.mode === 'in' ? 'swim' : 'bask';
        c.until = t + 15 + rand() * 15;
      }
    }
    if (c.mode === 'swim') c.heading += dt * 0.05;
    c.jaw.rotation.x = c.mode === 'bask' ? Math.max(0, Math.sin(t * 0.25)) * 0.6 : 0;
    c.tailSegs.forEach((s, i) => (s.rotation.y = Math.sin(t * (c.mode === 'bask' ? 0.3 : 2) + i) * (c.mode === 'bask' ? 0.05 : 0.25)));
    c.root.position.copy(c.pos);
    c.root.rotation.y = c.heading;
  }

  // The sloth: hangs upside down under a branch and creeps along it.
  const sloth = (() => {
    const ex = exhibitOf('sloth');
    const { w } = ex.e;
    const y = 2.9;
    const br = cyl(ex.g, M.bark, 0.07, 0.08, w - 1.2, 0, y, 0.4, 8);
    br.rotation.z = Math.PI / 2;
    cast(br);
    const furM = std({ color: 0x8a7458, roughness: 1 });
    const root = node(ex.g, 0, y, 0.4);
    sph(root, furM, 0.22, 0, -0.32, 0, 1, 0.8, 1.6);
    const head = sph(root, std({ color: 0xb8a080, roughness: 1 }), 0.11, 0, -0.33, 0.38);
    sph(root, std({ color: 0x3a2a1a, roughness: 1 }), 0.05, 0, -0.33, 0.47, 1.4, 0.6, 0.4);
    const limbs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const l = node(root, sx * 0.12, -0.28, sz * 0.25);
      cyl(l, furM, 0.035, 0.04, 0.3, 0, 0.14, 0, 6);
      limbs.push(l);
    }
    root.traverse((c) => (c.userData.animal = 'sloth'));
    return { root, head, limbs, x: 0, dir: 1, range: (w - 2) / 2 };
  })();
  function updateSloth(dt, t) {
    const s = sloth;
    s.x += s.dir * dt * 0.05;
    if (Math.abs(s.x) > s.range) s.dir *= -1;
    s.root.position.x = s.x;
    s.root.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    s.limbs.forEach((l, i) => (l.rotation.x = Math.sin(t * 0.6 + i * 1.6) * 0.25));
    s.head.rotation.y = Math.sin(t * 0.2) * 0.4;
  }

  // Bats: most hang from the rafters, a few flutter about.
  const bats = (() => {
    const ex = exhibitOf('bats');
    const { w, d } = ex.e;
    const batMat = std({ color: 0x2a201c, roughness: 0.9 });
    const wingGeo = new THREE.PlaneGeometry(0.22, 0.12).translate(0.11, 0, 0);
    const list = [];
    for (let i = 0; i < 22; i++) {
      const g = node(ex.g);
      sph(g, batMat, 0.05, 0, 0, 0, 0.8, 1.4, 0.8, 8);
      sph(g, batMat, 0.03, 0, -0.07, 0.01, 1, 1, 1, 8);
      const wl = add(g, new THREE.Mesh(wingGeo, std({ color: 0x3a2a24, roughness: 0.9, side: THREE.DoubleSide })), 0.03, 0, 0);
      const wr = add(g, new THREE.Mesh(wingGeo, wl.material), -0.03, 0, 0);
      wr.scale.x = -1;
      const flying = i < 5;
      const bar = i % 3;
      list.push({ g, wl, wr, flying, hx: lerp(-w / 2 + 0.6, w / 2 - 0.6, rand()), hz: -d / 2 + 0.7 + bar * 0.9, phase: rand() * 6, r: 0.8 + rand() * 1.2 });
    }
    return { list, H: 3.2, d };
  })();
  function updateBats(t) {
    for (const b of bats.list) {
      if (b.flying) {
        const a = t * (1.2 + b.r * 0.2) + b.phase;
        b.g.position.set(Math.cos(a) * b.r * 1.5, 1.6 + Math.sin(a * 2) * 0.4, Math.sin(a) * b.r * 0.6 - 0.2);
        b.g.rotation.set(0, -a, 0);
        const f = Math.sin(t * 25 + b.phase) * 1.0;
        b.wl.rotation.y = f;
        b.wr.rotation.y = -f;
      } else {
        b.g.position.set(b.hx, bats.H - 0.4, b.hz);
        b.g.rotation.set(Math.PI, 0, Math.sin(t * 0.8 + b.phase) * 0.08);
        b.wl.rotation.y = 1.3;
        b.wr.rotation.y = -1.3;
      }
    }
  }

  // ---------- the zoo map at the entrance ----------
  {
    const mapTex = canvasTex(1024, 768, (g, W, H) => {
      g.fillStyle = '#2e7a3c';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f4ecd8';
      g.font = 'bold 40px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('BOSQUE TROPICAL · TROPICAL FOREST', W / 2, 52);
      const sx = (x) => W / 2 + x * 12.5;
      const sz = (z) => 400 + z * 11.5;
      g.strokeStyle = '#f0f0e8';
      g.lineWidth = 22;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const line of PATHS) {
        g.beginPath();
        line.forEach(([x, z], i) => (i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))));
        g.stroke();
      }
      g.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      for (const e of EXHIBITS) {
        const x = sx(e.at[0]);
        const y = sz(e.at[1]);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x, y, 20, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#1f5a2a';
        g.lineWidth = 4;
        g.stroke();
        g.fillStyle = '#000';
        g.textBaseline = 'middle';
        g.fillText(e.emoji, x, y + 1);
        g.fillStyle = '#ffffff';
        g.font = 'bold 15px Arial, sans-serif';
        g.fillText(e.es, x, y + 32);
        g.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      }
      g.fillStyle = '#d9447a';
      g.beginPath();
      g.arc(sx(TROPICAL_SPAWN.x), sz(TROPICAL_SPAWN.z) - 30, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 18px Arial, sans-serif';
      g.fillText('Usted está aquí · You are here', sx(0) + 140, sz(TROPICAL_SPAWN.z) - 30);
    });
    mapTex.wrapS = mapTex.wrapT = THREE.ClampToEdgeWrapping;
    mapTex.repeat.set(1, 1);
    const mb = node(group, 2.4, 0, 24.3, -0.35);
    for (const s of [-1, 1]) box(mb, M.darkWood, 0.1, 2.2, 0.1, s * 1.05, 1.1, 0);
    const board = add(mb, new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), std({ map: mapTex, roughness: 0.7 })), 0, 1.45, 0.06);
    box(mb, M.darkWood, 2.12, 1.62, 0.05, 0, 1.45, 0.02);
    cast(mb);
    colliders.push({ x: 2.4, z: 24.3, r: 0.5, off: false });
    interact([board], {
      label: () => 'Look at the zoo map',
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(2.4 - Math.sin(-0.35) * -1.6, 1.5, 24.3 + Math.cos(-0.35) * 1.6), yaw: -0.35, pitch: 0 });
        ctx.complete('trMap');
        ctx.toast('The tropical forest: big cats along the north, monkeys all around, and the bats, sloth and crocodile on the west side.', 6000);
      },
    });
  }

  // ---------- the jungle all around ----------
  {
    const inExhibit = (x, z, pad) => colliders.some((c) => c.x0 !== undefined && x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
    const trees = [];
    for (let i = 0; i < 9000 && trees.length < 520; i++) {
      const x = -90 + rand() * 180;
      const z = -85 + rand() * 170;
      if (nearestOnPaths(x, z, tmpP) < HW + 1.4) continue;
      if (inExhibit(x, z, 1.2)) continue;
      if (trees.some((t) => Math.abs(t.x - x) < 3 && Math.abs(t.z - z) < 3)) continue;
      trees.push({ x, z, palm: rand() < 0.3, h: 7 + rand() * 7, s: 2.2 + rand() * 1.8 });
    }
    const broad = trees.filter((t) => !t.palm);
    const palms = trees.filter((t) => t.palm);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1, 1, 7).translate(0, 0.5, 0), M.bark, trees.length);
    const crowns = new THREE.InstancedMesh(mergeGeometries([new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(0.75, 1).translate(0.7, -0.25, 0.3), new THREE.IcosahedronGeometry(0.7, 1).translate(-0.6, -0.2, -0.4)]), M.leaf, broad.length);
    const fronds = new THREE.InstancedMesh(
      mergeGeometries(Array.from({ length: 8 }, (_, i) => new THREE.PlaneGeometry(0.5, 2.4).translate(0, 1.2, 0).rotateX(1.1).rotateY((i / 8) * Math.PI * 2))),
      M.leafDS,
      palms.length,
    );
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    trees.forEach((t, i) => trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.palm ? 0.18 : 0.3, t.h * (t.palm ? 1 : 0.7), t.palm ? 0.18 : 0.3))));
    broad.forEach((t, i) => {
      crowns.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h * 0.7 + t.s * 0.5, t.z), q.setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(t.s, t.s * 0.8, t.s)));
      crowns.setColorAt(i, c.setHSL(0.27 + rand() * 0.08, 0.6, 0.1 + rand() * 0.09));
    });
    palms.forEach((t, i) => {
      fronds.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h, t.z), q.setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(1.2, 1.2, 1.2)));
      fronds.setColorAt(i, c.setHSL(0.27 + rand() * 0.05, 0.55, 0.25 + rand() * 0.1));
    });
    group.add(trunks, crowns, fronds);
    cast(trunks, crowns, fronds);
    noRay(trunks, crowns, fronds);
    // Big leafy ferns along the paths.
    const ferns = [];
    for (let i = 0; i < 6000 && ferns.length < 700; i++) {
      const x = -40 + rand() * 80;
      const z = -34 + rand() * 66;
      const dd = nearestOnPaths(x, z, tmpP);
      if (dd < HW + 0.4 || dd > HW + 3.5 || inExhibit(x, z, 0.3)) continue;
      ferns.push([x, z, 0.7 + rand() * 0.8]);
    }
    const fernGeo = mergeGeometries(Array.from({ length: 7 }, (_, i) => new THREE.PlaneGeometry(0.22, 1.0).translate(0, 0.5, 0).rotateX(0.9 + (i % 2) * 0.3).rotateY((i / 7) * Math.PI * 2)));
    const fm = new THREE.InstancedMesh(fernGeo, M.leafDS, ferns.length);
    ferns.forEach(([x, z, s], i) => {
      fm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(Y, rand() * 6), new THREE.Vector3(s, s, s)));
      fm.setColorAt(i, c.setHSL(0.28 + rand() * 0.06, 0.6, 0.2 + rand() * 0.12));
    });
    group.add(fm);
    noRay(fm);
  }

  // ---------- per frame ----------
  let time = 0;
  let nextRoar = 20;
  let nextCall = 4;
  function update(dt) {
    time += dt;
    const t = time;
    const pp = ctx.player().pos;
    for (const ex of exhibits) {
      const show = Math.hypot(pp.x - ex.visit.x, pp.z - ex.visit.z) < 38;
      for (const a of ex.animals) a.m.root.visible = show;
    }
    for (const a of animals) if (a.m.root.visible) (a.kind === 'quad' ? updateQuad : updatePrimate)(a, dt, t);
    updateCroc(dt, t);
    updateSloth(dt, t);
    updateBats(t);
    waterTex.offset.set(t * 0.01, t * 0.008);
    const p = ctx.player().pos;
    for (const ex of exhibits) {
      if (ex.visited || Math.hypot(p.x - ex.visit.x, p.z - ex.visit.z) > 4) continue;
      ex.visited = true;
      const n = exhibits.filter((x) => x.visited).length;
      ctx.toast(`${ex.e.es} · ${ex.e.en}  (${n} of ${exhibits.length})`, 2600);
      const k = ex.e.key;
      if (k === 'blackjag') ctx.complete('trBlack');
      if (k === 'sloth') ctx.complete('trSloth');
      if (k === 'croc') ctx.complete('trCroc');
      if (k === 'bear') ctx.complete('trBear');
      if (n === exhibits.length) ctx.complete('trAll');
    }
    // The lion roars now and then; monkeys chatter.
    const lionEx = exhibitOf('lion');
    if (t > nextRoar) {
      nextRoar = t + 35 + rand() * 25;
      const d = Math.hypot(p.x - lionEx.visit.x, p.z - lionEx.visit.z);
      const v = Math.max(0, 1 - d / 45);
      if (v > 0.05) ctx.sound.roar(v);
      if (d < 16) {
        ctx.complete('trLion');
        ctx.toast('ROOOAAAR! The lion’s roar rumbles through the whole forest.', 3500);
      }
    }
    if (t > nextCall) {
      nextCall = t + 4 + rand() * 6;
      const ex = exhibits[Math.floor(rand() * exhibits.length)];
      if (['cage', 'yardTall'].includes(ex.e.type)) {
        const v = Math.max(0, 1 - Math.hypot(p.x - ex.visit.x, p.z - ex.visit.z) / 22);
        if (v > 0.05) (ex.e.key === 'siamang' ? ctx.sound.hoot(v) : ctx.sound.chatter(v * 0.7));
      }
    }
    api.state.calm = ctx.player().seat ? 1 : 0;
  }
  // You can also wait at the lion's glass for a roar.
  interact(exhibitOf('lion').g.children.filter((c) => c.isMesh && c.geometry.type === 'BoxGeometry').slice(0, 1), {
    label: () => 'Wait for the lion to roar',
    act: () => {
      nextRoar = time + 2;
      ctx.toast('You wait quietly by the glass…');
    },
  });

  return api;
}
