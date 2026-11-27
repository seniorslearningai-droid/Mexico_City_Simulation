// Air BnB, suite 602, on the sixth floor above Paseo de la Reforma.
// Everything here is in meters; north (-z) faces the avenue.
//
// Floor plan (looking down):
//
//   z=-5 ┌────── window ───────┬──── balcony door ──── window ──┐
//        │   MASTER BEDROOM    │          LIVING ROOM           │
//        │   bed               │      couch ▸ ▸ ▸ TV            │
//  z=-0.4├─────┬───────┬─door──┼───── arch ─────┬───────────────┤
//        │BATH │CLOSET door  H │     DINING     │               │
//        │  2 door      │   A door  (round     open to kitchen   │
//   z=2  ├─────┴───────┤   L │      table)    │    island     │
//        │  BATHROOM  door  L ├───── arch ─────┘               │
//   z=5  ├─────────────┴─door─┤     FOYER          KITCHEN    │
//        │     BEDROOM        ├───[front door]──┴───────────────┘ z=6.4
//   z=9  └────────────────────┘
//      x=-10.6      -4.6  -3.2 -3.0           1.0            5.0
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as T from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const ease = (k) => k * k * (3 - 2 * k);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = 2.8; // ceiling height

// Give a box UVs in meters. With an offset (the box's world center) the
// pattern lines up across neighbouring boxes, so tiles and planks match.
export function meterUV(geo, ox = 0, oy = 0, oz = 0) {
  const uv = geo.attributes.uv;
  const p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const f = Math.floor(i / 4);
    const x = p.getX(i) + ox;
    const y = p.getY(i) + oy;
    const z = p.getZ(i) + oz;
    if (f < 2) uv.setXY(i, z, y);
    else if (f < 4) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  return geo;
}

// Rooms (floor rectangles), used to tell where you are.
const ROOMS = {
  closet: { x0: -7.6, x1: -4.6, z0: -0.4, z1: 2.0 },
  bath2: { x0: -10.6, x1: -7.6, z0: -0.4, z1: 2.0 },
};
export const SUITE_SPAWN = { x: -1.1, z: 5.7, yaw: 0, pitch: -0.04 };

