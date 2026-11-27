// Loose $5 peso coins lying around the zoo and the arena (never in the hotel).
// Walk over one to pick it up; the coin presses take two per souvenir coin.
import * as THREE from 'three';

// Hand-placed spots per place. Extra coins sit near the shops and all over
// Arena México. Spots that turn out to be inside furniture are skipped.
const SPOTS = {
  axolotls: [[3.5, 11.0], [5.4, 11.0], [-2.5, 10.5], [1.6, 5.1]],
  forest: [[-10.8, 9.1], [-11.1, -11.7], [-13.3, -30.2], [0, -39.6], [10.8, -17.2], [10.6, 5.1]],
  arena: [
    // Merch stand and snack stand.
    [-4.3, 14.5], [-3.2, 14.4], [-5.4, 14.5], [-4.3, 17.0],
    [4.3, 14.5], [3.2, 14.4], [5.4, 14.5], [4.3, 17.0],
    // Entrance stage.
    [0, 14.3], [-2.6, 17.6], [2.6, 17.6], [0, 21.5],
    // Arena floor around the ring.
    [-6, 0], [6, 0], [0, -6.2], [0, 6.5], [-9, -8], [9, 8], [11, -4], [-11, 5], [-12, 10.5], [12, -10.5], [6.5, -9], [-6.5, 9.5],
  ],
  aviary: [
    [-36, 44], [-36.6, 30], [-35.4, 15], [-36.3, 0], [-35.6, -15], [-36, -28],
    [-29.1, -51.2], [0, -66], [29.1, -51.2],
    [36.4, -20], [35.6, 0], [36, 25], [36.3, 48],
  ],
  pandas: [
    // Souvenir kiosk and coin machine.
    [-3.6, 10.4], [-3.6, 11.5], [-3.6, 12.6], [3.55, 13.3], [3.55, 14.8],
    [0, 9.2], [-2, 15.8], [-7.5, 2.2], [7.5, 2.2], [0, 4.2],
    [8, 10.6], [14, 10.6], [22, 10.6],
  ],
  tropical: [
    [0, 24], [0, 20.5], [-20, 19.6], [-28, 8], [-28, -6], [-17, -20], [-4, -21], [8, -21], [21, -18.8],
    [28, -6], [28, 6], [17.5, 19], [8, 20], [-9, 20], [-18, 1.6], [-5, 0.8], [6, 1.2], [17, 1.6],
  ],
  coastal: [
    // By the coin press.
    [3.7, 5.8], [5.4, 5.7], [2.9, 4.4],
    [-5, 12], [6, 14], [-10, 6], [10, 2], [-3, 0.5], [0, 14.5], [-12, -4], [12, -6],
  ],
};

export function buildPesos(places, ctx) {
  const rim = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 0.9, roughness: 0.25, emissive: 0x222222 });
  const core = new THREE.MeshStandardMaterial({ color: 0xe6b84a, metalness: 0.9, roughness: 0.25, emissive: 0x3a2a08 });
  const rimGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 28).rotateX(Math.PI / 2);
  const coreGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.034, 24).rotateX(Math.PI / 2);
  const glowGeo = new THREE.CircleGeometry(0.28, 24).rotateX(-Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.35, depthWrite: false });
  const byPlace = {};
  const blocked = (p, x, z) =>
    p.colliders.some((c) => (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + 0.3 : x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3));
  for (const p of places) {
    const spots = SPOTS[p.id];
    if (!spots) continue;
    const list = [];
    for (const [x, z] of spots) {
      if (blocked(p, x, z)) continue;
      const y = p.floorAt ? p.floorAt(x, z) : 0;
      const g = new THREE.Group();
      g.position.set(x, y + 0.42, z);
      g.add(new THREE.Mesh(rimGeo, rim), new THREE.Mesh(coreGeo, core));
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = -0.4;
      g.add(glow);
      g.traverse((o) => (o.raycast = () => {}));
      p.root.add(g);
      list.push({ g, x, z, y, taken: false, phase: Math.random() * 6 });
    }
    byPlace[p.id] = list;
  }
  function update(place, pos, t) {
    const list = byPlace[place.id];
    if (!list) return;
    for (const c of list) {
      if (c.taken) continue;
      c.g.rotation.y = t * 2.5 + c.phase;
      c.g.position.y = c.y + 0.42 + Math.sin(t * 3 + c.phase) * 0.05;
      if (Math.hypot(pos.x - c.x, pos.z - c.z) < 0.7 && Math.abs(pos.y - c.y) < 1) {
        c.taken = true;
        c.g.visible = false;
        ctx.collect();
      }
    }
  }
  const counts = () => Object.fromEntries(Object.entries(byPlace).map(([k, v]) => [k, v.length]));
  return { update, counts, byPlace };
}
