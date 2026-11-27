import * as THREE from 'three';
import { createCarriage } from './castle-carriages.js';
import { boardSign, grass, marble, paving, plaster, rng, woodFloor } from './textures.js';

export const CASTLE_SPAWN = { x: -0.75, z: 7.8, yaw: -0.03, pitch: 0.015 };
const TERRACE = 4;
const STAIR_TOP = -16.8;
const STAIR_BOTTOM = -23.2;
const STEP_COUNT = 20;
const STAIR_WIDTH = 5.0;

export function buildCastle(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const random = rng(1876);
  const material = (color, properties = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...properties });
  const stone = material(0xc8b79a);
  const lightStone = material(0xe6dac1);
  const floorStone = material(0xd1c2a7, { map: paving() });
  const grassMat = material(0x68914d, { map: grass() });
  const stoneShade = material(0x9b8c75);
  const wall = material(0xe5c394, { map: plaster() });
  const coral = material(0xb9634a);
  const dark = material(0x354444);
  const iron = material(0x324945, { metalness: 0.45 });
  const brass = material(0xbe8d46, { metalness: 0.54 });
  const timber = material(0x6d493b);
  const cabinet = material(0x553126);
  const exhibitRed = material(0x712e3f);
  const museumFloor = material(0xb8926d, { map: woodFloor() });
  const glass = material(0xa3cbd9, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, roughness: 0.22 });
  const pool = material(0x478f96, { metalness: 0.16, roughness: 0.18 });
  const jet = new THREE.MeshBasicMaterial({ color: 0xd9f6f8, transparent: true, opacity: 0.73, depthWrite: false });
  const hedge = material(0x38663a);
  const leaves = [material(0x456642), material(0x67814e), material(0x2b5545)];
  const blossom = [material(0xf4bf42), material(0xb64058), material(0xf3e5be)];
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  const stepLength = (STAIR_TOP - STAIR_BOTTOM) / STEP_COUNT;

  function place(parent, object, x, y, z) {
    parent.add(object);
    object.position.set(x, y, z);
    return object;
  }
  const mesh = (parent, geometry, mat, x, y, z) => place(parent, new THREE.Mesh(geometry, mat), x, y, z);
  const box = (parent, mat, w, h, d, x, y, z) =>
    mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cylinder = (parent, mat, top, base, h, x, y, z, sides = 20) =>
    mesh(parent, new THREE.CylinderGeometry(top, base, h, sides), mat, x, y, z);
  const oval = (parent, mat, x, y, z, w, h, d, geometry = sphere) => {
    const object = mesh(parent, geometry, mat, x, y, z);
    object.scale.set(w, h, d);
    return object;
  };
  const block = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  const roundBlock = (x, z, r) => colliders.push({ x, z, r });
  const node = (parent, x, y, z) => place(parent, new THREE.Group(), x, y, z);
  function surface(mat, w, d, x, y, z) {
    const geometry = new THREE.PlaneGeometry(w, d);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    mesh(group, geometry, mat, x, y, z).rotation.x = -Math.PI / 2;
  }
  function sign(parent, title, subtitle, width, x, y, z, hue = '#394942') {
    const map = boardSign(title, subtitle, { bg: hue, fg: '#fff0cb' });
    return mesh(parent, new THREE.PlaneGeometry(width, width / 4),
      new THREE.MeshBasicMaterial({ map, toneMapped: false }), x, y, z);
  }
  function plaque(parent, { title, subtitle, detail, task, width = 1.65 }, x, y, z, yaw = 0) {
    const support = node(parent, x, y, z);
    support.rotation.y = yaw;
    box(support, iron, 0.065, 0.94, 0.07, 0, 0.47, -0.015);
    const card = sign(support, title, subtitle, width, 0, 0.97, 0.035);
    const backing = box(support, dark, width + 0.055, width / 4 + 0.03, 0.07, 0, 0.97, -0.012);
    for (const panel of [card, backing]) {
      panel.userData.interact = {
        label: () => `Read about ${subtitle}`,
        act() { ctx.toast(detail, 7600); if (task) ctx.complete(task); },
      };
    }
    return support;
  }

  function arch(parent, x, y, z, radius, straight, depth, gauge, frame = lightStone) {
    const shape = new THREE.Shape();
    shape.moveTo(-radius - gauge, 0);
    shape.lineTo(-radius - gauge, straight);
    shape.absarc(0, straight, radius + gauge, Math.PI, 0, true);
    shape.lineTo(radius + gauge, 0);
    shape.lineTo(radius, 0);
    shape.lineTo(radius, straight);
    shape.absarc(0, straight, radius, 0, Math.PI);
    shape.lineTo(-radius, 0);
    shape.closePath();
    return mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }),
      frame, x, y, z);
  }
  function balustrade(length, x, y, z, yaw = 0) {
    const rail = node(group, x, y, z);
    rail.rotation.y = yaw;
    for (const h of [0.13, 1.0]) box(rail, lightStone, length, 0.19, 0.27, 0, h, 0);
    const n = Math.ceil(length / 0.55);
    for (let index = 0; index <= n; index++) {
      const p = length * (index / n - 0.5);
      if (index % 5 === 0 || index === n) box(rail, lightStone, 0.26, 0.90, 0.29, p, 0.54, 0);
      else {
        cylinder(rail, stone, 0.09, 0.075, 0.35, p, 0.74, 0, 9);
        cylinder(rail, stone, 0.075, 0.13, 0.35, p, 0.39, 0, 9);
      }
    }
  }
  function column(parent, x, y, z, height, radius, shaft = stone) {
    box(parent, lightStone, radius * 3, 0.17, radius * 3, x, y + 0.085, z);
    cylinder(parent, shaft, radius * 0.82, radius, height - 0.3, x, y + height / 2, z, 12);
    cylinder(parent, lightStone, radius * 1.43, radius * 0.9, 0.18, x, y + height - 0.12, z, 12);
  }

  // Stone terrace, formal beds, roofed corridors and a view out over the forest.
  box(group, stoneShade, 29, TERRACE + 1, 27.68, 0, TERRACE / 2 - 0.51, -2.96);
  surface(floorStone, 29, 27.68, 0, TERRACE, -2.96);
  surface(grassMat, 164, 145, 0, -4.5, 2.0);
  for (const side of [-1, 1]) {
    balustrade(26.4, side * 14.12, TERRACE, -2.7, Math.PI / 2);
    block(side * 14.12 - 0.21, side * 14.12 + 0.21, -16.8, 10.82);
    balustrade(11.6, side * 8.38, TERRACE, STAIR_TOP);
    block(side * 8.38 - 5.8, side * 8.38 + 5.8, STAIR_TOP - 0.12, STAIR_TOP + 0.15);
  }
  balustrade(28.2, 0, TERRACE, 10.45);
  block(-14.35, 14.35, 10.31, 10.59);
  const flowers = [];
  function formalBed(x, z, shade) {
    box(group, stone, 6.55, 0.18, 5.5, x, TERRACE + 0.09, z);
    box(group, grassMat, 6.36, 0.13, 5.30, x, TERRACE + 0.174, z);
    block(x - 3.28, x + 3.28, z - 2.75, z + 2.75);
    for (const side of [-1, 1]) {
      box(group, hedge, 6.08, 0.33, 0.41, x, TERRACE + 0.32, z + side * 2.45);
      box(group, hedge, 0.40, 0.33, 4.75, x + side * 2.90, TERRACE + 0.32, z);
      for (let i = 0; i < 22; i++) {
        flowers.push([x + (i / 21 - 0.5) * 4.9, TERRACE + 0.29 + random() * 0.12, z + side * (1.8 + random() * 0.19), shade]);
        if (i < 16) flowers.push([x + side * (2.25 + random() * 0.21), TERRACE + 0.29 + random() * 0.12, z + (i / 15 - 0.5) * 3.43, (shade + 2) % 3]);
      }
    }
    const topiary = oval(group, hedge, x, TERRACE + 1.02, z, 0.77, 0.96, 0.77, rock);
    topiary.rotation.y = random() * Math.PI;
    cylinder(group, lightStone, 0.37, 0.27, 0.44, x, TERRACE + 0.39, z, 12);
  }
  for (const side of [-1, 1]) {
    formalBed(side * 7.4, 3.1, side === -1 ? 0 : 1);
    formalBed(side * 7.4, -4.3, side === -1 ? 1 : 0);
    box(group, wall, 2.30, 0.22, 17.50, side * 12.38, TERRACE + 3.23, -4.00);
    box(group, coral, 2.42, 0.105, 17.70, side * 12.38, TERRACE + 3.41, -4.00).rotation.z = side * 0.095;
    for (const z of [-12.4, -8.4, -4.3, 0, 4.3]) {
      for (const x of [11.30, 13.46]) {
        column(group, side * x, TERRACE, z, 3.14, 0.11, iron);
        roundBlock(side * x, z, 0.17);
      }
    }
  }
  const transform = new THREE.Object3D();
  blossom.forEach((mat, index) => {
    const set = flowers.filter((flower) => flower[3] === index);
    const border = new THREE.InstancedMesh(rock, mat, set.length);
    set.forEach(([x, y, z], i) => {
      transform.position.set(x, y, z);
      transform.scale.set(0.11, 0.095, 0.11);
      transform.updateMatrix();
      border.setMatrixAt(i, transform.matrix);
    });
    group.add(border);
  });
  for (let i = 0; i < 105; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (17 + random() * 31);
    const z = -30 + random() * 65;
    const h = 2.6 + random() * 5.7;
    cylinder(group, timber, 0.14, 0.23, h, x, -4.5 + h * 0.5, z, 6);
    oval(group, leaves[i % leaves.length], x, -4.15 + h, z, h * 0.48, h * 0.39, h * 0.42, rock);
  }
  for (let i = 0; i < 30; i++) {
    const x = (i % 2 ? -1 : 1) * (42 + random() * 31);
    const h = random() * 12 + 3;
    box(group, stoneShade, 2 + random() * 3, h, 3.5 + random() * 4, x, h / 2 - 4.5, -27 + random() * 62);
  }

  const fountainZ = 1.0;
  roundBlock(0, fountainZ, 1.72);
  cylinder(group, stone, 1.68, 1.75, 0.33, 0, TERRACE + 0.19, fountainZ, 48);
  cylinder(group, pool, 1.51, 1.51, 0.035, 0, TERRACE + 0.367, fountainZ, 48);
  mesh(group, new THREE.TorusGeometry(1.59, 0.078, 8, 48),
    lightStone, 0, TERRACE + 0.391, fountainZ).rotation.x = Math.PI / 2;
  cylinder(group, stone, 0.29, 0.49, 0.68, 0, TERRACE + 0.62, fountainZ);
  cylinder(group, lightStone, 0.70, 0.37, 0.13, 0, TERRACE + 0.95, fountainZ);
  cylinder(group, pool, 0.61, 0.61, 0.022, 0, TERRACE + 1.025, fountainZ, 30);
  cylinder(group, stone, 0.18, 0.29, 0.28, 0, TERRACE + 1.17, fountainZ);
  oval(group, lightStone, 0, TERRACE + 1.49, fountainZ, 0.17, 0.31, 0.16);
  oval(group, lightStone, 0, TERRACE + 1.83, fountainZ, 0.12, 0.145, 0.115);
  const droplets = [];
  for (let i = 0; i < 22; i++) droplets.push(oval(group, jet, 0, TERRACE + 1, fountainZ, 0.031, 0.045, 0.031));

  const towerZ = -9.7;
  roundBlock(0, towerZ, 2.66);
  cylinder(group, lightStone, 2.60, 2.63, 0.50, 0, TERRACE + 0.24, towerZ, 44);
  cylinder(group, stone, 2.48, 2.49, 6.85, 0, TERRACE + 3.81, towerZ, 44);
  for (const y of [0.51, 2.85, 5.94, 7.16]) {
    cylinder(group, lightStone, 2.55, 2.55, 0.14, 0, TERRACE + y, towerZ, 44);
  }
  cylinder(group, lightStone, 2.67, 2.67, 0.21, 0, TERRACE + 7.35, towerZ, 44);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    cylinder(group, lightStone, 0.10, 0.14, 0.57, 2.54 * Math.sin(angle), TERRACE + 7.69,
      towerZ + 2.54 * Math.cos(angle), 8);
  }
  const crestRail = mesh(group, new THREE.TorusGeometry(2.54, 0.084, 8, 48), lightStone, 0, TERRACE + 7.97, towerZ);
  crestRail.rotation.x = Math.PI / 2;
  const stained = material(0x527078, { roughness: 0.32, metalness: 0.28 });
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const face = node(group, Math.sin(angle) * 2.465, TERRACE + 3.19, towerZ + Math.cos(angle) * 2.465);
    face.rotation.y = angle;
    arch(face, 0, 0, 0, 0.46, 1.1, 0.13, 0.13);
    box(face, stained, 0.87, 1.10, 0.095, 0, 0.55, 0.065);
    const cap = mesh(face, new THREE.CircleGeometry(0.432, 20, 0, Math.PI), stained, 0, 1.1, 0.119);
    cap.scale.x = 0.97;
    box(face, iron, 0.052, 1.47, 0.035, 0, 0.74, 0.117);
    box(face, lightStone, 1.16, 0.13, 0.34, 0, 0.0, 0.1);
  }
  cylinder(group, iron, 0.038, 0.048, 3.8, 0, TERRACE + 9.33, towerZ, 8);
  const flagGeo = new THREE.PlaneGeometry(2.48, 1.27, 18, 5).translate(1.24, 0, 0);
  const flagImage = document.createElement('canvas');
  flagImage.width = 312;
  flagImage.height = 160;
  const flagCtx = flagImage.getContext('2d');
  ['#196656', '#fff8e9', '#c73940'].forEach((color, i) => {
    flagCtx.fillStyle = color;
    flagCtx.fillRect(i * 104, 0, 104, 160);
  });
  flagCtx.font = '48px "Segoe UI Emoji", sans-serif';
  flagCtx.textAlign = 'center';
  flagCtx.fillText('🦅', 156, 95);
  const flagTexture = new THREE.CanvasTexture(flagImage);
  flagTexture.colorSpace = THREE.SRGBColorSpace;
  mesh(group, flagGeo, new THREE.MeshBasicMaterial({ map: flagTexture, side: THREE.DoubleSide }), 0, TERRACE + 10.29, towerZ);

  const photo = plaque(group, { title: 'FOTO', subtitle: 'the Alcázar garden' }, 2.24, TERRACE, 5.9);
  for (const panel of photo.children.slice(1)) {
    panel.userData.interact = {
      label: () => 'Take a garden photo',
      act() {
        ctx.sit({
          eye: new THREE.Vector3(0.48, TERRACE + 1.60, 6.4), yaw: 0.02, pitch: 0.12,
          photo: true, task: 'castlePhoto', caption: 'Jardín del Alcázar · Castillo de Chapultepec',
        });
      },
    };
  }
  plaque(group, {
    title: 'SALA DE CARRUAJES', subtitle: 'the way to the museum',
    detail: 'Follow the path around the tower. The stairs behind it lead down into the carriage gallery.',
  }, -2.72, TERRACE, 5.75);
  for (const x of [-1.02, 1.02]) {
    box(group, iron, 0.066, 1.65, 0.078, x, TERRACE + 0.825, -16.23);
    roundBlock(x, -16.23, 0.073);
  }
  sign(group, 'MUSEO ↓', 'Carriages and artifacts', 2.21, 0, TERRACE + 1.58, -16.18);
  for (let i = 0; i < STEP_COUNT; i++) {
    const h = TERRACE * (1 - i / STEP_COUNT);
    const z = STAIR_TOP - (i + 0.5) * stepLength;
    box(group, stone, STAIR_WIDTH, h, stepLength + 0.004, 0, h / 2, z);
    box(group, lightStone, STAIR_WIDTH + 0.03, 0.043, 0.07, 0, h - 0.024, z - stepLength * 0.44);
  }
  for (const side of [-1, 1]) {
    const x = side * 2.43;
    const midZ = (STAIR_TOP + STAIR_BOTTOM) / 2;
    const rail = box(group, iron, 0.09, 0.09, Math.hypot(TERRACE, STAIR_TOP - STAIR_BOTTOM),
      x, TERRACE * 0.5 + 0.86, midZ);
    rail.rotation.x = -Math.atan2(TERRACE, STAIR_TOP - STAIR_BOTTOM);
    for (const z of [STAIR_TOP, midZ, STAIR_BOTTOM]) {
      const y = TERRACE * (z - STAIR_BOTTOM) / (STAIR_TOP - STAIR_BOTTOM);
      box(group, iron, 0.1, 0.88, 0.1, x, y + 0.44, z);
    }
    if (side < 0) block(-14.25, -2.52, STAIR_BOTTOM, STAIR_TOP + 0.05);
    else block(2.52, 14.25, STAIR_BOTTOM, STAIR_TOP + 0.05);
  }

  // The visitor route continues through the carriage hall into a room of artifacts.
  surface(floorStone, 23.2, 21.5, 0, 0.0, -33.93);
  surface(museumFloor, 22.95, 12.1, 0, 0.006, -50.7);
  box(group, wall, 24.0, 0.25, 33.7, 0, 6.0, -40.0);
  for (const side of [-1, 1]) {
    box(group, wall, 0.37, 6.0, 32.80, side * 11.76, 3.0, -40.08);
    box(group, timber, 0.06, 1.0, 32.65, side * 11.55, 0.50, -40.05);
    box(group, wall, 9.51, 5.9, 0.45, side * 7.08, 2.95, -24.02);
    box(group, wall, 9.93, 5.9, 0.24, side * 6.83, 2.95, -44.65);
    block(side * 11.76 - 0.185, side * 11.76 + 0.185, -56.6, -23.82);
    block(side * 7.08 - 4.75, side * 7.08 + 4.75, -24.25, -23.80);
    block(side * 6.83 - 4.96, side * 6.83 + 4.96, -44.77, -44.53);
    for (const z of [-28, -36, -42, -50]) column(group, side * 10.95, 0, z, 5.9, 0.32);
  }
  box(group, wall, 23.95, 6, 0.35, 0, 3, -56.6);
  block(-11.96, 11.96, -56.78, -56.40);
  arch(group, 0, 0, -24.28, 2.25, 2.05, 0.49, 0.22);
  box(group, wall, 5.04, 1.37, 0.48, 0, 5.22, -24.03);
  box(group, coral, 24.1, 0.29, 0.82, 0, 5.95, -23.94);
  sign(group, 'SALÓN DE CARRUAJES', 'Carriage Hall · Alcázar', 3.95, 0, 5.06, -23.766);
  arch(group, 0, 0, -44.79, 1.80, 2.30, 0.29, 0.18);
  box(group, wall, 4.04, 1.58, 0.29, 0, 5.08, -44.65);
  sign(group, 'OBJETOS DEL ALCÁZAR', 'The artifact gallery', 3.30, 0, 4.81, -44.47);
  const backToGarden = sign(group, 'JARDÍN DEL ALCÁZAR', 'Stairs to the garden', 3.54, 0, 5.03, -24.30);
  backToGarden.rotation.y = Math.PI;

  place(group, new THREE.HemisphereLight(0xe1f0ff, 0xbca584, 2.07), 0, 9, 0);
  place(group, new THREE.DirectionalLight(0xffe7bc, 1.67), 4, 18, 15);
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe5aa });
  for (const z of [-28.7, -36.2, -42.2, -49, -54]) {
    for (const x of [-5.1, 5.1]) {
      cylinder(group, brass, 0.045, 0.045, 0.70, x, 5.53, z, 6);
      cylinder(group, brass, 0.37, 0.62, 0.22, x, 5.16, z, 16);
      oval(group, lampGlow, x, 5.00, z, 0.43, 0.14, 0.43);
    }
    place(group, new THREE.PointLight(0xffe2b6, 18, 9, 1.75), 0, 5.05, z);
  }

  const collection = [
    { x: -5.46, z: -29.6, type: 'gala', title: 'CARROZA DE GALA', subtitle: 'the imperial gala coach',
      detail: 'This coach represents the ornate Milan-made carriage of Maximiliano and Carlota. Look for the gilded trim and the sculptural ornaments.', task: 'castleGala' },
    { x: 5.46, z: -33.8, type: 'daily', title: 'CARRUAJE COTIDIANO', subtitle: 'the everyday coach',
      detail: 'Maximiliano and Carlota’s daily carriage was later used by Benito Juárez. The imperial emblems on its doors gave way to republican ones.', task: 'castleDaily' },
    { x: -5.46, z: -38.2, type: 'calesa', title: 'CALESA DE JUÁREZ', subtitle: 'Benito Juárez’s calesa',
      detail: 'The calesa recalls the carriage in which Benito Juárez returned to Mexico City on July 15, 1867, after the Republic was restored.', task: 'castleJuarez' },
  ];
  for (const entry of collection) {
    const { x, z } = entry;
    const side = Math.sign(x);
    box(group, timber, 3.85, 0.17, 5.40, x, 0.081, z);
    box(group, exhibitRed, 3.78, 0.025, 5.32, x, 0.17, z);
    place(group, createCarriage(entry.type), x, 0.18, z);
    for (const dz of [-2.5, 2.5]) {
      cylinder(group, brass, 0.052, 0.075, 0.97, x - side * 1.88, 0.50, z + dz, 10);
      oval(group, brass, x - side * 1.88, 1, z + dz, 0.079, 0.079, 0.079);
    }
    box(group, exhibitRed, 0.036, 0.045, 4.98, x - side * 1.88, 0.88, z);
    block(x - 1.93, x + 1.93, z - 2.71, z + 2.71);
    plaque(group, entry, x - side * 2.17, 0, z + 0.71, -side * Math.PI / 2);
  }
  plaque(group, {
    title: 'EL ALCÁZAR', subtitle: 'the Alcázar',
    detail: 'The Alcázar was the residential wing of the castle. These galleries bring together examples of objects used in its rooms.',
  }, 5.45, 0, -41, -Math.PI / 3);

  const silver = material(0xc4ced3, { metalness: 0.71, roughness: 0.28 });
  const porcelain = material(0xe3ded0, { roughness: 0.32 });
  const fabric = material(0xb38c98);
  const embroidered = material(0xe4c3a8);
  const darkFabric = material(0x747187);
  function displayCase(x, z, height) {
    const stand = node(group, x, 0, z);
    box(stand, cabinet, 2.35, 0.82, 1.40, 0, 0.41, 0);
    box(stand, brass, 2.43, 0.049, 1.47, 0, 0.82, 0);
    box(stand, exhibitRed, 2.28, 0.024, 1.30, 0, 0.86, 0);
    const y = 0.86 + height / 2;
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) box(stand, timber, 0.045, height, 0.045, side * 1.16, y, end * 0.68);
      mesh(stand, new THREE.PlaneGeometry(2.30, height), glass, 0, y, side * 0.68);
      mesh(stand, new THREE.PlaneGeometry(1.36, height), glass, side * 1.16, y, 0).rotation.y = Math.PI / 2;
    }
    mesh(stand, new THREE.PlaneGeometry(2.32, 1.36), glass, 0, 0.86 + height, 0).rotation.x = Math.PI / 2;
    block(x - 1.18, x + 1.18, z - 0.70, z + 0.70);
    return stand;
  }
  const service = displayCase(-4.25, -50.6, 1.30);
  oval(service, silver, -0.52, 1.18, -0.18, 0.33, 0.27, 0.22);
  oval(service, silver, -0.52, 1.43, -0.18, 0.10, 0.06, 0.08);
  const handle = mesh(service, new THREE.TorusGeometry(0.16, 0.034, 8, 20), silver, -0.78, 1.20, -0.18);
  handle.rotation.y = 0.25;
  const spout = cylinder(service, silver, 0.039, 0.098, 0.34, -0.19, 1.31, -0.17, 10);
  spout.rotation.z = -0.74;
  for (const x of [0.17, 0.53, 0.88]) {
    cylinder(service, silver, 0.09, 0.12, 0.028, x, 0.891, 0.32, 16);
    cylinder(service, silver, 0.028, 0.021, 0.21, x, 1.00, 0.32, 10);
    const cup = cylinder(service, silver, 0.105, 0.067, 0.14, x, 1.13, 0.32, 16);
    cup.rotation.y = 0.22;
    cylinder(service, dark, 0.084, 0.084, 0.008, x, 1.203, 0.32, 16);
  }
  for (const [x, z] of [[0.39, -0.20], [0.79, -0.24]]) {
    const plate = cylinder(service, porcelain, 0.18, 0.16, 0.045, x, 1.04, z, 24);
    plate.rotation.x = 1.05;
    mesh(service, new THREE.TorusGeometry(0.14, 0.012, 6, 24), brass, x, 1.04, z + 0.029).rotation.x = -0.52;
  }
  plaque(group, { title: 'SERVICIO DE MESA', subtitle: 'the dining service',
    detail: 'The Alcázar dining room displays pieces from Maximiliano’s Christofle silver service, alongside glassware associated with Porfirio Díaz. These pieces are modeled examples.',
    task: 'castleService' }, -4.25, 0, -49.52);

  const clothing = displayCase(4.25, -50.6, 2.25);
  const skirtProfile = [[0, 0.0], [0.54, 0.0], [0.52, 0.10], [0.40, 0.39], [0.27, 0.68], [0.18, 0.98], [0, 1.0]];
  mesh(clothing, new THREE.LatheGeometry(skirtProfile.map(([x, y]) => new THREE.Vector2(x, y)), 36), fabric, 0.13, 0.92, 0);
  oval(clothing, fabric, 0.13, 2.05, 0, 0.26, 0.34, 0.19);
  cylinder(clothing, embroidered, 0.123, 0.177, 0.10, 0.13, 2.35, 0, 14);
  cylinder(clothing, darkFabric, 0.214, 0.214, 0.065, 0.13, 1.85, 0, 24);
  for (const side of [-1, 1]) {
    oval(clothing, fabric, 0.13 + side * 0.28, 2.13, 0, 0.11, 0.16, 0.11).rotation.z = -side * 0.45;
    oval(clothing, embroidered, 0.13 + side * 0.35, 2.00, 0.01, 0.076, 0.079, 0.087).rotation.z = -side * 0.44;
  }
  for (const [y, r] of [[1.08, 0.485], [1.22, 0.435], [1.39, 0.358]]) {
    mesh(clothing, new THREE.TorusGeometry(r, 0.016, 8, 34), embroidered, 0.13, y, 0).rotation.x = Math.PI / 2;
  }
  plaque(group, { title: 'INDUMENTARIA', subtitle: 'nineteenth-century dress',
    detail: 'A wide skirt like this could be supported by layers of petticoats. This model illustrates the silhouette described in the Alcázar’s introductory gallery.',
    task: 'castleDress' }, 4.25, 0, -49.52);

  const galleryWall = node(group, 0, 0, -56.38);
  const greenStone = material(0x457d61, { map: marble(), roughness: 0.36 });
  box(galleryWall, timber, 4.4, 0.94, 0.80, 0, 0.51, 1.65);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.70;
    mesh(galleryWall, new THREE.LatheGeometry([[0, 0], [0.16, 0.025], [0.10, 0.17], [0.20, 0.28], [0.14, 0.42], [0.105, 0.52], [0.15, 0.55]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 18), greenStone, x, 1.0, 1.63);
  }
  sign(galleryWall, 'MUSEO NACIONAL DE HISTORIA', 'Castillo de Chapultepec', 4.12, 0, 3.85, 0.04, '#733f3b');
  block(-2.20, 2.20, -55.13, -54.31);

  let time = 0;
  const state = { water: 0, calm: 0 };
  let sawGarden = false;
  let enteredGallery = false;
  function update(dt) {
    time += dt;
    for (let i = 0; i < droplets.length; i++) {
      const progress = (time * 0.96 + i * 0.15) % 1;
      const angle = i * Math.PI * 2 / 7;
      droplets[i].position.set(Math.cos(angle) * (0.22 + 1.13 * progress),
        TERRACE + 0.39 + 0.77 * progress + 0.85 * Math.sin(Math.PI * progress) - 0.75 * progress * progress,
        fountainZ + Math.sin(angle) * (0.22 + 1.13 * progress));
    }
    const flagPosition = flagGeo.getAttribute('position');
    for (let i = 0; i < flagPosition.count; i++) {
      const x = flagPosition.getX(i);
      flagPosition.setZ(i, x * 0.12 * Math.sin(x * 3.75 - time * 3.1));
    }
    flagPosition.needsUpdate = true;
    const { x, z } = ctx.player().pos;
    if (!sawGarden && z < 4.8 && z > -12.5) {
      sawGarden = true;
      ctx.complete('castleGarden');
    }
    if (!enteredGallery && z < -25.4) {
      enteredGallery = true;
      ctx.complete('castleGallery');
    }
    state.water = z > STAIR_TOP ? Math.max(0, 1 - Math.hypot(x, z - fountainZ) / 11) * 0.48 : 0;
    state.calm = z > STAIR_TOP ? 0.4 : 0;
  }

  return {
    group, colliders, update, state,
    floorAt(x, z) {
      if (z >= STAIR_TOP) return TERRACE;
      if (z <= STAIR_BOTTOM) return 0;
      return TERRACE * Math.ceil((z - STAIR_BOTTOM) / stepLength) / STEP_COUNT;
    },
    limit(position, radius) {
      const halfWidth = position.z > STAIR_TOP ? 14.25 : position.z < STAIR_BOTTOM ? 11.55 : STAIR_WIDTH * 0.5;
      position.x = THREE.MathUtils.clamp(position.x, -halfWidth + radius, halfWidth - radius);
      position.z = THREE.MathUtils.clamp(position.z, -56.4 + radius, 10.4 - radius);
    },
  };
}
