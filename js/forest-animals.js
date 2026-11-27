import * as THREE from 'three';

export const FOREST_ANIMALS = {
  tiger: { es: 'Tigre de Bengala', en: 'Bengal tiger', type: 'cat', coat: 0xc57638, pale: 0xf4e1bc, mark: 0x291f20, size: 1.36, pattern: 'stripe', task: 'forestTiger', fact: 'Look for the stripes on its shoulders and flanks. A tiger’s stripe pattern is individual to each animal.' },
  maned: { es: 'Lobo de crin', en: 'Maned wolf', type: 'canine', coat: 0xb35d32, pale: 0xe8cab0, mark: 0x30201b, size: 0.93, long: true, fact: 'Long legs and a rusty coat set the maned wolf apart. Look for the dark mane across the shoulders.' },
  fallow: { es: 'Gamo', en: 'Fallow deer', type: 'deer', coat: 0xb78c60, pale: 0xe4cba9, mark: 0x584033, size: 0.94, pattern: 'spot', antler: 'palm', fact: 'Look for pale spots on the coat and broad, flattened antlers on the male.' },
  gray: { es: 'Zorra gris', en: 'Gray fox', type: 'canine', coat: 0x8d8584, pale: 0xe2c3aa, mark: 0x4c403d, size: 0.60, fact: 'The gray fox has a bushy tail and pointed ears. Unlike most canids, it can climb trees.' },
  brown: { es: 'Oso pardo', en: 'Brown bear', type: 'bear', coat: 0x745743, pale: 0xb68d69, mark: 0x372b27, size: 1.43, fact: 'Look for the rounded ears, large paws, and muscular hump behind the head.' },
  elk: { es: 'Wapití', en: 'Elk', type: 'deer', coat: 0x9c7353, pale: 0xdab58a, mark: 0x453027, size: 1.31, antler: 'branch', task: 'forestElk', fact: 'The wapití, also called elk, has branching antlers that it sheds and regrows.' },
  wolf: { es: 'Lobo canadiense', en: 'Canadian wolf', type: 'canine', coat: 0x766e64, pale: 0xcabfa8, mark: 0x3b3631, size: 1.09, task: 'forestWolf', fact: 'Look for the large paws, pointed ears, and thick tail. This wolf has a broad muzzle.' },
  raccoon: { es: 'Perro mapache', en: 'Raccoon dog', type: 'canine', coat: 0x9b795c, pale: 0xc6a98b, mark: 0x42332e, size: 0.66, mask: true, fact: 'The dark markings resemble a raccoon’s mask. The raccoon dog belongs to the dog family.' },
  sika: { es: 'Venado sika', en: 'Sika deer', type: 'deer', coat: 0x956345, pale: 0xd7b593, mark: 0x654837, size: 0.85, pattern: 'spot', antler: 'short', fact: 'A light rump patch and white spots are useful clues when looking for sika deer.' },
  macaque: { es: 'Mono japonés', en: 'Japanese macaque', type: 'monkey', coat: 0x85716a, pale: 0xb2998b, mark: 0xca827a, size: 0.70, fact: 'Its pink face and short tail distinguish it from the other primates along the zoo trails.' },
  tigrillo: { es: 'Tigrillo', en: 'Margay', type: 'cat', coat: 0xb48253, pale: 0xe3c5a0, mark: 0x402a23, size: 0.58, pattern: 'rosette', fact: 'Look for the long tail and spots. The margay uses its tail for balance as it moves among branches.' },
  snow: { es: 'Leopardo de las nieves', en: 'Snow leopard', type: 'cat', coat: 0xa8a7a4, pale: 0xe1ded3, mark: 0x555353, size: 1.19, pattern: 'rosette', task: 'forestSnow', fact: 'Look for the wide paws, gray rosettes, and long, thick tail of this mountain cat.' },
  black: { es: 'Oso negro', en: 'Black bear', type: 'bear', coat: 0x363435, pale: 0x9e7955, mark: 0x1f1c1c, size: 1.19, task: 'forestBlack', fact: 'The black bear has comparatively upright ears. Look for the lighter fur around its muzzle.' },
  owl: { es: 'Lechuza', en: 'Owl', type: 'owl', coat: 0xa5794c, pale: 0xeee2ce, mark: 0x5c3b30, size: 0.77, task: 'forestOwl', fact: 'The pale facial disc frames the owl’s large eyes. Watch it turn its head on the perch.' },
};

const ovalGeo = new THREE.SphereGeometry(1, 16, 11);
const triangleEar = new THREE.ConeGeometry(0.11, 0.30, 5);
const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
const black = material(0x241c1b);
const reflection = new THREE.MeshBasicMaterial({ color: 0xfff2d4 });

