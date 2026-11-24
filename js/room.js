// Hotel Jacaranda, room 1207. Everything here is in meters.
//
// Floor plan (looking down, north is up / -z):
//
//        balcony  (z -6.6 .. -5.15)
//   +------[ sliding glass door ]------+  z = -5
//   | armchair                   desk  |
//   | [bed]  rug   bench         [TV]  |
//   |                            plant |
//   +------------+---------------------+  z = 1
//   |  bathroom  door   minibar  wardrobe
//   |            |     suitcase  [door]|  z = 4
//   x=-3.5     x=-0.5                 x=3.5
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as T from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const ease = (k) => k * k * (3 - 2 * k);
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
    ceiling: std({ color: 0xfbf8f3, roughness: 1 }),
    floor: std({ map: tex.wood, roughness: 0.5 }),
    saltillo: std({ map: tex.saltillo, roughness: 0.75 }),
    tile: std({ map: tex.tile, roughness: 0.22 }),
    trim: std({ color: 0x1f3d8c, roughness: 0.3 }),
    walnut: std({ map: tex.grain, color: 0x8a5a3a, roughness: 0.55 }),
    oak: std({ map: tex.grain, color: 0xe6c79c, roughness: 0.6 }),
    white: std({ color: 0xf6f3ee, roughness: 0.45 }),
    porcelain: std({ color: 0xffffff, roughness: 0.12 }),
    chrome: std({ color: 0xeeeeee, metalness: 1, roughness: 0.12 }),
    brass: std({ color: 0xd1a659, metalness: 1, roughness: 0.3 }),
    black: std({ color: 0x1c1c1f, metalness: 0.4, roughness: 0.45 }),
    linen: std({ color: 0xf7f4ee, roughness: 1 }),
    headboard: std({ color: 0x2c6b70, map: tex.fabric, roughness: 1 }),
    mustard: std({ color: 0xd99a26, map: tex.fabric, roughness: 1 }),
    pink: std({ color: 0xd9447a, map: tex.fabric, roughness: 1 }),
    teal: std({ color: 0x2f8a88, map: tex.fabric, roughness: 1 }),
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
    const c = { x0, z0, x1, z1, off: false };
    colliders.push(c);
    return c;
  }
  function interact(objs, def) {
    for (const o of [].concat(objs)) o.userData.interact = def;
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
    return s;
  }
  // Recessed ceiling light: a downward cone, so the ceiling isn't blown out.
  function spotLight(color, distance, x, z, shadow = false) {
    const l = new THREE.SpotLight(color, 0, distance, 1.2, 0.9, 2);
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
  function pointLight(color, distance, x, y, z, shadow = false) {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.position.set(x, y, z);
    if (shadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(512, 512);
      l.shadow.camera.near = 0.05;
      l.shadow.camera.far = 9;
      l.shadow.bias = -0.004;
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
      shadowLights.push(l);
    }
    group.add(l);
    return l;
  }

  // ---------- shell: floors, ceiling, walls ----------
  wbox(group, M.floor, -3.5, -0.2, -5, 3.5, 0, 1);
  wbox(group, M.floor, -0.5, -0.2, 1, 3.5, 0, 4);
  wbox(group, M.saltillo, -3.5, -0.2, 1, -0.5, 0, 4);
  wbox(group, M.black, -2.6, -0.2, -5.15, 2.6, 0.012, -5);
  wbox(group, M.ceiling, -3.65, H, -5.15, 3.65, H + 0.15, 4.15);

  wbox(group, M.accent, -3.65, 0, -5.15, -3.5, H, 0.94);
  wbox(group, M.wall, -3.65, 0, 0.94, -3.5, H, 4.15);
  wbox(group, M.wall, 3.5, 0, -5.15, 3.65, H, 4.15);
  // South wall with the entry door opening.
  wbox(group, M.wall, -3.5, 0, 4, 1.2, H, 4.15);
  wbox(group, M.wall, 2.2, 0, 4, 3.5, H, 4.15);
  wbox(group, M.wall, 1.2, 2.15, 4, 2.2, H, 4.15);
  // North wall around the balcony door.
  wbox(group, M.wall, -3.5, 0, -5.15, -2.6, H, -5);
  wbox(group, M.wall, 2.6, 0, -5.15, 3.5, H, -5);
  wbox(group, M.wall, -2.6, 2.5, -5.15, 2.6, H, -5);
  // Bathroom partitions.
  wbox(group, M.wall, -3.5, 0, 0.94, -0.44, H, 1.06);
  wbox(group, M.wall, -0.56, 0, 1.06, -0.44, H, 1.4);
  wbox(group, M.wall, -0.56, 0, 2.3, -0.44, H, 4);
  wbox(group, M.wall, -0.56, 2.1, 1.4, -0.44, H, 2.3);

  solid(-3.8, -5.3, -3.5, 4.3);
  solid(3.5, -5.3, 3.8, 4.3);
  solid(-3.5, 4, 3.5, 4.3);
  solid(-3.5, -5.15, -2.6, -5);
  solid(2.6, -5.15, 3.5, -5);
  solid(-3.5, 0.94, -0.44, 1.06);
  solid(-0.56, 1.06, -0.44, 1.4);
  solid(-0.56, 2.3, -0.44, 4);

  // Baseboards.
  const bb = (x0, z0, x1, z1) => wbox(group, M.white, x0, 0, z0, x1, 0.09, z1);
  bb(3.485, -5, 3.5, 4);
  bb(-3.5, -5, -3.485, 0.94);
  bb(-3.5, 0.925, -0.44, 0.94);
  bb(-0.44, 1.06, -0.425, 1.4);
  bb(-0.44, 2.3, -0.425, 4);
  bb(-0.44, 3.985, 1.2, 4);
  bb(2.2, 3.985, 3.5, 4);
  bb(-3.5, -5, -2.6, -4.985);
  bb(2.6, -5, 3.5, -4.985);
  // Door casings.
  wbox(group, M.white, 1.1, 0, 3.98, 1.2, 2.25, 4.0);
  wbox(group, M.white, 2.2, 0, 3.98, 2.3, 2.25, 4.0);
  wbox(group, M.white, 1.1, 2.15, 3.98, 2.3, 2.25, 4.0);
  wbox(group, M.white, -0.44, 0, 1.3, -0.42, 2.2, 1.4);
  wbox(group, M.white, -0.44, 0, 2.3, -0.42, 2.2, 2.4);
  wbox(group, M.white, -0.44, 2.1, 1.3, -0.42, 2.2, 2.4);

  // ---------- ceiling lights ----------
  const downlight = (x, z, mat) => {
    const m = add(group, new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), mat), x, H - 0.002, z);
    m.rotation.x = Math.PI / 2;
    cyl(group, M.chrome, 0.1, 0.1, 0.006, x, H - 0.003, z, 24, true);
    return m;
  };
  const roomDL = std({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0 });
  const bathDL = std({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 0 });
  for (const [x, z] of [[-1.2, -3.7], [1.5, -3.7], [-1.2, -0.5], [1.5, -0.5], [1.4, 1.9], [1.4, 3.3]]) downlight(x, z, roomDL);
  for (const [x, z] of [[-2.0, 1.8], [-2.0, 3.3]]) downlight(x, z, bathDL);
  const mainLight = spotLight(0xffe1bc, 0, 0.2, -2.1, true);
  const hallLight = spotLight(0xffe1bc, 4, 1.4, 2.6);
  const bathLight = spotLight(0xfff1e0, 3.6, -2.0, 2.5);
  // Soft fill standing in for light bouncing off the walls and ceiling.
  const fillLight = pointLight(0xffe6c8, 9, 0.3, 1.5, -1.6);

  const roomLights = toggler((k) => {
    mainLight.intensity = 11 * k;
    hallLight.intensity = 6 * k;
    fillLight.intensity = 1.6 * k;
    roomDL.emissiveIntensity = 1.4 * k;
  }, 5, { dirty: false });
  roomLights.on = true;
  const bathLights = toggler((k) => {
    bathLight.intensity = 7 * k;
    bathDL.emissiveIntensity = 1.4 * k;
  }, 5, { dirty: false });
  bathLights.on = true;

  // Light switches.
  const switchPlate = (x, y, z, ry) => {
    const g = node(group, x, y, z, ry);
    box(g, M.white, 0.08, 0.12, 0.012, 0, 0, 0.006);
    box(g, M.porcelain, 0.03, 0.05, 0.012, 0, 0, 0.016);
    return g;
  };
  const mainSwitch = switchPlate(0.85, 1.2, 3.985, Math.PI);
  interact(mainSwitch.children, {
    label: () => (roomLights.on ? 'Switch off the room lights' : 'Switch on the room lights'),
    act: () => (roomLights.on = !roomLights.on),
  });
  const bathSwitch = switchPlate(-0.572, 1.2, 2.55, -Math.PI / 2);
  interact(bathSwitch.children, {
    label: () => (bathLights.on ? 'Switch off the bathroom light' : 'Switch on the bathroom light'),
    act: () => (bathLights.on = !bathLights.on),
  });

  // ---------- balcony door, balcony, curtains ----------
  wbox(group, M.black, -2.6, 0, -5.15, -2.55, 2.5, -5);
  wbox(group, M.black, 2.55, 0, -5.15, 2.6, 2.5, -5);
  wbox(group, M.black, -2.6, 2.45, -5.15, 2.6, 2.5, -5);
  function pane(width) {
    const g = new THREE.Group();
    const ph = 2.45;
    box(g, M.black, width, 0.05, 0.045, width / 2, 0.025, 0);
    box(g, M.black, width, 0.05, 0.045, width / 2, ph - 0.025, 0);
    box(g, M.black, 0.05, ph, 0.045, 0.025, ph / 2, 0);
    box(g, M.black, 0.05, ph, 0.045, width - 0.025, ph / 2, 0);
    const glass = box(g, M.glass, width - 0.1, ph - 0.1, 0.012, width / 2, ph / 2, 0);
    noShadow(glass);
    group.add(g);
    return g;
  }
  const fixedPane = pane(2.6);
  fixedPane.position.set(-2.55, 0, -5.115);
  const slidePane = pane(2.6);
  slidePane.position.set(-0.05, 0, -5.045);
  const handle = box(slidePane, M.chrome, 0.025, 0.35, 0.03, 0.12, 1.05, 0.04);
  solid(-2.6, -5.15, 0.05, -5);
  const slideCol = solid(0.05, -5.15, 2.6, -5);
  const balconyDoor = toggler((k) => {
    slidePane.position.x = -0.05 - 2.4 * k;
    slideCol.off = k > 0.7;
  }, 1.1);
  interact([...slidePane.children, handle], {
    label: () => (balconyDoor.on ? 'Slide the balcony door shut' : 'Slide the balcony door open'),
    act: () => {
      balconyDoor.on = !balconyDoor.on;
      if (balconyDoor.on) ctx.toast('Street sounds from Paseo de la Reforma drift in.');
    },
  });

  // Balcony slab and glass railing.
  wbox(group, M.saltillo, -3.3, -0.25, -6.6, 3.3, 0, -5.15);
  const rail = new THREE.Group();
  group.add(rail);
  wbox(rail, M.glass, -3.25, 0.05, -6.56, 3.25, 1.0, -6.54);
  wbox(rail, M.glass, -3.26, 0.05, -6.55, -3.24, 1.0, -5.15);
  wbox(rail, M.glass, 3.24, 0.05, -6.55, 3.26, 1.0, -5.15);
  noShadow(rail);
  wbox(group, M.black, -3.3, 1.0, -6.6, 3.3, 1.05, -6.5);
  wbox(group, M.black, -3.3, 1.0, -6.6, -3.2, 1.05, -5.15);
  wbox(group, M.black, 3.2, 1.0, -6.6, 3.3, 1.05, -5.15);
  for (const x of [-3.25, -1.1, 1.1, 3.25]) wbox(group, M.black, x - 0.025, 0, -6.58, x + 0.025, 1.0, -6.53);
  solid(-3.5, -6.9, 3.5, -6.5);
  solid(-3.5, -6.6, -3.2, -5.15);
  solid(3.2, -6.6, 3.5, -5.15);

  // Bistro set on the balcony.
  function bistroChair(x, z, ry, cushion) {
    const g = node(group, x, 0, z, ry);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cyl(g, M.black, 0.012, 0.012, 0.45, lx, 0.225, lz, 8);
    box(g, M.black, 0.42, 0.025, 0.42, 0, 0.46, 0);
    rbox(g, cushion, 0.4, 0.05, 0.4, 0.02, 0, 0.495, 0);
    for (const lx of [-0.18, 0.18]) cyl(g, M.black, 0.012, 0.012, 0.45, lx, 0.69, 0.2, 8);
    box(g, M.black, 0.4, 0.14, 0.02, 0, 0.84, 0.2);
    return g;
  }
  const bc1 = bistroChair(-2.45, -5.75, 0, M.pink);
  const bc2 = bistroChair(-1.35, -5.75, 0, M.teal);
  const table = node(group, -1.9, 0, -6.15);
  cyl(table, M.black, 0.2, 0.2, 0.02, 0, 0.01, 0);
  cyl(table, M.black, 0.02, 0.02, 0.7, 0, 0.36, 0, 8);
  cyl(table, M.tile, 0.3, 0.3, 0.025, 0, 0.72, 0, 32);
  cyl(table, M.clay, 0.04, 0.035, 0.09, 0.08, 0.78, 0.05);
  solid(-2.25, -6.5, -1.55, -5.8);
  solid(-2.67, -5.97, -2.23, -5.53);
  solid(-1.57, -5.97, -1.13, -5.53);
  for (const [c, x] of [[bc1, -2.45], [bc2, -1.35]]) {
    interact(c.children, {
      label: () => 'Sit and take in the view',
      act: () => ctx.sit({ eye: new THREE.Vector3(x, 1.12, -5.7), yaw: 0, pitch: -0.08 }),
    });
  }

  function agavePlant(parent, x, y, z, s = 1, leaves = 14) {
    const g = node(parent, x, y, z);
    const geo = new THREE.ConeGeometry(0.045 * s, 0.6 * s, 5);
    geo.translate(0, 0.3 * s, 0);
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * Math.PI * 2;
      const m = add(g, new THREE.Mesh(geo, M.agave), 0, 0, 0);
      m.rotation.set(0, a, 0.5 + (i % 3) * 0.25);
      m.rotation.order = 'YZX';
    }
    return g;
  }
  const potA = node(group, 2.55, 0, -5.95);
  cyl(potA, M.terracotta, 0.26, 0.2, 0.45, 0, 0.225, 0, 24);
  agavePlant(potA, 0, 0.42, 0, 1.2, 16);
  solid(2.25, -6.25, 2.85, -5.65);
  const potB = node(group, 3.0, 0, -6.3);
  cyl(potB, M.tile, 0.14, 0.11, 0.24, 0, 0.12, 0, 20);
  for (const [cx, h] of [[0, 0.5], [0.05, 0.36], [-0.05, 0.3]]) add(potB, new THREE.Mesh(new THREE.CapsuleGeometry(0.035, h, 4, 10), M.cactus), cx, 0.24 + h / 2, 0);

  // Curtains: each panel is a pleated plane anchored at the wall edge.
  cyl(group, M.brass, 0.015, 0.015, 6.0, 0, 2.66, -4.88, 12).rotation.z = Math.PI / 2;
  const curtainGeo = new THREE.PlaneGeometry(1, 2.58, 72, 1);
  curtainGeo.translate(0.5, 1.29, 0);
  {
    const p = curtainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * Math.PI * 2 * 10) * 0.04);
    curtainGeo.computeVertexNormals();
  }
  const curtainL = add(group, new THREE.Mesh(curtainGeo, M.curtain), -2.95, 0.06, -4.86);
  const curtainR = add(group, new THREE.Mesh(curtainGeo, M.curtain), 2.95, 0.06, -4.86);
  const curtains = toggler((k) => {
    const w = 3.0 - 2.55 * k;
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

  // ---------- bed ----------
  const bed = node(group, -2.375, 0, -2.0);
  for (const [lx, lz] of [[-1.0, -0.95], [1.0, -0.95], [-1.0, 0.95], [1.0, 0.95]]) box(bed, M.walnut, 0.08, 0.1, 0.08, lx, 0.05, lz);
  box(bed, M.walnut, 2.15, 0.25, 2.0, 0, 0.225, 0);
  rbox(bed, M.linen, 2.05, 0.26, 1.94, 0.05, 0.02, 0.47, 0);
  rbox(bed, M.linen, 1.65, 0.1, 2.06, 0.04, 0.24, 0.63, 0);
  box(bed, M.linen, 1.6, 0.3, 0.02, 0.24, 0.52, 1.03);
  box(bed, M.linen, 1.6, 0.3, 0.02, 0.24, 0.52, -1.03);
  rbox(bed, M.linen, 0.2, 0.12, 2.08, 0.05, -0.56, 0.66, 0);
  const runner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 2.12), M.sarape);
  add(bed, runner, 0.72, 0.687, 0);
  box(bed, M.sarape, 0.55, 0.26, 0.012, 0.72, 0.56, 1.06);
  box(bed, M.sarape, 0.55, 0.26, 0.012, 0.72, 0.56, -1.06);
  for (const z of [-0.45, 0.45]) {
    const pillow = rbox(bed, M.linen, 0.42, 0.16, 0.78, 0.07, -0.78, 0.74, z);
    pillow.rotation.z = -0.38;
  }
  const c1 = rbox(bed, M.pink, 0.14, 0.4, 0.42, 0.06, -0.56, 0.82, -0.28);
  c1.rotation.z = -0.3;
  const c2 = rbox(bed, M.teal, 0.14, 0.4, 0.42, 0.06, -0.56, 0.82, 0.25);
  c2.rotation.z = -0.3;
  const bolster = cyl(bed, M.sarape, 0.09, 0.09, 0.8, -0.38, 0.75, 0, 20);
  bolster.rotation.x = Math.PI / 2;
  // Headboard.
  rbox(group, M.headboard, 0.12, 1.25, 2.3, 0.04, -3.43, 0.9, -2.0);
  wbox(group, M.walnut, -3.5, 0.25, -3.21, -3.47, 1.58, -0.79);
  solid(-3.5, -3.05, -1.28, -0.95);
  interact([bed, ...bed.children], {
    label: () => 'Lie down on the bed',
    act: () => {
      ctx.sit({ eye: new THREE.Vector3(-2.95, 0.98, -2.0), yaw: -Math.PI / 2, pitch: 0.18, lying: true });
      ctx.complete('bed');
    },
  });

  // Painting above the bed.
  wbox(group, M.walnut, -3.5, 1.65, -2.66, -3.465, 2.45, -1.34);
  const art = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.72), M.canvas), -3.462, 2.05, -2.0);
  art.rotation.y = Math.PI / 2;
  interact(art, {
    label: () => 'Look at the painting',
    act: () => ctx.toast('“Volcanes al atardecer” — Popocatépetl and Iztaccíhuatl at sunset.'),
  });

  // Rug and bench.
  const rugMesh = add(group, new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), M.rug), -1.55, 0.004, -2.0);
  rugMesh.rotation.x = -Math.PI / 2;
  noShadow(rugMesh);
  const bench = node(group, -1.02, 0, -2.0);
  for (const [lx, lz] of [[-0.15, -0.6], [0.15, -0.6], [-0.15, 0.6], [0.15, 0.6]]) box(bench, M.walnut, 0.04, 0.4, 0.04, lx, 0.2, lz);
  box(bench, M.walnut, 0.38, 0.04, 1.36, 0, 0.4, 0);
  rbox(bench, M.leather, 0.38, 0.1, 1.36, 0.03, 0, 0.46, 0);
  solid(-1.23, -2.7, -0.81, -1.3);

  // ---------- nightstands + lamps ----------
  function tableLamp(x, y, z, shadow) {
    const g = node(group, x, y, z);
    const base = cyl(g, M.lampTile, 0.06, 0.095, 0.3, 0, 0.15, 0, 24);
    cyl(g, M.brass, 0.01, 0.01, 0.12, 0, 0.36, 0, 8);
    const shadeMat = std({ color: 0xf4e9d4, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide });
    const shade = cyl(g, shadeMat, 0.13, 0.17, 0.22, 0, 0.45, 0, 28, true);
    noShadow(shade);
    const light = pointLight(0xffc48a, 4.5, x, y + 0.42, z, shadow);
    const st = toggler((k) => {
      light.intensity = 2.6 * k;
      shadeMat.emissiveIntensity = 0.9 * k;
    }, 6, { dirty: false });
    interact([base, shade, ...g.children], {
      label: () => (st.on ? 'Switch off the lamp' : 'Switch on the lamp'),
      act: () => {
        st.on = !st.on;
        if (st.on) ctx.complete('lamp');
      },
    });
    return st;
  }
  function nightstand(z) {
    const g = node(group, -3.22, 0, z);
    for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) cyl(g, M.brass, 0.015, 0.012, 0.08, lx, 0.04, lz, 8);
    box(g, M.walnut, 0.48, 0.5, 0.45, 0, 0.33, 0);
    box(g, M.oak, 0.01, 0.17, 0.39, 0.245, 0.46, 0);
    box(g, M.oak, 0.01, 0.17, 0.39, 0.245, 0.24, 0);
    sphere(g, M.brass, 0.018, 0.26, 0.46, 0, 10);
    sphere(g, M.brass, 0.018, 0.26, 0.24, 0, 10);
    solid(-3.47, z - 0.24, -2.97, z + 0.24);
    return g;
  }
  nightstand(-3.36);
  const ns2 = nightstand(-0.64);
  tableLamp(-3.24, 0.58, -3.4, true);
  tableLamp(-3.24, 0.58, -0.68, true);
  // Alarm clock + book.
  box(ns2, M.black, 0.1, 0.06, 0.06, 0.1, 0.61, 0.14);
  const clockFace = box(ns2, std({ color: 0x000000, emissive: 0xff5040, emissiveIntensity: 1.2 }), 0.004, 0.025, 0.045, 0.151, 0.61, 0.14);
  noShadow(clockFace);
  box(group, M.teal, 0.16, 0.03, 0.22, -3.14, 0.595, -3.18);

  // ---------- dresser + TV ----------
  const dresser = node(group, 3.25, 0, -2.0);
  for (const [lx, lz] of [[-0.2, -0.85], [0.2, -0.85], [-0.2, 0.85], [0.2, 0.85]]) cyl(dresser, M.brass, 0.015, 0.012, 0.1, lx, 0.05, lz, 8);
  box(dresser, M.walnut, 0.5, 0.68, 1.8, 0, 0.44, 0);
  for (const dz of [-0.6, 0, 0.6]) {
    box(dresser, M.oak, 0.01, 0.56, 0.56, -0.252, 0.44, dz);
    box(dresser, M.brass, 0.02, 0.012, 0.16, -0.26, 0.6, dz);
  }
  solid(2.98, -2.92, 3.5, -1.08);
  // Decor on top.
  const vaseGeo = new THREE.LatheGeometry(
    [[0, 0], [0.07, 0], [0.1, 0.06], [0.09, 0.16], [0.05, 0.24], [0.045, 0.3], [0.06, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  );
  add(group, new THREE.Mesh(vaseGeo, M.clay), 3.25, 0.78, -2.7);
  box(group, M.pink, 0.22, 0.04, 0.3, 3.24, 0.8, -1.45);
  box(group, M.teal, 0.2, 0.035, 0.27, 3.25, 0.838, -1.44);
  // TV.
  const tvBody = box(group, M.black, 0.05, 0.82, 1.42, 3.47, 1.55, -2.0);
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 512;
  tvCanvas.height = 288;
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const screenOn = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
  const screen = add(group, new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.765), M.screenOff), 3.442, 1.55, -2.0);
  screen.rotation.y = -Math.PI / 2;
  noShadow(screen);
  const tvLight = pointLight(0x9fb8ff, 4, 2.9, 1.55, -2.0);
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
    tvLight.intensity = 0.9 + Math.sin(tv.t * 7) * 0.12;
  });
  interact([screen, tvBody], {
    label: () => (tv.on ? 'Turn off the TV' : 'Turn on the TV'),
    act: () => {
      tv.on = !tv.on;
      screen.material = tv.on ? screenOn : M.screenOff;
      if (!tv.on) tvLight.intensity = 0;
      else ctx.complete('tv');
    },
  });

  // ---------- desk ----------
  const desk = node(group, 3.22, 0, -4.05);
  box(desk, M.walnut, 0.56, 0.04, 1.2, 0, 0.74, 0);
  for (const [lx, lz] of [[-0.24, -0.56], [0.24, -0.56], [-0.24, 0.56], [0.24, 0.56]]) box(desk, M.black, 0.03, 0.72, 0.03, lx, 0.36, lz);
  box(desk, M.walnut, 0.5, 0.1, 1.1, 0, 0.67, 0);
  box(desk, M.linen, 0.21, 0.01, 0.3, -0.05, 0.765, 0.18);
  box(desk, M.black, 0.01, 0.01, 0.14, -0.05, 0.775, 0.38);
  cyl(desk, M.clay, 0.04, 0.035, 0.1, -0.12, 0.81, -0.1, 16);
  solid(2.94, -4.65, 3.5, -3.45);
  // Brass desk lamp.
  const dl = node(group, 3.33, 0.76, -4.5);
  cyl(dl, M.brass, 0.08, 0.09, 0.02, 0, 0.01, 0, 20);
  const arm = cyl(dl, M.brass, 0.008, 0.008, 0.45, -0.05, 0.22, 0, 8);
  arm.rotation.z = 0.25;
  const dShadeMat = std({ color: 0x1f3d8c, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 0.5, side: THREE.DoubleSide });
  const dShade = cyl(dl, dShadeMat, 0.04, 0.11, 0.13, -0.12, 0.43, 0, 20, true);
  noShadow(dShade);
  const deskLight = pointLight(0xffc48a, 3, 3.21, 1.12, -4.5);
  const deskLamp = toggler((k) => {
    deskLight.intensity = 1.8 * k;
    dShadeMat.emissiveIntensity = 0.4 * k;
  }, 6, { dirty: false });
  interact(dl.children, {
    label: () => (deskLamp.on ? 'Switch off the desk lamp' : 'Switch on the desk lamp'),
    act: () => (deskLamp.on = !deskLamp.on),
  });

  function chair(x, z, ry, seat) {
    const g = node(group, x, 0, z, ry);
    for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(g, M.walnut, 0.035, 0.45, 0.035, lx, 0.225, lz);
    box(g, M.walnut, 0.44, 0.04, 0.44, 0, 0.46, 0);
    rbox(g, seat, 0.42, 0.06, 0.42, 0.025, 0, 0.5, 0);
    for (const lx of [-0.19, 0.19]) box(g, M.walnut, 0.035, 0.42, 0.035, lx, 0.69, 0.2);
    rbox(g, M.walnut, 0.44, 0.16, 0.035, 0.015, 0, 0.84, 0.2);
    return g;
  }
  const deskChair = chair(2.55, -4.05, -Math.PI / 2, M.mustard);
  solid(2.33, -4.27, 2.77, -3.83);
  interact(deskChair.children, {
    label: () => 'Sit at the desk',
    act: () => ctx.sit({ eye: new THREE.Vector3(2.5, 1.18, -4.05), yaw: -Math.PI / 2, pitch: -0.3 }),
  });

  // ---------- reading corner: armchair + floor lamp ----------
  const acYaw = -1.15;
  const armchair = node(group, -2.55, 0, -4.3, acYaw);
  for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) cyl(armchair, M.walnut, 0.025, 0.018, 0.2, lx, 0.1, lz, 8);
  box(armchair, M.walnut, 0.8, 0.07, 0.74, 0, 0.23, 0);
  rbox(armchair, M.mustard, 0.7, 0.16, 0.66, 0.05, 0, 0.34, -0.02);
  const back = rbox(armchair, M.mustard, 0.76, 0.66, 0.16, 0.06, 0, 0.66, 0.31);
  back.rotation.x = 0.16;
  for (const s of [-1, 1]) {
    box(armchair, M.walnut, 0.06, 0.05, 0.7, s * 0.39, 0.56, 0);
    box(armchair, M.walnut, 0.05, 0.3, 0.05, s * 0.39, 0.4, -0.3);
  }
  rbox(armchair, M.sarape, 0.3, 0.3, 0.1, 0.04, 0.18, 0.56, 0.2).rotation.set(0.25, 0, 0.2);
  solid(-3.0, -4.75, -2.1, -3.85);
  interact(armchair.children, {
    label: () => 'Sit in the armchair',
    act: () => {
      const fwd = new THREE.Vector3(-Math.sin(acYaw), 0, -Math.cos(acYaw));
      ctx.sit({ eye: new THREE.Vector3(-2.55, 1.1, -4.3).addScaledVector(fwd, -0.1), yaw: acYaw, pitch: -0.05 });
    },
  });
  const fl = node(group, -3.2, 0, -4.75);
  cyl(fl, M.black, 0.15, 0.16, 0.025, 0, 0.012, 0, 24);
  cyl(fl, M.brass, 0.012, 0.012, 1.45, 0, 0.74, 0, 8);
  const flMat = std({ color: 0xf4e9d4, emissive: 0xffc47a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide });
  const flShade = cyl(fl, flMat, 0.17, 0.21, 0.28, 0, 1.52, 0, 28, true);
  noShadow(flShade);
  const flLight = pointLight(0xffc48a, 4.5, -3.2, 1.5, -4.75);
  const floorLamp = toggler((k) => {
    flLight.intensity = 2.4 * k;
    flMat.emissiveIntensity = 0.9 * k;
  }, 6, { dirty: false });
  solid(-3.45, -5.0, -2.95, -4.5);
  interact(fl.children, {
    label: () => (floorLamp.on ? 'Switch off the floor lamp' : 'Switch on the floor lamp'),
    act: () => (floorLamp.on = !floorLamp.on),
  });

  // Organ pipe cactus in a talavera pot.
  const cactus = node(group, 3.12, 0, -0.55);
  cyl(cactus, M.tile, 0.22, 0.17, 0.42, 0, 0.21, 0, 28);
  cyl(cactus, std({ color: 0x5a4030, roughness: 1 }), 0.2, 0.2, 0.02, 0, 0.4, 0, 20);
  for (const [cx, cz, h] of [[0, 0, 1.25], [0.08, 0.06, 0.95], [-0.08, 0.05, 1.05], [0.04, -0.09, 0.8], [-0.07, -0.07, 0.65]]) {
    add(cactus, new THREE.Mesh(new THREE.CapsuleGeometry(0.055, h, 4, 12), M.cactus), cx, 0.4 + h / 2, cz);
  }
  solid(2.88, -0.8, 3.36, -0.3);
  interact(cactus.children, { label: () => 'Touch the cactus', act: () => ctx.toast('¡Ay! Órgano cactus — look, don’t touch.') });

  // ---------- wardrobe ----------
  const carcass = [
    wbox(group, M.walnut, 2.92, 0, 1.4, 3.5, 0.08, 3.2),
    wbox(group, M.walnut, 2.92, 2.26, 1.4, 3.5, 2.3, 3.2),
    wbox(group, M.walnut, 2.92, 0, 1.4, 3.5, 2.3, 1.44),
    wbox(group, M.walnut, 2.92, 0, 3.16, 3.5, 2.3, 3.2),
    wbox(group, M.oak, 3.47, 0.08, 1.44, 3.5, 2.26, 3.16),
    wbox(group, M.oak, 2.95, 1.93, 1.44, 3.47, 1.96, 3.16),
  ];
  const rod = cyl(group, M.chrome, 0.012, 0.012, 1.72, 3.2, 1.85, 2.3, 10);
  rod.rotation.x = Math.PI / 2;
  const robe = rbox(group, M.linen, 0.12, 1.0, 0.5, 0.05, 3.2, 1.3, 1.8);
  rbox(group, M.teal, 0.1, 0.75, 0.48, 0.04, 3.2, 1.45, 2.4);
  rbox(group, M.pink, 0.1, 0.8, 0.46, 0.04, 3.2, 1.42, 2.75);
  for (const z of [1.8, 2.4, 2.75]) box(group, M.oak, 0.02, 0.02, 0.42, 3.2, 1.81, z);
  box(group, M.black, 0.4, 0.3, 0.38, 3.24, 0.23, 2.85);
  box(group, M.sarape, 0.4, 0.12, 0.5, 3.22, 2.02, 2.0);
  rbox(group, M.linen, 0.42, 0.14, 0.6, 0.06, 3.2, 2.03, 2.7);
  solid(2.92, 1.4, 3.5, 3.2);
  function wardrobeDoor(hz, dir) {
    const pivot = node(group, 2.905, 0.04, hz);
    const d = box(pivot, M.walnut, 0.03, 2.2, 0.87, 0, 1.1, dir * 0.43);
    box(pivot, M.brass, 0.02, 0.35, 0.02, -0.025, 1.1, dir * 0.78);
    return { pivot, d };
  }
  const wdL = wardrobeDoor(1.44, 1);
  const wdR = wardrobeDoor(3.16, -1);
  let wardrobeSeen = false;
  const wardrobe = toggler((k) => {
    wdL.pivot.rotation.y = -1.9 * k;
    wdR.pivot.rotation.y = 1.9 * k;
  }, 1.6);
  interact([...wdL.pivot.children, ...wdR.pivot.children, robe, ...carcass], {
    label: () => (wardrobe.on ? 'Close the wardrobe' : 'Open the wardrobe'),
    act: () => {
      wardrobe.on = !wardrobe.on;
      if (wardrobe.on) {
        ctx.complete('wardrobe');
        if (!wardrobeSeen) ctx.toast('A fluffy robe, a spare sarape and a little safe.');
        wardrobeSeen = true;
      }
    },
  });

  // ---------- entry door ----------
  const door = node(group, 1.7, 0, 4.055);
  box(door, M.walnut, 1.0, 2.15, 0.05, 0, 1.075, 0);
  box(door, M.oak, 0.7, 0.8, 0.01, 0, 1.6, -0.028);
  box(door, M.oak, 0.7, 0.8, 0.01, 0, 0.6, -0.028);
  cyl(door, M.brass, 0.012, 0.012, 0.02, 0, 1.55, -0.035, 10).rotation.x = Math.PI / 2;
  const rose = cyl(door, M.chrome, 0.03, 0.03, 0.02, 0.38, 1.0, -0.035, 16);
  rose.rotation.x = Math.PI / 2;
  box(door, M.chrome, 0.14, 0.02, 0.02, 0.32, 1.0, -0.055);
  cyl(door, M.chrome, 0.025, 0.025, 0.015, 0.38, 1.22, -0.033, 16).rotation.x = Math.PI / 2;
  const bolt = box(door, M.chrome, 0.012, 0.045, 0.014, 0.38, 1.22, -0.045);
  const sign = box(door, std({ color: 0xd9447a, roughness: 0.6 }), 0.1, 0.18, 0.004, 0.36, 0.86, -0.07);
  noShadow(sign);
  const lock = toggler((k) => (bolt.rotation.z = (Math.PI / 2) * k), 5, { dirty: false });
  interact(door.children, {
    label: () => (lock.on ? 'Unlock the door' : 'Lock the door'),
    act: () => {
      lock.on = !lock.on;
      ctx.toast(lock.on ? '*click* Locked. Nobody gets in without a room key.' : 'Door unlocked.');
      if (lock.on) ctx.complete('lock');
    },
  });

  // ---------- minibar + coffee station ----------
  const minibar = [
    wbox(group, M.walnut, -0.44, 0, 3.15, 0.06, 0.95, 3.75),
    wbox(group, M.walnut, -0.44, 0.7, 2.55, 0.06, 0.95, 3.15),
    wbox(group, M.walnut, -0.44, 0, 2.55, 0.06, 0.7, 2.6),
    wbox(group, M.oak, 0.06, 0.08, 3.2, 0.07, 0.48, 3.7),
    wbox(group, M.oak, 0.06, 0.52, 3.2, 0.07, 0.9, 3.7),
  ];
  sphere(group, M.brass, 0.018, 0.085, 0.3, 3.45, 10);
  sphere(group, M.brass, 0.018, 0.085, 0.72, 3.45, 10);
  wbox(group, M.white, -0.44, 0, 2.6, -0.4, 0.7, 3.15);
  wbox(group, M.white, -0.4, 0, 2.6, 0.04, 0.04, 3.15);
  const fridgeLightMat = std({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 0 });
  wbox(group, fridgeLightMat, -0.4, 0.66, 2.6, 0.04, 0.7, 3.15);
  wbox(group, M.glass, -0.4, 0.35, 2.6, 0.04, 0.36, 3.15);
  const sodaCols = [0xf2862e, 0x7cc243, 0xd9447a, 0x8e44ad, 0xcfe8f5, 0xf2c14e];
  let si = 0;
  for (const y of [0.04, 0.36]) {
    for (const z of [2.68, 2.78, 2.88, 2.98, 3.08]) {
      const c = sodaCols[si++ % sodaCols.length];
      cyl(group, std({ color: c, roughness: 0.2, transparent: c === 0xcfe8f5, opacity: 0.7 }), 0.028, 0.03, 0.2, -0.12, y + 0.1, z, 12);
    }
  }
  const fridgePivot = node(group, 0.075, 0.04, 2.6);
  const fridgeDoor = box(fridgePivot, M.walnut, 0.03, 0.63, 0.54, 0, 0.315, 0.275);
  box(fridgePivot, M.white, 0.004, 0.6, 0.5, -0.017, 0.315, 0.275);
  box(fridgePivot, M.brass, 0.02, 0.012, 0.12, 0.02, 0.55, 0.47);
  // Coffee machine, clay mugs, fruit bowl.
  box(group, M.black, 0.22, 0.28, 0.18, -0.22, 1.09, 3.5);
  box(group, M.chrome, 0.06, 0.04, 0.05, -0.12, 1.08, 3.5);
  cyl(group, M.clay, 0.045, 0.04, 0.09, -0.06, 0.995, 3.3, 16);
  cyl(group, M.clay, 0.045, 0.04, 0.09, -0.3, 0.995, 3.25, 16);
  const bowlGeo = new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bowl = add(group, new THREE.Mesh(bowlGeo, std({ map: lampTile, roughness: 0.25, side: THREE.DoubleSide })), -0.2, 1.03, 2.8);
  bowl.scale.y = 0.6;
  for (const [fx, fz, c] of [[-0.24, 2.78, 0xf28a1d], [-0.16, 2.82, 0x7cc243], [-0.2, 2.74, 0x7cc243], [-0.19, 2.86, 0xf28a1d]]) sphere(group, std({ color: c, roughness: 0.5 }), 0.04, fx, 1.03, fz, 12);
  solid(-0.44, 2.55, 0.06, 3.75);
  const fridge = toggler((k) => {
    fridgePivot.rotation.y = 1.75 * k;
    fridgeLightMat.emissiveIntensity = 1.5 * Math.min(1, k * 3);
  }, 2.4);
  let fridgeSeen = false;
  interact([fridgeDoor, ...fridgePivot.children, ...minibar], {
    label: () => (fridge.on ? 'Close the mini fridge' : 'Open the mini fridge'),
    act: () => {
      fridge.on = !fridge.on;
      if (fridge.on) {
        ctx.complete('minibar');
        if (!fridgeSeen) ctx.toast('Agua mineral, mango juice and tamarind soda. ¡Salud!');
        fridgeSeen = true;
      }
    },
  });

  // Poster above the minibar.
  wbox(group, M.black, -0.44, 1.25, 2.73, -0.42, 2.15, 3.47);
  const posterMesh = add(group, new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.86), M.poster), -0.418, 1.7, 3.1);
  posterMesh.rotation.y = Math.PI / 2;

  // Suitcase.
  const suit = node(group, 0.6, 0, 3.55, 0.3);
  rbox(suit, std({ color: 0xe8822d, roughness: 0.35 }), 0.44, 0.62, 0.26, 0.04, 0, 0.37, 0);
  for (const s of [-1, 1]) cyl(suit, M.black, 0.025, 0.025, 0.03, s * 0.17, 0.03, 0.08, 10).rotation.z = Math.PI / 2;
  box(suit, M.chrome, 0.015, 0.25, 0.015, -0.1, 0.8, 0.1);
  box(suit, M.chrome, 0.015, 0.25, 0.015, 0.1, 0.8, 0.1);
  box(suit, M.black, 0.22, 0.025, 0.03, 0, 0.93, 0.1);
  solid(0.33, 3.33, 0.87, 3.77);
  interact(suit.children, { label: () => 'Check your suitcase', act: () => ctx.toast('Passport, sunscreen, and an empty bag for souvenirs.') });

  // ---------- bathroom ----------
  // Talavera wainscot, full height in the shower.
  wbox(group, M.tile, -3.5, 0, 1.06, -3.488, 1.25, 4.0);
  wbox(group, M.tile, -3.5, 0, 3.988, -0.56, 1.25, 4.0);
  wbox(group, M.tile, -3.5, 0, 1.06, -0.56, 1.25, 1.072);
  wbox(group, M.tile, -0.572, 0, 1.072, -0.56, 1.25, 1.4);
  wbox(group, M.tile, -0.572, 0, 2.3, -0.56, 1.25, 3.988);
  wbox(group, M.tile, -3.5, 1.25, 2.85, -3.488, 2.4, 4.0);
  wbox(group, M.tile, -3.488, 1.25, 3.988, -2.3, 2.4, 4.0);
  wbox(group, M.trim, -3.5, 1.25, 1.06, -3.484, 1.29, 2.85);
  wbox(group, M.trim, -2.3, 1.25, 3.984, -0.56, 1.29, 4.0);
  wbox(group, M.trim, -3.5, 1.25, 1.06, -0.56, 1.29, 1.076);
  wbox(group, M.trim, -0.576, 1.25, 2.3, -0.56, 1.29, 3.988);
  wbox(group, M.trim, -0.576, 1.25, 1.076, -0.56, 1.29, 1.4);

  // Vanity with a hand-painted vessel sink.
  wbox(group, M.walnut, -3.488, 0.14, 1.3, -2.96, 0.8, 2.5);
  wbox(group, M.oak, -2.965, 0.2, 1.34, -2.955, 0.74, 2.46);
  wbox(group, M.marble, -3.488, 0.8, 1.28, -2.92, 0.84, 2.52);
  const sinkGeo = new THREE.LatheGeometry(
    [[0, 0], [0.08, 0.005], [0.16, 0.04], [0.2, 0.11], [0.205, 0.13], [0.19, 0.13], [0.15, 0.06], [0.06, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)),
    36,
  );
  const sink = add(group, new THREE.Mesh(sinkGeo, std({ map: lampTile, roughness: 0.2, side: THREE.DoubleSide })), -3.2, 0.84, 1.9);
  const tapPost = cyl(group, M.chrome, 0.016, 0.018, 0.3, -3.445, 0.99, 1.9, 12);
  const spout = cyl(group, M.chrome, 0.012, 0.012, 0.2, -3.345, 1.13, 1.9, 10);
  spout.rotation.z = Math.PI / 2;
  const tapKnob = cyl(group, M.chrome, 0.02, 0.02, 0.04, -3.445, 0.88, 2.05, 12);
  const stream = cyl(group, M.water, 0.007, 0.009, 0.22, -3.25, 1.0, 1.9, 8);
  stream.visible = false;
  noShadow(stream);
  noRay(stream);
  solid(-3.5, 1.28, -2.92, 2.52);
  // Toiletries.
  cyl(group, std({ color: 0xf2c14e, roughness: 0.3 }), 0.025, 0.025, 0.14, -3.4, 0.91, 2.35, 12);
  cyl(group, std({ color: 0x2f8a88, roughness: 0.3 }), 0.025, 0.025, 0.12, -3.4, 0.9, 2.42, 12);
  const tap = { on: false, t: 0 };
  updaters.push((dt) => {
    if (!tap.on) return;
    tap.t += dt;
    stream.scale.x = stream.scale.z = 1 + Math.sin(tap.t * 40) * 0.15;
  });
  interact([sink, tapPost, spout, tapKnob], {
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

  // Round mirror with a tin sunburst frame. It's a real reflection.
  const mirrorGroup = node(group, -3.485, 1.62, 1.9, Math.PI / 2);
  const mirror = new Reflector(new THREE.CircleGeometry(0.36, 48), {
    textureWidth: 640,
    textureHeight: 640,
    clipBias: 0.003,
    color: 0xc9c9c9,
  });
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

  // Toilet.
  const wc = node(group, -1.3, 0, 3.6);
  const wcBase = cyl(wc, M.porcelain, 0.16, 0.13, 0.38, 0, 0.19, -0.05, 24);
  wcBase.scale.z = 1.35;
  const wcRim = add(wc, new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 10, 28), M.porcelain), 0, 0.4, -0.08);
  wcRim.rotation.x = Math.PI / 2;
  wcRim.scale.y = 1.3;
  const lid = cyl(wc, M.porcelain, 0.19, 0.19, 0.025, 0, 0.44, -0.08, 28);
  lid.scale.z = 1.3;
  rbox(wc, M.porcelain, 0.44, 0.36, 0.17, 0.04, 0, 0.62, 0.29);
  cyl(wc, M.chrome, 0.025, 0.025, 0.01, 0, 0.805, 0.29, 16);
  solid(-1.55, 3.28, -1.05, 4.0);
  interact(wc.children, { label: () => 'Flush', act: () => ctx.toast('*whoosh*') });
  // Toilet paper.
  box(group, M.chrome, 0.12, 0.01, 0.06, -0.8, 0.72, 3.96);
  const roll = cyl(group, M.linen, 0.055, 0.055, 0.1, -0.8, 0.66, 3.93, 16);
  roll.rotation.z = Math.PI / 2;

  // Walk-in shower with rain head.
  const tray = wbox(group, M.porcelain, -3.488, 0, 2.85, -2.3, 0.04, 3.988);
  cyl(group, M.chrome, 0.04, 0.04, 0.005, -2.9, 0.043, 3.45, 16);
  const showerGlass = new THREE.Group();
  group.add(showerGlass);
  wbox(showerGlass, M.glass, -2.31, 0.04, 3.0, -2.29, 2.05, 3.988);
  wbox(showerGlass, M.glass, -3.488, 0.04, 2.84, -2.95, 2.05, 2.86);
  noShadow(showerGlass);
  wbox(group, M.chrome, -2.315, 2.05, 3.0, -2.285, 2.07, 3.988);
  wbox(group, M.chrome, -3.488, 2.05, 2.835, -2.95, 2.07, 2.865);
  const showerArm = cyl(group, M.chrome, 0.012, 0.012, 0.4, -3.29, 2.2, 3.45, 10);
  showerArm.rotation.z = Math.PI / 2;
  const showerHead = cyl(group, M.chrome, 0.15, 0.15, 0.02, -3.05, 2.18, 3.45, 32);
  const mixer = cyl(group, M.chrome, 0.06, 0.06, 0.02, -3.478, 1.15, 3.45, 24);
  mixer.rotation.z = Math.PI / 2;
  solid(-2.33, 3.0, -2.27, 4.0);
  solid(-3.5, 2.82, -2.95, 2.88);
  const dropCount = 500;
  const drops = new Float32Array(dropCount * 3);
  for (let i = 0; i < dropCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * 0.13;
    drops[i * 3] = -3.05 + Math.cos(a) * rr;
    drops[i * 3 + 1] = 0.05 + Math.random() * 2.1;
    drops[i * 3 + 2] = 3.45 + Math.sin(a) * rr;
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
  interact([mixer, showerHead, showerArm, tray, ...showerGlass.children], {
    label: () => (shower.on ? 'Turn off the shower' : 'Turn on the shower'),
    act: () => {
      shower.on = !shower.on;
      water.visible = shower.on;
      if (shower.on) ctx.toast('Hot water, great pressure. Five stars.');
    },
  });

  // Towels on a rail.
  const towelRod = cyl(group, M.chrome, 0.012, 0.012, 0.9, -1.75, 1.42, 1.13, 10);
  towelRod.rotation.z = Math.PI / 2;
  rbox(group, M.linen, 0.36, 0.6, 0.035, 0.015, -1.98, 1.13, 1.14);
  rbox(group, std({ color: 0x2f8a88, roughness: 1 }), 0.36, 0.55, 0.035, 0.015, -1.55, 1.16, 1.14);
  const mat = add(group, new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), std({ color: 0xf1ece2, roughness: 1 })), -2.65, 0.005, 2.45);
  mat.rotation.x = -Math.PI / 2;

  // Bathroom door (opens inward).
  const bathPivot = node(group, -0.5, 0, 1.4);
  const bathDoor = box(bathPivot, M.white, 0.04, 2.08, 0.88, 0, 1.04, 0.45);
  for (const s of [-1, 1]) {
    box(bathPivot, M.chrome, 0.03, 0.02, 0.12, s * 0.04, 1.0, 0.76);
  }
  const bathClosed = solid(-0.56, 1.4, -0.44, 2.3);
  const bathOpen = solid(-1.4, 1.38, -0.5, 1.46);
  const bath = toggler((k) => {
    bathPivot.rotation.y = -1.48 * k;
    bathClosed.off = k > 0.5;
    bathOpen.off = k <= 0.5;
  }, 1.6);
  interact(bathPivot.children, {
    label: () => (bath.on ? 'Close the bathroom door' : 'Open the bathroom door'),
    act: () => (bath.on = !bath.on),
  });

  // State the game loop reads for sound.
  api.state = { balconyDoor, tap, shower };

  // ---------- per-frame ----------
  function update(dt) {
    for (const u of updaters) u(dt);
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
      const bh = 40 + ((Math.sin(idx * 12.9898) * 43758.5453) % 1 + 1) % 1 * 110;
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
  // News ticker.
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
