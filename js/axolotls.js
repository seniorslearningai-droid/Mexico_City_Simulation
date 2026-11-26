import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boardSign, grass, gravel, paving, rng } from './textures.js';
import { buildZooPress } from './zoo-press.js';

export const AXOLOTL_SPAWN = { x: -0.3, z: 14.55, yaw: -0.115, pitch: -0.045 };

function drawAxolotlStamp(g, ink) {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(side * 43, -4 + i * 12);
      g.quadraticCurveTo(side * (59 + 4 * i), -28 + 11 * i, side * (67 + i * 10), -45 + 21 * i);
      g.stroke();
    }
  }
  g.beginPath();
  g.ellipse(0, 4, 51, 32, 0, 0, Math.PI * 2);
  // Knock out the eyes and smile to let the copper show through.
  for (const x of [-22, 22]) {
    g.moveTo(x + 5.5, -2);
    g.arc(x, -2, 5.5, 0, Math.PI * 2);
  }
  g.moveTo(-15, 10);
  g.quadraticCurveTo(0, 29, 15, 10);
  g.quadraticCurveTo(0, 22, -15, 10);
  g.fill('evenodd');
}

export const AXOLOTL_COINS = [
  { name: 'Axolotl', es: 'Ajolote', stamp: drawAxolotlStamp, task: 'axCoin' },
];

