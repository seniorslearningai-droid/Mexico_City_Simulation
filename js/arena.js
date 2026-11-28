// Arena México, the "cathedral of lucha libre" in Colonia Doctores.
// No luchadores yet: just the ring, the stands, the stage and (if you open
// the doors) a few thousand fans.
//
// Layout in meters, looking down (north is -z):
//
//              north stands (20 rows)
//      +-----------------------------------+
//      |   chairs   [bell|desk]   chairs   |
//  W   |  chairs     +-------+     chairs  |   E
//      |  chairs     | RING  |     chairs  |
//      |   chairs    +-------+    chairs   |
//      |  chairs      | walk |     chairs  |
//      +----------+   | way  |   +---------+
//   south stands  |  merch  snacks | south stands
//                 |  [LED screen]  |
//                 +---[ doors ]----+
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { meterUV } from './room.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const ease = (k) => k * k * (3 - 2 * k);
const Y = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

const ROW = 0.85; // depth of one row of stands
const RISE = 0.42; // height of one row
const ROWS = 20;
const FX = 15; // arena floor half-size = where the stands begin
const FZ = 13;
const BACK = ROWS * ROW + 2.6; // walkway behind the top row
const TOP = ROWS * RISE;
const OX = FX + BACK; // outer walls
const OZ = FZ + BACK;
const ROOF = 22;
const STX = 7; // half-width of the entrance stage
const STAGE_BACK = 18.5;
const APRON = 3.2;
const POST = 3.0;
const RING_H = 1.2;

export const ARENA_SPAWN = { x: 0, z: 16.4, yaw: 0, pitch: -0.04 };