function node(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function piece(parent, mat, x, y, z, sx, sy, sz, geometry = ovalGeo) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function curve(parent, mat, points, radius, segments = 10) {
  const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return piece(parent, mat, 0, 0, 0, 1, 1, 1, new THREE.TubeGeometry(path, segments, radius, 6));
}

// Animals share a rig. Silhouettes, coats, and animation distinguish the species.
export function makeForestAnimal(parent, species, scale = 1, antlers = true) {
  const { type, size } = species;
  const body = material(species.coat);
  const light = material(species.pale);
  const marking = material(species.mark);
  const root = node(parent, 0, 0, 0);
  root.scale.setScalar(size * scale);
  if (type === 'owl') {
    piece(root, body, 0, 0.46, 0, 0.22, 0.36, 0.21);
    piece(root, marking, 0, 0.20, -0.19, 0.10, 0.20, 0.067).rotation.x = -0.37;
    for (const side of [-1, 1]) {
      piece(root, marking, side * 0.18, 0.43, -0.06, 0.09, 0.29, 0.14).rotation.z = side * 0.14;
      piece(root, marking, side * 0.1, 0.071, 0.08, 0.05, 0.039, 0.11);
    }
    const head = node(root, 0, 0.76, 0.035);
    piece(head, body, 0, 0, 0, 0.247, 0.218, 0.194);
    for (const side of [-1, 1]) {
      piece(head, light, side * 0.077, 0.003, 0.144, 0.143, 0.176, 0.067).rotation.z = side * 0.34;
      piece(head, black, side * 0.088, 0.036, 0.201, 0.041, 0.044, 0.016);
      piece(head, reflection, side * 0.088 + 0.012, 0.05, 0.213, 0.011, 0.011, 0.007);
    }
    piece(head, marking, 0, -0.061, 0.198, 0.035, 0.075, 0.035);
    return { root, head, tail: null, legs: [], stationary: true };
  }

  const isBear = type === 'bear';
  const isDeer = type === 'deer';
  const isCat = type === 'cat';
  const isMonkey = type === 'monkey';
  const legHeight = isBear ? 0.60 : isDeer || species.long ? 0.99 : isMonkey ? 0.46 : species.mask ? 0.43 : 0.65;
  const mass = isBear ? 0.49 : isDeer ? 0.33 : isMonkey ? 0.30 : 0.35;
  const length = isBear ? 0.81 : isMonkey ? 0.47 : isCat ? 0.75 : 0.66;
  const shoulder = legHeight + mass * 0.38;
  piece(root, body, 0, shoulder, 0, mass, mass * 0.83, length);
  piece(root, light, 0, shoulder - mass * 0.45, 0.23, mass * 0.84, mass * 0.5, length * 0.62);
  const breast = piece(root, type === 'deer' ? marking : body, 0, shoulder + 0.08, length * 0.54,
    mass * (isBear ? 0.98 : 0.76), mass * (isDeer ? 1.25 : 0.9), length * 0.50);
  if (isDeer) breast.rotation.x = Math.PI * 0.20;
  if (species.long) piece(root, marking, 0, shoulder + 0.28, 0.33, 0.16, 0.20, 0.32);

  const h = isDeer ? 0.95 : isMonkey ? 0.48 : isBear ? 0.20 : 0.35;
  const head = node(root, 0, legHeight + h, length * (isDeer ? 0.85 : 0.89));
  if (isDeer) {
    piece(root, marking, 0, shoulder + 0.39, length * 0.56, 0.188, 0.54, 0.24).rotation.x = Math.PI * 0.18;
  }
  const faceW = isBear ? 0.29 : isDeer ? 0.16 : isMonkey ? 0.21 : isCat ? 0.244 : 0.204;
  piece(head, body, 0, 0, 0.055, faceW, faceW * 0.91, faceW * 1.10);
  if (isMonkey) {
    piece(head, marking, 0, -0.008, 0.226, 0.162, 0.156, 0.079);
    piece(head, marking, 0, -0.12, 0.252, 0.113, 0.078, 0.077);
  } else {
    const muzzle = isCat ? 0.24 : isBear ? 0.30 : 0.32;
    piece(head, light, 0, -faceW * 0.42, muzzle, faceW * 0.70, faceW * 0.51, 0.142);
    piece(head, black, 0, -faceW * 0.35, muzzle + 0.121, faceW * 0.41, 0.046, 0.053);
  }
  for (const side of [-1, 1]) {
    const eyeZ = isMonkey ? 0.290 : faceW * 0.74 + 0.067;
    if (species.mask) piece(head, marking, side * 0.115, 0.022, 0.192, 0.105, 0.087, 0.046);
    if (isCat) piece(head, light, side * faceW * 0.53, -0.049, 0.193, 0.113, 0.076, 0.074);
    piece(head, black, faceW * 0.63 * side, faceW * 0.19, eyeZ, 0.030, 0.029, 0.019);
    piece(head, reflection, faceW * 0.63 * side + 0.008, faceW * 0.19 + 0.009, eyeZ + 0.013, 0.007, 0.007, 0.005);
    if (isBear || isCat || isMonkey || species.mask) {
      const earY = isMonkey ? 0.004 : faceW * 0.86;
      const earX = side * faceW * (isMonkey ? 1.0 : 0.78);
      piece(head, body, earX, earY, 0.009, 0.096, 0.095, 0.055);
      piece(head, isCat ? marking : light, earX, earY + 0.013, 0.054, 0.050, 0.054, 0.021);
    } else {
      const ear = piece(head, body, side * faceW * 0.8, faceW * 1.02, -0.007,
        isDeer ? 0.73 : 1.0, species.long ? 1.33 : 0.90, 0.57, triangleEar);
      ear.rotation.z = -side * (isDeer ? 0.75 : 0.31);
    }
  }

  if (isDeer && antlers) {
    const horn = material(0xcabb9e);
    const palm = species.antler === 'palm';
    const spread = species.antler === 'short' ? 0.24 : 0.45;
    for (const side of [-1, 1]) {
      const base = [side * 0.091, 0.114, 0.010];
      curve(head, horn, [base, [side * 0.20, 0.34, -0.11], [side * spread, 0.62, -0.24], [side * (spread + 0.09), 0.82, -0.43]], 0.025);
      for (const t of [0.26, 0.42, 0.59]) {
        const x = side * (0.10 + spread * t);
        curve(head, horn, [[x, t, -t * 0.33], [x + side * 0.065, t + 0.12, -t * 0.3 + 0.13],
          [x + side * 0.08, t + 0.25, -t * 0.3 + 0.19]], 0.018);
      }
      if (palm) piece(head, horn, side * (spread - 0.09), 0.55, -0.19, 0.114, 0.21, 0.044).rotation.z = -side * 0.52;
    }
  }

  const legs = [];
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const z = end * length * 0.58;
      const leg = node(root, side * mass * 0.67, legHeight + 0.13, z);
      piece(leg, body, 0, -legHeight * 0.26, 0, mass * 0.43, legHeight * 0.49, mass * 0.42);
      piece(leg, species.long || isDeer ? marking : body, 0, -legHeight * 0.74, 0.016,
        mass * (isBear ? 0.37 : 0.28), legHeight * 0.38, 0.081);
      piece(leg, isBear || isCat ? body : marking, 0, -legHeight - 0.075, 0.039, mass * 0.36, 0.065, 0.112);
      legs.push(leg);
    }
  }

  const tail = node(root, 0, shoulder + 0.09, -length * 0.89);
  const tailLength = isCat ? 1.19 : isBear || isMonkey ? 0.21 : isDeer ? 0.27 : 0.77;
  const tailRadius = species === FOREST_ANIMALS.snow ? 0.115 : isCat ? 0.062 : 0.081;
  if (isCat) {
    curve(tail, body, [[0, 0, 0], [0.045, -0.17, -0.34], [0.14, -0.11, -0.74], [0.23, 0.13, -tailLength]], tailRadius);
    for (const [i, y] of [[0, -0.128], [1, -0.135], [2, -0.091], [3, 0.02]]) {
      piece(tail, marking, 0.062 + i * 0.044, y, -0.32 - i * 0.205, tailRadius * 1.06, 0.052, 0.039);
    }
  } else {
    piece(tail, isDeer ? light : body, 0, -tailLength * 0.20, -tailLength * 0.40,
      isBear ? 0.083 : 0.11, 0.088, tailLength * 0.57).rotation.x = -0.35;
    if (type === 'canine') piece(tail, marking, 0, -tailLength * 0.25, -tailLength * 0.82, 0.072, 0.067, 0.12);
  }

  if (species.pattern) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 5; i++) {
          const z = ((i - 2) * 0.145 + (row % 2) * 0.07) * length / 0.75;
          const relY = (row - 1) * mass * 0.34;
          const r = Math.sqrt(Math.max(0.15, 1 - (z / length) ** 2 - (relY / (mass * 0.83)) ** 2));
          const x = side * (mass * r + 0.004);
          const mark = species.pattern === 'spot' ? light : marking;
          if (species.pattern === 'stripe') {
            if (row === 2) continue;
            const stripe = piece(root, mark, x, shoulder + relY + 0.09, z, 0.022, 0.114, 0.026);
            stripe.rotation.x = (i % 2 ? -1 : 1) * 0.33;
          } else {
            piece(root, mark, x, shoulder + relY, z, 0.017, 0.034, 0.055);
            if (species.pattern === 'rosette') piece(root, body, x + side * 0.012, shoulder + relY + 0.004, z, 0.012, 0.013, 0.026);
          }
        }
      }
    }
  }

  return { root, head, tail, legs, stationary: false };
}
