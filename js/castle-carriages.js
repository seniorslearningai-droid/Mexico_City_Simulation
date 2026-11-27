import * as THREE from 'three';

// Carriage bodies are aligned along the local z axis, with the driver's seat at +z.
export function createCarriage(type) {
  const carriage = new THREE.Group();
  const standard = (color, metalness = 0, roughness = 0.57) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const gilt = type === 'gala';
  const open = type === 'calesa';
  const metal = standard(gilt ? 0xc89a47 : 0xa18354, 0.52);
  const wheel = standard(gilt ? 0xc49442 : open ? 0x402d25 : 0x61372b, 0.08);
  const tire = standard(0x2a2321, 0.48);
  const lacquer = standard(gilt ? 0x49242c : open ? 0x30433b : 0x492722, 0.15, 0.33);
  const leather = standard(open ? 0x713d3b : 0x522b2e);
  const black = standard(0x242124);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7a969f, metalness: 0.28, roughness: 0.25, transparent: true, opacity: 0.43, depthWrite: false,
  });
  function mesh(geometry, material, x, y, z, parent = carriage) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    parent.add(part);
    return part;
  }
  const box = (material, w, h, d, x, y, z, parent) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const dome = (material, w, h, d, x, y, z) => {
    const part = mesh(new THREE.SphereGeometry(1, 16, 10), material, x, y, z);
    part.scale.set(w, h, d);
    return part;
  };
  function rod(a, b, radius, material) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const vector = end.clone().sub(start);
    const part = mesh(new THREE.CylinderGeometry(radius, radius, vector.length(), 7),
      material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize());
  }
  for (const [z, radius] of [[-0.93, 0.73], [1.04, 0.53]]) {
    rod([-1.02, radius, z], [1.02, radius, z], 0.075, black);
    for (const side of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(radius - 0.035, 0.047, 8, 36), wheel, side * 0.93, radius, z);
      ring.rotation.y = Math.PI / 2;
      mesh(new THREE.TorusGeometry(radius, 0.019, 7, 36), tire, side * 0.93, radius, z).rotation.y = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.16, 12), metal, side * 0.94, radius, z).rotation.z = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const spoke = box(wheel, 0.048, radius - 0.05, 0.038, 0, 0, 0);
        spoke.position.set(side * 0.93, radius + 0.5 * radius * Math.cos(angle), z + 0.5 * radius * Math.sin(angle));
        spoke.rotation.x = angle;
      }
    }
  }
  for (const x of [-0.62, 0.62]) {
    rod([x, 0.69, -1.47], [x, 0.56, 1.45], 0.067, black);
    rod([x, 0.55, 1.34], [x * 1.15, 0.78, 2.30], 0.046, wheel);
    box(black, 0.27, 0.066, 0.43, x * 1.19, 0.93, 0.16);
  }

  dome(lacquer, 0.72, 0.36, 1.18, 0, 1.19, -0.17);
  box(lacquer, 1.29, 0.28, 1.85, 0, 1.23, -0.17);
  box(metal, 1.38, 0.042, 1.98, 0, 1.37, -0.17);
  box(leather, 1.12, 0.115, 0.38, 0, 1.48, -0.76);
  box(leather, 1.12, 0.43, 0.13, 0, 1.66, -0.94);

  if (open) {
    for (const x of [-0.63, 0.63]) {
      box(lacquer, 0.075, 0.30, 1.20, x, 1.53, -0.27);
      box(metal, 0.075, 0.039, 1.20, x, 1.69, -0.27);
    }
    box(lacquer, 1.27, 0.23, 0.10, 0, 1.53, 0.32);
    dome(black, 0.67, 0.24, 0.33, 0, 1.89, -0.85);
  } else {
    const cabinTop = gilt ? 2.48 : 2.20;
    const cabinMiddle = (cabinTop + 1.37) / 2;
    const cabinHeight = cabinTop - 1.37;
    box(lacquer, 1.25, cabinHeight, 0.32, 0, cabinMiddle, -0.96);
    box(lacquer, 1.25, cabinHeight, 0.16, 0, cabinMiddle, 0.46);
    for (const side of [-1, 1]) {
      for (const z of [-0.79, 0.12, 0.48]) box(metal, 0.058, cabinHeight, 0.048, side * 0.645, cabinMiddle, z);
      box(lacquer, 0.065, 0.40, 1.20, side * 0.642, 1.55, -0.145);
      box(glass, 0.019, cabinHeight - 0.44, 1.19, side * 0.647, (cabinTop + 1.80) / 2, -0.15);
      box(metal, 0.04, 0.037, 1.26, side * 0.657, 1.81, -0.15);
      dome(metal, 0.037, 0.13, 0.14, side * 0.68, 1.56, -0.28);
      dome(lacquer, 0.047, 0.088, 0.096, side * 0.69, 1.57, -0.28);
      if (gilt) {
        for (const z of [-0.72, 0.28]) {
          dome(metal, 0.095, 0.16, 0.075, side * 0.68, 1.49, z);
          dome(metal, 0.065, 0.066, 0.065, side * 0.72, 1.65, z);
        }
      }
    }
    box(metal, 1.42, 0.06, 1.85, 0, cabinTop, -0.23);
    dome(lacquer, 0.71, 0.21, 0.94, 0, cabinTop + 0.03, -0.23);
    if (gilt) {
      mesh(new THREE.CylinderGeometry(0.14, 0.075, 0.11, 10), metal, 0, cabinTop + 0.25, -0.22);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        dome(metal, 0.036, 0.07, 0.036, Math.cos(a) * 0.118, cabinTop + 0.32, -0.22 + Math.sin(a) * 0.118);
      }
    }
  }

  box(lacquer, 1.18, 0.21, 0.46, 0, 1.10, 0.85);
  box(leather, 1.16, 0.12, 0.42, 0, 1.24, 0.84);
  box(leather, 1.15, 0.23, 0.095, 0, 1.33, 0.63);
  for (const side of [-1, 1]) {
    rod([side * 0.65, 1.21, 0.64], [side * 0.77, 1.76, 0.58], 0.027, metal);
    box(metal, 0.15, 0.25, 0.15, side * 0.77, 1.85, 0.58);
    box(glass, 0.154, 0.13, 0.156, side * 0.77, 1.85, 0.58);
    dome(metal, 0.105, 0.073, 0.10, side * 0.77, 1.99, 0.58);
  }
  return carriage;
}