export function buildArena(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const updaters = [];
  const shadowLights = [];
  const api = {
    group,
    colliders,
    shadowLights,
    dirty: true,
    inRing: false,
    cheer: 0,
    floorAt,
    update,
    state: { fans: 0, show: 0, cheer: 0 },
  };
  const rand = T.rng(2024);

  // ---------- materials ----------
  const plasterTex = T.plaster();
  const M = {
    concrete: std({ color: 0x5c5a63, map: plasterTex, roughness: 0.95 }),
    floor: std({ color: 0x2e2d34, map: plasterTex, roughness: 0.8 }),
    stage: std({ color: 0x1a1a1f, roughness: 0.75, metalness: 0.1 }),
    wall: std({ color: 0x24222c, map: plasterTex, roughness: 0.9 }),
    roof: std({ color: 0x141318, roughness: 1 }),
    steel: std({ color: 0xc3c6ce, metalness: 0.9, roughness: 0.28 }),
    truss: std({ color: 0x34343a, metalness: 0.7, roughness: 0.45 }),
    black: std({ color: 0x18181b, roughness: 0.6 }),
    cloth: std({ color: 0x101014, roughness: 1 }),
    wood: std({ map: T.woodGrain(), color: 0x7a5236, roughness: 0.6 }),
    carpet: std({ color: 0x8e1b2a, roughness: 1 }),
    brass: std({ color: 0xd1a659, metalness: 1, roughness: 0.3 }),
    canvas: std({ map: T.ringCanvas(), roughness: 0.85 }),
    skirt: std({ map: T.ringSkirt(), roughness: 0.9 }),
    red: std({ color: 0xc8282e, roughness: 0.5 }),
    blue: std({ color: 0x1f4fa8, roughness: 0.5 }),
    white: std({ color: 0xeeeeee, roughness: 0.5 }),
    green: std({ color: 0x1f8a4c, roughness: 0.5 }),
    teal: std({ color: 0x1f6b6e, roughness: 0.6 }),
    orange: std({ color: 0xe8822d, roughness: 0.6 }),
    yellow: std({ color: 0xf2c14e, roughness: 0.6 }),
    skin: std({ color: 0xd8b48a, roughness: 0.6 }),
  };

  // ---------- helpers ----------
  const add = (p, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    p.add(mesh);
    return mesh;
  };
  const box = (p, mat, w, h, d, x, y, z) => add(p, new THREE.Mesh(meterUV(new THREE.BoxGeometry(w, h, d)), mat), x, y, z);
  function wbox(p, mat, x0, y0, z0, x1, y1, z1) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    return add(p, new THREE.Mesh(meterUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), cx, cy, cz), mat), cx, cy, cz);
  }
  const rbox = (p, mat, w, h, d, r, x, y, z) => add(p, new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat), x, y, z);
  const cyl = (p, mat, rt, rb, h, x, y, z, seg = 16, open = false) =>
    add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat), x, y, z);
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
  const interact = (objs, def) => {
    for (const o of [].concat(objs)) o.userData.interact = def;
    return def;
  };
  const cast = (...objs) => objs.forEach((o) => o.traverse((c) => (c.userData.cast = true)));
  const noRay = (...objs) => objs.forEach((o) => o.traverse((c) => (c.raycast = () => {})));
  function toggler(apply, speed = 2) {
    const s = { on: false, k: 0 };
    updaters.push((dt) => {
      const target = s.on ? 1 : 0;
      if (s.k === target) return;
      s.k = target > s.k ? Math.min(1, s.k + dt * speed) : Math.max(0, s.k - dt * speed);
      apply(ease(s.k), s.k);
    });
    apply(0, 0);
    return s;
  }
  // Split [lo, hi] into the stretches between aisles.
  function between(lo, hi, aisles, half) {
    const out = [];
    let a = lo;
    for (const c of aisles) {
      if (c + half <= a || c - half >= hi) continue;
      if (c - half > a) out.push([a, c - half]);
      a = Math.max(a, c + half);
    }
    if (a < hi) out.push([a, hi]);
    return out;
  }

  // ---------- floor height (stairs, ring) ----------
  function floorAt(x, z) {
    if (api.inRing && Math.abs(x) < APRON && Math.abs(z) < APRON) return RING_H;
    if (Math.abs(x) < STX && z > FZ) return 0;
    const d = Math.max(Math.abs(x) - FX, Math.abs(z) - FZ);
    if (d <= 0) return 0;
    return Math.min(Math.floor(d / ROW) + 1, ROWS) * RISE;
  }

  // ---------- shell ----------
  wbox(group, M.floor, -FX, -0.2, -FZ, FX, 0, FZ);
  wbox(group, M.stage, -STX, -0.2, FZ, STX, 0.005, STAGE_BACK);

  // Stands: each row is a stepped ring of concrete, merged into one mesh.
  const steps = [];
  const step = (x0, z0, x1, z1, h) => {
    if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return;
    const g = new THREE.BoxGeometry(x1 - x0, h, z1 - z0);
    g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    steps.push(meterUV(g));
  };
  const tier = (a, b, h) => {
    step(FX + a, -(FZ + b), FX + b, FZ + b, h);
    step(-(FX + b), -(FZ + b), -(FX + a), FZ + b, h);
    step(-(FX + a), -(FZ + b), FX + a, -(FZ + a), h);
    step(-(FX + a), FZ + a, -STX, FZ + b, h);
    step(STX, FZ + a, FX + a, FZ + b, h);
  };
  for (let r = 0; r < ROWS; r++) tier(r * ROW, (r + 1) * ROW, (r + 1) * RISE);
  tier(ROWS * ROW, BACK, TOP);
  group.add(new THREE.Mesh(mergeGeometries(steps), M.concrete));
  // Yellow safety nosing on the first step.
  const nosing = std({ color: 0xd9a520, roughness: 0.6 });
  wbox(group, nosing, FX - 0.02, RISE - 0.02, -FZ, FX + 0.06, RISE + 0.01, FZ);
  wbox(group, nosing, -FX - 0.06, RISE - 0.02, -FZ, -FX + 0.02, RISE + 0.01, FZ);
  wbox(group, nosing, -FX, RISE - 0.02, -FZ - 0.06, FX, RISE + 0.01, -FZ + 0.02);

  // Outer walls and roof.
  wbox(group, M.wall, OX, 0, -OZ - 0.4, OX + 0.4, ROOF, OZ + 0.4);
  wbox(group, M.wall, -OX - 0.4, 0, -OZ - 0.4, -OX, ROOF, OZ + 0.4);
  wbox(group, M.wall, -OX, 0, -OZ - 0.4, OX, ROOF, -OZ);
  wbox(group, M.wall, -OX, 0, OZ, OX, ROOF, OZ + 0.4);
  wbox(group, M.roof, -OX - 0.4, ROOF, -OZ - 0.4, OX + 0.4, ROOF + 0.5, OZ + 0.4);
  solid(OX - 0.3, -OZ - 1, OX + 1, OZ + 1);
  solid(-OX - 1, -OZ - 1, -OX + 0.3, OZ + 1);
  solid(-OX - 1, -OZ - 1, OX + 1, -OZ + 0.3);
  solid(-OX - 1, OZ - 0.3, OX + 1, OZ + 1);
  // Roof beams.
  const roofBeams = [];
  for (let x = -30; x <= 30; x += 6) roofBeams.push(new THREE.BoxGeometry(0.5, 0.9, 2 * OZ).translate(x, ROOF - 0.45, 0));
  for (let z = -30; z <= 30; z += 10) roofBeams.push(new THREE.BoxGeometry(2 * OX, 0.5, 0.4).translate(0, ROOF - 1.0, z));
  group.add(new THREE.Mesh(mergeGeometries(roofBeams), M.truss));
  // Little work lights in the roof.
  const roofDots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.25, 10), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }), 60);
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    let i = 0;
    for (let x = -27; x <= 27; x += 6) {
      for (let z = -25; z <= 25; z += 10) {
        if (i < 60) roofDots.setMatrixAt(i++, m4.compose(new THREE.Vector3(x + 3, ROOF - 0.02, z), q, new THREE.Vector3(1, 1, 1)));
      }
    }
    roofDots.count = i;
  }
  group.add(roofDots);

  // ---------- entrance stage ----------
  // Side walls between the stage and the south stands.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -STX : STX - 0.3;
    wbox(group, M.wall, x0, 0, FZ, x0 + 0.3, TOP + 1, OZ);
    solid(x0, FZ, x0 + 0.3, OZ);
  }
  wbox(group, M.wall, -STX, TOP + 1, STAGE_BACK, STX, TOP + 1.4, OZ);
  // Back wall with the tunnel doors.
  wbox(group, M.wall, -STX, 0, STAGE_BACK, -1.6, TOP + 1, STAGE_BACK + 0.3);
  wbox(group, M.wall, 1.6, 0, STAGE_BACK, STX, TOP + 1, STAGE_BACK + 0.3);
  wbox(group, M.wall, -1.6, 3.3, STAGE_BACK, 1.6, TOP + 1, STAGE_BACK + 0.3);
  solid(-STX, STAGE_BACK, -1.6, STAGE_BACK + 0.3);
  solid(1.6, STAGE_BACK, STX, STAGE_BACK + 0.3);
  // Tunnel behind the doors, glowing at the far end.
  wbox(group, M.stage, -1.6, -0.2, STAGE_BACK, 1.6, 0.005, 24);
  wbox(group, M.wall, -1.9, 0, STAGE_BACK + 0.3, -1.6, 3.3, 24);
  wbox(group, M.wall, 1.6, 0, STAGE_BACK + 0.3, 1.9, 3.3, 24);
  wbox(group, M.wall, -1.9, 3.3, STAGE_BACK + 0.3, 1.9, 3.6, 24);
  const tunnelGlow = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  wbox(group, tunnelGlow, -1.6, 0, 23.8, 1.6, 3.3, 24);
  solid(-1.9, STAGE_BACK + 0.3, -1.6, 24.2);
  solid(1.6, STAGE_BACK + 0.3, 1.9, 24.2);
  solid(-1.6, 23.6, 1.6, 24.2);

  const doorPivots = [];
  for (const s of [-1, 1]) {
    const pivot = node(group, s * 1.6, 0, STAGE_BACK + 0.15);
    const panel = box(pivot, M.red, 1.62, 3.25, 0.08, -s * 0.81, 1.625, s * 0.005);
    box(pivot, M.brass, 0.05, 0.5, 0.05, -s * 1.45, 1.2, -0.06);
    box(pivot, M.black, 1.3, 0.1, 0.01, -s * 0.8, 2.6, -0.045);
    doorPivots.push({ pivot, panel, s });
  }
  const doorCol = solid(-1.6, STAGE_BACK, 1.6, STAGE_BACK + 0.3);
  const doors = toggler((k) => {
    for (const d of doorPivots) d.pivot.rotation.y = d.s * 1.45 * k;
    doorCol.off = k > 0.6;
  }, 0.9);

  // Big LED screen above the doors.
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 512;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  wbox(group, M.black, -5.8, 3.5, STAGE_BACK - 0.1, 5.8, 8.9, STAGE_BACK);
  const stageScreen = add(group, new THREE.Mesh(new THREE.PlaneGeometry(11, 5.1), screenMat), 0, 6.2, STAGE_BACK - 0.11);
  stageScreen.rotation.y = Math.PI;

  // Truss arch over the stage with par cans.
  const parMat = std({ color: 0x222222, emissive: 0xffffff, emissiveIntensity: 0 });
  for (const s of [-1, 1]) {
    wbox(group, M.truss, s * 6.2 - 0.25, 0, 13.75, s * 6.2 + 0.25, 9.6, 14.25);
    solid(s * 6.2 - 0.25, 13.75, s * 6.2 + 0.25, 14.25);
  }
  wbox(group, M.truss, -6.45, 9.6, 13.75, 6.45, 10.1, 14.25);
  for (let i = 0; i < 9; i++) {
    const can = cyl(group, parMat, 0.16, 0.2, 0.4, -4.8 + i * 1.2, 9.3, 14.0, 12);
    can.rotation.x = -0.6;
  }

  // Walkway from the stage to the ring, edged with LED chasers.
  wbox(group, M.carpet, -1.2, 0, APRON + 1.0, 1.2, 0.012, FZ);
  const ledTex = T.ledStrip();
  ledTex.repeat.set(1, (FZ - APRON - 1) / 1.2);
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, color: 0xffffff, toneMapped: false });
  for (const s of [-1, 1]) {
    const strip = add(group, new THREE.Mesh(new THREE.PlaneGeometry(0.08, FZ - APRON - 1), ledMat), s * 1.27, 0.015, (FZ + APRON + 1) / 2);
    strip.rotation.x = -Math.PI / 2;
  }

  // ---------- merch stand ----------
  const maskPrice = 15;
  const maskColors = ['red', 'blue', 'black', 'green', 'gold', 'purple'];
  const maskOffer = (design) => ({
    label: () => `Buy the ${maskColors[design]} mask · $${maskPrice} MXN`,
    act: () => ctx.buyMask(design, maskPrice),
  });
  const merch = node(group, -4.3, 0, 15.6);
  const merchParts = [];
  merchParts.push(box(merch, M.wood, 2.6, 0.06, 0.9, 0, 0.9, 0));
  merchParts.push(box(merch, M.red, 2.6, 0.86, 0.04, 0, 0.45, -0.43));
  merchParts.push(box(merch, M.wood, 2.9, 1.7, 0.06, 0, 1.75, 0.55));
  for (const s of [-1, 1]) box(merch, M.black, 0.06, 2.9, 0.06, s * 1.42, 1.45, 0.55);
  // Masks on display heads.
  function maskHead(parent, x, y, z, design, scale = 1) {
    const [base, trim, eyes] = T.MASKS[design % T.MASKS.length];
    const h = node(parent, x, y, z);
    h.scale.setScalar(scale);
    const head = add(h, new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), std({ color: base, roughness: 0.4 })));
    head.scale.set(0.92, 1.12, 1);
    for (const sx of [-1, 1]) {
      const rim = add(h, new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), std({ color: trim, roughness: 0.4 })), sx * 0.04, 0.02, -0.088);
      rim.scale.set(1.3, 0.8, 0.5);
      const eye = add(h, new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), std({ color: eyes, roughness: 0.4 })), sx * 0.04, 0.02, -0.098);
      eye.scale.set(1.3, 0.7, 0.4);
    }
    const mouth = add(h, new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), std({ color: trim })), 0, -0.06, -0.095);
    mouth.scale.set(1.2, 0.7, 0.4);
    return h;
  }
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5;
    merchParts.push(cyl(merch, M.black, 0.015, 0.03, 0.22, x, 1.04, -0.1, 8));
    interact(maskHead(merch, x, 1.27, -0.1, i).children, maskOffer(i));
  }
  // Masks hanging on the pegboard.
  for (let i = 0; i < 6; i++) {
    const tex = T.maskFace(i);
    const m = add(merch, new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, roughness: 0.5 })), -1.1 + i * 0.44, 1.85 + (i % 2) * 0.25, 0.51);
    m.rotation.y = Math.PI;
    interact(m, maskOffer(i));
  }
  const merchSign = add(merch, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), new THREE.MeshBasicMaterial({ map: T.boardSign('MÁSCARAS', `$${maskPrice} MXN EACH`, { bg: '#b02428' }), toneMapped: false })), 0, 2.95, 0.5);
  merchSign.rotation.y = Math.PI;
  merchParts.push(merchSign);
  solid(-5.75, 15.1, -2.85, 16.25);
  interact(merchParts, {
    label: () => `Choose a mask color · $${maskPrice} MXN each`,
    act: () => ctx.toast('Look at the color you want on the mask display, then use it to buy that mask.'),
  });

  // ---------- snack stand ----------
  const snack = node(group, 4.3, 0, 15.6);
  const snackParts = [];
  const popcornParts = [];
  const popcornPrice = 10;
  snackParts.push(rbox(snack, M.teal, 2.6, 0.95, 0.85, 0.05, 0, 0.475, 0));
  snackParts.push(box(snack, M.wood, 2.7, 0.06, 0.95, 0, 0.98, 0));
  snackParts.push(box(snack, M.yellow, 2.9, 1.7, 0.06, 0, 1.75, 0.55));
  for (const s of [-1, 1]) box(snack, M.black, 0.06, 2.9, 0.06, s * 1.42, 1.45, 0.55);
  // Popcorn, taco trays, drinks.
  for (let i = 0; i < 3; i++) {
    popcornParts.push(cyl(snack, M.red, 0.09, 0.07, 0.22, -1.0 + i * 0.22, 1.12, -0.15, 12));
    popcornParts.push(add(snack, new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0xfff1c4, roughness: 1 })), -1.0 + i * 0.22, 1.22, -0.15));
  }
  for (let i = 0; i < 2; i++) {
    snackParts.push(box(snack, M.white, 0.3, 0.03, 0.2, 0.1 + i * 0.36, 1.03, -0.15));
    for (let j = 0; j < 3; j++) {
      const taco = cyl(snack, M.yellow, 0.04, 0.04, 0.08, 0.02 + i * 0.36 + j * 0.08, 1.07, -0.15, 10, false);
      taco.rotation.x = Math.PI / 2;
      taco.scale.set(1, 1, 0.7);
      snackParts.push(taco);
    }
  }
  for (let i = 0; i < 4; i++) snackParts.push(cyl(snack, [M.orange, M.green, M.red, M.yellow][i], 0.04, 0.035, 0.14, 0.85 + (i % 2) * 0.1, 1.08, -0.2 + Math.floor(i / 2) * 0.12, 10));
  const lampMat = std({ color: 0x331a0a, emissive: 0xff7a2a, emissiveIntensity: 1.2 });
  snackParts.push(box(snack, lampMat, 1.2, 0.05, 0.3, -0.4, 1.6, 0.1));
  const snackSign = add(snack, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), new THREE.MeshBasicMaterial({ map: T.sign('TACOS · CHURROS · PALOMITAS', { bg: '#1f8a4c', w: 1024, h: 236, font: 'bold 70px Georgia, serif' }), toneMapped: false })), 0, 2.95, 0.5);
  snackSign.rotation.y = Math.PI;
  snackParts.push(snackSign);
  const popcornSign = add(snack, new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.2125),
    new THREE.MeshBasicMaterial({
      map: T.boardSign('PALOMITAS', `$${popcornPrice} MXN`, { bg: '#1f6b46' }),
      toneMapped: false,
    })), -0.78, 0.67, -0.433);
  popcornSign.rotation.y = Math.PI;
  popcornParts.push(popcornSign);
  interact(popcornParts, {
    label: () => `Buy popcorn · $${popcornPrice} MXN`,
    act: () => {
      if (!ctx.buy(popcornPrice)) {
        ctx.toast(`You need $${popcornPrice} MXN in $5 peso coins to buy popcorn.`);
        return;
      }
      ctx.toast('Palomitas with chile and lime — the arena classic.');
      ctx.complete('snacks');
    },
  });
  solid(2.85, 15.1, 5.75, 16.25);
  const SNACKS = [
    'Tacos al pastor with pineapple and salsa verde. ¡Qué rico!',
    'A bag of churros, still warm and covered in sugar.',
    'An ice-cold agua de jamaica.',
  ];
  let snackI = 0;
  interact(snackParts, {
    label: () => 'Grab a snack',
    act: () => {
      ctx.toast(SNACKS[snackI++ % SNACKS.length]);
      ctx.complete('snacks');
    },
  });

  // ---------- the ring ----------
  const ring = new THREE.Group();
  group.add(ring);
  const ringParts = [];
  const platform = add(ring, new THREE.Mesh(new THREE.BoxGeometry(APRON * 2, 1.1, APRON * 2), [M.skirt, M.skirt, M.black, M.black, M.skirt, M.skirt]), 0, 0.55, 0);
  const mat = add(ring, new THREE.Mesh(new THREE.BoxGeometry(APRON * 2 + 0.1, 0.1, APRON * 2 + 0.1), M.canvas), 0, RING_H - 0.05, 0);
  mat.userData.part = 'mat';
  platform.userData.part = 'apron';
  ringParts.push(platform, mat);
  // Corner posts with padded turnbuckles: red and blue corners, two neutral.
  const corners = [
    [1, -1, M.red],
    [-1, 1, M.blue],
    [-1, -1, M.white],
    [1, 1, M.white],
  ];
  for (const [sx, sz, padMat] of corners) {
    const post = cyl(ring, M.steel, 0.07, 0.07, 1.6, sx * POST, RING_H + 0.8, sz * POST, 12);
    const pad = rbox(ring, padMat, 0.26, 1.15, 0.26, 0.05, sx * (POST - 0.08), RING_H + 0.82, sz * (POST - 0.08));
    for (const o of [post, pad]) {
      o.userData.part = 'post';
      o.userData.corner = [sx, sz];
      ringParts.push(o);
    }
  }
  // Ropes: green, white and red, like the flag. Each side is a group we can wobble.
  const ropeMats = [M.green, M.white, M.red];
  const ropeHeights = [RING_H + 0.38, RING_H + 0.78, RING_H + 1.18];
  const SIDES = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
  const ropes = {};
  for (const [name, [nx, nz]] of Object.entries(SIDES)) {
    const g = node(ring);
    ropeHeights.forEach((y, i) => {
      const r = cyl(g, ropeMats[i], 0.028, 0.028, POST * 2, nx * POST, y, nz * POST, 10);
      if (nx) r.rotation.x = Math.PI / 2;
      else r.rotation.z = Math.PI / 2;
      r.userData.part = i === 0 ? 'bottom' : 'rope';
      r.userData.side = name;
      ringParts.push(r);
    });
    // Rope spacers.
    for (const t of [-1.2, 0, 1.2]) {
      const sp = box(g, M.black, nx ? 0.04 : 0.06, 0.82, nz ? 0.04 : 0.06, nx * POST + (nz ? t : 0), RING_H + 0.78, nz * POST + (nx ? t : 0));
      noRay(sp);
    }
    ropes[name] = { g, n: [nx, nz], off: 0, v: 0 };
  }
  // Steel steps on the walkway side.
  for (const [h, d] of [[0.4, 0.95], [0.8, 0.63], [1.2, 0.32]]) {
    const st = box(ring, M.steel, 1.4, 0.4, d, 0, h - 0.2, APRON + d / 2 + 0.03);
    st.userData.part = 'steps';
    ringParts.push(st);
  }
  cast(ring);
  const ringOut = [solid(-APRON - 0.12, -APRON - 0.12, APRON + 0.12, APRON + 0.12), solid(-0.75, APRON, 0.75, APRON + 1.0)];
  const ringIn = [
    solid(-3.6, -3.6, 3.6, -2.85),
    solid(-3.6, 2.85, 3.6, 3.6),
    solid(-3.6, -3.6, -2.85, 3.6),
    solid(2.85, -3.6, 3.6, 3.6),
  ];
  function setInRing(v) {
    api.inRing = v;
    ringOut.forEach((c) => (c.off = v));
    ringIn.forEach((c) => (c.off = !v));
  }
  setInRing(false);

  let ringToasted = false;
  const facing = (x, z) => Math.atan2(x, z); // yaw that looks from (x, z) toward the ring
  function climbIn() {
    const p = ctx.player().pos;
    let x;
    let z;
    if (Math.abs(p.x) > Math.abs(p.z)) {
      x = Math.sign(p.x) * 1.9;
      z = THREE.MathUtils.clamp(p.z, -1.8, 1.8);
    } else {
      x = THREE.MathUtils.clamp(p.x, -1.8, 1.8);
      z = Math.sign(p.z || 1) * 1.9;
    }
    setInRing(true);
    ctx.warp({ x, z, yaw: facing(x, z), pitch: -0.08, arc: 0.45 });
    ctx.complete('ring');
    pop(0.5);
    if (!ringToasted) ctx.toast('You’re in the ring! Bounce off the ropes or climb a turnbuckle.');
    ringToasted = true;
  }
  function slideOut(side) {
    const [nx, nz] = SIDES[side];
    const p = ctx.player().pos;
    let t = nx ? THREE.MathUtils.clamp(p.z, -2.4, 2.4) : THREE.MathUtils.clamp(p.x, -2.4, 2.4);
    if (side === 'S' && Math.abs(t) < 1.1) t = 1.3 * (Math.sign(t) || 1);
    const x = nx ? nx * 3.9 : t;
    const z = nz ? nz * 3.9 : t;
    setInRing(false);
    ctx.warp({ x, z, yaw: facing(x, z), pitch: -0.05, arc: 0.2 });
  }
  function bounce(side) {
    const r = ropes[side];
    r.v += 2.6;
    ctx.push(-r.n[0] * 7.5, -r.n[1] * 7.5);
    ctx.sound.boing();
    ctx.complete('ropes');
    pop(0.6);
  }
  function climbTurnbuckle([sx, sz]) {
    const x = sx * 2.5;
    const z = sz * 2.5;
    ctx.sit({ eye: new THREE.Vector3(x, RING_H + 0.78 + 1.55, z), yaw: facing(x, z), pitch: -0.32, arc: 1.1 });
    ctx.complete('turnbuckle');
    ctx.toast('¡Desde la tercera cuerda! Move or press E to jump.');
    pop(0.8);
  }
  for (const o of ringParts) {
    interact(o, {
      label: () => {
        const part = o.userData.part;
        if (!api.inRing) return 'Climb into the ring';
        if (part === 'post') return 'Climb the turnbuckle';
        if (part === 'rope') return 'Bounce off the ropes';
        if (part === 'bottom') return 'Slide out under the ropes';
        return '';
      },
      act: () => {
        const part = o.userData.part;
        if (!api.inRing) return climbIn();
        if (part === 'post') return climbTurnbuckle(o.userData.corner);
        if (part === 'rope') return bounce(o.userData.side);
        if (part === 'bottom') return slideOut(o.userData.side);
      },
    });
  }

  // ---------- timekeeper's table: bell + lighting desk ----------
  const table = node(group, 0, 0, -4.6);
  box(table, M.wood, 2.4, 0.05, 0.7, 0, 0.74, 0);
  box(table, M.cloth, 2.36, 0.7, 0.66, 0, 0.36, 0);
  const bellParts = [];
  bellParts.push(box(table, M.wood, 0.34, 0.06, 0.24, -0.7, 0.795, 0));
  const dome = add(table, new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.brass), -0.7, 0.83, 0);
  bellParts.push(dome);
  const hammer = node(table, -0.42, 0.79, 0.05);
  const handle = cyl(hammer, M.wood, 0.012, 0.012, 0.28, 0, 0.0, 0.14, 8);
  handle.rotation.x = Math.PI / 2;
  const head = cyl(hammer, M.steel, 0.025, 0.025, 0.08, 0, 0.0, 0.0, 10);
  head.rotation.z = Math.PI / 2;
  bellParts.push(handle, head);
  cyl(table, M.black, 0.02, 0.03, 0.12, 0.05, 0.82, 0.12, 8);
  cyl(table, M.black, 0.025, 0.02, 0.07, 0.05, 0.92, 0.12, 10);
  let hammerT = 1;
  updaters.push((dt) => {
    if (hammerT >= 1) return;
    hammerT = Math.min(1, hammerT + dt * 1.6);
    hammer.rotation.y = Math.sin(hammerT * Math.PI * 6) * 0.5 * (1 - hammerT);
  });
  interact(bellParts, {
    label: () => 'Ring the bell',
    act: () => {
      hammerT = 0;
      ctx.sound.bell();
      ctx.complete('bell');
      pop(0.9);
    },
  });
  // Lighting desk with glowing buttons.
  const desk = node(table, 0.6, 0.79, 0);
  const deskBody = box(desk, M.black, 0.75, 0.08, 0.45, 0, 0.02, 0);
  deskBody.rotation.x = -0.15;
  const btnCols = [0xff3d8b, 0x31e0d0, 0xffc23d, 0x9b5cff, 0x7cc243, 0xff6a3d];
  const deskParts = [deskBody];
  for (let i = 0; i < 12; i++) {
    const b = box(desk, new THREE.MeshBasicMaterial({ color: btnCols[i % 6], toneMapped: false }), 0.05, 0.02, 0.05, -0.28 + (i % 6) * 0.1, 0.07, -0.12 + Math.floor(i / 6) * 0.1);
    b.rotation.x = -0.15;
    deskParts.push(b);
  }
  for (let i = 0; i < 6; i++) {
    const f = box(desk, M.steel, 0.02, 0.03, 0.12, -0.28 + i * 0.1, 0.07, 0.12);
    deskParts.push(f);
  }
  solid(-1.25, -4.95, 1.25, -4.25);
  // Two officials' chairs behind the table.
  const officialChairs = [];
  for (const x of [-0.6, 0.6]) {
    const c = node(group, x, 0, -5.2, Math.PI);
    box(c, M.black, 0.42, 0.04, 0.4, 0, 0.45, 0);
    box(c, M.black, 0.42, 0.32, 0.03, 0, 0.72, 0.2);
    for (const [lx, lz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) box(c, M.steel, 0.025, 0.45, 0.025, lx, 0.225, lz);
    officialChairs.push(c);
  }
  cast(table, ...officialChairs);

  // ---------- seats ----------
  // Stand seats: plastic tip-up seats facing the ring.
  const seatGeo = mergeGeometries([
    new THREE.BoxGeometry(0.46, 0.07, 0.42).translate(0, 0.43, -0.02),
    new THREE.BoxGeometry(0.46, 0.46, 0.06).rotateX(0.12).translate(0, 0.68, 0.2),
  ]);
  // Ringside folding chairs.
  const chairGeo = mergeGeometries([
    new THREE.BoxGeometry(0.42, 0.04, 0.4).translate(0, 0.45, 0),
    new THREE.BoxGeometry(0.42, 0.3, 0.03).translate(0, 0.73, 0.2),
    new THREE.BoxGeometry(0.03, 0.88, 0.03).translate(-0.19, 0.44, 0.2),
    new THREE.BoxGeometry(0.03, 0.88, 0.03).translate(0.19, 0.44, 0.2),
    new THREE.BoxGeometry(0.03, 0.45, 0.03).translate(-0.19, 0.225, -0.18),
    new THREE.BoxGeometry(0.03, 0.45, 0.03).translate(0.19, 0.225, -0.18),
  ]);
  const seatMats = [
    std({ color: 0xb8232f, roughness: 0.45 }),
    std({ color: 0xe6e6ea, roughness: 0.45 }),
    std({ color: 0x1d7a48, roughness: 0.45 }),
  ];
  const chairMat = std({ color: 0x3c3c44, roughness: 0.5, metalness: 0.3 });
  const allSeats = []; // { chunk, i, x, y, z, yaw }
  const chunks = [];
  function addChunk(list, geo, material, kind) {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, material, list.length);
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const m4 = new THREE.Matrix4();
    const p = new THREE.Vector3();
    list.forEach((s, i) => {
      im.setMatrixAt(i, m4.compose(p.set(s.x, s.y, s.z), q.setFromAxisAngle(Y, s.yaw), one));
      s.chunk = chunks.length;
      s.i = i;
      allSeats.push(s);
    });
    im.userData.seats = list;
    im.userData.kind = kind;
    chunks.push(im);
    group.add(im);
    interact(im, seatInteract(im));
  }

  // Aisles up the stands.
  const AISLE = 0.62;
  const aislesEW = [-24, -16, -8, 0, 8, 16, 24];
  const aislesN = [-27, -18, -9, 0, 9, 18, 27];
  const aislesS = [-27, -18, -10, 10, 18, 27];
  const inAisle = (t, list) => list.some((c) => Math.abs(t - c) < AISLE + 0.2);
  for (let band = 0; band < 3; band++) {
    const r0 = [0, 7, 14][band];
    const r1 = [7, 14, ROWS][band];
    const lists = { E: [], W: [], N: [], S: [] };
    for (let r = r0; r < r1; r++) {
      const d = r * ROW + 0.5;
      const y = (r + 1) * RISE;
      for (let t = -(FZ + d) + 0.45; t <= FZ + d - 0.45; t += 0.55) {
        if (inAisle(t, aislesEW)) continue;
        lists.E.push({ x: FX + d, y, z: t, yaw: Math.PI / 2, row: r });
        lists.W.push({ x: -(FX + d), y, z: t, yaw: -Math.PI / 2, row: r });
      }
      for (let t = -(FX + d) + 0.75; t <= FX + d - 0.75; t += 0.55) {
        if (!inAisle(t, aislesN)) lists.N.push({ x: t, y, z: -(FZ + d), yaw: Math.PI, row: r });
        if (!inAisle(t, aislesS) && Math.abs(t) > STX + 0.4) lists.S.push({ x: t, y, z: FZ + d, yaw: 0, row: r });
      }
      // Each row of seats is a wall you can only cross at an aisle.
      const a = r * ROW + 0.25;
      const b = r * ROW + 0.75;
      const reach = (r + 1) * ROW;
      for (const [lo, hi] of between(-(FZ + reach), FZ + reach, aislesEW, AISLE)) {
        solid(FX + a, lo, FX + b, hi);
        solid(-(FX + b), lo, -(FX + a), hi);
      }
      for (const [lo, hi] of between(-(FX + reach), FX + reach, aislesN, AISLE)) solid(lo, -(FZ + b), hi, -(FZ + a));
      for (const [lo, hi] of between(-(FX + reach), FX + reach, aislesS, AISLE)) {
        if (hi <= -STX) solid(lo, FZ + a, hi, FZ + b);
        else if (lo >= STX) solid(lo, FZ + a, hi, FZ + b);
        else {
          if (lo < -STX) solid(lo, FZ + a, -STX, FZ + b);
          if (hi > STX) solid(STX, FZ + a, hi, FZ + b);
        }
      }
    }
    for (const k of ['E', 'W', 'N', 'S']) addChunk(lists[k], seatGeo, seatMats[band], 'stands');
  }

  // Ringside chairs on the arena floor.
  const floorLists = { E: [], W: [], N: [], S: [] };
  for (let i = 0; i < 7; i++) {
    const d = 5.6 + i * 1.0;
    for (let t = -9.6; t <= 9.6; t += 0.56) {
      if (Math.abs(t) < 0.7) continue;
      floorLists.E.push({ x: d, y: 0, z: t, yaw: Math.PI / 2 });
      floorLists.W.push({ x: -d, y: 0, z: t, yaw: -Math.PI / 2 });
    }
    for (const [lo, hi] of [[-9.85, -0.45], [0.45, 9.85]]) {
      solid(d - 0.22, lo, d + 0.22, hi);
      solid(-d - 0.22, lo, -d + 0.22, hi);
    }
  }
  for (let i = 0; i < 6; i++) {
    const dz = 6.0 + i * 1.0;
    for (let t = -4.2; t <= 4.2; t += 0.56) {
      floorLists.N.push({ x: t, y: 0, z: -dz, yaw: Math.PI });
      if (Math.abs(t) > 1.6) floorLists.S.push({ x: t, y: 0, z: dz, yaw: 0 });
    }
    solid(-4.45, -dz - 0.22, 4.45, -dz + 0.22);
    solid(-4.45, dz - 0.22, -1.35, dz + 0.22);
    solid(1.35, dz - 0.22, 4.45, dz + 0.22);
  }
  for (const k of ['E', 'W', 'N', 'S']) addChunk(floorLists[k], chairGeo, chairMat, 'floor');

  // ---------- fans (hidden until the doors open) ----------
  const order = allSeats.map((s, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const fanSeats = order.slice(0, Math.floor(order.length * 0.62)).map((i) => allSeats[i]);
  const NF = fanSeats.length;
  const fanBySeat = new Map();
  fanSeats.forEach((s, i) => fanBySeat.set(s.chunk * 100000 + s.i, i));
  const fanU = { uTime: { value: 0 }, uCheer: { value: 0 }, uSway: { value: 0 } };
  const phase = new Float32Array(NF);
  for (let i = 0; i < NF; i++) phase[i] = rand() * 6.28;
  function fanMaterial(base) {
    const m = std({ roughness: 0.8, ...base });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, fanU);
      sh.vertexShader = 'attribute float aPhase;\nuniform float uTime;\nuniform float uCheer;\nuniform float uSway;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          transformed.y += uCheer * max(0.0, sin(uTime * 7.0 + aPhase)) * 0.16;
          transformed.x += uSway * sin(uTime * 1.1 + aPhase * 1.7) * 0.035;`,
        );
    };
    return m;
  }
  function fanMesh(geo, material, colors) {
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    const im = new THREE.InstancedMesh(geo, material, NF);
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const m4 = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    fanSeats.forEach((s, i) => {
      im.setMatrixAt(i, m4.compose(p.set(s.x, s.y, s.z), q.setFromAxisAngle(Y, s.yaw), one));
      im.setColorAt(i, c.set(colors[Math.floor(rand() * colors.length)]));
    });
    im.count = 0;
    im.frustumCulled = false;
    group.add(im);
    noRay(im);
    return im;
  }
  const shirts = [0xc8282e, 0x1f4fa8, 0xf2c14e, 0x1f8a4c, 0xf4f1ea, 0x18181c, 0xe8507e, 0x6b3fa0, 0xe8822d, 0x3fc1c9];
  const heads = [0xc58b62, 0xa86f4c, 0xe0b38a, 0x8a5a3c, 0xd49a6a, 0xc58b62, 0xa86f4c, 0xc8282e, 0x1f4fa8, 0xf2c14e, 0x18181c, 0x6b3fa0];
  const fanBody = fanMesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 7).translate(0, 0.78, 0.06), fanMaterial({}), shirts);
  const fanHead = fanMesh(new THREE.IcosahedronGeometry(0.13, 1).translate(0, 1.24, 0.04), fanMaterial({ flatShading: true }), heads);
  const fanArms = fanMesh(
    mergeGeometries([
      new THREE.CylinderGeometry(0.035, 0.045, 0.46, 6).rotateZ(0.3).translate(-0.24, 1.36, 0.04),
      new THREE.CylinderGeometry(0.035, 0.045, 0.46, 6).rotateZ(-0.3).translate(0.24, 1.36, 0.04),
    ]),
    fanMaterial({}),
    shirts,
  );
  const fans = { on: false, k: 0 };
  let cheerPop = 0;
  function pop(amount) {
    cheerPop = Math.min(1, cheerPop + amount);
  }
  const seatTaken = (chunkIdx, i) => {
    const f = fanBySeat.get(chunkIdx * 100000 + i);
    return f !== undefined && f < fanBody.count;
  };

  let seatToasted = false;
  function seatInteract(im) {
    return {
      label: (hit) => {
        if (!hit || hit.instanceId == null) return '';
        if (seatTaken(chunks.indexOf(im), hit.instanceId)) return 'Seat taken';
        return im.userData.kind === 'floor' ? 'Sit ringside' : 'Take a seat';
      },
      act: (hit) => {
        if (!hit || hit.instanceId == null) return;
        if (seatTaken(chunks.indexOf(im), hit.instanceId)) {
          ctx.toast('Este asiento está ocupado — try an empty one.');
          return;
        }
        const s = im.userData.seats[hit.instanceId];
        const eye = new THREE.Vector3(s.x + Math.sin(s.yaw) * 0.06, s.y + 1.18, s.z + Math.cos(s.yaw) * 0.06);
        ctx.sit({ eye, yaw: s.yaw, pitch: im.userData.kind === 'floor' ? -0.02 : -0.2 });
        if (im.userData.kind === 'stands') {
          ctx.complete('seat');
          if (!seatToasted) ctx.toast(`Row ${s.row + 1}. Great view of the ring from up here!`);
          seatToasted = true;
        }
      },
    };
  }

  // Doors at the back of the stage let the fans in.
  interact(doorPivots.flatMap((d) => d.pivot.children), {
    label: () => (doors.on ? 'Close the doors and clear the arena' : 'Open the doors and let the fans in'),
    act: () => {
      doors.on = !doors.on;
      fans.on = doors.on;
      if (doors.on) {
        ctx.complete('fans');
        ctx.toast('¡Abran las puertas! The fans are pouring in…');
      }
    },
  });

  // ---------- banners and papel picado ----------
  const bannerSpots = [
    [OX - 0.05, 15, -14, -Math.PI / 2], [OX - 0.05, 15, 0, -Math.PI / 2], [OX - 0.05, 15, 14, -Math.PI / 2],
    [-OX + 0.05, 15, -14, Math.PI / 2], [-OX + 0.05, 15, 0, Math.PI / 2], [-OX + 0.05, 15, 14, Math.PI / 2],
    [-20, 15, -OZ + 0.05, 0], [-7, 15, -OZ + 0.05, 0], [7, 15, -OZ + 0.05, 0], [20, 15, -OZ + 0.05, 0],
    [-20, 15, OZ - 0.05, Math.PI], [20, 15, OZ - 0.05, Math.PI],
  ];
  bannerSpots.forEach(([x, y, z, ry], i) => {
    const b = add(group, new THREE.Mesh(new THREE.PlaneGeometry(3.2, 8), std({ map: T.banner(i, i + 3), roughness: 0.9 })), x, y, z);
    b.rotation.y = ry;
  });
  const flagCols = [0xd9447a, 0xf2a93b, 0x3fa7a0, 0x8e6cc4, 0x7cc243, 0xf2e3c4, 0xc8282e, 0x1f4fa8];
  const flagSpots = [];
  for (const z of [-21, -11, 11, 21]) {
    for (let x = -OX + 1; x <= OX - 1; x += 0.9) {
      const k = x / OX;
      flagSpots.push([x, 19.2 - 1.8 * (1 - k * k), z, 0]);
    }
  }
  for (const x of [-13, 13]) {
    for (let z = -OZ + 1; z <= OZ - 1; z += 0.9) {
      const k = z / OZ;
      flagSpots.push([x, 18.4 - 1.6 * (1 - k * k), z, Math.PI / 2]);
    }
  }
  const flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.8).translate(0, -0.4, 0), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), flagSpots.length);
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    flagSpots.forEach(([x, y, z, ry], i) => {
      flags.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(Y, ry), new THREE.Vector3(1, 1, 1)));
      flags.setColorAt(i, c.set(flagCols[i % flagCols.length]).multiplyScalar(0.55));
    });
  }
  group.add(flags);
  noRay(flags);

  // ---------- lighting rig + video cube ----------
  const TRUSS_Y = 13.5;
  wbox(group, M.truss, -4.7, TRUSS_Y, -4.7, 4.7, TRUSS_Y + 0.45, -4.25);
  wbox(group, M.truss, -4.7, TRUSS_Y, 4.25, 4.7, TRUSS_Y + 0.45, 4.7);
  wbox(group, M.truss, -4.7, TRUSS_Y, -4.25, -4.25, TRUSS_Y + 0.45, 4.25);
  wbox(group, M.truss, 4.25, TRUSS_Y, -4.25, 4.7, TRUSS_Y + 0.45, 4.25);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(group, M.black, 0.03, 0.03, ROOF - TRUSS_Y, sx * 4.45, (ROOF + TRUSS_Y) / 2, sz * 4.45, 6);
  const fixtureMat = std({ color: 0x222222, emissive: 0xfff2dc, emissiveIntensity: 0.8 });
  for (let i = -3; i <= 3; i += 2) {
    for (const [x, z] of [[i, -4.48], [i, 4.48], [-4.48, i], [4.48, i]]) {
      const f = cyl(group, fixtureMat, 0.14, 0.18, 0.35, x, TRUSS_Y - 0.15, z, 10);
      f.rotation.x = z === -4.48 ? 0.5 : z === 4.48 ? -0.5 : 0;
      f.rotation.z = x === -4.48 ? -0.5 : x === 4.48 ? 0.5 : 0;
    }
  }
  const cube = node(group, 0, 17.8, 0);
  box(cube, M.black, 5.4, 3.4, 5.4, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const s = add(cube, new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.9), screenMat), Math.sin((i * Math.PI) / 2) * 2.71, 0, Math.cos((i * Math.PI) / 2) * 2.71);
    s.rotation.y = (i * Math.PI) / 2;
  }
  const cubeLed = new THREE.MeshBasicMaterial({ color: 0xff3d8b, toneMapped: false });
  box(cube, cubeLed, 5.55, 0.14, 5.55, 0, -1.75, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(cube, M.black, 0.025, 0.025, ROOF - 19.5, sx * 2.5, (ROOF - 17.8) / 2 + 0.85, sz * 2.5, 6);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x2a2230, 1.0);
  group.add(hemi);
  const house = [];
  for (const [x, z] of [[-17, -15], [17, -15], [-17, 15], [17, 15]]) {
    const l = new THREE.PointLight(0xfff0dc, 0, 0, 2);
    l.position.set(x, 19, z);
    group.add(l);
    house.push(l);
  }
  const key = new THREE.SpotLight(0xfff6ea, 0, 0, 0.42, 0.45, 2);
  key.position.set(0, TRUSS_Y - 0.3, 0);
  key.target.position.set(0, RING_H, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 6;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0006;
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  group.add(key, key.target);
  shadowLights.push(key);
  // Colored moving heads for the light show, with visible beams.
  const beamCols = [0xff3d8b, 0x31e0d0, 0xffc23d, 0x9b5cff];
  const beams = [];
  const beamLen = 26;
  [[-4.45, -4.45], [4.45, -4.45], [4.45, 4.45], [-4.45, 4.45]].forEach(([x, z], i) => {
    const l = new THREE.SpotLight(beamCols[i], 0, 0, 0.13, 0.35, 2);
    l.position.set(x, TRUSS_Y - 0.2, z);
    group.add(l, l.target);
    const coneGeo = new THREE.ConeGeometry(Math.tan(0.13) * beamLen, beamLen, 24, 1, true).translate(0, -beamLen / 2, 0);
    const coneMat = new THREE.MeshBasicMaterial({ color: beamCols[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const cone = add(group, new THREE.Mesh(coneGeo, coneMat), x, TRUSS_Y - 0.2, z);
    noRay(cone);
    beams.push({ l, cone, coneMat, i });
  });

  // The light show is run from the desk on the timekeeper's table.
  const show = toggler(() => {}, 0.8);
  interact(deskParts, {
    label: () => (show.on ? 'Stop the light show' : 'Start the light show'),
    act: () => {
      show.on = !show.on;
      if (show.on) {
        ctx.complete('lights');
        ctx.toast('¡Luces! The house lights drop and the beams start sweeping.');
        pop(1);
      }
    },
  });

  // ---------- screens ----------
  let screenAcc = 1;
  function drawScreen(t) {
    const g = screenCanvas.getContext('2d');
    const w = screenCanvas.width;
    const h = screenCanvas.height;
    const s = show.k;
    if (s < 0.5) {
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1c1030');
      bg.addColorStop(1, '#3a0f2a');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const x = (i * 97.3 + t * 30) % w;
        const y = (i * 53.7) % h;
        g.fillStyle = `rgba(242,193,78,${0.15 + 0.15 * Math.sin(t * 2 + i)})`;
        g.fillRect(x, y, 3, 3);
      }
      T.drawMask(g, 150, 250, 0.9, T.MASKS[0]);
      T.drawMask(g, w - 150, 250, 0.9, T.MASKS[1]);
      g.textAlign = 'center';
      g.fillStyle = '#f2c14e';
      g.font = 'bold 104px Georgia, serif';
      g.fillText('ARENA MÉXICO', w / 2, 220);
      g.fillStyle = '#f4f1ea';
      g.font = 'bold 38px sans-serif';
      g.fillText('LA CATEDRAL DE LA LUCHA LIBRE', w / 2, 290);
      g.fillStyle = fans.k > 0.05 ? '#7cf2a0' : '#e8507e';
      g.font = 'bold 34px sans-serif';
      g.fillText(fans.k > 0.05 ? '¡BIENVENIDOS, AFICIONADOS!' : 'PUERTAS CERRADAS · ABREN PRONTO', w / 2, 400);
    } else {
      g.fillStyle = '#0a0610';
      g.fillRect(0, 0, w, h);
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(t * 0.6);
      for (let i = 0; i < 16; i++) {
        g.rotate(Math.PI / 8);
        g.fillStyle = i % 2 ? '#e8507e' : '#1f6b6e';
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(700, -90);
        g.lineTo(700, 90);
        g.fill();
      }
      g.restore();
      const beat = Math.abs(Math.sin(t * Math.PI * 2));
      g.textAlign = 'center';
      g.fillStyle = '#ffffff';
      g.font = `bold ${120 + beat * 18}px Georgia, serif`;
      g.fillText('¡LUCHA LIBRE!', w / 2, h / 2 + 40);
      g.fillStyle = '#f2c14e';
      g.font = 'bold 40px sans-serif';
      g.fillText('ARENA MÉXICO', w / 2, h / 2 + 110);
    }
    screenTex.needsUpdate = true;
  }

  // ---------- per frame ----------
  const tmpV = new THREE.Vector3();
  function update(dt, t) {
    for (const u of updaters) u(dt);

    // Rope wobble (a damped spring per side).
    for (const r of Object.values(ropes)) {
      if (Math.abs(r.off) < 1e-4 && Math.abs(r.v) < 1e-4) continue;
      r.v += (-140 * r.off - 9 * r.v) * dt;
      r.off += r.v * dt;
      r.g.position.set(r.n[0] * r.off, 0, r.n[1] * r.off);
      api.dirty = true;
    }

    // Fans file in (or out) over a few seconds.
    fans.k += THREE.MathUtils.clamp((fans.on ? 1 : 0) - fans.k, -dt * 0.35, dt * 0.22);
    const n = Math.floor(fans.k * NF);
    fanBody.count = fanHead.count = n;
    cheerPop = Math.max(0, cheerPop - dt * 0.35);
    const cheer = Math.min(1, fans.k * (0.12 + 0.7 * show.k + cheerPop));
    api.cheer = cheer;
    fanArms.count = cheer > 0.35 ? Math.floor(n * 0.5) : 0;
    fanU.uTime.value = t;
    fanU.uCheer.value = cheer;
    fanU.uSway.value = fans.k;

    // Lights: house lights fall as the show rises.
    const s = show.k;
    hemi.intensity = 1.0 - 0.75 * s;
    for (const l of house) l.intensity = 420 * (1 - 0.85 * s);
    key.intensity = 380 + 620 * s;
    fixtureMat.emissiveIntensity = 0.8 + 1.5 * s;
    parMat.emissiveIntensity = s * (1.5 + Math.sin(t * 8) * 1.2);
    parMat.emissive.setHSL((t * 0.15) % 1, 0.9, 0.55);
    const ledHue = s > 0 ? (t * 0.3) % 1 : 0.02;
    ledMat.color.setHSL(ledHue, s > 0 ? 1 : 0.1, 0.25 + 0.35 * s);
    ledTex.offset.y = -t * (0.6 + 2 * s);
    cubeLed.color.setHSL((t * 0.12) % 1, 0.9, 0.3 + 0.3 * s);
    beams.forEach((b) => {
      b.l.intensity = 2200 * s;
      b.coneMat.opacity = 0.13 * s;
      b.cone.visible = s > 0.01;
      const a = t * (0.5 + b.i * 0.07) + (b.i * Math.PI) / 2;
      const rad = 3 + 9 * (0.5 + 0.5 * Math.sin(t * 0.37 + b.i));
      b.l.target.position.set(Math.cos(a) * rad, 0.5 + 4 * (0.5 + 0.5 * Math.sin(t * 0.9 + b.i)), Math.sin(a) * rad);
      tmpV.subVectors(b.l.target.position, b.l.position).normalize();
      b.cone.quaternion.setFromUnitVectors(DOWN, tmpV);
    });

    screenAcc += dt;
    if (screenAcc > 1 / 12) {
      screenAcc = 0;
      drawScreen(t);
    }

    api.state.fans = fans.k;
    api.state.show = show.k;
    api.state.cheer = cheer;
  }

  api.setInRing = setInRing;
  return api;
}
