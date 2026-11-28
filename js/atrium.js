// The hotel's open-air atrium, outside the suite's front door.
//
// From above it's a long U of galleries round a well that is open from the
// lobby all the way up to the sky:
//
//   z=9.15  ┌──601──────────┬──[602 ours]──┬──────603──────┬────┐
//           │   left gallery (your floor runs past your door) │ E  │
//   z=11.55 ├───────────── railing ───────────────────┐ gal │ L  │
//           │        open well (look down to the      │ ler │ E  │
//           │        lobby, up to the sky)            │  y  │ V  │
//   z=19.55 ├───────────── railing ───────────────────┘     │ S  │
//           │   right gallery                                │    │
//   z=21.95 └──606──────────┴─────605──────┴──────604──────┴────┘
//         x=-26                                         20.4  22.8  26
//
// The bottom of the U (east end) has two elevators and the stairs. Only
// your own room (602) opens; every other door is locked.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { meterUV } from './room.js';
import { GROUND } from './city.js';
import * as T from './textures.js';

const FH = 3.15; // floor-to-floor height
const ROOF = GROUND + 59;
const TOP_K = 18; // the last slab (the galleries' roof)
const OUR_K = 6; // the suite's floor (y = 0)
const X0 = -26; // the well's west wall
const XR = 20.4; // the well's east edge (start of the bottom gallery)
const XC = 22.8; // the elevator core's face
const ZL = 9.15; // the left rooms' wall
const ZLR = 11.55; // left railing
const ZRR = 19.55; // right railing
const ZR = 21.95; // the right rooms' wall
const levelY = (k) => GROUND + k * FH;

// Room doors along each gallery (door centres).
const LEFT_DOORS = [[-18.4, '601'], [12.8, '603']]; // 602 is ours, in its vestibule at x = -1.1
const RIGHT_DOORS = [[12.8, '604'], [-2.8, '605'], [-18.4, '606']];
const LIFTS = [13.0, 15.1]; // elevator door centres (z) on the core wall
const STAIRS_Z = 18.6;
// Where you step out of the elevator.
const LIFT_LANDING = { x: 21.6, z: 14.05, yaw: Math.PI / 2, pitch: 0.05 };

