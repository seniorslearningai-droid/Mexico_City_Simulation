import * as THREE from 'three';
import { buildCoastalPress } from './coastal-press.js';
import { boardSign, grass, gravel, rng, waterNormals, woodGrain } from './textures.js';

export const COASTAL_SPAWN = { x: 0, z: 9, yaw: 0.16, pitch: -0.05 };

export function buildCoastal(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const random = rng(434);
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...options });
  const coast = {
    grass: material(0x6c8660, { map: grass() }),
    sand: material(0xd5c6a0, { map: gravel() }),
    path: material(0xe4d4b5, { map: gravel() }),
    rock: [material(0x878582), material(0x92968d), material(0x6c7474)],
    tile: material(0x237583, { roughness: 0.45 }),
    concrete: material(0xd5cab0),
    metal: material(0x244953, { metalness: 0.3 }),
    wood: material(0x96704b, { map: woodGrain() }),
    bark: material(0x594539),
    leaf: [material(0x385440), material(0x506c40), material(0x677f46)],
    glass: material(0xa8deeb, { transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.25 }),
  };
  const ellipsoid = new THREE.SphereGeometry(1, 18, 12);
  const boulder = new THREE.DodecahedronGeometry(1, 0);
  const normals = waterNormals();
  const water = material(0x419daf, {
    roughness: 0.24, metalness: 0.12, normalMap: normals, normalScale: new THREE.Vector2(0.48, 0.48),
  });

  function add(parent, object, x, y, z) {
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  const node = (parent, x, y, z) => add(parent, new THREE.Group(), x, y, z);
  const mesh = (parent, geometry, surface, x, y, z) =>
    add(parent, new THREE.Mesh(geometry, surface), x, y, z);
  const box = (parent, surface, w, h, d, x, y, z) =>
    mesh(parent, new THREE.BoxGeometry(w, h, d), surface, x, y, z);
  function shape(parent, geometry, surface, x, y, z, sx, sy, sz) {
    const object = mesh(parent, geometry, surface, x, y, z);
    object.scale.set(sx, sy, sz);
    return object;
  }
  const oval = (parent, surface, x, y, z, sx, sy, sz) =>
    shape(parent, ellipsoid, surface, x, y, z, sx, sy, sz);
  function ground(surface, w, d, x, y, z) {
    const geometry = new THREE.PlaneGeometry(w, d);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    const slab = mesh(group, geometry, surface, x, y, z);
    slab.rotation.x = -Math.PI / 2;
  }
  const block = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  function interact(object, label, act) {
    object.userData.interact = { label: () => label, act };
  }
  function rock(x, y, z, sx, sy, sz) {
    const stone = shape(group, boulder, coast.rock[Math.floor(random() * 3)], x, y, z, sx, sy, sz);
    stone.rotation.set(random() * 0.3, random() * Math.PI, random() * 0.28);
    stone.userData.cast = true;
    return stone;
  }
  function sign(parent, title, subtitle, width, x, y, z, color = '#174f63') {
    const map = boardSign(title, subtitle, { bg: color, fg: '#fff0c9', w: title.length > 17 ? 1536 : 1024 });
    return mesh(parent, new THREE.PlaneGeometry(width, width / 4),
      new THREE.MeshBasicMaterial({ map, toneMapped: false }), x, y, z);
  }

  add(group, new THREE.HemisphereLight(0xe0f5ff, 0xb9a078, 2.15), 0, 15, 0);
  const sun = add(group, new THREE.DirectionalLight(0xffe5b6, 2.65), -10, 26, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 20, bottom: -21, near: 0.5, far: 70 });
  sun.shadow.normalBias = 0.035;
  sun.shadow.autoUpdate = false;

  ground(coast.grass, 94, 94, 0, -0.07, 0);
  ground(coast.path, 32, 15.1, 0, -0.005, 6.5);
  ground(coast.path, 5.4, 5.5, 0, -0.008, 16.2);
  ground(coast.sand, 31, 12, 0, -0.049, -6.5);
  for (const x of [-15.9, 15.9]) {
    box(group, coast.concrete, 0.22, 0.21, 15, x, 0.075, 6.5);
    block(x - 0.14, x + 0.14, -1, 14.14);
  }
  for (const x of [-9.35, 9.35]) {
    box(group, coast.concrete, 13.1, 0.21, 0.23, x, 0.075, 14.10);
    block(x - 6.55, x + 6.55, 13.98, 14.23);
  }

  function habitat(x, width, title, subtitle) {
    const front = -1.15;
    block(x - width / 2, x + width / 2, -12.2, front + 0.13);

    const basin = mesh(group, new THREE.CircleGeometry(1, 60), water, x, 0.16, -5.15);
    basin.rotation.x = -Math.PI / 2;
    basin.scale.set(width * 0.475, 4.08, 1);
    const shelf = oval(group, coast.sand, x, 0.09, -9.55, width * 0.43, 0.45, 2.52);
    shelf.userData.cast = true;
    for (let i = 0; i < 14; i++) {
      const px = x - width / 2 + 0.45 + i * (width - 0.9) / 13;
      rock(px, 0.45, -11.3 + random() * 0.65, 0.7 + random() * 0.8, 0.7 + random() * 1.75, 0.7 + random() * 1.1);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        rock(x + side * (width / 2 - 0.25), 0.32, -2.4 - i * 1.74,
          0.58 + random() * 0.42, 0.55 + random() * 0.58, 0.76 + random() * 0.37);
      }
    }

    box(group, coast.concrete, width, 0.45, 0.38, x, 0.21, front);
    box(group, coast.tile, width, 0.12, 0.39, x, 0.45, front);
    box(group, coast.metal, width, 0.045, 0.07, x, 1.45, front);
    for (let i = 0; i <= 6; i++) {
      const px = x + (i / 6 - 0.5) * width;
      box(group, coast.metal, 0.054, 1.03, 0.08, px, 0.96, front);
      if (i === 6) break;
      mesh(group, new THREE.PlaneGeometry(width / 6 - 0.045, 0.94), coast.glass, px + width / 12, 0.95, front);
    }
    for (const px of [-1.55, 1.55]) {
      const pole = box(group, coast.metal, 0.1, 3.25, 0.1, x + px, 1.62, -1.2);
      pole.userData.cast = true;
    }
    box(group, coast.tile, 3.52, 0.88, 0.14, x, 2.85, -1.16);
    sign(group, title, subtitle, 3.38, x, 2.86, -1.079);
  }

  habitat(-7.65, 13.9, 'Pingüino de Humboldt', 'Humboldt penguin');
  habitat(7.65, 13.9, 'Lobo marino de California', 'California sea lion');
  const penguinIslands = [
    [-9.1, 0.2, -2.55, 2.4, 0.49, 1.25],
    [-5.25, 0.16, -4.45, 1.48, 0.44, 0.99],
    [-10.9, 0.08, -6.72, 1.48, 0.43, 1.17],
  ];
  for (const size of penguinIslands) oval(group, coast.rock[0], ...size);
  oval(group, coast.rock[1], 8.1, 0.14, -3.25, 2.78, 0.62, 1.45);
  oval(group, coast.rock[0], 5.85, 0.06, -7.7, 1.54, 0.60, 1.29);

  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? 1 : -1;
    const x = i < 24 ? (random() - 0.5) * 46 : side * (17 + random() * 10);
    const z = i < 24 ? -13 - random() * 11 : -13 + random() * 29;
    const h = 2 + random() * 5.1;
    const trunk = mesh(group, new THREE.CylinderGeometry(0.09, 0.23, h, 7), coast.bark, x, h / 2, z);
    trunk.userData.cast = i < 38;
    for (let j = 0; j < 3; j++) {
      const crown = shape(group, boulder, coast.leaf[j], x + (j - 1) * 0.7,
        h * (0.86 + j * 0.11), z + (j % 2 - 0.5) * 0.9, h * 0.31, h * 0.29, h * 0.32);
      crown.rotation.y = random() * 6.28;
      crown.userData.cast = i < 38;
    }
  }

  box(group, coast.concrete, 5.6, 0.20, 0.44, 0, 3.04, 10.3).userData.cast = true;
  for (const x of [-2.72, 2.72]) box(group, coast.tile, 0.27, 3, 0.29, x, 1.5, 10.3).userData.cast = true;
  const arch = sign(group, 'FRANJA COSTERA', 'Coastal Zone · Chapultepec', 5.0, 0, 3.02, 10.54);
  const back = new THREE.Mesh(arch.geometry, arch.material);
  back.rotation.y = Math.PI;
  add(group, back, 0, 3.02, 10.05);
  block(-2.89, -2.55, 10.13, 10.47);
  block(2.55, 2.89, 10.13, 10.47);

  const penguin = {
    black: material(0x1d252b),
    white: material(0xf3eee1),
    pink: material(0xcd928a),
    feet: material(0x474143),
    eyes: material(0x101317, { roughness: 0.24 }),
  };
  function makePenguin(x, y, z, size, heading, swimming = false) {
    const root = node(group, x, y, z);
    const body = node(root, 0, 0, 0);
    oval(body, penguin.black, 0, 0.44, 0, 0.19, 0.34, 0.16);
    oval(body, penguin.white, 0, 0.43, 0.088, 0.145, 0.26, 0.103);
    oval(body, penguin.black, 0, 0.56, 0.163, 0.141, 0.049, 0.038);
    for (const offset of [-0.051, 0.018, 0.068]) {
      oval(body, penguin.black, offset, 0.34 + Math.abs(offset) * 0.9, 0.183, 0.013, 0.013, 0.01);
    }
    const head = node(body, 0, 0.73, 0.016);
    oval(head, penguin.black, 0, 0, 0, 0.139, 0.142, 0.133);
    oval(head, penguin.white, 0, -0.079, 0.067, 0.113, 0.064, 0.073);
    const wings = [];
    const feet = [];
    for (const side of [-1, 1]) {
      oval(head, penguin.white, side * 0.098, 0.014, 0.077, 0.033, 0.101, 0.026).rotation.z = -side * 0.28;
      oval(head, penguin.pink, side * 0.083, 0.016, 0.111, 0.038, 0.048, 0.021);
      oval(head, penguin.eyes, side * 0.084, 0.032, 0.13, 0.012, 0.012, 0.009);
      const wing = node(body, side * 0.164, 0.59, -0.035);
      oval(wing, penguin.black, side * 0.052, -0.142, -0.016, 0.044, 0.19, 0.058);
      wings.push(wing);
      feet.push(oval(body, penguin.feet, side * 0.08, 0.039, 0.092, 0.062, 0.036, 0.101));
    }
    const beak = mesh(head, new THREE.ConeGeometry(0.047, 0.14, 8), penguin.feet, 0, -0.041, 0.16);
    beak.rotation.x = Math.PI / 2;
    root.scale.setScalar(size);
    const phase = random() * 12;
    return { root, body, head, wings, feet, x, y, z, heading, phase, swimming };
  }
  const birds = [
    makePenguin(-9.95, 0.64, -2.6, 1.03, 0.13),
    makePenguin(-8.4, 0.66, -2.5, 0.89, -0.44),
    makePenguin(-8.95, 0.66, -2.93, 0.93, 0.7),
    makePenguin(-5.38, 0.53, -4.59, 1, -0.34),
    makePenguin(-10.86, 0.43, -6.65, 0.9, 0.28),
    makePenguin(-6.1, 0.12, -5.8, 0.93, 0, true),
    makePenguin(-7.35, 0.12, -5.85, 0.84, 0, true),
  ];

  const lion = {
    coat: material(0x594139, { roughness: 0.48 }),
    chest: material(0x876750),
    muzzle: material(0xa78b72),
    dark: material(0x251e1d),
    whisker: material(0xc2ac92),
  };
  function makeSeaLion(x, y, z, scale, heading, swimming = false) {
    const root = node(group, x, y, z);
    oval(root, lion.coat, 0, 0.26, -0.13, 0.38, 0.34, 0.81);
    oval(root, lion.coat, 0, 0.16, -0.79, 0.25, 0.22, 0.47);
    const neck = node(root, 0, 0.41, 0.29);
    oval(neck, lion.chest, 0, 0.21, 0.12, 0.29, 0.46, 0.35).rotation.x = 0.34;
    oval(neck, lion.coat, 0, 0.51, 0.24, 0.22, 0.245, 0.24);
    oval(neck, lion.muzzle, 0, 0.45, 0.448, 0.161, 0.102, 0.126);
    oval(neck, lion.dark, 0, 0.492, 0.548, 0.071, 0.045, 0.037);
    const flippers = [];
    for (const side of [-1, 1]) {
      oval(neck, lion.dark, side * 0.159, 0.558, 0.393, 0.024, 0.021, 0.019);
      oval(neck, lion.coat, side * 0.193, 0.44, 0.183, 0.045, 0.081, 0.035).rotation.z = -side * 0.4;
      for (let i = 0; i < 3; i++) {
        const whisker = box(neck, lion.whisker, 0.14, 0.006, 0.006, side * 0.166, 0.45 - i * 0.015, 0.519 - i * 0.016);
        whisker.rotation.z = side * (0.12 - i * 0.18);
      }
      const flipper = node(root, side * 0.27, 0.2, 0.19);
      oval(flipper, lion.coat, side * 0.13, -0.095, -0.1, 0.14, 0.072, 0.38).rotation.y = -side * 0.55;
      oval(root, lion.coat, side * 0.115, 0.07, -1.14, 0.142, 0.055, 0.27).rotation.y = -side * 0.49;
      flippers.push(flipper);
    }
    root.scale.setScalar(scale);
    return { root, neck, flippers, x, y, z, heading, swimming, phase: random() * 9 };
  }
  const seaLions = [
    makeSeaLion(8.2, 0.72, -3.12, 1.13, 0.29),
    makeSeaLion(9.48, 0.61, -3.33, 0.9, -0.88),
    makeSeaLion(7.4, 0.13, -5.55, 1.03, 0, true),
    makeSeaLion(5.75, 0.61, -7.68, 0.81, 0.53),
  ];

  function infoPost(x, title, subtitle, fact) {
    const stand = node(group, x, 0, 0.48);
    box(stand, coast.metal, 0.093, 1.22, 0.13, 0, 0.61, 0);
    const mount = box(stand, coast.concrete, 1.42, 0.39, 0.07, 0, 1.22, 0.047);
    const board = sign(stand, title, subtitle, 1.38, 0, 1.22, 0.089);
    const read = () => {
      ctx.toast(fact, 7400);
      ctx.complete('coastSign');
    };
    interact(mount, 'Read the animal sign', read);
    interact(board, 'Read the animal sign', read);
    block(x - 0.14, x + 0.14, 0.33, 0.63);
  }
  infoPost(-12.2, 'Pingüino de Humboldt', 'Read about the penguins',
    'Humboldt penguins live along the Pacific coast of Peru and Chile. Their flippers propel them through the cold waters of the Humboldt Current.');
  infoPost(12.2, 'Lobo marino de California', 'Read about the sea lions',
    'Listen for a bark and look for little ear flaps. California sea lions can rotate their rear flippers underneath their bodies to walk on land.');

  const bench = node(group, -6.25, 0, 5.25);
  box(bench, coast.metal, 0.1, 0.48, 0.44, -0.8, 0.24, 0);
  box(bench, coast.metal, 0.1, 0.48, 0.44, 0.8, 0.24, 0);
  const seat = box(bench, coast.wood, 1.94, 0.105, 0.51, 0, 0.49, 0);
  const backrest = box(bench, coast.wood, 1.94, 0.34, 0.08, 0, 0.78, 0.23);
  const sit = () => {
    ctx.sit({ eye: new THREE.Vector3(-6.25, 1.21, 5.18), yaw: 0.18, pitch: -0.06, calm: true });
    ctx.complete('coastBench');
  };
  interact(seat, 'Sit and watch the pools', sit);
  interact(backrest, 'Sit and watch the pools', sit);
  block(-7.25, -5.25, 4.97, 5.55);

  box(group, coast.tile, 0.09, 1.42, 0.09, -4.0, 0.71, 2.55);
  const photo = sign(group, 'FOTO', 'Penguin lookout', 1.08, -4.0, 1.36, 2.61, '#9c3f56');
  interact(photo, 'Take a photo of the penguins', () => {
    ctx.sit({
      eye: new THREE.Vector3(-7.58, 1.65, 1.15), yaw: 0.14, pitch: -0.16,
      photo: true, task: 'coastPhoto', caption: 'Humboldt penguins · Chapultepec',
    });
  });
  block(-4.12, -3.88, 2.43, 2.67);

  const press = buildCoastalPress(group, ctx);
  press.machine.position.set(4.55, 0, 4.6);
  press.machine.rotation.y = -0.22;
  box(group, coast.concrete, 2.55, 0.09, 1.62, 4.55, 0.025, 4.6);
  block(3.86, 5.29, 3.93, 4.72);

  const state = { water: 0, calm: 0 };
  let elapsed = 0;
  const seen = new Set();
  const view = new THREE.Vector3();
  const direction = new THREE.Vector3();
  function observe(key, animals, message) {
    if (seen.has(key)) return;
    const visible = animals.some(({ root }) => {
      direction.copy(root.position);
      direction.y += 0.56;
      direction.sub(ctx.camera.position);
      return direction.lengthSq() < 75 && view.dot(direction.normalize()) > 0.87;
    });
    if (!visible) return;
    seen.add(key);
    ctx.toast(message);
    ctx.complete(key);
  }

  function update(dt) {
    elapsed += dt;
    press.update(elapsed);
    normals.offset.set(elapsed * 0.022, elapsed * 0.014);
    for (const bird of birds) {
      const { root, body, head, wings, feet, x, y, z, heading, phase, swimming } = bird;
      const t = elapsed + phase;
      if (swimming) {
        const path = elapsed * 0.66 + phase;
        root.position.set(x + Math.sin(path) * 1.34, y + Math.sin(t * 4) * 0.045, z + Math.cos(path) * 1.35);
        root.rotation.y = Math.atan2(Math.cos(path), -Math.sin(path));
        body.rotation.x = 1.17 + Math.sin(t * 4) * 0.09;
      } else {
        root.position.x = x + Math.sin(t * 0.64) * 0.14;
        root.position.z = z + Math.cos(t * 0.64) * 0.1;
        root.rotation.y = heading + Math.sin(t * 0.58) * 0.32;
        body.rotation.z = Math.sin(t * 6) * 0.071;
        feet[0].position.y = 0.039 + Math.max(0, Math.sin(t * 6)) * 0.023;
        feet[1].position.y = 0.039 + Math.max(0, -Math.sin(t * 6)) * 0.023;
      }
      head.rotation.y = Math.sin(t * 1.7) * 0.22;
      wings[0].rotation.z = -0.22 + Math.sin(t * 5.2) * 0.17;
      wings[1].rotation.z = 0.22 - Math.sin(t * 5.2) * 0.17;
    }
    for (const animal of seaLions) {
      const { root, neck, flippers, x, y, z, heading, swimming, phase } = animal;
      const t = elapsed + phase;
      if (swimming) {
        const path = t * 0.72;
        root.position.set(x + Math.sin(path) * 2.2, y + Math.sin(t * 4) * 0.07, z + Math.cos(path) * 1.55);
        root.rotation.y = Math.atan2(2.2 * Math.cos(path), -1.55 * Math.sin(path));
        neck.rotation.x = 0.41 + Math.sin(t * 3) * 0.115;
      } else {
        root.rotation.y = heading + Math.sin(t * 0.55) * 0.2;
        neck.rotation.x = Math.sin(t * 1.2) * 0.24;
      }
      flippers[0].rotation.y = Math.sin(t * 3.7) * (swimming ? 0.64 : 0.16);
      flippers[1].rotation.y = -flippers[0].rotation.y;
    }
    const player = ctx.player();
    state.water = Math.max(0, 1 - Math.abs(player.pos.z + 2.5) / 17) * 0.38;
    state.calm = player.seat?.calm ? 1 : 0;
    if (player.pos.z > 8 || player.pos.z < -0.85) return;
    ctx.camera.getWorldDirection(view);
    observe('coastPenguins', birds, 'You spotted the Humboldt penguins. Look for the black band across their chests!');
    observe('coastSeaLions', seaLions, 'You spotted the California sea lions. Watch them swim and haul out onto the rocks.');
  }

  return {
    group, colliders, state, update,
    floorAt: () => 0,
    limit(position, radius) {
      position.x = THREE.MathUtils.clamp(position.x, -15.8 + radius, 15.8 - radius);
      position.z = THREE.MathUtils.clamp(position.z, -11.7 + radius, 17 - radius);
    },
    shadowLights: [sun], dirty: true,
  };
}
