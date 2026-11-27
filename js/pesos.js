// Loose $5 peso coins lying around the zoo and the arena (never in the hotel).
// Walk over one to pick it up; the coin presses take two per souvenir coin.
import * as THREE from 'three';
import { billTexture } from './atm.js';

// Hand-placed spots per place. Extra spots sit near the shops and all over
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

// One $20 bill hides in just one of these tucked-away zoo spots each game.
const BILL_SPOTS = {
  aviary: [[-29.1, -51.2], [36.3, 48]],
  pandas: [[22, 10.6], [-7.5, 2.2]],
  coastal: [[-12, -4], [12, -6]],
  axolotls: [[1.6, 5.1]],
  forest: [[0, -39.6], [-13.3, -30.2]],
  tropical: [[-24.4, -18.6], [27.4, -13.4], [24, 17.8]],
};

// Only some spots get a coin each game, so they're not always in the same place.
const SHARE = 0.4;

export function buildPesos(places, ctx) {
  // No glow: the coins are a dull, worn silver and gold, lying flat on the ground.
  const rim = new THREE.MeshStandardMaterial({ color: 0xb4b2a8, metalness: 0.8, roughness: 0.45 });
  const core = new THREE.MeshStandardMaterial({ color: 0xb8954a, metalness: 0.8, roughness: 0.45 });
  const rimGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.022, 24);
  const coreGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.025, 20);
  // A tiny glint that flashes now and then: the only thing that gives a coin away.
  const glintTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,240,1)');
    grd.addColorStop(0.25, 'rgba(255,240,190,0.5)');
    grd.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,240,0.9)';
    g.fillRect(30, 4, 4, 56);
    g.fillRect(4, 30, 56, 4);
    return new THREE.CanvasTexture(c);
  })();
  const byPlace = {};
  let bill = null;
  const blocked = (p, x, z) =>
    p.colliders.some((c) => (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + 0.3 : x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3));
  // Pick the bill's hiding spot first, so no coin sits right next to it.
  const billSpots = [];
  for (const p of places) for (const [x, z] of BILL_SPOTS[p.id] || []) if (!blocked(p, x, z)) billSpots.push({ p, x, z });
  if (billSpots.length) {
    const { p, x, z } = billSpots[Math.floor(Math.random() * billSpots.length)];
    const y = p.floorAt ? p.floorAt(x, z) : 0;
    // Flat on the ground, dull and a little crumpled-looking: no glint at all.
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.12).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: billTexture(), color: 0xa8b4b8, roughness: 0.95, side: THREE.DoubleSide }),
    );
    m.position.set(x, y + 0.012, z);
    m.rotation.set(0.06, Math.random() * 6.3, -0.05);
    m.raycast = () => {};
    p.root.add(m);
    bill = { m, p, x, z, y, taken: false };
  }
  for (const p of places) {
    const spots = SPOTS[p.id];
    if (!spots) continue;
    const open = spots.filter(([x, z]) => !blocked(p, x, z) && !(bill && bill.p === p && Math.hypot(x - bill.x, z - bill.z) < 3));
    // Shuffle and keep a share of the spots (at least two per place).
    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [open[i], open[j]] = [open[j], open[i]];
    }
    const keep = open.slice(0, Math.max(2, Math.round(open.length * SHARE)));
    const list = [];
    for (const [x, z] of keep) {
      const y = p.floorAt ? p.floorAt(x, z) : 0;
      const g = new THREE.Group();
      g.position.set(x, y + 0.013, z);
      g.rotation.set((Math.random() - 0.5) * 0.12, Math.random() * 6.3, (Math.random() - 0.5) * 0.12);
      g.add(new THREE.Mesh(rimGeo, rim), new THREE.Mesh(coreGeo, core));
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthWrite: false, opacity: 0 }));
      glint.position.y = 0.05;
      glint.scale.setScalar(0.32);
      g.add(glint);
      g.traverse((o) => (o.raycast = () => {}));
      p.root.add(g);
      list.push({ g, glint, x, z, y, taken: false, phase: Math.random() * 6, every: 3.5 + Math.random() * 3 });
    }
    byPlace[p.id] = list;
  }
  function update(place, pos, t) {
    if (bill && !bill.taken && bill.p === place && Math.hypot(pos.x - bill.x, pos.z - bill.z) < 0.5 && Math.abs(pos.y - bill.y) < 1) {
      bill.taken = true;
      bill.m.visible = false;
      ctx.collectBill && ctx.collectBill();
    }
    const list = byPlace[place.id];
    if (!list) return;
    for (const c of list) {
      if (c.taken) continue;
      // A short flash once every few seconds.
      const k = ((t + c.phase) % c.every) / 0.35;
      c.glint.material.opacity = k < 1 ? Math.sin(k * Math.PI) * 0.9 : 0;
      if (Math.hypot(pos.x - c.x, pos.z - c.z) < 0.5 && Math.abs(pos.y - c.y) < 1) {
        c.taken = true;
        c.g.visible = false;
        ctx.collect();
      }
    }
  }
  const counts = () => Object.fromEntries(Object.entries(byPlace).map(([k, v]) => [k, v.length]));
  return { update, counts, byPlace, bill: () => bill };
}