export function buildAtrium(ctx) {
  const group = new THREE.Group();
  const api = {};
  const colliders = { 6: [], 0: [] };
  const all = [];
  const state = { level: OUR_K, riding: false };
  const geos = {}; // merged geometry per material key
  const push = (key, geo) => (geos[key] || (geos[key] = [])).push(geo);
  const boxGeo = (x0, y0, z0, x1, y1, z1) => {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    return meterUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), cx, cy, cz).translate(cx, cy, cz);
  };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    wall: std({ map: T.plaster(), color: 0xeadfcc, roughness: 0.9 }),
    slab: std({ color: 0xd9d1c4, roughness: 0.85 }),
    carpet: std({ map: T.fabric(), color: 0x8a2f3c, roughness: 1 }),
    glass: std({ color: 0xa9c4d0, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }),
    rail: std({ color: 0x2a2c30, metalness: 0.6, roughness: 0.35 }),
    door: std({ map: T.woodGrain(), color: 0x7a4a2a, roughness: 0.6 }),
    frame: std({ color: 0xf2ece2, roughness: 0.5 }),
    steel: std({ color: 0xb8bec4, metalness: 0.85, roughness: 0.25 }),
    brass: std({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }),
    marble: std({ map: T.marble(), color: 0xf0ece4, roughness: 0.3 }),
    plant: std({ color: 0x3e7a3a, roughness: 0.9, side: THREE.DoubleSide }),
    pot: std({ color: 0xb8643a, roughness: 0.8 }),
    sofa: std({ map: T.fabric(), color: 0x2f6a6a, roughness: 0.95 }),
    sofa2: std({ map: T.fabric(), color: 0xc87a3a, roughness: 0.95 }),
    wood: std({ map: T.woodGrain(), color: 0x8a5a32, roughness: 0.7 }),
    water: std({ color: 0x5a9ab8, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
    sconce: std({ color: 0xfff0d0, emissive: 0xffd8a0, emissiveIntensity: 0.9 }),
    lit: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    dark: std({ color: 0x1a1c20, roughness: 0.4 }),
  };
  const mesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.userData.noShadow = true;
    group.add(m);
    return m;
  };
  const add = (o, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    group.add(o);
    o.traverse((c) => (c.userData.noShadow = true));
    return o;
  };
  const solid = (level, x0, z0, x1, z1) => {
    const c = { x0, z0, x1, z1, off: level !== state.level };
    colliders[level].push(c);
    all.push([level, c]);
    return c;
  };
  const round = (level, x, z, r) => {
    const c = { x, z, r, off: level !== state.level };
    colliders[level].push(c);
    all.push([level, c]);
    return c;
  };
  const interact = (o, spec) => {
    o.userData.interact = spec;
    return o;
  };
  const plate = (text, w = 256, h = 128) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#2a2622';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8b050';
    g.lineWidth = 6;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#e8c870';
    g.font = `bold ${Math.round(h * 0.55)}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  };

  // ---------- the walls round the well, full height ----------
  // Left rooms' wall, with the opening for our vestibule on our floor.
  push('wall', boxGeo(X0, GROUND, ZL, XC, -0.0, ZL + 0.02));
  push('wall', boxGeo(X0, 0, ZL, -3.0, 2.85, ZL + 0.02));
  push('wall', boxGeo(0.5, 0, ZL, XC, 2.85, ZL + 0.02));
  push('wall', boxGeo(X0, 2.85, ZL, XC, ROOF, ZL + 0.02));
  push('wall', boxGeo(X0, GROUND, ZR - 0.02, XC, ROOF, ZR)); // right rooms' wall
  push('wall', boxGeo(XC - 0.02, GROUND, ZL, XC, ROOF, ZR)); // elevator core
  push('wall', boxGeo(X0 - 0.3, GROUND, ZL, X0, ROOF + 1.2, ZR)); // west end of the well
  // Parapets on the roof.
  push('wall', boxGeo(X0 - 0.3, ROOF, ZL - 0.3, 26, ROOF + 1.2, ZL));
  push('wall', boxGeo(X0 - 0.3, ROOF, ZR, 26, ROOF + 1.2, ZR + 0.3));

  // ---------- each floor: gallery slab, carpet, railing, doors, lights ----------
  for (let k = 1; k <= TOP_K; k++) {
    const y = levelY(k);
    const last = k === TOP_K;
    // U-shaped slab: left arm, right arm, bottom.
    push('slab', boxGeo(X0, y - 0.3, ZL, XR, y, ZLR));
    push('slab', boxGeo(X0, y - 0.3, ZRR, XR, y, ZR));
    push('slab', boxGeo(XR, y - 0.3, ZL, XC, y, ZR));
    if (last) continue;
    // Carpet runners.
    push('carpet', boxGeo(X0, y, ZL + 0.02, XR, y + 0.006, ZLR));
    push('carpet', boxGeo(X0, y, ZRR, XR, y + 0.006, ZR - 0.02));
    push('carpet', boxGeo(XR, y, ZL + 0.02, XC - 0.02, y + 0.006, ZR - 0.02));
    // Glass railings with a dark top rail.
    push('glass', boxGeo(X0, y + 0.05, ZLR - 0.06, XR + 0.03, y + 1.0, ZLR - 0.04));
    push('glass', boxGeo(X0, y + 0.05, ZRR + 0.04, XR + 0.03, y + 1.0, ZRR + 0.06));
    push('glass', boxGeo(XR + 0.04, y + 0.05, ZLR - 0.05, XR + 0.06, y + 1.0, ZRR + 0.05));
    push('rail', boxGeo(X0, y + 1.0, ZLR - 0.1, XR + 0.1, y + 1.06, ZLR));
    push('rail', boxGeo(X0, y + 1.0, ZRR, XR + 0.1, y + 1.06, ZRR + 0.1));
    push('rail', boxGeo(XR, y + 1.0, ZLR - 0.1, XR + 0.1, y + 1.06, ZRR + 0.1));
    for (let x = X0 + 2; x < XR; x += 3) {
      push('rail', boxGeo(x - 0.02, y, ZLR - 0.07, x + 0.02, y + 1.0, ZLR - 0.03));
      push('rail', boxGeo(x - 0.02, y, ZRR + 0.03, x + 0.02, y + 1.0, ZRR + 0.07));
    }
    // Doors (merged; the ones on our floor are separate so they can be used).
    if (k !== OUR_K) {
      const doorsL = [...LEFT_DOORS.map(([x]) => x), -1.1];
      for (const x of doorsL) {
        push('frame', boxGeo(x - 0.6, y, ZL + 0.02, x + 0.6, y + 2.3, ZL + 0.05));
        push('door', boxGeo(x - 0.5, y, ZL + 0.05, x + 0.5, y + 2.15, ZL + 0.08));
      }
      for (const [x] of RIGHT_DOORS) {
        push('frame', boxGeo(x - 0.6, y, ZR - 0.05, x + 0.6, y + 2.3, ZR - 0.02));
        push('door', boxGeo(x - 0.5, y, ZR - 0.08, x + 0.5, y + 2.15, ZR - 0.05));
      }
    }
    // Elevator doors and the stair door on the core.
    for (const z of LIFTS) {
      push('frame', boxGeo(XC - 0.05, y, z - 0.7, XC - 0.02, y + 2.4, z + 0.7));
      if (k !== OUR_K && k !== 0) push('steel', boxGeo(XC - 0.08, y, z - 0.55, XC - 0.05, y + 2.2, z + 0.55));
    }
    push('frame', boxGeo(XC - 0.05, y, STAIRS_Z - 0.65, XC - 0.02, y + 2.3, STAIRS_Z + 0.65));
    if (k !== OUR_K) push('door', boxGeo(XC - 0.08, y, STAIRS_Z - 0.55, XC - 0.05, y + 2.15, STAIRS_Z + 0.55));
    // Wall lights between the doors.
    for (const x of [-22, -10.5, 4.5, 17]) {
      push('sconce', boxGeo(x - 0.12, y + 1.9, ZL + 0.02, x + 0.12, y + 2.15, ZL + 0.09));
      push('sconce', boxGeo(x - 0.12, y + 1.9, ZR - 0.09, x + 0.12, y + 2.15, ZR - 0.02));
    }
  }
  // The lobby floor, and the lobby's doors (the restaurant and offices).
  {
    const y = GROUND;
    push('marble', boxGeo(X0, y - 0.05, ZL, XC, y + 0.02, ZR));
    for (const [x] of LEFT_DOORS.concat([[-1.1]])) {
      push('frame', boxGeo(x - 0.6, y, ZL + 0.02, x + 0.6, y + 2.3, ZL + 0.05));
      push('door', boxGeo(x - 0.5, y, ZL + 0.05, x + 0.5, y + 2.15, ZL + 0.08));
    }
    for (const [x] of RIGHT_DOORS) {
      push('frame', boxGeo(x - 0.6, y, ZR - 0.05, x + 0.6, y + 2.3, ZR - 0.02));
      push('door', boxGeo(x - 0.5, y, ZR - 0.08, x + 0.5, y + 2.15, ZR - 0.05));
    }
    for (const z of LIFTS) push('frame', boxGeo(XC - 0.05, y, z - 0.7, XC - 0.02, y + 2.4, z + 0.7));
    push('frame', boxGeo(XC - 0.05, y, STAIRS_Z - 0.65, XC - 0.02, y + 2.3, STAIRS_Z + 0.65));
  }
  for (const [key, list] of Object.entries(geos)) mesh(mergeGeometries(list), M[key]);

  // ---------- our floor: the vestibule, the doors you can try, colliders ----------
  {
    // The little vestibule between the corridor and the suite's front door.
    mesh(boxGeo(-3.0, -0.2, 6.55, 0.5, 0.006, ZL), M.carpet);
    mesh(boxGeo(0.5, 0, 6.55, 0.65, 2.85, ZL), M.wall);
    mesh(boxGeo(-3.0, 2.8, 6.55, 0.5, 2.95, ZL), M.slab);
    solid(6, 0.5, 6.55, 0.65, ZL);
    // The 602 plate beside our door, and a small lamp.
    const p602 = mesh(new THREE.PlaneGeometry(0.34, 0.17), plate('602'));
    p602.position.set(-0.25, 1.55, 6.565);
    mesh(boxGeo(-2.2, 1.9, 6.55, -1.96, 2.15, 6.62), M.sconce);
    // Our floor's other doors: locked.
    const locked = (num) => ({
      label: (h) => (h.distance < 3 ? `Room ${num}` : null),
      act: () => ctx.toast(`Room ${num} is locked. Your key only opens Suite 602 — this isn't your room!`, 3600),
    });
    const y = 0;
    for (const [x, num] of LEFT_DOORS) {
      mesh(boxGeo(x - 0.6, y, ZL + 0.02, x + 0.6, y + 2.3, ZL + 0.05), M.frame);
      const d = interact(mesh(boxGeo(x - 0.5, y, ZL + 0.05, x + 0.5, y + 2.15, ZL + 0.08), M.door), locked(num));
      mesh(boxGeo(x + 0.33, 0.97, ZL + 0.08, x + 0.43, 1.03, ZL + 0.13), M.brass);
      const p = mesh(new THREE.PlaneGeometry(0.34, 0.17), plate(num));
      p.position.set(x + 0.85, 1.55, ZL + 0.025);
      void d;
    }
    for (const [x, num] of RIGHT_DOORS) {
      mesh(boxGeo(x - 0.6, y, ZR - 0.05, x + 0.6, y + 2.3, ZR - 0.02), M.frame);
      interact(mesh(boxGeo(x - 0.5, y, ZR - 0.08, x + 0.5, y + 2.15, ZR - 0.05), M.door), locked(num));
      mesh(boxGeo(x - 0.43, 0.97, ZR - 0.13, x - 0.33, 1.03, ZR - 0.08), M.brass);
      const p = mesh(new THREE.PlaneGeometry(0.34, 0.17), plate(num));
      p.position.set(x - 0.85, 1.55, ZR - 0.025);
      p.rotation.y = Math.PI;
    }
    // Floor number painted at the bottom of the U.
    const sign = mesh(new THREE.PlaneGeometry(1.6, 0.5), plate('PISO 6', 512, 160));
    sign.position.set(XC - 0.03, 2.55, 16.95);
    sign.rotation.y = -Math.PI / 2;
    // Walls and railings you bump into.
    solid(6, X0, 9.0, -3.0, ZL + 0.08); // left rooms (and the bedroom behind)
    solid(6, 0.5, 9.0, XC, ZL + 0.08);
    solid(6, X0, ZR - 0.08, XC, ZR + 0.2); // right rooms
    solid(6, XC - 0.1, ZL, XC + 0.3, ZR); // the core
    solid(6, X0 - 0.4, ZL, X0 + 0.05, ZR); // west end
    solid(6, X0, ZLR - 0.12, XR + 0.1, ZLR + 0.02); // railings
    solid(6, X0, ZRR - 0.02, XR + 0.1, ZRR + 0.12);
    solid(6, XR - 0.02, ZLR - 0.12, XR + 0.12, ZRR + 0.12);
    // The vestibule's west wall is the bedroom's east wall; keep you in.
    solid(6, -3.25, 6.55, -3.0, 9.1);
  }

  // ---------- the lobby (floor 1, open to the sky above) ----------
  {
    const y = GROUND + 0.02;
    // A round fountain in the middle of the well.
    const fx = -4;
    const fz = 15.55;
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.5, 40), M.marble), fx, y + 0.25, fz);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.04, 40), M.water), fx, y + 0.45, fz);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 20), M.marble), fx, y + 0.8, fz);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 0.15, 30), M.marble), fx, y + 1.45, fz);
    const jet = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.6, 10), M.water), fx, y + 1.8, fz);
    round(0, fx, fz, 1.85);
    // Couch groups round low tables, on rugs.
    const seats = [];
    function sofa(x, z, yaw, mat) {
      const g = new THREE.Group();
      const b = (w, h, d, bx, by, bz, m = mat) => {
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        o.position.set(bx, by, bz);
        g.add(o);
      };
      b(2.0, 0.35, 0.85, 0, 0.22, 0);
      b(2.0, 0.5, 0.2, 0, 0.6, -0.33);
      for (const s of [-1, 1]) b(0.18, 0.5, 0.85, s * 0.98, 0.4, 0);
      for (let i = 0; i < 2; i++) b(0.88, 0.1, 0.62, -0.45 + i * 0.9, 0.44, 0.06);
      b(2.0, 0.06, 0.85, 0, 0.03, 0, M.dark);
      g.rotation.y = yaw;
      add(g, x, y, z);
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const c = round(0, x, z, 0.95);
      void c;
      interact(g, {
        label: (h) => (h.distance < 3 ? 'Rest on the couch' : null),
        act: () => {
          ctx.sit({ eye: new THREE.Vector3(x + fwd.x * 0.1, y + 1.05, z + fwd.z * 0.1), yaw: Math.atan2(-fwd.x, -fwd.z), pitch: 0.25, calm: true });
          ctx.complete('lobby');
          ctx.toast('Ahh. From down here you can see every floor of the hotel, all the way up to the sky.', 4800);
        },
      });
      seats.push(g);
    }
    function lounge(cx, cz, mat) {
      const rug = add(new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), std({ map: T.rug(), roughness: 1 })), cx, y + 0.005, cz);
      rug.rotation.x = -Math.PI / 2;
      sofa(cx, cz - 1.35, 0, mat);
      sofa(cx, cz + 1.35, Math.PI, mat);
      const tbl = add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), M.wood), cx, y + 0.42, cz);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.38, 0.5), M.wood), cx, y + 0.19, cz);
      solid(0, cx - 0.62, cz - 0.37, cx + 0.62, cz + 0.37);
      void tbl;
    }
    lounge(-17, 15.55, M.sofa);
    lounge(8.5, 15.55, M.sofa2);
    // Potted palms round the well.
    const frond = new THREE.PlaneGeometry(0.35, 1.6).translate(0, 0.8, 0);
    for (const [px, pz] of [[-24.5, 12.6], [-24.5, 18.5], [-10.5, 12.6], [-10.5, 18.5], [2.5, 12.6], [2.5, 18.5], [15, 12.6], [15, 18.5]]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 16), M.pot), px, y + 0.3, pz);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8), M.wood), px, y + 1.4, pz);
      for (let i = 0; i < 8; i++) {
        const f = add(new THREE.Mesh(frond, M.plant), px, y + 2.1, pz);
        f.rotation.set(1.0, (i / 8) * Math.PI * 2, 0, 'YXZ');
      }
      round(0, px, pz, 0.45);
    }
    // Reception desk by the elevators.
    add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 3.2), M.wood), 18.6, y + 0.55, 15.55);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 3.3), M.marble), 18.6, y + 1.12, 15.55);
    const rec = mesh(new THREE.PlaneGeometry(2.4, 0.5), plate('RECEPCIÓN', 512, 110));
    rec.position.set(18.18, y + 0.7, 15.55);
    rec.rotation.y = -Math.PI / 2;
    interact(rec, { label: (h) => (h.distance < 3 ? 'Ring the reception bell' : null), act: () => { ctx.sound.bell && ctx.sound.bell(); ctx.toast('*ding!* “¡Buenas tardes! Enjoy your stay at Air BnB.”'); } });
    solid(0, 18.15, 13.9, 19.05, 17.2);
    const lsign = mesh(new THREE.PlaneGeometry(1.6, 0.5), plate('LOBBY', 512, 160));
    lsign.position.set(XC - 0.03, y + 2.55, 16.95);
    lsign.rotation.y = -Math.PI / 2;
    // Lobby walls.
    solid(0, X0, ZL - 0.2, XC, ZL + 0.08);
    solid(0, X0, ZR - 0.08, XC, ZR + 0.2);
    solid(0, XC - 0.1, ZL, XC + 0.3, ZR);
    solid(0, X0 - 0.4, ZL, X0 + 0.05, ZR);
    api.jet = jet;
  }

  // ---------- elevators and stairs (usable on our floor and in the lobby) ----------
  const liftDoors = {};
  for (const k of [OUR_K, 0]) {
    const y = levelY(k) + (k === 0 ? 0.02 : 0);
    liftDoors[k] = LIFTS.map((z) => {
      const halves = [-1, 1].map((s) => {
        const d = mesh(new THREE.BoxGeometry(0.03, 2.2, 0.55), M.steel);
        d.position.set(XC - 0.065, y + 1.1, z + s * 0.275);
        return d;
      });
      // Call button and floor display.
      const btn = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.08), M.brass);
      btn.position.set(XC - 0.04, y + 1.1, z + 0.78);
      const disp = mesh(new THREE.PlaneGeometry(0.4, 0.18), plate(k === 0 ? 'L' : '6', 128, 64));
      disp.position.set(XC - 0.04, y + 2.55, z);
      disp.rotation.y = -Math.PI / 2;
      const go = k === OUR_K ? 0 : OUR_K;
      for (const o of [btn, ...halves]) {
        interact(o, {
          label: (h) => (h.distance < 3.5 && !state.riding ? (go === 0 ? 'Take the elevator down to the lobby' : 'Take the elevator up to floor 6') : null),
          act: () => ride(go, 'elevator'),
        });
      }
      return { halves, open: 0, z };
    });
    // The stair door, with a little wired-glass window.
    const sd = mesh(new THREE.BoxGeometry(0.04, 2.15, 1.1), M.door);
    sd.position.set(XC - 0.065, y + 1.075, STAIRS_Z);
    const win = mesh(new THREE.PlaneGeometry(0.4, 0.6), std({ color: 0x9ab8c4, roughness: 0.1, metalness: 0.3 }));
    win.position.set(XC - 0.087, y + 1.5, STAIRS_Z);
    win.rotation.y = -Math.PI / 2;
    mesh(boxGeo(XC - 0.12, y + 0.97, STAIRS_Z - 0.48, XC - 0.085, y + 1.03, STAIRS_Z - 0.3), M.steel);
    const ss = mesh(new THREE.PlaneGeometry(0.9, 0.24), plate('ESCALERAS', 384, 100));
    ss.position.set(XC - 0.03, y + 2.45, STAIRS_Z);
    ss.rotation.y = -Math.PI / 2;
    const go = k === OUR_K ? 0 : OUR_K;
    interact(sd, {
      label: (h) => (h.distance < 3 && !state.riding ? (go === 0 ? 'Walk down the stairs to the lobby' : 'Walk up the stairs to floor 6') : null),
      act: () => ride(go, 'stairs'),
    });
    win.userData.interact = sd.userData.interact;
  }

  function setLevel(k) {
    state.level = k;
    for (const [lv, c] of all) c.off = lv !== k;
  }
  async function ride(to, how) {
    if (state.riding) return;
    state.riding = true;
    const from = state.level;
    if (how === 'elevator') {
      ctx.sound.bell && ctx.sound.bell();
      ctx.toast('*ding!* The elevator arrives…', 1500);
      await new Promise((r) => setTimeout(r, 700));
    }
    await ctx.fade(
      to === 0 ? 'Lobby' : 'Piso 6',
      how === 'stairs' ? (to === 0 ? 'Down five flights of stairs…' : 'Up five flights of stairs… phew!') : to === 0 ? 'Going down…' : 'Going up…',
      () => {
        setLevel(to);
        const spot = how === 'stairs' ? { x: 21.6, z: STAIRS_Z - 0.3, yaw: Math.PI / 2, pitch: 0.05 } : LIFT_LANDING;
        ctx.player().place(spot);
      },
    );
    if (how === 'elevator') ctx.sound.bell && ctx.sound.bell();
    state.riding = false;
    if (to === 0) ctx.toast('The lobby. Look up: the hotel’s galleries rise floor after floor to the open sky. Rest on a couch, or take the elevator back up.', 5600);
    else ctx.toast('Back on floor 6. Suite 602 is the middle door on the left.', 3600);
  }

  Object.assign(api, { group, colliders: all.map(([, c]) => c), state, setLevel, ride });
  api.floorAt = (x, z) => (state.level === 0 ? GROUND + 0.02 : 0);
  let t = 0;
  api.update = (dt) => {
    t += dt;
    if (api.jet) api.jet.scale.y = 1 + Math.sin(t * 6) * 0.08;
  };
  setLevel(OUR_K);
  return api;
}
