import * as THREE from 'three';
import { FOREST_ANIMALS, makeForestAnimal } from './forest-animals.js';
import { boardSign, forestFloor, grass, gravel, rng, woodGrain } from './textures.js';

export const FOREST_SPAWN = { x: -10.1, z: 16.5, yaw: -0.08, pitch: -0.01 };

export function buildForest(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const random = rng(1956);
  const mat = (color, properties = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...properties });
  const dirt = mat(0xaaa181, { map: forestFloor() });
  const trail = mat(0xd2b282, { map: gravel() });
  const lawn = mat(0x76905a, { map: grass() });
  const soil = mat(0x846b4b);
  const wood = mat(0x785c43, { map: woodGrain() });
  const timber = mat(0x594d3f);
  const dark = mat(0x31433b);
  const stone = mat(0x96968b);
  const rock = mat(0x8b857b);
  const boulder = new THREE.DodecahedronGeometry(1, 0);
  const crown = new THREE.IcosahedronGeometry(1, 0);
  const needles = [mat(0x2d5141), mat(0x3a6046), mat(0x55724a)];
  const glass = mat(0xb2d4d0, { transparent: true, opacity: 0.15, depthWrite: false, roughness: 0.19, side: THREE.DoubleSide });
  const water = mat(0x528d93, { roughness: 0.20, metalness: 0.27 });
  const roof = mat(0x30463e);
  const plaster = mat(0xccc1a8);
  const nightWall = mat(0x253138);
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffc47f });

  function place(parent, object, x, y, z) {
    parent.add(object);
    object.position.set(x, y, z);
    return object;
  }
  const mesh = (parent, geometry, material, x, y, z) => place(parent, new THREE.Mesh(geometry, material), x, y, z);
  const box = (parent, material, w, h, d, x, y, z) => mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const node = (parent, x, y, z) => place(parent, new THREE.Group(), x, y, z);
  const cylinder = (parent, material, rt, rb, h, x, y, z, sides = 10) =>
    mesh(parent, new THREE.CylinderGeometry(rt, rb, h, sides), material, x, y, z);
  const block = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  const roundBlock = (x, z, r) => colliders.push({ x, z, r });
  function ellipsoid(parent, geometry, material, x, y, z, sx, sy, sz) {
    const object = mesh(parent, geometry, material, x, y, z);
    object.scale.set(sx, sy, sz);
    return object;
  }
  function ground(surface, w, d, x, y, z) {
    const geometry = new THREE.PlaneGeometry(w, d);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    mesh(group, geometry, surface, x, y, z).rotation.x = -Math.PI / 2;
  }
  function sign(parent, title, subtitle, w, x, y, z, color = '#315b45') {
    return mesh(parent, new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({
      map: boardSign(title, subtitle, { bg: color, fg: '#ffedc1' }), toneMapped: false,
    }), x, y, z);
  }
  function postSign(title, subtitle, x, z, yaw, action, w = 1.74, color) {
    const board = node(group, x, 0, z);
    board.rotation.y = yaw;
    box(board, timber, 0.10, 1.35, 0.10, 0, 0.675, 0);
    const backing = box(board, dark, w + 0.06, w / 4 + 0.045, 0.10, 0, 1.32, 0.015);
    const face = sign(board, title, subtitle, w, 0, 1.32, 0.071, color);
    if (action) {
      face.userData.interact = action;
      backing.userData.interact = action;
    }
    roundBlock(x, z, 0.084);
  }
  function exhibitInfo(species) {
    return {
      label: () => `Read about the ${species.en.toLowerCase()}`,
      act() {
        ctx.toast(species.fact, 6800);
        if (species.task) ctx.complete(species.task);
      },
    };
  }

  ground(dirt, 160, 145, 0, -0.042, -11);
  const ring = new THREE.CatmullRomCurve3([
    [-10.1, 17], [-11.2, 8], [-10.7, -9], [-10.2, -24], [-12, -33], [-8, -39.3],
    [0, -41], [8, -39.5], [11, -32], [11.1, -17], [10.8, -2], [10.8, 13.3],
    [5.3, 19.5], [-4.4, 20.1],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
  const sample = ring.getPoints(144);
  const pathPositions = [];
  const pathUV = [];
  const triangles = [];
  const corners = [];
  for (let i = 0; i < sample.length; i++) {
    const a = sample[(i + sample.length - 2) % (sample.length - 1)];
    const b = sample[(i + 1) % (sample.length - 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const width = 2.38 + Math.sin(i * 0.19) * 0.24;
    const p = sample[i];
    for (const side of [-1, 1]) {
      const x = p.x + side * dz / d * width;
      const z = p.z - side * dx / d * width;
      pathPositions.push(x, 0.005, z);
      pathUV.push(x, z);
      if (i % 6 === 0) corners.push([x, z]);
    }
    const j = i * 2;
    if (i !== sample.length - 1) triangles.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
  }
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
  pathGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(pathUV, 2));
  pathGeometry.setIndex(triangles);
  pathGeometry.computeVertexNormals();
  trail.side = THREE.DoubleSide;
  mesh(group, pathGeometry, trail, 0, 0, 0);
  for (const [x, z] of corners) {
    if (random() > 0.6) continue;
    ellipsoid(group, boulder, stone, x, 0.04, z, 0.18 + random() * 0.2, 0.08, 0.15);
  }
  postSign('BOSQUE TEMPLADO', 'Temperate Forest · Chapultepec', -8.15, 12.3, -0.2, {
    label: () => 'Read the trail guide',
    act: () => ctx.toast('Follow the loop to visit the forest habitats. The Nocturnario is near the northwest bend.', 6200),
  }, 2.42);

  // Shared rig models and paddock footprints arranged around the loop on the reference.
  const habitats = [
    ['maned', -19.85, 12.7, 10.3, 7.5, 'east'],
    ['fallow', -19.7, 3.2, 10.6, 8.6, 'east', 2],
    ['gray', -19.5, -7.0, 10, 8.2, 'east'],
    ['brown', -20.0, -17.1, 11.0, 9.7, 'east', 1, true],
    ['tiger', 0.35, 11.85, 12.1, 8.7, 'west', 1, true],
    ['elk', 0.15, 1.55, 11.6, 9.75, 'west', 2],
    ['wolf', -0.2, -9.48, 11.2, 10.25, 'west', 2],
    ['raccoon', 0.5, -20.6, 10.3, 9.5, 'west', 2],
    ['black', 0.2, -33.0, 13.4, 8.2, 'north', 1, true],
    ['sika', 19.4, 10.3, 10.4, 8.5, 'west', 2],
    ['macaque', 20.2, -0.8, 11.2, 10.0, 'west', 2],
    ['tigrillo', 20.45, -12.5, 11.5, 9.6, 'west', 1, true],
    ['snow', 20.15, -24.25, 11.2, 10.65, 'west', 1, true],
  ];
  const actors = [];
  function fence(x, z, w, d, viewingSide, glazed) {
    const sides = [
      ['north', x, z - d / 2, w, 0], ['south', x, z + d / 2, w, 0],
      ['west', x - w / 2, z, d, Math.PI / 2], ['east', x + w / 2, z, d, Math.PI / 2],
    ];
    for (const [side, px, pz, length, yaw] of sides) {
      const edge = node(group, px, 0, pz);
      edge.rotation.y = yaw;
      const viewSide = side === viewingSide || (x > -6 && x < 6 && viewingSide === 'west' && side === 'east');
      const useGlass = glazed && viewSide;
      const level = useGlass ? 1.45 : viewSide ? 1.26 : 1.68;
      box(edge, stone, length + 0.14, 0.25, 0.20, 0, 0.13, 0);
      box(edge, dark, length + 0.07, 0.064, 0.081, 0, level, 0);
      if (!useGlass) {
        for (const height of [0.52, 0.89]) box(edge, timber, length, 0.056, 0.056, 0, height, 0);
      } else {
        const pane = mesh(edge, new THREE.PlaneGeometry(length - 0.09, level - 0.25), glass, 0, (level + 0.25) / 2, 0);
        pane.raycast = () => {};
      }
      const n = Math.ceil(length / 1.68);
      for (let i = 0; i <= n; i++) box(edge, dark, 0.071, level + 0.10, 0.092, (i / n - 0.5) * length, (level + 0.10) / 2, 0);
    }
  }
  function pool(x, z, width, depth) {
    const edge = ellipsoid(group, boulder, stone, x, 0.12, z, width, 0.18, depth);
    edge.rotation.y = 0.12;
    const pond = mesh(group, new THREE.CircleGeometry(1, 36), water, x, 0.24, z);
    pond.rotation.x = -Math.PI / 2;
    pond.scale.set(width * 0.82, depth * 0.77, 1);
  }
  function tree(x, z, height, variant) {
    cylinder(group, timber, 0.10, 0.22, height * 0.77, x, height * 0.385, z, 7);
    if (variant === 0) {
      for (let i = 0; i < 3; i++) {
        const r = height * (0.30 - i * 0.05);
        cylinder(group, needles[i], 0.03, r, height * 0.50, x, height * (0.58 + i * 0.16), z, 7);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        ellipsoid(group, crown, needles[(variant + i) % 3], x + (i - 1) * 0.46, height * (0.74 + i * 0.10), z,
          height * 0.25, height * 0.24, height * 0.24);
      }
    }
  }

  for (const [key, x, z, w, d, side, count = 1, glazed = false] of habitats) {
    const species = FOREST_ANIMALS[key];
    const east = side === 'east';
    const north = side === 'north';
    const markerOffset = w / 2 + 0.31;
    ground(lawn, w - 0.14, d - 0.14, x, -0.012, z);
    block(x - w / 2 - 0.055, x + w / 2 + 0.055, z - d / 2 - 0.055, z + d / 2 + 0.055);
    fence(x, z, w, d, side, glazed);
    if (north) {
      postSign(species.es, species.en, x + 1.75, z - d / 2 - 0.31, Math.PI, exhibitInfo(species));
    } else {
      postSign(species.es, species.en, x + (east ? markerOffset : -markerOffset), z,
        (east ? 1 : -1) * Math.PI / 2, exhibitInfo(species));
      if (x > -6 && x < 6) postSign(species.es, species.en, x + markerOffset, z + 0.65,
        Math.PI / 2, exhibitInfo(species));
    }
    const back = east ? -1 : 1;
    for (let i = 0; i < 5; i++) {
      const stoneX = x + (north ? (random() - 0.5) * w * 0.63 : back * (w * 0.27 + random() * w * 0.10));
      const stoneZ = z + (north ? 1 : random() - 0.5) * d * 0.34;
      const mound = ellipsoid(group, boulder, rock, stoneX, 0.21, stoneZ,
        0.53 + random() * 0.72, 0.50 + random() * (key === 'snow' ? 1.7 : 0.62), 0.60 + random() * 0.71);
      mound.rotation.y = random() * Math.PI;
    }
    tree(x + w * 0.28 * back, z - d * 0.29, 3.2 + random() * 2, key === 'snow' ? 0 : 1);
    if (key === 'brown' || key === 'tiger' || key === 'macaque') pool(x + back * w * 0.27, z + d * 0.26, 1.45, 0.96);
    if (key === 'macaque' || key === 'tigrillo') {
      for (const delta of [-0.9, 0.9]) cylinder(group, wood, 0.10, 0.13, 1.8, x + w * 0.27, 0.9, z + delta);
      box(group, wood, 0.87, 0.13, 2.28, x + w * 0.27, 1.79, z);
    }
    if (key === 'gray' || key === 'wolf') {
      box(group, timber, 1.66, 0.98, 0.78, x + w * 0.33 * back, 0.49, z + 2.44);
      box(group, roof, 1.90, 0.10, 0.97, x + w * 0.33 * back, 1.02, z + 2.44);
    }

    for (let i = 0; i < count; i++) {
      const animal = makeForestAnimal(group, species, i ? 0.81 : 1, i === 0);
      actors.push({
        ...animal,
        x: x + (north ? 0 : -back * w * 0.16) + (i ? back * 1.95 : 0),
        y: 0.016,
        z: z + (north ? -1.1 : 0) + (i ? 1.82 : -0.41),
        dx: w * (i ? 0.14 : 0.17),
        dz: d * 0.16,
        phase: random() * 8,
      });
    }
  }

  // Nocturnario: a walk-in building with a dim, glazed owl enclosure.
  const houseX = -20;
  const houseZ = -30.2;
  const houseW = 9.4;
  const houseD = 8.7;
  const east = houseX + houseW / 2;
  const west = houseX - houseW / 2;
  const opening = 1.38;
  ground(stone, houseW, houseD, houseX, 0.016, houseZ);
  ground(trail, 4.6, 2.55, east + 2.2, 0.008, houseZ);
  box(group, nightWall, 0.26, 3.46, houseD, west, 1.73, houseZ);
  block(west - 0.13, west + 0.13, houseZ - houseD / 2, houseZ + houseD / 2);
  for (const side of [-1, 1]) {
    const pz = houseZ + side * houseD / 2;
    box(group, plaster, houseW, 3.46, 0.26, houseX, 1.73, pz);
    block(west - 0.1, east + 0.1, pz - 0.13, pz + 0.13);
    const segment = houseD / 2 - opening;
    const z = houseZ + side * (opening + segment / 2);
    box(group, plaster, 0.26, 3.46, segment, east, 1.73, z);
    block(east - 0.15, east + 0.15, z - segment / 2, z + segment / 2);
  }
  box(group, roof, houseW + 0.7, 0.26, houseD + 0.64, houseX, 3.5, houseZ);
  box(group, plaster, 0.27, 0.65, opening * 2, east, 3.13, houseZ);
  sign(group, 'NOCTURNARIO', 'Nocturnal house', 2.51, east + 0.145, 2.86, houseZ, '#444c57').rotation.y = Math.PI / 2;
  box(group, nightWall, 2.85, 0.73, 6.63, west + 1.55, 0.37, houseZ);
  box(group, nightWall, 2.8, 0.12, 6.63, west + 1.55, 2.64, houseZ);
  const windowX = west + 2.98;
  mesh(group, new THREE.PlaneGeometry(6.58, 1.84), glass, windowX, 1.67, houseZ).rotation.y = Math.PI / 2;
  for (const dz of [-3.28, 0, 3.28]) box(group, timber, 0.07, 1.94, 0.08, windowX, 1.67, houseZ + dz);
  block(west, windowX + 0.07, houseZ - 3.34, houseZ + 3.34);
  for (const dz of [-2.6, 2.6]) {
    box(group, lamp, 0.34, 0.055, 0.20, houseX + 1.2, 3.15, houseZ + dz);
    place(group, new THREE.PointLight(0xffbb7d, 8, 5), houseX + 1.2, 2.96, houseZ + dz);
  }
  const perchX = west + 1.39;
  const perch = cylinder(group, timber, 0.055, 0.08, 3.0, perchX, 1.19, houseZ, 9);
  perch.rotation.x = Math.PI * 0.5;
  cylinder(group, timber, 0.10, 0.15, 1.20, perchX, 0.61, houseZ + 0.65);
  actors.push({ ...makeForestAnimal(group, FOREST_ANIMALS.owl), x: perchX, y: 1.27, z: houseZ - 0.62, phase: 0.7, yaw: Math.PI / 2 });
  postSign('LECHUZA', 'Owl', windowX + 0.39, houseZ - 0.85, Math.PI / 2, exhibitInfo(FOREST_ANIMALS.owl), 1.35, '#444c57');

  postSign('FOTO', 'Bengal tiger lookout', 7.88, 11.02, Math.PI / 2, {
    label: () => 'Take a tiger photo',
    act() {
      ctx.sit({
        eye: new THREE.Vector3(8.35, 1.68, 11.8), yaw: Math.PI / 2, pitch: -0.065,
        photo: true, task: 'forestPhoto', caption: 'Tigre de Bengala · Bosque Templado',
      });
    },
  }, 1.37, '#8b4552');

  for (let i = 0; i < 68; i++) {
    const right = i % 2 ? 1 : -1;
    const x = right * (27.1 + random() * 11);
    const z = -47 + random() * 75;
    tree(x, z, 2.8 + random() * 5.25, i % 3);
  }
  for (let i = 0; i < 16; i++) {
    tree(-24 + random() * 48, i % 2 ? 23 + random() * 6 : -45 - random() * 6, 3 + random() * 4.9, i % 3);
  }
  for (const [x, z] of [[-13.9, 16.7], [13.95, 3.8], [-14, -2.1], [7.1, -32.0], [-5.8, -25.8], [14.8, -34.0]]) {
    tree(x, z, 4.58 + random() * 1.9, 0);
    roundBlock(x, z, 0.21);
  }
  place(group, new THREE.HemisphereLight(0xe1f3ff, 0xa7a787, 2.05), 0, 13, 0);
  place(group, new THREE.DirectionalLight(0xffe6bd, 1.9), -12, 26, 17);

  let time = 0;
  let enteredHouse = false;
  const state = { water: 0, calm: 0 };
  function update(dt) {
    time += dt;
    for (const actor of actors) {
      const { phase, root, head, tail, legs } = actor;
      const pace = time + phase;
      if (actor.stationary) {
        root.position.set(actor.x, actor.y, actor.z);
        root.rotation.y = actor.yaw;
        head.rotation.y = Math.sin(pace * 0.66) * 0.81;
        head.rotation.z = Math.sin(pace * 0.91) * 0.14;
        continue;
      }
      const cycle = pace % 12;
      const walkingTime = Math.floor(pace / 12) * 9 + Math.min(cycle, 9);
      const walkPhase = walkingTime * 0.29;
      const paceFactor = 0.55 + Math.sin(pace * 0.46) * 0.39;
      const stride = cycle >= 9 ? 0 : Math.sin(walkingTime * 6.2) * paceFactor;
      root.position.set(actor.x + Math.sin(walkPhase) * actor.dx,
        actor.y + Math.abs(stride) * 0.040, actor.z + Math.cos(walkPhase) * actor.dz);
      root.rotation.y = Math.atan2(Math.cos(walkPhase) * actor.dx, -Math.sin(walkPhase) * actor.dz);
      head.rotation.y = Math.sin(pace * 1.25) * 0.23;
      head.rotation.x = Math.sin(pace * 2.2) * 0.06;
      tail.rotation.y = Math.sin(pace * 3.25) * 0.32;
      legs.forEach((leg, i) => { leg.rotation.x = stride * (i === 0 || i === 3 ? 0.36 : -0.36); });
    }
    const { x, z } = ctx.player().pos;
    const inside = x < east - 0.35 && x > west && Math.abs(z - houseZ) < houseD / 2 - 0.13;
    if (inside && !enteredHouse) {
      enteredHouse = true;
      ctx.complete('forestNight');
    }
    state.calm = inside ? 0 : 0.28;
    state.water = Math.max(0, 1 - Math.hypot(x - 0.35, z - 11.85) / 9) * 0.18;
  }

  return {
    group, colliders, state, update, floorAt: () => 0,
    limit(position, radius) {
      position.x = THREE.MathUtils.clamp(position.x, -26.5 + radius, 26.5 - radius);
      position.z = THREE.MathUtils.clamp(position.z, -43.6 + radius, 22.1 - radius);
    },
  };
}