export function buildAxolotls(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const random = rng(901);
  const mat = (color, properties = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...properties });
  const accent = mat(0x306d73);
  const plaster = mat(0xeee2ca);
  const paint = mat(0x25434f);
  const oak = mat(0x89624e);
  const tile = mat(0xa5acbf, { map: paving() });
  const meadow = mat(0x799260, { map: grass() });
  const path = mat(0xe7cda4, { map: gravel() });
  const tankSand = mat(0x908478);
  const tankStone = mat(0x586768);
  const tankBack = mat(0x143948, { emissive: 0x174565, emissiveIntensity: 0.65 });
  const plant = [mat(0x368d77), mat(0x609957), mat(0x3f746e)];
  const glass = mat(0x8cdbec, { transparent: true, opacity: 0.13, roughness: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const water = mat(0x51b6ca, { transparent: true, opacity: 0.24, roughness: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const fixture = new THREE.MeshBasicMaterial({ color: 0xe6f5ff });
  const trim = new THREE.MeshBasicMaterial({ color: 0x69bbc6 });
  const sphere = new THREE.SphereGeometry(1, 16, 11);
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);

  function place(parent, object, x, y, z) {
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  const node = (parent, x, y, z) => place(parent, new THREE.Group(), x, y, z);
  const mesh = (parent, geo, material, x, y, z) =>
    place(parent, new THREE.Mesh(geo, material), x, y, z);
  const box = (parent, material, w, h, d, x, y, z) =>
    mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const ellipsoid = (parent, material, x, y, z, sx, sy, sz, geo = sphere) => {
    const object = mesh(parent, geo, material, x, y, z);
    object.scale.set(sx, sy, sz);
    return object;
  };
  const block = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  function floor(material, width, depth, x, y, z) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width, uv.getY(i) * depth);
    mesh(group, geometry, material, x, y, z).rotation.x = -Math.PI / 2;
  }
  function sign(parent, title, subtitle, width, x, y, z, bg = '#244c55') {
    const map = boardSign(title, subtitle, { bg, fg: '#fff1d7', w: title.length > 17 ? 1480 : 1024 });
    return mesh(parent, new THREE.PlaneGeometry(width, width / 4),
      new THREE.MeshBasicMaterial({ map, toneMapped: false }), x, y, z);
  }
  const interact = (part, label, act) => { part.userData.interact = { label: () => label, act }; };

  floor(meadow, 85, 75, 0, -0.065, 6);
  floor(path, 17, 12, 0, -0.011, 12.5);
  floor(tile, 14.2, 20, 0, 0, -3.3);
  for (const side of [-1, 1]) {
    box(group, paint, 0.29, 3.9, 20.3, side * 7.14, 1.95, -3.33);
    box(group, plaster, 5.7, 3.9, 0.28, side * 4.28, 1.95, 6.76);
    box(group, accent, 5.75, 0.24, 0.33, side * 4.31, 0.12, 6.79);
    box(group, accent, 0.19, 3.54, 0.36, side * 6.9, 1.78, 6.87);
    box(group, accent, 4.44, 0.08, 0.037, side * 4.19, 0.42, 6.935);
    box(group, accent, 0.20, 3.16, 0.52, side * 1.48, 1.58, 6.77);
    block(side * 7.14 - 0.145, side * 7.14 + 0.145, -13.49, 6.82);
    block(side * 4.28 - 2.92, side * 4.28 + 2.92, 6.60, 6.91);
  }
  box(group, paint, 14.5, 3.9, 0.3, 0, 1.95, -13.45);
  block(-7.28, 7.28, -13.61, -13.30);
  box(group, paint, 14.65, 0.22, 20.7, 0, 4, -3.32);
  box(group, accent, 14.85, 0.28, 1.10, 0, 3.81, 7.04);
  box(group, paint, 3.17, 0.77, 0.38, 0, 3.5, 6.79);
  box(group, paint, 3.13, 0.78, 0.17, 0, 3.43, 7.54);
  sign(group, 'AJOLOTARIO', 'Axolotl Exhibit · Chapultepec', 3.05, 0, 3.43, 7.632);
  sign(group, 'AJOLOTE MEXICANO', 'Ambystoma mexicanum', 2.76, -4.36, 2.62, 6.932);
  const exit = sign(group, 'SALIDA', 'Exit to the plaza', 1.58, 0, 3.46, 6.57);
  exit.rotation.y = Math.PI;
  sign(group, 'AJOLOTE MEXICANO', 'Look for the feathery gills!', 3.7, 0, 3.12, -13.27);

  for (const x of [-3.2, 3.2]) {
    for (const z of [3.1, -1.6, -6.3, -11]) {
      box(group, oak, 3.0, 0.2, 0.23, x, 3.78, z);
      box(group, fixture, 2.8, 0.035, 0.13, x, 3.67, z);
    }
  }
  place(group, new THREE.HemisphereLight(0xcde8ff, 0xa08d9b, 2.0), 0, 10, 0);
  place(group, new THREE.DirectionalLight(0xffe7bb, 1.4), -7, 14, 12);

  for (const x of [-6.4, -4.1, 5.95]) {
    const pot = mesh(group, new THREE.CylinderGeometry(0.41, 0.32, 0.55, 10), accent, x, 0.275, 7.86);
    block(x - 0.41, x + 0.41, 7.45, 8.27);
    for (let j = 0; j < 8; j++) {
      const angle = j * 2.399;
      const leaf = ellipsoid(pot, plant[j % 3], Math.cos(angle) * 0.17, 0.49, Math.sin(angle) * 0.17,
        0.105, 0.46 + random() * 0.23, 0.035);
      leaf.rotation.z = Math.cos(angle) * 0.65;
      leaf.rotation.x = Math.sin(angle) * 0.65;
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 13; i++) {
      const x = side * (9.6 + random() * 8);
      const z = -10 + i * 2.3 + random();
      mesh(group, new THREE.CylinderGeometry(0.12, 0.29, 3.4, 7), oak, x, 1.7, z);
      ellipsoid(group, plant[i % 3], x, 3.6, z, 1.55, 1.75, 1.4, stoneGeo);
      ellipsoid(group, plant[(i + 1) % 3], x + 0.6, 4.25, z, 1.4, 1.17, 1.1, stoneGeo);
    }
  }

  const traits = [
    { name: 'Pink axolotl', es: 'Ajolote rosado', body: 0xffb7b9, gills: 0xb83062, fin: 0xf1839c, task: 'axPink' },
    { name: 'Wild-type axolotl', es: 'Ajolote silvestre', body: 0x81705c, gills: 0x84485a, fin: 0x6a6056, task: 'axWild' },
    { name: 'Golden axolotl', es: 'Ajolote dorado', body: 0xf0bb6e, gills: 0xd38157, fin: 0xdca25b },
  ];
  const skins = traits.map((trait) => ({
    body: mat(trait.body, { roughness: 0.46, emissive: trait.body, emissiveIntensity: 0.15 }),
    gills: mat(trait.gills, { emissive: trait.gills, emissiveIntensity: 0.22 }),
    fin: mat(trait.fin, { roughness: 0.42 }),
  }));
  const eye = mat(0x211b2a, { roughness: 0.29 });
  const highlight = new THREE.MeshBasicMaterial({ color: 0xfff5e8 });
  const finOutline = new THREE.Shape();
  finOutline.moveTo(0, 0.11);
  finOutline.quadraticCurveTo(-0.09, -0.56, 0, -0.8);
  finOutline.quadraticCurveTo(0.13, -0.48, 0.10, 0.11);
  const finGeo = new THREE.ShapeGeometry(finOutline).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  const animals = [];
  function tube(parent, material, points, width, steps = 6) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return mesh(parent, new THREE.TubeGeometry(curve, steps, width, 4, false), material, 0, 0, 0);
  }
  // Merge each rigid part by material while keeping its animated joints separate.
  function batchRigidParts(joint) {
    const byMaterial = new Map();
    for (const part of joint.children) {
      if (!part.isMesh) continue;
      if (!byMaterial.has(part.material)) byMaterial.set(part.material, []);
      byMaterial.get(part.material).push(part);
    }
    for (const [material, parts] of byMaterial) {
      if (parts.length < 2) continue;
      const pieces = parts.map((part) => {
        part.updateMatrix();
        return part.geometry.clone().applyMatrix4(part.matrix);
      });
      const geometry = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      joint.remove(...parts);
      mesh(joint, geometry, material, 0, 0, 0);
    }
  }
  function makeAxolotl(parent, variety, phase, height, size) {
    const skin = skins[variety];
    const root = node(parent, 0, height, 0);
    root.scale.setScalar(size);
    ellipsoid(root, skin.body, 0, 0, -0.05, 0.135, 0.11, 0.37);
    ellipsoid(root, skin.body, 0, 0.012, 0.27, 0.196, 0.099, 0.18);
    const tail = node(root, 0, 0, -0.27);
    ellipsoid(tail, skin.body, 0, -0.003, -0.29, 0.068, 0.077, 0.37);
    ellipsoid(tail, skin.fin, 0, 0.021, -0.52, 0.025, 0.11, 0.27);
    const crest = mesh(tail, finGeo, skin.fin, 0, 0.055, -0.02);
    crest.material.side = THREE.DoubleSide;
    const limbs = [];
    const gillFans = [];
    for (const side of [-1, 1]) {
      ellipsoid(root, eye, side * 0.117, 0.061, 0.399, 0.018, 0.018, 0.015);
      ellipsoid(root, highlight, side * 0.117 + 0.005, 0.068, 0.409, 0.005, 0.005, 0.004);
      const fan = node(root, side * 0.16, 0.023, 0.205);
      gillFans.push(fan);
      for (let i = 0; i < 3; i++) {
        const high = (2 - i) * 0.095 + 0.048;
        const spread = 0.15 + i * 0.043;
        tube(fan, skin.gills, [[0, 0, 0], [side * spread * 0.65, high * 0.52, -0.048], [side * spread, high, -0.06]], 0.018);
        for (let j = 1; j < 5; j++) {
          const q = j / 5;
          ellipsoid(fan, skin.gills, side * spread * q + side * 0.011, high * q + 0.026, -0.056 - 0.015 * q,
            0.018, 0.044, 0.015).rotation.z = -side * 0.55;
        }
      }
      for (const z of [0.07, -0.23]) {
        const limb = node(root, side * 0.098, -0.039, z);
        const tip = side * 0.16;
        tube(limb, skin.body, [[0, 0, 0], [side * 0.10, -0.075, -0.065], [tip, -0.101, -0.008]], 0.026);
        for (let toe = 0; toe < 3; toe++) {
          const spread = toe * 0.023;
          tube(limb, skin.body, [[tip, -0.101, -0.008], [tip + side * 0.028, -0.107, spread], [tip + side * 0.049, -0.106, spread + 0.022]], 0.007, 3);
        }
        limbs.push(limb);
      }
    }
    for (const joint of [root, tail, ...gillFans, ...limbs]) batchRigidParts(joint);
    animals.push({ root, tail, gillFans, limbs, phase, height });
  }

  const tanks = [];
  function tank(x, z, yaw, variety, display = false) {
    const stand = node(group, x, 0, z);
    stand.rotation.y = yaw;
    const width = display ? 4.75 : 2.75;
    const depth = 2.04;
    const trait = traits[variety];
    box(stand, paint, width + 0.14, 0.88, depth + 0.13, 0, 0.44, 0);
    box(stand, tankSand, width, 0.12, depth, 0, 0.91, 0);
    box(stand, tankBack, width, 1.20, 0.08, 0, 1.53, -depth / 2);
    const front = mesh(stand, new THREE.PlaneGeometry(width, 1.17), glass, 0, 1.53, depth / 2);
    front.raycast = () => {};
    mesh(stand, new THREE.PlaneGeometry(width, depth), water, 0, 1.98, 0).rotation.x = -Math.PI / 2;
    for (const side of [-1, 1]) {
      const end = mesh(stand, new THREE.PlaneGeometry(depth, 1.17), glass, side * width / 2, 1.53, 0);
      end.rotation.y = Math.PI / 2;
      box(stand, paint, 0.065, 1.23, 0.07, side * width / 2, 1.53, depth / 2);
    }
    box(stand, accent, width + 0.12, 0.14, depth + 0.12, 0, 2.13, 0);
    box(stand, trim, width, 0.028, 0.05, 0, 2.044, depth / 2);
    for (const side of [-1, 1]) {
      const stone = ellipsoid(stand, tankStone, side * width * 0.34, 1.04, -0.36, 0.31, 0.16, 0.26, stoneGeo);
      stone.rotation.y = side * 0.7;
      for (let i = 0; i < 7; i++) {
        const leaf = ellipsoid(stand, plant[i % 3], side * width * 0.36 + (random() - 0.5) * 0.32,
          1.13, -0.51 + random() * 0.22, 0.041, 0.16 + random() * 0.22, 0.024);
        leaf.rotation.z = (random() - 0.5) * 1.6;
      }
    }
    const label = sign(stand, display ? 'Ajolote mexicano' : trait.es, display ? 'Axolotl display tank' : trait.name, 1.25, 0, 0.71, depth / 2 + 0.074);
    interact(label, 'Read about axolotls', () => {
      ctx.toast('The feathery branches beside an axolotl’s head are external gills. Look for three on each side.', 6500);
      ctx.complete('axSign');
    });
    const count = display ? 3 : 2;
    for (let i = 0; i < count; i++) {
      makeAxolotl(stand, display ? i : variety, random() * 8, 1.16 + i * 0.23, 0.91 + random() * 0.12);
    }
    if (display) {
      block(x - width / 2 - 0.07, x + width / 2 + 0.07, z - depth / 2 - 0.07, z + depth / 2 + 0.07);
      const photo = sign(stand, 'FOTO', 'Take an axolotl photo', 1.25, width * 0.33, 0.71, depth / 2 + 0.075, '#7d425d');
      interact(photo, 'Take an axolotl photo', () => ctx.sit({
        eye: new THREE.Vector3(x, 1.58, z + 2.45), yaw: 0, pitch: -0.045,
        photo: true, task: 'axPhoto', caption: 'Ajolotes · Chapultepec',
      }));
    } else {
      block(x - depth / 2 - 0.08, x + depth / 2 + 0.08, z - width / 2 - 0.08, z + width / 2 + 0.08);
      if (trait.task) tanks.push({ stand, task: trait.task, title: trait.name });
    }
  }
  for (let i = 0; i < 4; i++) {
    const z = 3.6 - i * 3.55;
    tank(-5.65, z, Math.PI / 2, i % traits.length);
    tank(5.65, z, -Math.PI / 2, (i + 1) % traits.length);
  }
  tank(0, -11.72, 0, 0, true);

  const press = buildZooPress(group, ctx, AXOLOTL_COINS, 0x794461);
  press.machine.position.set(4.4, 0, 9.45);
  press.machine.rotation.y = -0.32;
  box(group, accent, 2.26, 0.13, 1.56, 4.4, 0.005, 9.24);
  for (const x of [3.38, 5.42]) box(group, paint, 0.07, 2.65, 0.09, x, 1.325, 9.4);
  sign(group, 'MONEDA DE AJOLOTE', 'Axolotl pressed coin', 2.18, 4.40, 2.65, 9.46, '#713d58');
  block(3.71, 5.11, 8.73, 9.67);

  let elapsed = 0;
  const state = { water: 0, calm: 0 };
  const spotted = new Set();
  const cameraForward = new THREE.Vector3();
  const towardTank = new THREE.Vector3();
  function update(dt) {
    elapsed += dt;
    press.update(elapsed);
    for (const animal of animals) {
      const { root, tail, gillFans, limbs, phase, height } = animal;
      const drift = elapsed * 0.42 + phase;
      const stroke = elapsed * 4 + phase;
      root.position.set(Math.sin(drift) * 0.56, height + 0.065 * Math.sin(drift * 1.7), Math.cos(drift) * 0.38);
      root.rotation.y = Math.atan2(0.56 * Math.cos(drift), -0.38 * Math.sin(drift));
      tail.rotation.y = Math.sin(stroke) * 0.46;
      gillFans.forEach((fan, index) => { fan.rotation.z = Math.sin(stroke * 0.56 + index) * 0.10; });
      limbs.forEach((limb, index) => { limb.rotation.y = Math.sin(stroke + index * 1.6) * 0.23; });
    }
    const player = ctx.player();
    const inside = player.pos.z < 6.5 && Math.abs(player.pos.x) < 7;
    state.water = inside ? 0.24 : 0;
    state.calm = inside ? 0 : 0.2;
    if (!inside) return;
    if (!spotted.has('axEnter')) {
      spotted.add('axEnter');
      ctx.complete('axEnter');
    }

    ctx.camera.getWorldDirection(cameraForward);
    for (const { stand, task, title } of tanks) {
      if (spotted.has(task)) continue;
      towardTank.copy(stand.position);
      towardTank.y = 1.53;
      towardTank.sub(ctx.camera.position);
      const aisleSide = Math.sign(stand.position.x) * ctx.camera.position.x < Math.abs(stand.position.x);
      if (aisleSide && towardTank.lengthSq() < 13 && cameraForward.dot(towardTank.normalize()) > 0.90) {
        spotted.add(task);
        ctx.toast(`You spotted a ${title.toLowerCase()}!`);
        ctx.complete(task);
      }
    }
  }

  return {
    group, colliders, state, update, floorAt: () => 0,
    limit(position, radius) {
      position.x = THREE.MathUtils.clamp(position.x, -8.25 + radius, 8.25 - radius);
      position.z = THREE.MathUtils.clamp(position.z, -13.1 + radius, 18 - radius);
    },
  };
}