export function buildRoom(ctx) {
  const group = new THREE.Group();
  const colliders = [];
  const updaters = [];
  const shadowLights = [];
  const api = { group, colliders, shadowLights, dirty: true, mirror: null, update };

  const tex = {
    wood: T.woodFloor(),
    grain: T.woodGrain(),
    plaster: T.plaster(),
    tile: T.talavera(),
    saltillo: T.saltillo(),
    rug: T.rug(),
    sarape: T.sarape(),
    fabric: T.fabric(),
    marble: T.marble(),
    painting: T.painting(),
    poster: T.poster(),
  };
  const lampTile = tex.tile.clone();
  lampTile.repeat.set(4, 2);
  lampTile.needsUpdate = true;

  const M = {
    wall: std({ color: 0xf2eadf, map: tex.plaster, roughness: 0.95 }),
    accent: std({ color: 0xc4507c, map: tex.plaster, roughness: 0.95 }),
    accent2: std({ color: 0x3f8f8a, map: tex.plaster, roughness: 0.95 }),
    warm: std({ color: 0xe8c48e, map: tex.plaster, roughness: 0.95 }),
    ceiling: std({ color: 0xfbf8f3, roughness: 1 }),
    floor: std({ map: tex.wood, roughness: 0.5 }),
    saltillo: std({ map: tex.saltillo, roughness: 0.75 }),
    tile: std({ map: tex.tile, roughness: 0.22 }),
    trim: std({ color: 0x1f3d8c, roughness: 0.3 }),
    walnut: std({ map: tex.grain, color: 0x8a5a3a, roughness: 0.55 }),
    oak: std({ map: tex.grain, color: 0xe6c79c, roughness: 0.6 }),
    cabinet: std({ map: tex.grain, color: 0x2c6b70, roughness: 0.55 }),
    white: std({ color: 0xf6f3ee, roughness: 0.45 }),
    porcelain: std({ color: 0xffffff, roughness: 0.12 }),
    chrome: std({ color: 0xeeeeee, metalness: 1, roughness: 0.12 }),
    steel: std({ color: 0xc8ccd0, metalness: 0.85, roughness: 0.3 }),
    brass: std({ color: 0xd1a659, metalness: 1, roughness: 0.3 }),
    black: std({ color: 0x1c1c1f, metalness: 0.4, roughness: 0.45 }),
    glassTop: std({ color: 0x0b0b0d, metalness: 0.2, roughness: 0.08 }),
    linen: std({ color: 0xf7f4ee, roughness: 1 }),
    headboard: std({ color: 0x2c6b70, map: tex.fabric, roughness: 1 }),
    mustard: std({ color: 0xd99a26, map: tex.fabric, roughness: 1 }),
    pink: std({ color: 0xd9447a, map: tex.fabric, roughness: 1 }),
    teal: std({ color: 0x2f8a88, map: tex.fabric, roughness: 1 }),
    sofa: std({ color: 0x3a5f8a, map: tex.fabric, roughness: 1 }),
    leather: std({ color: 0x9c5a30, roughness: 0.5 }),
    curtain: std({ color: 0xeee5d3, map: tex.fabric, roughness: 1, side: THREE.DoubleSide }),
    glass: std({ color: 0xcfe4ee, transparent: true, opacity: 0.13, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    marble: std({ map: tex.marble, roughness: 0.18 }),
    terracotta: std({ color: 0xb85a32, roughness: 0.85 }),
    clay: std({ color: 0x9a4a2a, roughness: 0.7 }),
    cactus: std({ color: 0x3f7a4a, roughness: 0.65 }),
    agave: std({ color: 0x6f9e8e, roughness: 0.55 }),
    rug: std({ map: tex.rug, roughness: 1 }),
    sarape: std({ map: tex.sarape, roughness: 1 }),
    canvas: std({ map: tex.painting, roughness: 0.85 }),
    poster: std({ map: tex.poster, roughness: 0.7 }),
    lampTile: std({ map: lampTile, roughness: 0.25 }),
    screenOff: std({ color: 0x08080a, roughness: 0.12, metalness: 0.3 }),
    water: std({ color: 0xbfe3ff, transparent: true, opacity: 0.55, roughness: 0.05 }),
    tubWater: std({ color: 0x9fd2e8, transparent: true, opacity: 0.7, roughness: 0.05, metalness: 0.1 }),
  };

  // ---------- helpers ----------
  function add(parent, mesh, x = 0, y = 0, z = 0) {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const box = (p, mat, w, h, d, x, y, z) => add(p, new THREE.Mesh(meterUV(new THREE.BoxGeometry(w, h, d)), mat), x, y, z);
  function wbox(p, mat, x0, y0, z0, x1, y1, z1) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    const geo = meterUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), cx, cy, cz);
    return add(p, new THREE.Mesh(geo, mat), cx, cy, cz);
  }
  const rbox = (p, mat, w, h, d, r, x, y, z) => add(p, new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat), x, y, z);
  const cyl = (p, mat, rt, rb, h, x, y, z, seg = 24, open = false) =>
    add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat), x, y, z);
  const sphere = (p, mat, r, x, y, z, seg = 16) => add(p, new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat), x, y, z);
  const node = (p, x = 0, y = 0, z = 0, ry = 0) => {
    const g = add(p, new THREE.Group(), x, y, z);
    g.rotation.y = ry;
    return g;
  };
  function solid(x0, z0, x1, z1) {
    const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), off: false };
    colliders.push(c);
    return c;
  }
  function interact(objs, def) {
    for (const o of [].concat(objs)) o.traverse((c) => (c.userData.interact = def));
    return def;
  }
  function noShadow(...objs) {
    for (const o of objs) o.traverse((c) => (c.userData.noShadow = true));
  }
  function noRay(...objs) {
    for (const o of objs) o.traverse((c) => (c.raycast = () => {}));
  }
  // An on/off state that animates `k` between 0 and 1 and calls apply(eased k).
  function toggler(apply, speed = 2.2, { dirty = true } = {}) {
    const s = { on: false, k: 0 };
    updaters.push((dt) => {
      const target = s.on ? 1 : 0;
      if (s.k === target) return;
      s.k = target > s.k ? Math.min(1, s.k + dt * speed) : Math.max(0, s.k - dt * speed);
      apply(ease(s.k), s.k);
      if (dirty) api.dirty = true;
    });
    apply(0, 0);
    s.set = (on) => {
      s.on = on;
      s.k = on ? 1 : 0;
      apply(s.k, s.k);
    };
    return s;
  }
  function spotLight(color, x, z, shadow = false) {
    const l = new THREE.SpotLight(color, 0, 7, 1.05, 0.9, 2);
    l.position.set(x, H - 0.05, z);
    l.target.position.set(x, 0, z);
    group.add(l, l.target);
    if (shadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.camera.near = 0.1;
      l.shadow.camera.far = 10;
      l.shadow.bias = -0.0008;
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
      shadowLights.push(l);
    }
    return l;
  }
  function pointLight(color, distance, x, y, z) {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.position.set(x, y, z);
    group.add(l);
    return l;
  }
  // Wall from (x0,z0) to (x1,z1) between heights y0 and y1. Solid if it reaches the floor.
  function W(x0, z0, x1, z1, y0 = 0, y1 = H, mat = M.wall) {
    wbox(group, mat, x0, y0, z0, x1, y1, z1);
    if (y0 === 0) solid(x0, z0, x1, z1);
  }
  // White casing around a doorway. along = 'x' (wall runs along x at z = c) or 'z'.
  function casing(along, c, a0, a1, top, depth = 0.16) {
    const g = (p0, p1, q0, q1, y0, y1) => (along === 'x' ? wbox(group, M.white, p0, y0, q0, p1, y1, q1) : wbox(group, M.white, q0, y0, p0, q1, y1, p1));
    // The trim stands 3 mm proud of the opening's sides and top. If it lined
    // up exactly with the wall's ends, the two surfaces would flicker.
    const r = 0.003;
    g(a0 - 0.06, a0 + r, c - depth / 2, c + depth / 2, 0, top + 0.06);
    g(a1 - r, a1 + 0.06, c - depth / 2, c + depth / 2, 0, top + 0.06);
    g(a0 - 0.06, a1 + 0.06, c - depth / 2, c + depth / 2, top - r, top + 0.06);
  }
  // An interior door on a hinge. `free` points along the wall from the hinge to
  // the latch, `into` is the side it swings into. Doors start open.
  function hingedDoor(hx, hz, width, free, into, label) {
    const yawOf = (d) => Math.atan2(-d[1], d[0]);
    const closedYaw = yawOf(free);
    const openYaw = closedYaw + wrapAngle(yawOf(into) - closedYaw);
    const pivot = node(group, hx, 0, hz, closedYaw);
    box(pivot, M.white, width - 0.03, 2.1, 0.04, width / 2, 1.05, 0);
    for (const s of [-1, 1]) {
      box(pivot, M.white, width - 0.25, 0.8, 0.01, width / 2, 1.55, s * 0.025);
      box(pivot, M.chrome, 0.12, 0.02, 0.02, width - 0.12, 1.0, s * 0.04);
    }
    const t = 0.05;
    const closed = solid(hx - (free[0] ? 0 : t), hz - (free[1] ? 0 : t), hx + free[0] * width + (free[0] ? 0 : t), hz + free[1] * width + (free[1] ? 0 : t));
    const open = solid(hx - (into[0] ? 0 : t), hz - (into[1] ? 0 : t), hx + into[0] * width + (into[0] ? 0 : t), hz + into[1] * width + (into[1] ? 0 : t));
    const st = toggler((k) => {
      pivot.rotation.y = closedYaw + (openYaw - closedYaw) * (1 - k);
      closed.off = k < 0.5;
      open.off = k >= 0.5;
    }, 1.6);
    st.set(false); // k = 0 means open here
    interact(pivot, {
      label: () => (st.on ? `Open the ${label} door` : `Close the ${label} door`),
      act: () => (st.on = !st.on),
    });
    return st;
  }

  // ---------- floors and ceiling ----------
  const floor = (mat, x0, z0, x1, z1) => wbox(group, mat, x0, -0.2, z0, x1, 0, z1);
  floor(M.floor, -3.1, -5.0, 1.0, -0.4); // living
  floor(M.floor, -3.0, -0.4, 1.0, 6.4); // dining + foyer
  floor(M.saltillo, 1.0, -0.4, 2.85, 3.0); // open connection to the dining room
  floor(M.saltillo, 1.0, 3.0, 5.0, 6.4); // kitchen
  floor(M.floor, -7.0, -5.0, -3.1, -0.4); // master bedroom
  floor(M.floor, -4.6, -0.4, -3.0, 5.0); // hallway
  floor(M.floor, -7.6, -0.4, -4.6, 2.0); // closet
  floor(M.saltillo, -10.6, -0.4, -7.6, 2.0); // bathroom in the closet
  floor(M.saltillo, -10.6, 2.0, -4.6, 5.0); // bathroom
  floor(M.floor, -7.0, 5.0, -3.0, 9.0); // bedroom
  wbox(group, M.black, -2.6, -0.2, -5.15, 0.6, 0.012, -5);
  wbox(group, M.ceiling, -10.75, H, -5.15, 5.15, H + 0.15, 9.15);

  // ---------- outer walls ----------
  W(-10.75, -5.15, -6.5, -5.0);
  W(-6.5, -5.15, -3.7, -5.0, 0, 0.5);
  W(-6.5, -5.15, -3.7, -5.0, 2.45, H);
  W(-3.7, -5.15, -2.6, -5.0);
  W(-2.6, -5.15, 0.6, -5.0, 2.5, H);
  W(0.6, -5.15, 5.15, -5.0);
  W(5.0, -5.0, 5.15, 6.55);
  W(-10.75, -5.0, -10.6, -0.4);
  W(-7.06, -5.0, -6.94, -0.46, 0, H, M.accent); // master bedroom west wall
  W(-10.75, -0.4, -10.6, 5.0);
  W(-10.75, 5.0, -10.6, 9.15);
  W(-7.06, 5.06, -6.94, 9.0, 0, H, M.accent2); // bedroom west wall
  W(-10.6, 9.0, -3.0, 9.15);
  W(-3.2, 5.06, -3.0, 9.0);
  W(-3.0, 6.4, -1.6, 6.55);
  W(-1.6, 6.4, -0.6, 6.55, 2.15, H);
  W(-0.6, 6.4, 5.15, 6.55);
  // ---------- inner walls ----------
  W(-3.0, -0.46, -2.4, -0.34); // living / dining + kitchen
  W(-2.4, -0.46, 0.4, -0.34, 2.4, H);
  W(0.4, -0.46, 1.06, -0.34);
  W(0.94, -5.0, 1.06, -0.46); // living room east wall
  W(-3.2, -5.0, -3.0, -0.46); // master / living
  W(-10.6, -0.46, -4.4, -0.34); // master / closet + hall
  W(-4.4, -0.46, -3.5, -0.34, 2.15, H);
  W(-3.5, -0.46, -3.0, -0.34);
  W(-3.2, -0.34, -3.0, 2.2, 0, H, M.warm); // hallway / dining
  W(-3.2, 2.2, -3.0, 3.2, 2.3, H, M.warm);
  W(-3.2, 3.2, -3.0, 5.06);
  W(-4.66, -0.34, -4.54, 0.4); // hallway west wall
  W(-4.66, 0.4, -4.54, 1.3, 2.15, H);
  W(-4.66, 1.3, -4.54, 2.3);
  W(-4.66, 2.3, -4.54, 3.1, 2.15, H);
  W(-4.66, 3.1, -4.54, 4.94);
  W(-10.6, 4.94, -4.4, 5.06); // bedroom north wall
  W(-4.4, 4.94, -3.5, 5.06, 2.15, H);
  W(-3.5, 4.94, -3.2, 5.06);
  W(-10.6, 1.94, -4.66, 2.06); // closet / bathroom
  W(-7.66, -0.34, -7.54, 0.3); // closet / bathroom in the closet
  W(-7.66, 0.3, -7.54, 1.2, 2.15, H);
  W(-7.66, 1.2, -7.54, 1.94);
  W(-3.0, 3.34, -2.0, 3.46, 0, H, M.warm); // dining / foyer
  W(-2.0, 3.34, 0.0, 3.46, 2.3, H, M.warm);
  W(0.0, 3.34, 0.94, 3.46, 0, H, M.warm);
  // Wrap the north wall around the tiled corner. The dining side is open.
  W(1.06, -0.46, 2.91, -0.34);
  W(2.79, -0.34, 2.91, 3.06);
  W(2.91, 2.94, 5.0, 3.06); // kitchen north wall
  casing('x', -0.4, -4.4, -3.5, 2.15);
  casing('x', 5.0, -4.4, -3.5, 2.15);
  casing('z', -4.6, 0.4, 1.3, 2.15);
  casing('z', -4.6, 2.3, 3.1, 2.15);
  casing('z', -7.6, 0.3, 1.2, 2.15);
  casing('z', -3.1, 2.2, 3.2, 2.3, 0.24);
  casing('x', -0.4, -2.4, 0.4, 2.4);
  casing('x', 3.4, -2.0, 0.0, 2.3);
  casing('x', 6.475, -1.6, -0.6, 2.15, 0.19);

  // ---------- lights ----------
  const roomDL = std({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0 });
  const bathDL = std({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 0 });
  const downlight = (x, z, mat) => {
    const m = add(group, new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), mat), x, H - 0.002, z);
    m.rotation.x = Math.PI / 2;
    cyl(group, M.chrome, 0.1, 0.1, 0.006, x, H - 0.003, z, 24, true);
  };
  for (const [x, z] of [[-2.0, -3.7], [0, -3.7], [-2.0, -1.4], [0, -1.4], [-1.0, 4.4], [-1.0, 5.6], [2.2, 4.2], [3.8, 4.2], [2.2, 5.5], [3.8, 5.5], [-3.9, 0.6], [-3.9, 2.7], [-3.9, 4.3], [-6.0, -3.7], [-4.2, -3.7], [-6.0, -1.6], [-4.2, -1.6], [-6.0, 6.2], [-4.2, 6.2], [-6.0, 7.9], [-4.2, 7.9]]) downlight(x, z, roomDL);
  for (const [x, z] of [[-8.6, 3.5], [-6.2, 3.5], [-6.1, 0.8], [-9.1, 0.8]]) downlight(x, z, bathDL);
  const L = {
    living: spotLight(0xffe1bc, -1.0, -2.7, true),
    dining: pointLight(0xffd6a0, 6, -1.0, 1.85, 1.4),
    kitchen: spotLight(0xfff0dc, 3.0, 4.7),
    foyer: spotLight(0xffe1bc, -1.0, 4.9),
    hall: pointLight(0xffe1bc, 6, -3.9, 2.4, 2.3),
    master: spotLight(0xffe1bc, -5.1, -2.7),
    bedroom: spotLight(0xffe1bc, -5.1, 7.0),
    bath: spotLight(0xfff1e0, -7.6, 3.5),
    closet: pointLight(0xfff1e0, 5, -7.6, 2.4, 0.8),
  };
  const roomLights = toggler((k) => {
    L.living.intensity = 11 * k;
    L.dining.intensity = 3.4 * k;
    L.kitchen.intensity = 10 * k;
    L.foyer.intensity = 7 * k;
    L.hall.intensity = 2.6 * k;
    L.master.intensity = 9 * k;
    L.bedroom.intensity = 8 * k;
    roomDL.emissiveIntensity = 1.4 * k;
  }, 5, { dirty: false });
  roomLights.on = true;
  const bathLights = toggler((k) => {
    L.bath.intensity = 8 * k;
    L.closet.intensity = 2.6 * k;
    bathDL.emissiveIntensity = 1.4 * k;
  }, 5, { dirty: false });
  bathLights.on = true;
  const switchPlate = (x, y, z, ry) => {
    const g = node(group, x, y, z, ry);
    box(g, M.white, 0.08, 0.12, 0.012, 0, 0, 0.006);
    box(g, M.porcelain, 0.03, 0.05, 0.012, 0, 0, 0.016);
    return g;
  };
  interact(switchPlate(-1.9, 1.2, 6.395, Math.PI), {
    label: () => (roomLights.on ? 'Switch off the lights' : 'Switch on the lights'),
    act: () => (roomLights.on = !roomLights.on),
  });
  interact(switchPlate(-4.535, 1.2, 3.35, Math.PI / 2), {
    label: () => (bathLights.on ? 'Switch off the bathroom lights' : 'Switch on the bathroom lights'),
    act: () => (bathLights.on = !bathLights.on),
  });

  // ===================== LIVING ROOM =====================
  // Balcony door: one fixed pane and one that slides.
  wbox(group, M.black, -2.6, 0, -5.15, -2.55, 2.5, -5);
  wbox(group, M.black, 0.55, 0, -5.15, 0.6, 2.5, -5);
  wbox(group, M.black, -2.6, 2.45, -5.15, 0.6, 2.5, -5);
  function pane(width, ph = 2.45) {
    const g = new THREE.Group();
    box(g, M.black, width, 0.05, 0.045, width / 2, 0.025, 0);
    box(g, M.black, width, 0.05, 0.045, width / 2, ph - 0.025, 0);
    box(g, M.black, 0.05, ph, 0.045, 0.025, ph / 2, 0);
    box(g, M.black, 0.05, ph, 0.045, width - 0.025, ph / 2, 0);
    const glass = box(g, M.glass, width - 0.1, ph - 0.1, 0.012, width / 2, ph / 2, 0);
    noShadow(glass);
    group.add(g);
    return g;
  }
  pane(1.6).position.set(-2.55, 0, -5.115);
  const slidePane = pane(1.6);
  slidePane.position.set(-1.0, 0, -5.045);
  box(slidePane, M.chrome, 0.025, 0.35, 0.03, 0.12, 1.05, 0.04);
  solid(-2.6, -5.15, -0.95, -5);
  const slideCol = solid(-0.95, -5.15, 0.6, -5);
  const balconyDoor = toggler((k) => {
    slidePane.position.x = -1.0 - 1.45 * k;
    slideCol.off = k > 0.7;
  }, 1.1);
  interact(slidePane, {
    label: () => (balconyDoor.on ? 'Slide the balcony door shut' : 'Slide the balcony door open'),
    act: () => {
      balconyDoor.on = !balconyDoor.on;
      if (balconyDoor.on) ctx.toast('Street sounds from Paseo de la Reforma drift in.');
    },
  });
  // Windows: one in the living room, one in the master bedroom.
  function windowFrame(x0, x1, y0, y1) {
    const z = -5.075;
    wbox(group, M.black, x0, y0, z - 0.06, x1, y0 + 0.05, z + 0.06);
    wbox(group, M.black, x0, y1 - 0.05, z - 0.06, x1, y1, z + 0.06);
    wbox(group, M.black, x0, y0, z - 0.06, x0 + 0.05, y1, z + 0.06);
    wbox(group, M.black, x1 - 0.05, y0, z - 0.06, x1, y1, z + 0.06);
    wbox(group, M.black, (x0 + x1) / 2 - 0.025, y0, z - 0.04, (x0 + x1) / 2 + 0.025, y1, z + 0.04);
    noShadow(wbox(group, M.glass, x0, y0, z - 0.006, x1, y1, z + 0.006));
    wbox(group, M.white, x0 - 0.05, y0 - 0.04, -5.0, x1 + 0.05, y0, -4.86);
  }
  windowFrame(-6.5, -3.7, 0.5, 2.45);

  // Balcony slab and glass railing, with a bistro set and plants.
  wbox(group, M.saltillo, -3.3, -0.25, -6.6, 1.3, 0, -5.15);
  const rail = new THREE.Group();
  group.add(rail);
  wbox(rail, M.glass, -3.25, 0.05, -6.56, 1.25, 1.0, -6.54);
  wbox(rail, M.glass, -3.26, 0.05, -6.55, -3.24, 1.0, -5.15);
  wbox(rail, M.glass, 1.24, 0.05, -6.55, 1.26, 1.0, -5.15);
  noShadow(rail);
  wbox(group, M.black, -3.3, 1.0, -6.6, 1.3, 1.05, -6.5);
  wbox(group, M.black, -3.3, 1.0, -6.6, -3.2, 1.05, -5.15);
  wbox(group, M.black, 1.2, 1.0, -6.6, 1.3, 1.05, -5.15);
  for (const x of [-3.25, -1.0, 1.25]) wbox(group, M.black, x - 0.025, 0, -6.58, x + 0.025, 1.0, -6.53);
  solid(-3.5, -6.9, 1.5, -6.5);
  solid(-3.5, -6.6, -3.2, -5.15);
  solid(1.2, -6.6, 1.5, -5.15);
  function bistroChair(x, z, ry, cushion) {
    const g = node(group, x, 0, z, ry);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cyl(g, M.black, 0.012, 0.012, 0.45, lx, 0.225, lz, 8);
    box(g, M.black, 0.42, 0.025, 0.42, 0, 0.46, 0);
    rbox(g, cushion, 0.4, 0.05, 0.4, 0.02, 0, 0.495, 0);
    for (const lx of [-0.18, 0.18]) cyl(g, M.black, 0.012, 0.012, 0.45, lx, 0.69, 0.2, 8);
    box(g, M.black, 0.4, 0.14, 0.02, 0, 0.84, 0.2);
    return g;
  }
  for (const [x, c] of [[-2.45, M.pink], [-1.35, M.teal]]) {
    interact(bistroChair(x, -5.75, 0, c), {
      label: () => 'Sit and take in the view',
      act: () => ctx.sit({ eye: new THREE.Vector3(x, 1.12, -5.7), yaw: 0, pitch: -0.08 }),
    });
  }
  const btable = node(group, -1.9, 0, -6.15);
  cyl(btable, M.black, 0.2, 0.2, 0.02, 0, 0.01, 0);
  cyl(btable, M.black, 0.02, 0.02, 0.7, 0, 0.36, 0, 8);
  cyl(btable, M.tile, 0.3, 0.3, 0.025, 0, 0.72, 0, 32);
  cyl(btable, M.clay, 0.04, 0.035, 0.09, 0.08, 0.78, 0.05);
  solid(-2.25, -6.5, -1.55, -5.8);
  solid(-2.67, -5.97, -2.23, -5.53);
  solid(-1.57, -5.97, -1.13, -5.53);
  function agavePlant(parent, x, y, z, s = 1, leaves = 14) {
    const g = node(parent, x, y, z);
    const geo = new THREE.ConeGeometry(0.045 * s, 0.6 * s, 5);
    geo.translate(0, 0.3 * s, 0);
    for (let i = 0; i < leaves; i++) {
      const m = add(g, new THREE.Mesh(geo, M.agave));
      m.rotation.order = 'YZX';
      m.rotation.set(0, (i / leaves) * Math.PI * 2, 0.5 + (i % 3) * 0.25);
    }
    return g;
  }
  const potA = node(group, 0.6, 0, -5.95);
  cyl(potA, M.terracotta, 0.26, 0.2, 0.45, 0, 0.225, 0, 24);
  agavePlant(potA, 0, 0.42, 0, 1.2, 16);
  solid(0.3, -6.25, 0.9, -5.65);

  // Curtains across the balcony door.
  cyl(group, M.brass, 0.015, 0.015, 4.0, -1.0, 2.66, -4.88, 12).rotation.z = Math.PI / 2;
  const curtainGeo = new THREE.PlaneGeometry(1, 2.58, 72, 1);
  curtainGeo.translate(0.5, 1.29, 0);
  {
    const p = curtainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * Math.PI * 2 * 10) * 0.04);
    curtainGeo.computeVertexNormals();
  }
  const curtainL = add(group, new THREE.Mesh(curtainGeo, M.curtain), -2.95, 0.06, -4.86);
  // The right panel hangs just behind the left one so the two never share a
  // surface where they overlap when closed (that made them flicker).
  const curtainR = add(group, new THREE.Mesh(curtainGeo, M.curtain), 0.95, 0.06, -4.905);
  const curtains = toggler((k) => {
    const w = 2.0 - 1.6 * k;
    curtainL.scale.set(w, 1, 1 + 1.6 * k);
    curtainR.scale.set(-w, 1, 1 + 1.6 * k);
  }, 0.9);
  interact([curtainL, curtainR], {
    label: () => (curtains.on ? 'Close the curtains' : 'Open the curtains'),
    act: () => {
      curtains.on = !curtains.on;
      if (curtains.on) {
        ctx.complete('curtains');
        ctx.toast('¡Qué vista! Paseo de la Reforma, with the volcanoes on the horizon.');
      }
    },
  });

  // A big three-seat couch against the west wall, facing the TV.
  {
    const sofa = node(group, -2.25, 0, -2.7, -Math.PI / 2);
    box(sofa, M.walnut, 2.6, 0.12, 0.95, 0, 0.1, 0);
    rbox(sofa, M.sofa, 2.6, 0.26, 0.95, 0.05, 0, 0.29, 0);
    for (let i = 0; i < 3; i++) rbox(sofa, M.sofa, 0.78, 0.14, 0.75, 0.06, -0.8 + i * 0.8, 0.48, -0.08);
    rbox(sofa, M.sofa, 2.6, 0.5, 0.24, 0.08, 0, 0.65, 0.36);
    for (let i = 0; i < 3; i++) rbox(sofa, M.sofa, 0.74, 0.42, 0.16, 0.07, -0.8 + i * 0.8, 0.72, 0.2).rotation.x = -0.12;
    for (const sd of [-1, 1]) rbox(sofa, M.sofa, 0.2, 0.58, 0.95, 0.07, sd * 1.3, 0.37, 0);
    rbox(sofa, M.pink, 0.4, 0.36, 0.13, 0.06, -1.0, 0.7, 0.2).rotation.z = 0.15;
    rbox(sofa, M.mustard, 0.38, 0.34, 0.13, 0.06, 1.0, 0.7, 0.2).rotation.z = -0.15;
    rbox(sofa, M.sarape, 0.6, 0.04, 0.9, 0.02, 0.5, 0.57, -0.05);
    solid(-2.73, -4.0, -1.77, -1.4);
    interact(sofa, {
      label: () => 'Sit on the couch',
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(-2.1, 1.08, -2.7), yaw: -Math.PI / 2, pitch: -0.05, calm: true });
        ctx.complete('couch');
        ctx.toast('So comfy. The TV remote is right here…');
      },
    });
  }
  const rugMesh = add(group, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), M.rug), -1.4, 0.004, -2.7);
  rugMesh.rotation.x = -Math.PI / 2;
  noShadow(rugMesh);
  {
    const ct = node(group, -1.25, 0, -2.7);
    rbox(ct, M.walnut, 0.65, 0.06, 1.15, 0.02, 0, 0.42, 0);
    box(ct, M.walnut, 0.55, 0.03, 1.05, 0, 0.12, 0);
    for (const [lx, lz] of [[-0.27, -0.52], [0.27, -0.52], [-0.27, 0.52], [0.27, 0.52]]) box(ct, M.walnut, 0.05, 0.4, 0.05, lx, 0.2, lz);
    box(ct, M.teal, 0.2, 0.04, 0.28, 0.1, 0.47, 0.25);
    cyl(ct, M.clay, 0.07, 0.05, 0.12, -0.1, 0.51, -0.25, 16);
    solid(-1.58, -3.28, -0.92, -2.12);
  }
  // TV on a media console.
  const console1 = node(group, 0.75, 0, -2.7);
  box(console1, M.walnut, 0.45, 0.5, 2.2, 0, 0.3, 0);
  for (const dz of [-0.75, 0, 0.75]) box(console1, M.oak, 0.01, 0.38, 0.68, -0.226, 0.3, dz);
  solid(0.5, -3.8, 1.0, -1.6);
  const tvBody = box(group, M.black, 0.05, 0.9, 1.56, 0.97, 1.45, -2.7);
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 512;
  tvCanvas.height = 288;
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const screenOn = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
  const screen = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.84), M.screenOff), 0.942, 1.45, -2.7);
  screen.rotation.y = -Math.PI / 2;
  noShadow(screen);
  const tvLight = pointLight(0x9fb8ff, 5, 0.3, 1.45, -2.7);
  const tv = { on: false, t: 0, acc: 1 };
  updaters.push((dt) => {
    if (!tv.on) return;
    tv.t += dt;
    tv.acc += dt;
    if (tv.acc < 1 / 15) return;
    tv.acc = 0;
    const warm = drawTV(tvCanvas.getContext('2d'), 512, 288, tv.t);
    tvTex.needsUpdate = true;
    tvLight.color.set(warm ? 0xffd9a0 : 0xb48cff);
    tvLight.intensity = 1.1 + Math.sin(tv.t * 7) * 0.12;
  });
  interact([screen, tvBody, console1], {
    label: () => (tv.on ? 'Turn off the TV' : 'Turn on the TV'),
    act: () => {
      tv.on = !tv.on;
      screen.material = tv.on ? screenOn : M.screenOff;
      if (!tv.on) tvLight.intensity = 0;
      else ctx.complete('tv');
    },
  });
  // Armchair, floor lamp, cactus, a painting.
  function armchair(x, z, yaw, mat = M.mustard) {
    const a = node(group, x, 0, z, yaw);
    for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) cyl(a, M.walnut, 0.025, 0.018, 0.2, lx, 0.1, lz, 8);
    box(a, M.walnut, 0.8, 0.07, 0.74, 0, 0.23, 0);
    rbox(a, mat, 0.7, 0.16, 0.66, 0.05, 0, 0.34, -0.02);
    rbox(a, mat, 0.76, 0.66, 0.16, 0.06, 0, 0.66, 0.31).rotation.x = 0.16;
    for (const s of [-1, 1]) {
      box(a, M.walnut, 0.06, 0.05, 0.7, s * 0.39, 0.56, 0);
      box(a, M.walnut, 0.05, 0.3, 0.05, s * 0.39, 0.4, -0.3);
    }
    solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
    interact(a, {
      label: () => 'Sit in the armchair',
      act: () => {
        const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        ctx.sit({ eye: new THREE.Vector3(x, 1.1, z).addScaledVector(fwd, -0.1), yaw, pitch: -0.05, calm: true });
      },
    });
    return a;
  }
  armchair(0.3, -1.05, 0.5);
  function floorLamp(x, z, withLight) {
    const fl = node(group, x, 0, z);
    cyl(fl, M.black, 0.15, 0.16, 0.025, 0, 0.012, 0, 24);
    cyl(fl, M.brass, 0.012, 0.012, 1.45, 0, 0.74, 0, 8);
    const mat = std({ color: 0xf4e9d4, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide });
    noShadow(cyl(fl, mat, 0.17, 0.21, 0.28, 0, 1.52, 0, 28, true));
    const light = withLight ? pointLight(0xffc48a, 4.5, x, 1.5, z) : null;
    const st = toggler((k) => {
      if (light) light.intensity = 2.4 * k;
      mat.emissiveIntensity = 0.9 * k;
    }, 6, { dirty: false });
    solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
    interact(fl, { label: () => (st.on ? 'Switch off the floor lamp' : 'Switch on the floor lamp'), act: () => (st.on = !st.on) });
    return st;
  }
  floorLamp(-2.7, -4.6, false);
  function cactusPot(x, z) {
    const c = node(group, x, 0, z);
    cyl(c, M.tile, 0.22, 0.17, 0.42, 0, 0.21, 0, 28);
    cyl(c, std({ color: 0x5a4030, roughness: 1 }), 0.2, 0.2, 0.02, 0, 0.4, 0, 20);
    for (const [cx, cz, h] of [[0, 0, 1.25], [0.08, 0.06, 0.95], [-0.08, 0.05, 1.05], [0.04, -0.09, 0.8], [-0.07, -0.07, 0.65]]) add(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.055, h, 4, 12), M.cactus), cx, 0.4 + h / 2, cz);
    solid(x - 0.24, z - 0.24, x + 0.24, z + 0.24);
    interact(c, { label: () => 'Touch the cactus', act: () => ctx.toast('¡Ay! Órgano cactus — look, don’t touch.') });
  }
  cactusPot(0.6, -4.55);
  function wallArt(mat, x, y, z, w, h, ry, label, msg) {
    const g = node(group, x, y, z, ry);
    box(g, M.walnut, w + 0.08, h + 0.08, 0.03, 0, 0, 0);
    const a = add(g, new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), 0, 0, 0.017);
    if (label) interact(a, { label: () => label, act: () => ctx.toast(msg) });
    return g;
  }
  wallArt(M.canvas, -2.985, 1.8, -2.7, 1.4, 0.82, Math.PI / 2, 'Look at the painting', '“Volcanes al atardecer” — Popocatépetl and Iztaccíhuatl at sunset.');

  // ===================== DINING ROOM =====================
  function chair(x, z, ry, seat) {
    const g = node(group, x, 0, z, ry);
    for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(g, M.walnut, 0.035, 0.45, 0.035, lx, 0.225, lz);
    box(g, M.walnut, 0.44, 0.04, 0.44, 0, 0.46, 0);
    rbox(g, seat, 0.42, 0.06, 0.42, 0.025, 0, 0.5, 0);
    for (const lx of [-0.19, 0.19]) box(g, M.walnut, 0.035, 0.42, 0.035, lx, 0.69, 0.2);
    rbox(g, M.walnut, 0.44, 0.16, 0.035, 0.015, 0, 0.84, 0.2);
    return g;
  }
  {
    const TX = -1.0;
    const TZ = 1.4;
    const t = node(group, TX, 0, TZ);
    cyl(t, M.walnut, 0.28, 0.32, 0.04, 0, 0.02, 0, 32);
    cyl(t, M.walnut, 0.06, 0.08, 0.7, 0, 0.38, 0, 16);
    cyl(t, M.oak, 0.6, 0.6, 0.045, 0, 0.75, 0, 48);
    cyl(t, M.lampTile, 0.11, 0.09, 0.05, 0, 0.8, 0, 24);
    for (const [fx, fz, c] of [[-0.03, 0.02, 0xf28a1d], [0.04, -0.02, 0x7cc243], [0, -0.05, 0xd9447a]]) sphere(t, std({ color: c, roughness: 0.5 }), 0.04, fx, 0.85, fz, 12);
    for (const [px, pz] of [[0.28, 0.12], [-0.25, -0.18], [0.1, -0.32], [-0.12, 0.3]]) cyl(t, M.porcelain, 0.11, 0.09, 0.015, px, 0.78, pz, 24);
    solid(TX - 0.6, TZ - 0.6, TX + 0.6, TZ + 0.6);
    const seats = [[0, -0.8, Math.PI, M.pink], [0, 0.8, 0, M.teal], [-0.8, 0, -Math.PI / 2, M.mustard], [0.8, 0, Math.PI / 2, M.pink]];
    for (const [dx, dz, ry, mat] of seats) {
      const c = chair(TX + dx, TZ + dz, ry, mat);
      solid(TX + dx - 0.22, TZ + dz - 0.22, TX + dx + 0.22, TZ + dz + 0.22);
      interact(c, {
        label: () => 'Sit at the dining table',
        act: () => {
          ctx.sit({ eye: new THREE.Vector3(TX + dx * 0.95, 1.15, TZ + dz * 0.95), yaw: ry, pitch: -0.3 });
          ctx.complete('dine');
          ctx.toast('A little round table for four. ¡Buen provecho!');
        },
      });
    }
    // Pendant lamp over the table.
    cyl(group, M.black, 0.005, 0.005, 0.85, TX, H - 0.43, TZ, 6);
    const pMat = std({ color: 0xd9447a, emissive: 0xffc47a, emissiveIntensity: 0.6, roughness: 0.6, side: THREE.DoubleSide });
    noShadow(cyl(group, pMat, 0.12, 0.3, 0.26, TX, 1.98, TZ, 32, true));
  }
  {
    const sb = node(group, -2.77, 0, 0.8);
    box(sb, M.walnut, 0.45, 0.78, 1.6, 0, 0.45, 0);
    for (const dz of [-0.4, 0.4]) {
      box(sb, M.oak, 0.01, 0.6, 0.74, 0.226, 0.45, dz);
      sphere(sb, M.brass, 0.018, 0.24, 0.6, dz + (dz < 0 ? 0.3 : -0.3), 10);
    }
    const vaseGeo = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.1, 0.06], [0.09, 0.16], [0.05, 0.24], [0.045, 0.3], [0.06, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    add(sb, new THREE.Mesh(vaseGeo, M.clay), 0, 0.84, -0.5);
    agavePlant(add(sb, new THREE.Group(), 0, 0.84, 0.45), 0, 0, 0, 0.45, 10);
    cyl(sb, M.terracotta, 0.09, 0.07, 0.12, 0, 0.9, 0.45, 16);
    solid(-3.0, 0.0, -2.55, 1.6);
  }
  wallArt(M.poster, -2.985, 1.75, 0.8, 0.66, 0.86, Math.PI / 2);

  // ===================== FOYER =====================
  const door = node(group, -1.1, 0, 6.455);
  box(door, M.walnut, 1.0, 2.15, 0.05, 0, 1.075, 0);
  box(door, M.oak, 0.7, 0.8, 0.01, 0, 1.6, -0.028);
  box(door, M.oak, 0.7, 0.8, 0.01, 0, 0.6, -0.028);
  cyl(door, M.brass, 0.012, 0.012, 0.02, 0, 1.55, -0.035, 10).rotation.x = Math.PI / 2;
  cyl(door, M.chrome, 0.03, 0.03, 0.02, 0.38, 1.0, -0.035, 16).rotation.x = Math.PI / 2;
  box(door, M.chrome, 0.14, 0.02, 0.02, 0.32, 1.0, -0.055);
  cyl(door, M.chrome, 0.025, 0.025, 0.015, 0.38, 1.22, -0.033, 16).rotation.x = Math.PI / 2;
  const bolt = box(door, M.chrome, 0.012, 0.045, 0.014, 0.38, 1.22, -0.045);
  noShadow(box(door, std({ color: 0xd9447a, roughness: 0.6 }), 0.1, 0.18, 0.004, 0.36, 0.86, -0.07));
  solid(-1.6, 6.4, -0.6, 6.55);
  const lock = toggler((k) => (bolt.rotation.z = (Math.PI / 2) * k), 5, { dirty: false });
  interact(door, {
    label: () => (lock.on ? 'Unlock the door' : 'Lock the door'),
    act: () => {
      lock.on = !lock.on;
      ctx.toast(lock.on ? '*click* Locked. Nobody gets in without a room key.' : 'Door unlocked.');
      if (lock.on) ctx.complete('lock');
    },
  });
  const mat = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), M.sarape), -1.1, 0.005, 5.9);
  mat.rotation.x = -Math.PI / 2;
  noShadow(mat);
  {
    const ct = node(group, -2.8, 0, 4.6);
    box(ct, M.walnut, 0.36, 0.04, 1.2, 0, 0.82, 0);
    for (const [lx, lz] of [[-0.14, -0.55], [0.14, -0.55], [-0.14, 0.55], [0.14, 0.55]]) box(ct, M.black, 0.03, 0.8, 0.03, lx, 0.4, lz);
    const bowl = add(ct, new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ map: lampTile, roughness: 0.25, side: THREE.DoubleSide })), 0, 0.92, -0.2);
    bowl.scale.y = 0.6;
    box(ct, M.brass, 0.05, 0.01, 0.1, 0.02, 0.87, -0.2);
    cyl(ct, M.cactus, 0.05, 0.06, 0.18, 0, 0.93, 0.35, 12);
    solid(-3.0, 4.0, -2.6, 5.2);
  }
  wallArt(M.tile, -2.985, 1.7, 4.6, 0.9, 0.6, Math.PI / 2);
  for (const z of [5.6, 5.85, 6.1]) cyl(group, M.brass, 0.012, 0.012, 0.1, -2.95, 1.7, z, 8).rotation.z = Math.PI / 2;
  rbox(group, M.teal, 0.1, 0.7, 0.3, 0.04, -2.92, 1.35, 5.6);
  {
    const suit = node(group, -2.55, 0, 5.95, 0.3);
    rbox(suit, std({ color: 0xe8822d, roughness: 0.35 }), 0.44, 0.62, 0.26, 0.04, 0, 0.37, 0);
    for (const s of [-1, 1]) cyl(suit, M.black, 0.025, 0.025, 0.03, s * 0.17, 0.03, 0.08, 10).rotation.z = Math.PI / 2;
    box(suit, M.chrome, 0.015, 0.25, 0.015, -0.1, 0.8, 0.1);
    box(suit, M.chrome, 0.015, 0.25, 0.015, 0.1, 0.8, 0.1);
    box(suit, M.black, 0.22, 0.025, 0.03, 0, 0.93, 0.1);
    solid(-2.8, 5.75, -2.3, 6.15);
    interact(suit, { label: () => 'Check your suitcase', act: () => ctx.toast('Passport, sunscreen, and an empty bag for souvenirs.') });
  }

  // ===================== KITCHEN =====================
  {
    const top = 0.9;
    // East counter run (sink, stove) with tiles and an upper cabinet.
    wbox(group, M.cabinet, 4.42, 0.08, 3.9, 5.0, top - 0.04, 5.8);
    wbox(group, M.black, 4.45, 0, 3.9, 5.0, 0.08, 5.8);
    wbox(group, M.marble, 4.38, top - 0.04, 3.9, 5.0, top, 5.8);
    box(group, M.brass, 0.02, 0.012, 0.14, 4.41, top - 0.12, 4.3);
    wbox(group, M.tile, 4.985, top, 3.9, 5.0, 1.55, 6.4);
    wbox(group, M.cabinet, 4.65, 1.55, 3.9, 5.0, 2.25, 4.75);
    solid(4.38, 3.9, 5.0, 5.8);
    // South counter run with open shelves.
    wbox(group, M.cabinet, 2.0, 0.08, 5.82, 4.42, top - 0.04, 6.4);
    wbox(group, M.black, 2.0, 0, 5.85, 4.42, 0.08, 6.4);
    wbox(group, M.marble, 2.0, top - 0.04, 5.78, 5.0, top, 6.4);
    wbox(group, M.tile, 2.0, top, 6.385, 5.0, 1.55, 6.4);
    for (const y of [1.75, 2.1]) wbox(group, M.oak, 2.2, y, 6.15, 4.3, y + 0.04, 6.4);
    for (let i = 0; i < 6; i++) cyl(group, i % 2 ? M.lampTile : M.porcelain, 0.11, 0.11, 0.02, 2.5 + i * 0.3, 1.8, 6.3, 20).rotation.x = Math.PI / 2 - 0.2;
    for (let i = 0; i < 5; i++) cyl(group, M.clay, 0.045, 0.04, 0.09, 2.5 + i * 0.35, 2.19, 6.28, 16);
    solid(2.0, 5.78, 5.0, 6.4);
    // Stove: cooktop, oven door, range hood.
    wbox(group, M.glassTop, 4.45, top, 4.85, 4.95, top + 0.012, 5.65);
    const burnerMat = std({ color: 0x222222, emissive: 0xff3a10, emissiveIntensity: 0, roughness: 0.5 });
    for (const [bx, bz] of [[4.58, 5.03], [4.82, 5.03], [4.58, 5.47], [4.82, 5.47]]) {
      const ring = add(group, new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 24), burnerMat), bx, top + 0.014, bz);
      ring.rotation.x = -Math.PI / 2;
    }
    wbox(group, M.glassTop, 4.405, 0.15, 4.85, 4.42, 0.75, 5.65);
    wbox(group, M.chrome, 4.38, 0.66, 4.95, 4.4, 0.68, 5.55);
    const hood = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.4, 0.4, 4, 1), M.steel), 4.75, 1.85, 5.25);
    hood.rotation.y = Math.PI / 4;
    hood.scale.set(0.9, 1, 1.4);
    wbox(group, M.steel, 4.7, 2.05, 5.15, 4.9, H, 5.35);
    const knobs = [];
    for (let i = 0; i < 4; i++) knobs.push(cyl(group, M.black, 0.02, 0.02, 0.025, 4.39, 0.8, 5.02 + i * 0.15, 12));
    knobs.forEach((k) => (k.rotation.z = Math.PI / 2));
    const stove = toggler((k) => (burnerMat.emissiveIntensity = 1.6 * k), 1.5, { dirty: false });
    interact([...knobs, hood], {
      label: () => (stove.on ? 'Turn off the stove' : 'Turn on the stove'),
      act: () => {
        stove.on = !stove.on;
        if (stove.on) ctx.toast('The burners glow red. Time for some quesadillas?');
      },
    });
    // Sink with a gooseneck tap.
    wbox(group, M.steel, 4.48, top - 0.18, 4.0, 4.9, top + 0.005, 4.6);
    wbox(group, M.black, 4.5, top - 0.17, 4.02, 4.88, top - 0.16, 4.58);
    const kPost = cyl(group, M.chrome, 0.018, 0.02, 0.36, 4.93, top + 0.18, 4.3, 12);
    const kSpout = cyl(group, M.chrome, 0.012, 0.012, 0.25, 4.82, top + 0.36, 4.3, 10);
    kSpout.rotation.z = Math.PI / 2;
    const kStream = cyl(group, M.water, 0.008, 0.01, 0.36, 4.71, top + 0.17, 4.3, 8);
    kStream.visible = false;
    noShadow(kStream);
    noRay(kStream);
    const ktap = { on: false };
    interact([kPost, kSpout], {
      label: () => (ktap.on ? 'Turn off the tap' : 'Turn on the kitchen tap'),
      act: () => {
        ktap.on = !ktap.on;
        kStream.visible = ktap.on;
        if (ktap.on) {
          ctx.complete('sink');
          ctx.toast('You rinse your hands in the kitchen sink.');
        }
      },
    });
    api.kitchenTap = ktap;
    // Fridge in the corner, with a door that opens.
    const FZ = 3.06;
    wbox(group, M.white, 4.25, 0, FZ, 5.0, 1.95, FZ + 0.84);
    const fridgeLight = std({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 0 });
    wbox(group, fridgeLight, 4.3, 1.86, FZ + 0.04, 4.95, 1.88, FZ + 0.8);
    for (const y of [0.45, 0.9, 1.35]) wbox(group, M.glass, 4.3, y, FZ + 0.04, 4.95, y + 0.01, FZ + 0.8);
    const sodaCols = [0xf2862e, 0x7cc243, 0xd9447a, 0x8e44ad, 0xcfe8f5, 0xf2c14e];
    let si = 0;
    for (const y of [0.46, 0.91]) {
      for (const dz of [0.14, 0.29, 0.44, 0.59, 0.72]) {
        const c = sodaCols[si++ % sodaCols.length];
        cyl(group, std({ color: c, roughness: 0.2, transparent: c === 0xcfe8f5, opacity: 0.7 }), 0.03, 0.032, 0.22, 4.35, y + 0.11, FZ + dz, 12);
      }
    }
    box(group, std({ color: 0xc8a060, roughness: 0.8 }), 0.25, 0.12, 0.3, 4.6, 1.42, FZ + 0.44);
    sphere(group, std({ color: 0xf28a1d, roughness: 0.5 }), 0.06, 4.7, 0.55, FZ + 0.2, 12);
    const fridgePivot = node(group, 4.24, 0, FZ + 0.02);
    box(fridgePivot, M.steel, 0.04, 1.9, 0.8, 0, 0.98, 0.4);
    box(fridgePivot, M.chrome, 0.03, 0.6, 0.03, -0.04, 1.2, 0.74);
    wbox(group, fridgeLight, 4.97, 0.05, FZ + 0.04, 4.99, 1.85, FZ + 0.8);
    const fridgeCol = solid(4.2, FZ, 4.27, FZ + 0.84);
    const fridge = toggler((k) => {
      fridgePivot.rotation.y = 1.6 * k;
      fridgeLight.emissiveIntensity = 1.5 * Math.min(1, k * 3);
      fridgeCol.off = k > 0.5;
    }, 2.4);
    let fridgeSeen = false;
    interact(fridgePivot, {
      label: () => (fridge.on ? 'Close the fridge' : 'Open the fridge'),
      act: () => {
        fridge.on = !fridge.on;
        if (fridge.on) {
          ctx.complete('fridge');
          if (!fridgeSeen) ctx.toast('Agua mineral, mango juice, tamarind soda — and leftover tacos. ¡Salud!');
          fridgeSeen = true;
        }
      },
    });
    solid(4.25, FZ, 5.0, FZ + 0.84);
    // Coffee machine.
    const cm = node(group, 3.0, top, 6.15);
    box(cm, M.black, 0.26, 0.34, 0.24, 0, 0.17, 0);
    box(cm, M.chrome, 0.08, 0.04, 0.06, 0, 0.24, -0.14);
    box(cm, M.chrome, 0.2, 0.01, 0.12, 0, 0.012, -0.12);
    const coffeeMug = cyl(group, M.clay, 0.04, 0.035, 0.09, 3.0, top + 0.06, 6.03, 16);
    coffeeMug.visible = false;
    const steam = [0, 1, 2].map((i) => {
      const st = sphere(group, std({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1, depthWrite: false }), 0.025, 3.0, top + 0.2, 6.03, 8);
      noRay(st);
      noShadow(st);
      return { s: st, p: i / 3 };
    });
    let brewT = -1;
    updaters.push((dt) => {
      if (brewT < 0) return;
      brewT += dt;
      for (const st of steam) {
        const u = (brewT * 0.5 + st.p) % 1;
        st.s.position.set(3.0 + Math.sin(u * 8 + st.p * 5) * 0.02, top + 0.13 + u * 0.35, 6.03);
        st.s.material.opacity = Math.sin(u * Math.PI) * 0.5 * Math.max(0, 1 - brewT / 25);
        st.s.scale.setScalar(1 + u * 1.5);
      }
      if (brewT > 25) brewT = -1;
    });
    interact(cm, {
      label: () => 'Make a coffee',
      act: () => {
        coffeeMug.visible = true;
        brewT = 0;
        ctx.complete('coffee');
        ctx.toast('*whirr… drip drip* A café de olla with a hint of cinnamon. ¡Delicioso!');
      },
    });
    box(group, M.chrome, 0.3, 0.2, 0.18, 3.8, top + 0.1, 6.15);
    const bowl = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ map: lampTile, roughness: 0.25, side: THREE.DoubleSide })), 2.4, top + 0.08, 6.1);
    bowl.scale.y = 0.6;
    for (const [fx, fz, c] of [[2.36, 6.08, 0xf28a1d], [2.44, 6.12, 0x7cc243], [2.4, 6.04, 0xf2c14e]]) sphere(group, std({ color: c, roughness: 0.5 }), 0.045, fx, top + 0.1, fz, 12);
    // A small island with two stools.
    wbox(group, M.walnut, 2.4, 0, 3.95, 3.3, top - 0.04, 4.65);
    wbox(group, M.marble, 2.3, top - 0.04, 3.9, 3.4, top, 4.7);
    solid(2.3, 3.9, 3.4, 4.7);
    for (const z of [4.05, 4.55]) {
      const st = node(group, 1.95, 0, z);
      cyl(st, M.black, 0.15, 0.17, 0.02, 0, 0.01, 0, 16);
      cyl(st, M.chrome, 0.02, 0.02, 0.62, 0, 0.32, 0, 8);
      cyl(st, M.leather, 0.18, 0.17, 0.06, 0, 0.66, 0, 20);
      solid(1.77, z - 0.18, 2.13, z + 0.18);
      interact(st, { label: () => 'Sit at the kitchen island', act: () => ctx.sit({ eye: new THREE.Vector3(1.97, 1.32, z), yaw: -Math.PI / 2, pitch: -0.25 }) });
    }
    cyl(group, M.clay, 0.16, 0.12, 0.14, 2.85, top + 0.07, 4.3, 20);
    for (const [fx, fz, c] of [[2.8, 4.28, 0xd9447a], [2.9, 4.34, 0x7cc243]]) sphere(group, std({ color: c, roughness: 0.5 }), 0.05, fx, top + 0.15, fz, 12);
    cyl(group, M.black, 0.004, 0.004, 0.8, 2.85, H - 0.4, 4.3, 6);
    noShadow(cyl(group, std({ color: 0xf2c14e, emissive: 0xffc47a, emissiveIntensity: 0.7, roughness: 0.5, side: THREE.DoubleSide }), 0.06, 0.14, 0.16, 2.85, 1.95, 4.3, 20, true));
  }

  // ===================== HALLWAY =====================
  {
    const runner = add(group, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 5.0), M.rug), -3.85, 0.005, 2.3);
    runner.rotation.x = -Math.PI / 2;
    noShadow(runner);
    wallArt(M.sarape, -4.525, 1.6, 1.8, 0.4, 0.55, Math.PI / 2);
    wallArt(M.canvas, -3.215, 1.6, 0.9, 0.7, 0.42, -Math.PI / 2);
    wallArt(M.tile, -3.215, 1.6, 4.1, 0.5, 0.5, -Math.PI / 2);
  }

  // ===================== BEDROOMS =====================
  // A bed with its headboard against the west wall (x = xw), centred on z.
  function bed(xw, z, w) {
    const b = node(group, xw + 1.125, 0, z);
    for (const [lx, lz] of [[-1.0, -(w / 2 - 0.05)], [1.0, -(w / 2 - 0.05)], [-1.0, w / 2 - 0.05], [1.0, w / 2 - 0.05]]) box(b, M.walnut, 0.08, 0.1, 0.08, lx, 0.05, lz);
    box(b, M.walnut, 2.15, 0.25, w, 0, 0.225, 0);
    rbox(b, M.linen, 2.05, 0.26, w - 0.06, 0.05, 0.02, 0.47, 0);
    rbox(b, M.linen, 1.65, 0.1, w + 0.06, 0.04, 0.24, 0.63, 0);
    box(b, M.linen, 1.6, 0.3, 0.02, 0.24, 0.52, w / 2 + 0.03);
    box(b, M.linen, 1.6, 0.3, 0.02, 0.24, 0.52, -(w / 2 + 0.03));
    rbox(b, M.linen, 0.2, 0.12, w + 0.08, 0.05, -0.56, 0.66, 0);
    box(b, M.sarape, 0.55, 0.012, w + 0.12, 0.72, 0.687, 0);
    box(b, M.sarape, 0.55, 0.26, 0.012, 0.72, 0.56, w / 2 + 0.06);
    box(b, M.sarape, 0.55, 0.26, 0.012, 0.72, 0.56, -(w / 2 + 0.06));
    for (const pz of [-w * 0.225, w * 0.225]) rbox(b, M.linen, 0.42, 0.16, w * 0.39, 0.07, -0.78, 0.74, pz).rotation.z = -0.38;
    rbox(b, M.pink, 0.14, 0.4, 0.42, 0.06, -0.56, 0.82, -w * 0.14).rotation.z = -0.3;
    rbox(b, M.teal, 0.14, 0.4, 0.42, 0.06, -0.56, 0.82, w * 0.13).rotation.z = -0.3;
    cyl(b, M.sarape, 0.09, 0.09, w * 0.4, -0.38, 0.75, 0, 20).rotation.x = Math.PI / 2;
    rbox(group, M.headboard, 0.12, 1.25, w + 0.3, 0.04, xw + 0.07, 0.9, z);
    wbox(group, M.walnut, xw, 0.25, z - w / 2 - 0.21, xw + 0.03, 1.58, z + w / 2 + 0.21);
    solid(xw, z - w / 2 - 0.05, xw + 2.22, z + w / 2 + 0.05);
    interact(b, {
      label: () => 'Lie down on the bed',
      act: () => {
        ctx.sit({ eye: new THREE.Vector3(xw + 0.55, 0.98, z), yaw: -Math.PI / 2, pitch: 0.18, lying: true });
        ctx.complete('bed');
      },
    });
  }
  function tableLamp(x, y, z) {
    const g = node(group, x, y, z);
    cyl(g, M.lampTile, 0.06, 0.095, 0.3, 0, 0.15, 0, 24);
    cyl(g, M.brass, 0.01, 0.01, 0.12, 0, 0.36, 0, 8);
    const shadeMat = std({ color: 0xf4e9d4, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide });
    noShadow(cyl(g, shadeMat, 0.13, 0.17, 0.22, 0, 0.45, 0, 28, true));
    const light = pointLight(0xffc48a, 4.5, x, y + 0.42, z);
    const st = toggler((k) => {
      light.intensity = 2.6 * k;
      shadeMat.emissiveIntensity = 0.9 * k;
    }, 6, { dirty: false });
    interact(g, {
      label: () => (st.on ? 'Switch off the lamp' : 'Switch on the lamp'),
      act: () => {
        st.on = !st.on;
        if (st.on) ctx.complete('lamp');
      },
    });
    return st;
  }
  function nightstand(xw, z) {
    const g = node(group, xw + 0.28, 0, z);
    for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) cyl(g, M.brass, 0.015, 0.012, 0.08, lx, 0.04, lz, 8);
    box(g, M.walnut, 0.48, 0.5, 0.45, 0, 0.33, 0);
    box(g, M.oak, 0.01, 0.17, 0.39, 0.245, 0.46, 0);
    box(g, M.oak, 0.01, 0.17, 0.39, 0.245, 0.24, 0);
    sphere(g, M.brass, 0.018, 0.26, 0.46, 0, 10);
    sphere(g, M.brass, 0.018, 0.26, 0.24, 0, 10);
    solid(xw + 0.03, z - 0.24, xw + 0.53, z + 0.24);
    return g;
  }
  function dresser(x, z) {
    const d = node(group, x, 0, z);
    for (const [lx, lz] of [[-0.2, -0.85], [0.2, -0.85], [-0.2, 0.85], [0.2, 0.85]]) cyl(d, M.brass, 0.015, 0.012, 0.1, lx, 0.05, lz, 8);
    box(d, M.walnut, 0.5, 0.68, 1.8, 0, 0.44, 0);
    for (const dz of [-0.6, 0, 0.6]) {
      box(d, M.oak, 0.01, 0.56, 0.56, -0.252, 0.44, dz);
      box(d, M.brass, 0.02, 0.012, 0.16, -0.26, 0.6, dz);
    }
    solid(x - 0.27, z - 0.92, x + 0.25, z + 0.92);
    return d;
  }
  // Master bedroom (by the window).
  bed(-7.0, -2.7, 2.0);
  nightstand(-7.0, -4.06);
  const ns2 = nightstand(-7.0, -1.34);
  tableLamp(-6.74, 0.58, -4.1);
  tableLamp(-6.74, 0.58, -1.38);
  box(ns2, M.black, 0.1, 0.06, 0.06, 0.1, 0.61, 0.14);
  noShadow(box(ns2, std({ color: 0x000000, emissive: 0xff5040, emissiveIntensity: 1.2 }), 0.004, 0.025, 0.045, 0.151, 0.61, 0.14));
  wallArt(M.sarape, -6.925, 2.05, -2.7, 1.3, 0.72, Math.PI / 2, 'Look at the weaving', 'A hand-woven sarape from Saltillo, hung like a painting.');
  {
    const r2 = add(group, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), M.rug), -5.0, 0.004, -2.7);
    r2.rotation.x = -Math.PI / 2;
    noShadow(r2);
    const bench = node(group, -4.5, 0, -2.7);
    for (const [lx, lz] of [[-0.15, -0.6], [0.15, -0.6], [-0.15, 0.6], [0.15, 0.6]]) box(bench, M.walnut, 0.04, 0.4, 0.04, lx, 0.2, lz);
    box(bench, M.walnut, 0.38, 0.04, 1.36, 0, 0.4, 0);
    rbox(bench, M.leather, 0.38, 0.1, 1.36, 0.03, 0, 0.46, 0);
    solid(-4.71, -3.4, -4.29, -2.0);
  }
  dresser(-3.45, -2.6);
  wallArt(M.poster, -3.215, 1.65, -2.6, 0.66, 0.86, -Math.PI / 2);
  add(group, new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.1, 0.06], [0.09, 0.16], [0.05, 0.24], [0.045, 0.3], [0.06, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)), 24), M.clay), -3.45, 0.78, -3.2);
  armchair(-3.85, -4.4, 0.6, M.teal);
  floorLamp(-5.5, -4.7, false);
  // Curtains gathered either side of the bedroom window.
  cyl(group, M.brass, 0.015, 0.015, 3.2, -5.1, 2.62, -4.88, 12).rotation.z = Math.PI / 2;
  const bcL = add(group, new THREE.Mesh(curtainGeo, M.curtain), -6.75, 0.06, -4.86);
  bcL.scale.set(0.4, 0.985, 2.4);
  const bcR = add(group, new THREE.Mesh(curtainGeo, M.curtain), -3.45, 0.06, -4.86);
  bcR.scale.set(-0.4, 0.985, 2.4);

  // Second bedroom (off the south end of the hallway).
  bed(-7.0, 7.0, 1.6);
  nightstand(-7.0, 5.62);
  tableLamp(-6.74, 0.58, 5.6);
  wallArt(M.canvas, -6.925, 2.0, 7.0, 1.1, 0.64, Math.PI / 2, 'Look at the painting', 'Another view of the volcanoes. Someone at this hotel really loves Popocatépetl.');
  {
    const r1 = add(group, new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.2), M.rug), -5.0, 0.004, 7.0);
    r1.rotation.x = -Math.PI / 2;
    noShadow(r1);
    // Desk against the south wall, with a chair and a lamp.
    const desk = node(group, -5.6, 0, 8.72, -Math.PI / 2);
    box(desk, M.walnut, 0.56, 0.04, 1.2, 0, 0.74, 0);
    for (const [lx, lz] of [[-0.24, -0.56], [0.24, -0.56], [-0.24, 0.56], [0.24, 0.56]]) box(desk, M.black, 0.03, 0.72, 0.03, lx, 0.36, lz);
    box(desk, M.linen, 0.21, 0.01, 0.3, -0.05, 0.765, 0.18);
    cyl(desk, M.clay, 0.04, 0.035, 0.1, -0.12, 0.81, -0.1, 16);
    solid(-6.2, 8.44, -5.0, 9.0);
    const dc = chair(-5.6, 8.12, Math.PI, M.mustard);
    solid(-5.82, 7.9, -5.38, 8.34);
    interact(dc, { label: () => 'Sit at the desk', act: () => ctx.sit({ eye: new THREE.Vector3(-5.6, 1.18, 8.07), yaw: Math.PI, pitch: -0.3 }) });
    const dl = node(group, -6.0, 0.76, 8.8);
    cyl(dl, M.brass, 0.08, 0.09, 0.02, 0, 0.01, 0, 20);
    cyl(dl, M.brass, 0.008, 0.008, 0.45, 0, 0.22, -0.05, 8).rotation.x = -0.25;
    const dMat = std({ color: 0x1f3d8c, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 0.5, side: THREE.DoubleSide });
    noShadow(cyl(dl, dMat, 0.04, 0.11, 0.13, 0, 0.43, -0.12, 20, true));
    const deskLamp = toggler((k) => (dMat.emissiveIntensity = 0.9 * k), 6, { dirty: false });
    interact(dl, { label: () => (deskLamp.on ? 'Switch off the desk lamp' : 'Switch on the desk lamp'), act: () => (deskLamp.on = !deskLamp.on) });
  }
  wallArt(M.tile, -5.6, 1.7, 5.075, 0.8, 0.8, 0);
  // A wardrobe on the east wall.
  {
    const x0 = -3.78;
    const x1 = -3.2;
    const z0 = 6.8;
    const z1 = 8.6;
    const carcass = [
      wbox(group, M.walnut, x0, 0, z0, x1, 0.08, z1),
      wbox(group, M.walnut, x0, 2.26, z0, x1, 2.3, z1),
      wbox(group, M.walnut, x0, 0, z0, x1, 2.3, z0 + 0.04),
      wbox(group, M.walnut, x0, 0, z1 - 0.04, x1, 2.3, z1),
      wbox(group, M.oak, x1 - 0.03, 0.08, z0 + 0.04, x1, 2.26, z1 - 0.04), // back panel, fitted between the sides
    ];
    rbox(group, M.linen, 0.12, 1.0, 0.5, 0.05, -3.5, 1.3, 7.3);
    rbox(group, M.teal, 0.1, 0.75, 0.48, 0.04, -3.5, 1.45, 7.9);
    solid(x0, z0, x1, z1);
    const door1 = node(group, x0 - 0.015, 0.04, z0 + 0.04);
    box(door1, M.walnut, 0.03, 2.2, 0.86, 0, 1.1, 0.43);
    box(door1, M.brass, 0.02, 0.35, 0.02, -0.025, 1.1, 0.78);
    const door2 = node(group, x0 - 0.015, 0.04, z1 - 0.04);
    box(door2, M.walnut, 0.03, 2.2, 0.86, 0, 1.1, -0.43);
    box(door2, M.brass, 0.02, 0.35, 0.02, -0.025, 1.1, -0.78);
    const wardrobe = toggler((k) => {
      door1.rotation.y = 1.9 * k;
      door2.rotation.y = -1.9 * k;
    }, 1.6);
    interact([door1, door2, ...carcass], {
      label: () => (wardrobe.on ? 'Close the wardrobe' : 'Open the wardrobe'),
      act: () => {
        wardrobe.on = !wardrobe.on;
        if (wardrobe.on) ctx.toast('Spare blankets and a fluffy robe.');
      },
    });
  }

  // ===================== BATHROOM (off the hallway) =====================
  function wainscot(segs, top = 1.25) {
    for (const [x0, z0, x1, z1] of segs) {
      wbox(group, M.tile, x0, 0, z0, x1, top, z1);
      wbox(group, M.trim, x0 - (x1 - x0 < 0.05 ? 0.004 : 0), top, z0 - (z1 - z0 < 0.05 ? 0.004 : 0), x1 + (x1 - x0 < 0.05 ? 0.004 : 0), top + 0.04, z1 + (z1 - z0 < 0.05 ? 0.004 : 0));
    }
  }
  wainscot([
    [-10.6, 2.06, -4.66, 2.072],
    [-10.6, 4.928, -4.66, 4.94],
    [-10.6, 2.06, -10.588, 4.94],
    [-4.672, 2.06, -4.66, 2.3],
    [-4.672, 3.1, -4.66, 4.94],
  ]);
  wbox(group, M.tile, -10.6, 1.25, 2.6, -10.588, 2.4, 4.94);
  wbox(group, M.tile, -10.588, 1.25, 4.928, -9.3, 2.4, 4.94);
  // Vanity with a hand-painted vessel sink, and a real mirror.
  wbox(group, M.walnut, -7.7, 0.14, 2.072, -6.3, 0.8, 2.6);
  wbox(group, M.oak, -7.66, 0.2, 2.6, -6.34, 0.74, 2.61);
  wbox(group, M.marble, -7.72, 0.8, 2.072, -6.28, 0.84, 2.64);
  const sinkGeo = new THREE.LatheGeometry([[0, 0], [0.08, 0.005], [0.16, 0.04], [0.2, 0.11], [0.205, 0.13], [0.19, 0.13], [0.15, 0.06], [0.06, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
  const sink = add(group, new THREE.Mesh(sinkGeo, std({ map: lampTile, roughness: 0.2, side: THREE.DoubleSide })), -7.0, 0.84, 2.38);
  const tapPost = cyl(group, M.chrome, 0.016, 0.018, 0.3, -7.0, 0.99, 2.11, 12);
  const spout = cyl(group, M.chrome, 0.012, 0.012, 0.2, -7.0, 1.13, 2.21, 10);
  spout.rotation.x = Math.PI / 2;
  const stream = cyl(group, M.water, 0.007, 0.009, 0.22, -7.0, 1.0, 2.3, 8);
  stream.visible = false;
  noShadow(stream);
  noRay(stream);
  solid(-7.72, 2.06, -6.28, 2.64);
  cyl(group, std({ color: 0xf2c14e, roughness: 0.3 }), 0.025, 0.025, 0.14, -7.55, 0.91, 2.2, 12);
  cyl(group, std({ color: 0x2f8a88, roughness: 0.3 }), 0.025, 0.025, 0.12, -7.45, 0.9, 2.25, 12);
  const tap = { on: false, t: 0 };
  updaters.push((dt) => {
    if (!tap.on) return;
    tap.t += dt;
    stream.scale.x = stream.scale.z = 1 + Math.sin(tap.t * 40) * 0.15;
  });
  interact([sink, tapPost, spout], {
    label: () => (tap.on ? 'Turn off the tap' : 'Wash your hands'),
    act: () => {
      tap.on = !tap.on;
      stream.visible = tap.on;
      if (tap.on) {
        ctx.complete('sink');
        ctx.toast('Fresh, cool water. The soap smells like lime.');
      }
    },
  });
  const mirrorGroup = node(group, -7.0, 1.62, 2.075, 0);
  const mirror = new Reflector(new THREE.CircleGeometry(0.36, 48), { textureWidth: 640, textureHeight: 640, clipBias: 0.003, color: 0xc9c9c9 });
  mirror.position.z = 0.004;
  mirrorGroup.add(mirror);
  api.mirror = mirror;
  const ring = add(mirrorGroup, new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.022, 10, 48), M.brass), 0, 0, 0.006);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const len = i % 2 ? 0.1 : 0.17;
    const ray = add(mirrorGroup, new THREE.Mesh(new THREE.ConeGeometry(0.025, len, 4), M.brass), Math.cos(a) * (0.4 + len / 2), Math.sin(a) * (0.4 + len / 2), 0.004);
    ray.rotation.z = a - Math.PI / 2;
    ray.scale.z = 0.25;
  }
  noShadow(mirrorGroup);
  interact([mirror, ring], { label: () => 'Look in the mirror', act: () => ctx.toast('Looking good. Ready for tacos al pastor.') });
  function toilet(x, z, ry) {
    const wc = node(group, x, 0, z, ry);
    const base = cyl(wc, M.porcelain, 0.16, 0.13, 0.38, 0, 0.19, -0.05, 24);
    base.scale.z = 1.35;
    const rim = add(wc, new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 10, 28), M.porcelain), 0, 0.4, -0.08);
    rim.rotation.x = Math.PI / 2;
    rim.scale.y = 1.3;
    cyl(wc, M.porcelain, 0.19, 0.19, 0.025, 0, 0.44, -0.08, 28).scale.z = 1.3;
    rbox(wc, M.porcelain, 0.44, 0.36, 0.17, 0.04, 0, 0.62, 0.29);
    cyl(wc, M.chrome, 0.025, 0.025, 0.01, 0, 0.805, 0.29, 16);
    interact(wc, { label: () => 'Flush', act: () => ctx.toast('*whoosh*') });
    return wc;
  }
  toilet(-8.0, 4.62, 0);
  solid(-8.25, 4.3, -7.75, 4.94);
  {
    const roll = cyl(group, M.linen, 0.055, 0.055, 0.1, -7.5, 0.66, 4.89, 16);
    roll.rotation.z = Math.PI / 2;
    const rod = cyl(group, M.chrome, 0.012, 0.012, 0.9, -5.9, 1.42, 4.88, 10);
    rod.rotation.z = Math.PI / 2;
    rbox(group, M.linen, 0.36, 0.6, 0.035, 0.015, -6.12, 1.13, 4.87);
    rbox(group, std({ color: 0x2f8a88, roughness: 1 }), 0.36, 0.55, 0.035, 0.015, -5.7, 1.16, 4.87);
    const bm = add(group, new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), std({ color: 0xf1ece2, roughness: 1 })), -8.7, 0.005, 3.5);
    bm.rotation.x = -Math.PI / 2;
    bm.rotation.z = Math.PI / 2;
  }
  // Walk-in shower at the west end.
  const trayMesh = wbox(group, M.porcelain, -10.588, 0, 2.6, -9.3, 0.04, 4.928);
  const showerGlass = new THREE.Group();
  group.add(showerGlass);
  wbox(showerGlass, M.glass, -9.31, 0.04, 3.0, -9.29, 2.05, 4.928);
  noShadow(showerGlass);
  wbox(group, M.chrome, -9.315, 2.05, 3.0, -9.285, 2.07, 4.928);
  solid(-9.33, 3.0, -9.27, 4.94);
  solid(-10.6, 2.06, -9.3, 2.6);
  wbox(group, M.white, -10.6, 0, 2.06, -9.3, 2.4, 2.6);
  const showerArm = cyl(group, M.chrome, 0.012, 0.012, 0.4, -10.39, 2.2, 3.8, 10);
  showerArm.rotation.z = Math.PI / 2;
  const showerHead = cyl(group, M.chrome, 0.15, 0.15, 0.02, -10.15, 2.18, 3.8, 32);
  const mixer = cyl(group, M.chrome, 0.06, 0.06, 0.02, -10.578, 1.15, 3.8, 24);
  mixer.rotation.z = Math.PI / 2;
  const dropCount = 500;
  const drops = new Float32Array(dropCount * 3);
  for (let i = 0; i < dropCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * 0.13;
    drops[i * 3] = -10.15 + Math.cos(a) * rr;
    drops[i * 3 + 1] = 0.05 + Math.random() * 2.1;
    drops[i * 3 + 2] = 3.8 + Math.sin(a) * rr;
  }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(drops, 3));
  const water = new THREE.Points(dropGeo, new THREE.PointsMaterial({ color: 0xd4ecff, size: 0.014, transparent: true, opacity: 0.75, depthWrite: false }));
  water.visible = false;
  group.add(water);
  noRay(water);
  noShadow(water);
  const shower = { on: false };
  updaters.push((dt) => {
    if (!shower.on) return;
    for (let i = 0; i < dropCount; i++) {
      let y = drops[i * 3 + 1] - dt * (4 + (i % 7) * 0.3);
      if (y < 0.05) y += 2.1;
      drops[i * 3 + 1] = y;
    }
    dropGeo.attributes.position.needsUpdate = true;
  });
  interact([mixer, showerHead, showerArm, trayMesh, showerGlass], {
    label: () => (shower.on ? 'Turn off the shower' : 'Turn on the shower'),
    act: () => {
      shower.on = !shower.on;
      water.visible = shower.on;
      if (shower.on) ctx.toast('Hot water, great pressure. Five stars.');
    },
  });

  // ===================== WALK-IN CLOSET =====================
  {
    // Hanging clothes along the north wall, shelves and drawers along the south.
    const rod = cyl(group, M.chrome, 0.012, 0.012, 2.6, -6.15, 1.85, -0.05, 10);
    rod.rotation.z = Math.PI / 2;
    wbox(group, M.oak, -7.54, 1.98, -0.34, -4.8, 2.02, 0.25);
    const cols = [0xd9447a, 0x2f8a88, 0xf7f4ee, 0x1f3d8c, 0xd99a26, 0x3a3a3a, 0xc4507c, 0x7cc243, 0xf2c14e, 0x2c6b70, 0x9c5a30, 0xeee5d3];
    for (let i = 0; i < 12; i++) {
      const x = -7.3 + i * 0.21;
      const h = 0.7 + ((i * 37) % 5) * 0.08;
      rbox(group, std({ color: cols[i], map: tex.fabric, roughness: 1 }), 0.06, h, 0.48, 0.02, x, 1.82 - h / 2, -0.05);
      box(group, M.oak, 0.02, 0.02, 0.42, x, 1.83, -0.05);
    }
    for (let i = 0; i < 6; i++) rbox(group, std({ color: cols[(i * 5) % 12], roughness: 0.6 }), 0.14, 0.08, 0.26, 0.03, -7.3 + i * 0.4, 0.04, 0.12);
    wbox(group, M.walnut, -7.54, 0, 1.5, -4.8, 2.2, 1.94);
    for (const y of [0.5, 1.0, 1.5]) wbox(group, M.oak, -7.5, y, 1.48, -4.84, y + 0.03, 1.5);
    for (let i = 0; i < 7; i++) rbox(group, std({ color: cols[(i * 3 + 1) % 12], map: tex.fabric, roughness: 1 }), 0.3, 0.12, 0.3, 0.03, -7.25 + i * 0.36, 1.1, 1.7);
    rbox(group, M.linen, 0.5, 1.0, 0.12, 0.05, -5.1, 1.3, 1.42);
    solid(-7.54, -0.34, -4.8, 0.22);
    solid(-7.54, 1.48, -4.8, 1.94);
    const safe = node(group, -6.0, 0.05, 1.7);
    box(safe, M.black, 0.45, 0.4, 0.35, 0, 0.2, 0);
    cyl(safe, M.chrome, 0.04, 0.04, 0.02, 0.1, 0.22, -0.18, 16).rotation.x = Math.PI / 2;
    noShadow(box(safe, std({ color: 0x000000, emissive: 0x40ff60, emissiveIntensity: 1.0 }), 0.12, 0.04, 0.005, -0.1, 0.3, -0.178));
    interact(safe, { label: () => 'Open the safe', act: () => ctx.toast('*beep beep beep* Your passport and pesos are safe and sound.') });
  }

  // ===================== BATHROOM INSIDE THE CLOSET =====================
  wainscot([
    [-10.6, -0.34, -7.66, -0.328],
    [-10.6, 1.928, -7.66, 1.94],
    [-10.6, -0.34, -10.588, 1.94],
    [-7.672, -0.34, -7.66, 0.3],
    [-7.672, 1.2, -7.66, 1.94],
  ]);
  {
    // A deep bathtub you can fill.
    const tub = node(group, -10.2, 0, 0.55);
    rbox(tub, M.porcelain, 0.76, 0.55, 1.72, 0.08, 0, 0.275, 0);
    rbox(tub, std({ color: 0xe8f2f6, roughness: 0.1 }), 0.6, 0.02, 1.54, 0.01, 0, 0.551, 0);
    const tubWater = add(tub, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.54), M.tubWater), 0, 0.2, 0);
    tubWater.rotation.x = -Math.PI / 2;
    tubWater.visible = false;
    noShadow(tubWater);
    noRay(tubWater);
    const faucet = cyl(group, M.chrome, 0.018, 0.018, 0.22, -10.49, 0.72, -0.2, 10);
    faucet.rotation.z = Math.PI / 2;
    const tStream = cyl(group, M.water, 0.01, 0.012, 0.3, -10.38, 0.55, -0.2, 8);
    tStream.visible = false;
    noShadow(tStream);
    noRay(tStream);
    solid(-10.6, -0.34, -9.8, 1.42);
    const bath = { on: false, level: 0 };
    updaters.push((dt) => {
      if (bath.on) bath.level = Math.min(1, bath.level + dt / 8);
      tubWater.visible = bath.level > 0.01;
      tubWater.position.y = 0.06 + bath.level * 0.4;
      tStream.visible = bath.on && bath.level < 1;
      if (bath.on && bath.level >= 1) {
        bath.on = false;
        ctx.toast('The bath is full. Bubbles sold separately.');
      }
    });
    interact([tub, faucet], {
      label: () => (bath.on ? 'Turn off the bath' : bath.level > 0.5 ? 'Pull the plug' : 'Run a bath'),
      act: () => {
        if (!bath.on && bath.level > 0.5) {
          bath.level = 0;
          ctx.toast('*glug glug glug*');
          return;
        }
        bath.on = !bath.on;
        if (bath.on) ctx.toast('Warm water starts filling the tub…');
      },
    });
    api.bathTub = bath;
    toilet(-9.35, -0.07, Math.PI);
    solid(-9.6, -0.34, -9.1, 0.2);
    // Pedestal sink and a little round mirror.
    const ps = node(group, -8.5, 0, 1.72);
    cyl(ps, M.porcelain, 0.07, 0.1, 0.78, 0, 0.39, 0, 16);
    add(ps, new THREE.Mesh(sinkGeo, std({ map: lampTile, roughness: 0.2, side: THREE.DoubleSide })), 0, 0.78, -0.02).scale.setScalar(0.8);
    cyl(ps, M.chrome, 0.014, 0.014, 0.2, 0, 1.0, 0.16, 10);
    solid(-8.75, 1.5, -8.25, 1.94);
    const sm = add(group, new THREE.Mesh(new THREE.CircleGeometry(0.25, 36), std({ color: 0xdfe6ea, metalness: 1, roughness: 0.05 })), -8.5, 1.6, 1.925);
    sm.rotation.y = Math.PI;
    add(group, new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 36), M.brass), -8.5, 1.6, 1.925);
    const rod = cyl(group, M.chrome, 0.012, 0.012, 0.6, -10.588, 1.3, 1.65, 10);
    rod.rotation.x = Math.PI / 2;
    rbox(group, M.pink, 0.035, 0.55, 0.36, 0.015, -10.57, 1.05, 1.65);
  }

  // ===================== DOORS =====================
  hingedDoor(-4.4, -0.4, 0.9, [1, 0], [0, -1], 'bedroom');
  hingedDoor(-4.4, 5.0, 0.9, [1, 0], [0, 1], 'bedroom');
  hingedDoor(-4.6, 0.4, 0.9, [0, 1], [-1, 0], 'closet');
  hingedDoor(-4.6, 2.3, 0.8, [0, 1], [-1, 0], 'bathroom');
  hingedDoor(-7.6, 0.3, 0.9, [0, 1], [-1, 0], 'bathroom');

  // State the game loop reads for sound.
  api.state = {
    balconyDoor,
    water: [
      { on: () => tap.on, pos: new THREE.Vector3(-7.0, 1, 2.38), gain: 0.4, range: 4 },
      { on: () => shower.on, pos: new THREE.Vector3(-10.15, 1.2, 3.8), gain: 1, range: 5 },
      { on: () => api.kitchenTap.on, pos: new THREE.Vector3(4.7, 1, 4.3), gain: 0.4, range: 4 },
      { on: () => api.bathTub.on, pos: new THREE.Vector3(-10.2, 0.6, 0.0), gain: 0.7, range: 4.5 },
    ],
  };

  // ---------- per-frame ----------
  const inRoom = (r, p) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
  let closetSeen = false;
  let bath2Seen = false;
  function update(dt) {
    for (const u of updaters) u(dt);
    const pl = ctx.player && ctx.player();
    if (!pl) return;
    if (!closetSeen && inRoom(ROOMS.closet, pl.pos)) {
      closetSeen = true;
      ctx.toast('A walk-in closet full of clothes… and is that another door at the back?');
    }
    if (!bath2Seen && inRoom(ROOMS.bath2, pl.pos)) {
      bath2Seen = true;
      ctx.complete('closet');
      ctx.toast('A second bathroom, hidden inside the closet — with a big bathtub!');
    }
  }
  return api;
}

// The TV runs a little local channel. Returns true when the picture is warm.
function drawTV(g, w, h, t) {
  const showB = Math.floor(t / 9) % 2 === 1;
  if (!showB) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2a7bc4');
    sky.addColorStop(1, '#f9cf86');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9a8';
    g.beginPath();
    g.arc(400, 84 + Math.sin(t * 0.6) * 4, 30, 0, Math.PI * 2);
    g.fill();
    const speed = 22;
    const first = Math.floor((t * speed) / 48);
    const off = (t * speed) % 48;
    g.fillStyle = '#3a3360';
    for (let i = -1; i < 12; i++) {
      const idx = first + i;
      const bh = 40 + ((((Math.sin(idx * 12.9898) * 43758.5453) % 1) + 1) % 1) * 110;
      g.fillRect(i * 48 - off, h - 44 - bh, 44, bh);
    }
    g.fillStyle = '#d2a23a';
    g.fillRect(150, 90, 10, 160);
    g.beginPath();
    g.moveTo(155, 60);
    g.lineTo(175, 80);
    g.lineTo(155, 92);
    g.lineTo(135, 80);
    g.fill();
    g.fillStyle = '#d9447a';
    g.fillRect(20, 20, 176, 46);
    g.fillStyle = '#fff';
    g.font = 'bold 30px sans-serif';
    g.fillText('CDMX HOY', 32, 54);
    g.font = 'bold 54px sans-serif';
    g.fillText('24°', w - 120, 170);
    g.font = '20px sans-serif';
    g.fillText('Soleado', w - 118, 196);
  } else {
    g.fillStyle = '#1a0f2e';
    g.fillRect(0, 0, w, h);
    const spot = g.createRadialGradient(w / 2, 30, 10, w / 2, 120, 260);
    spot.addColorStop(0, 'rgba(255,240,200,0.55)');
    spot.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = spot;
    g.fillRect(0, 0, w, h);
    const mask = (x, base, trim, eye) => {
      g.fillStyle = base;
      g.beginPath();
      g.ellipse(x, 140, 56, 68, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = trim;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(x + s * 22, 130, 22, 14, s * 0.4, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = eye;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(x + s * 22, 130, 11, 7, s * 0.4, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = trim;
      g.beginPath();
      g.moveTo(x, 70);
      g.lineTo(x + 14, 105);
      g.lineTo(x - 14, 105);
      g.fill();
      g.fillRect(x - 18, 172, 36, 8);
    };
    const bounce = Math.abs(Math.sin(t * 3)) * 8;
    mask(140, '#c62a47', '#f2c14e', '#111');
    mask(372, '#1f3d8c', '#e8e8f0', '#111');
    g.fillStyle = '#f2c14e';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.fillText('LUCHA LIBRE', w / 2, 52);
    g.fillStyle = t % 1 < 0.5 ? '#ff5fa2' : '#ffffff';
    g.font = 'bold 28px sans-serif';
    g.fillText('¡ESTA NOCHE!', w / 2, 236 - bounce);
    g.textAlign = 'left';
  }
  g.fillStyle = 'rgba(10,18,40,0.9)';
  g.fillRect(0, h - 40, w, 40);
  g.fillStyle = '#f2c14e';
  g.fillRect(0, h - 40, 6, 40);
  g.fillStyle = '#fff';
  g.font = '20px sans-serif';
  const msg = 'Clima: 24°C y soleado  •  Xochimilco: paseos en trajinera todo el día  •  Bosque de Chapultepec abierto  •  Jacarandas en flor sobre Reforma  •  ¡Buen provecho!  •  ';
  const tw = g.measureText(msg).width;
  const x = -((t * 70) % tw);
  g.fillText(msg + msg, x, h - 13);
  return !showB;
}
