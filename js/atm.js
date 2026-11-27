// A small bank vestibule with an ATM that trades a $20 peso bill for four $5 coins.
import * as THREE from 'three';
import { marble, plaster, sign, buildingWindows } from './textures.js';

export const ATM_SPAWN = { x: 0, z: 2.9, yaw: 0, pitch: -0.05 };

// Room: x -3.5..3.5, z -4..4. ATMs stand against the back wall (z = -4).
const W = 3.5;
const D = 4;
const AX = -1.1; // the working ATM
const FRONT = -3.4; // front face of the ATMs

export function buildAtm(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  const colliders = [];
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const box = (m, w, h, d, x, y, z, parent = group) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  const plane = (m, w, h, x, y, z, parent = group) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // ---------- the room ----------
  const floorTex = marble();
  floorTex.repeat.set(3, 3);
  const floor = plane(mat(0xe8e4dc, { map: floorTex, roughness: 0.25 }), W * 2, D * 2, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  const ceil = plane(mat(0xf2f0ea), W * 2, D * 2, 0, 3, 0);
  ceil.rotation.x = Math.PI / 2;
  const wallTex = plaster();
  wallTex.repeat.set(2, 1);
  const wall = mat(0xd9dee4, { map: wallTex });
  const accent = mat(0x1f4f7a);
  box(wall, W * 2, 3, 0.2, 0, 1.5, -D - 0.1); // back
  box(wall, 0.2, 3, D * 2, -W - 0.1, 1.5, 0); // left
  box(wall, 0.2, 3, D * 2, W + 0.1, 1.5, 0); // right
  box(accent, W * 2, 0.35, 0.02, 0, 2.55, -D + 0.01); // blue band on the back wall
  // Skirting.
  const skirt = mat(0x6b7480);
  box(skirt, W * 2, 0.1, 0.03, 0, 0.05, -D + 0.015);
  box(skirt, 0.03, 0.1, D * 2, -W + 0.015, 0.05, 0);
  box(skirt, 0.03, 0.1, D * 2, W - 0.015, 0.05, 0);

  // Glass front with a door, looking out onto the street.
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const frame = mat(0x3a4048, { metalness: 0.6, roughness: 0.35 });
  plane(glass, W * 2, 3, 0, 1.5, D).rotation.y = Math.PI;
  for (const x of [-W, -0.8, 0.8, W]) box(frame, 0.08, 3, 0.08, x, 1.5, D);
  box(frame, W * 2, 0.08, 0.08, 0, 2.6, D);
  box(frame, W * 2, 0.06, 0.08, 0, 0.03, D);
  const handle = mat(0xc8ccd2, { metalness: 0.9, roughness: 0.2 });
  box(handle, 0.03, 0.5, 0.05, -0.12, 1.1, D - 0.05);
  box(handle, 0.03, 0.5, 0.05, 0.12, 1.1, D - 0.05);
  const outSign = plane(new THREE.MeshBasicMaterial({ map: sign('ABIERTO 24 HORAS', { bg: '#1f4f7a', fg: '#ffffff', font: 'bold 50px sans-serif' }), toneMapped: false }), 1.2, 0.3, 0, 2.3, D - 0.06);
  outSign.rotation.y = Math.PI;
  outSign.userData.interact = { label: (h) => (h.distance < 4 ? 'Door' : null), act: () => ctx.toast('The street is busy tonight. Use the buttons at the top left to travel somewhere else.') };

  // Outside: a sidewalk, the street and buildings across the way.
  const out = new THREE.Group();
  group.add(out);
  const walk = plane(mat(0xb8b2a6), 30, 3, 0, -0.01, D + 1.5, out);
  walk.rotation.x = -Math.PI / 2;
  const road = plane(mat(0x3c3e42), 30, 10, 0, -0.03, D + 8, out);
  road.rotation.x = -Math.PI / 2;
  for (let i = -3; i < 4; i++) {
    const stripe = plane(new THREE.MeshBasicMaterial({ color: 0xe8e2c0 }), 1.6, 0.14, i * 4, -0.02, D + 8, out);
    stripe.rotation.x = -Math.PI / 2;
  }
  const bw = buildingWindows({ seed: 77, warm: true });
  [[-9, 16, 8, 0xd8c8b0], [-1, 22, 6, 0xc4b8a8], [7, 18, 10, 0xe0d4c0]].forEach(([x, h, w, c], i) => {
    // The window texture covers 24 m × 28 m of wall.
    const map = bw.map.clone();
    const glow = bw.emissive.clone();
    for (const t of [map, glow]) t.repeat.set(w / 24, h / 28);
    const m = new THREE.MeshStandardMaterial({ color: c, map, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0.8, roughness: 0.9 });
    box(m, w, h, 6, x, h / 2, D + 17 + i, out);
  });
  const sky = plane(new THREE.MeshBasicMaterial({ color: 0x2a3550 }), 120, 60, 0, 25, D + 30, out);
  sky.rotation.y = Math.PI;
  const lampPost = mat(0x30343a, { metalness: 0.5 });
  box(lampPost, 0.12, 4.5, 0.12, -4.5, 2.25, D + 2.6, out);
  box(new THREE.MeshBasicMaterial({ color: 0xffd890 }), 0.5, 0.15, 0.3, -4.2, 4.5, D + 2.6, out);

  // Bank sign over the ATMs (a made-up bank).
  plane(new THREE.MeshBasicMaterial({ map: sign('BANCO JACARANDA', { bg: '#1f4f7a', fg: '#ffffff', w: 1024, h: 128, font: 'bold 70px sans-serif' }), toneMapped: false }), 2.6, 0.33, 0, 2.55, -D + 0.03);

  // Lights.
  group.add(new THREE.HemisphereLight(0xf4f8ff, 0x8a8478, 1.6));
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xf8fbff });
  for (const [x, z] of [[-1.6, -2], [1.6, -2], [-1.6, 1.6], [1.6, 1.6]]) {
    const p = plane(panelMat, 1.1, 0.55, x, 2.99, z);
    p.rotation.x = Math.PI / 2;
    const l = new THREE.PointLight(0xf2f6ff, 9, 8, 1.6);
    l.position.set(x, 2.8, z);
    group.add(l);
  }

  // A bench along the left wall and a wastebasket for receipts.
  const benchWood = mat(0x8a5a32);
  box(benchWood, 0.5, 0.06, 2, -W + 0.35, 0.46, 0.6);
  box(frame, 0.06, 0.44, 0.06, -W + 0.35, 0.22, -0.3);
  box(frame, 0.06, 0.44, 0.06, -W + 0.35, 0.22, 1.5);
  colliders.push({ x0: -W, x1: -W + 0.65, z0: -0.45, z1: 1.65 });
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.45, 18, 1, true), mat(0x707880, { metalness: 0.5, side: THREE.DoubleSide }));
  bin.position.set(0.35, 0.225, FRONT + 0.15);
  group.add(bin);
  colliders.push({ x: 0.35, z: FRONT + 0.15, r: 0.22 });
  // A poster on the right wall.
  const poster = plane(new THREE.MeshBasicMaterial({ map: canvasTex(512, 720, (g, w, h) => {
    g.fillStyle = '#f4efe2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f4f7a';
    g.fillRect(0, 0, w, 150);
    g.fillStyle = '#fff';
    g.font = 'bold 54px sans-serif';
    g.textAlign = 'center';
    g.fillText('¿Monedas?', w / 2, 95);
    g.fillStyle = '#1f2a36';
    g.font = 'bold 40px sans-serif';
    g.fillText('$20 → 4 × $5', w / 2, 260);
    g.font = '28px sans-serif';
    ['Cambia tu billete de $20', 'por cuatro monedas de $5', 'para las máquinas de', 'monedas del zoológico.', '', 'Trade a $20 bill for four', '$5 coins for the zoo’s', 'coin presses.'].forEach((t, i) => g.fillText(t, w / 2, 340 + i * 42));
  }), toneMapped: false }), 0.9, 1.27, W - 0.01, 1.55, -0.6);
  poster.rotation.y = -Math.PI / 2;

  // ---------- the ATMs ----------
  const body = mat(0x2c3846, { metalness: 0.4, roughness: 0.45 });
  const steel = mat(0x9aa2ac, { metalness: 0.85, roughness: 0.3 });
  const black = mat(0x0d0f12, { roughness: 0.4 });
  function cabinet(x) {
    const g = new THREE.Group();
    g.position.set(x, 0, -D + 0.3);
    group.add(g);
    box(body, 0.95, 1.75, 0.6, 0, 0.875, 0, g);
    box(steel, 0.97, 0.06, 0.62, 0, 1.78, 0, g);
    box(steel, 0.9, 0.7, 0.02, 0, 1.3, 0.305, g); // fascia around the screen
    box(black, 0.62, 0.48, 0.02, 0, 1.33, 0.312, g); // screen bezel
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: -D, z1: FRONT + 0.05 });
    return g;
  }
  const atm = cabinet(AX);
  const broken = cabinet(-AX);

  // Header sign on the working ATM.
  const header = plane(new THREE.MeshBasicMaterial({ map: sign('CAMBIO · $20 → 4 × $5', { bg: '#2e7d4f', fg: '#ffffff', font: 'bold 44px sans-serif' }), toneMapped: false }), 0.9, 0.22, 0, 1.97, 0.0, atm);
  box(body, 0.95, 0.3, 0.1, 0, 1.97, -0.06, atm);
  header.position.z = 0.0;
  const header2 = plane(new THREE.MeshBasicMaterial({ map: sign('FUERA DE SERVICIO', { bg: '#b0302a', fg: '#ffffff', font: 'bold 50px sans-serif' }), toneMapped: false }), 0.9, 0.22, 0, 1.97, 0.0, broken);
  box(body, 0.95, 0.3, 0.1, 0, 1.97, -0.06, broken);
  header2.position.z = 0.0;

  // The screen: redrawn whenever the ATM changes what it shows.
  const scrCanvas = document.createElement('canvas');
  scrCanvas.width = 512;
  scrCanvas.height = 384;
  const scrTex = new THREE.CanvasTexture(scrCanvas);
  scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = plane(new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), 0.56, 0.42, 0, 1.33, 0.324, atm);
  function drawScreen(title, lines = [], foot = '') {
    const g = scrCanvas.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 384);
    grd.addColorStop(0, '#1d5a8c');
    grd.addColorStop(1, '#0f3456');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 512, 54);
    g.fillStyle = '#1f4f7a';
    g.font = 'bold 30px sans-serif';
    g.textAlign = 'center';
    g.fillText('BANCO JACARANDA', 256, 38);
    g.fillStyle = '#ffffff';
    g.font = 'bold 40px sans-serif';
    g.fillText(title, 256, 120);
    g.font = '27px sans-serif';
    lines.forEach((t, i) => g.fillText(t, 256, 178 + i * 40));
    if (foot) {
      g.fillStyle = '#f2c14e';
      g.font = 'bold 26px sans-serif';
      g.fillText(foot, 256, 356);
    }
    scrTex.needsUpdate = true;
  }
  const welcome = () => drawScreen('¡Bienvenido!', ['Inserte un billete de $20', 'y reciba 4 monedas de $5.', 'Insert a $20 bill to get', 'four $5 coins.'], 'Toque la pantalla · Touch the screen');
  welcome();
  // The broken one just shows a dead screen with a message.
  plane(new THREE.MeshBasicMaterial({ map: canvasTex(512, 384, (g) => {
    g.fillStyle = '#101418';
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#d84a3a';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.fillText('FUERA DE SERVICIO', 256, 170);
    g.fillStyle = '#9aa2ac';
    g.font = '26px sans-serif';
    g.fillText('Out of service · Use the other ATM', 256, 230);
  }), toneMapped: false }), 0.56, 0.42, 0, 1.33, 0.324, broken);

  // Keypad (tilted shelf with keys).
  const padTex = canvasTex(256, 200, (g) => {
    g.fillStyle = '#3a4450';
    g.fillRect(0, 0, 256, 200);
    const keys = ['1', '2', '3', 'X', '4', '5', '6', '←', '7', '8', '9', '✓', '', '0', '', ''];
    const cols = ['#d8dde2', '#d8dde2', '#d8dde2', '#c8402e', '#d8dde2', '#d8dde2', '#d8dde2', '#e2b23a', '#d8dde2', '#d8dde2', '#d8dde2', '#3a9a52', '#3a4450', '#d8dde2', '#3a4450', '#3a4450'];
    keys.forEach((k, i) => {
      const x = 14 + (i % 4) * 60;
      const y = 12 + Math.floor(i / 4) * 46;
      g.fillStyle = cols[i];
      g.fillRect(x, y, 50, 38);
      g.fillStyle = '#1a2026';
      g.font = 'bold 26px sans-serif';
      g.textAlign = 'center';
      g.fillText(k, x + 25, y + 28);
    });
  });
  for (const cab of [atm, broken]) {
    const shelf = box(steel, 0.8, 0.04, 0.24, 0, 0.98, 0.4, cab);
    shelf.rotation.x = 0.35;
    const pad = plane(new THREE.MeshBasicMaterial({ map: padTex }), 0.3, 0.2, 0.12, 1.0, 0.41, cab);
    pad.rotation.x = -Math.PI / 2 + 0.35;
    if (cab === atm) {
      pad.userData.interact = {
        label: (h) => (h.distance < 2.6 ? 'Check your balance' : null),
        act: () => checkBalance(),
      };
    }
  }
  // Bill slot with its green guide light, receipt slot, coin tray.
  box(black, 0.3, 0.03, 0.04, -0.15, 1.06, 0.33, atm);
  const slotLed = box(new THREE.MeshBasicMaterial({ color: 0x3ad86a }), 0.3, 0.012, 0.012, -0.15, 1.035, 0.352, atm);
  box(black, 0.14, 0.02, 0.04, 0.27, 0.86, 0.32, atm);
  const tray = box(steel, 0.44, 0.18, 0.14, 0, 0.36, 0.36, atm);
  box(black, 0.38, 0.12, 0.12, 0, 0.38, 0.38, atm);
  box(black, 0.3, 0.03, 0.04, -0.15, 1.06, 0.33, broken);
  box(black, 0.44, 0.12, 0.08, 0, 0.36, 0.33, broken);
  broken.children.forEach((m) => {
    m.userData.interact = { label: (h) => (h.distance < 3 ? 'Out-of-service ATM' : null), act: () => ctx.toast('FUERA DE SERVICIO — this one’s broken. Try the ATM on the left.') };
  });

  // The bill that slides in, the coins that drop out, the receipt.
  const billTex = billTexture();
  const bill = plane(new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.6, side: THREE.DoubleSide }), 0.26, 0.12, -0.15, 1.06, 0.4, atm);
  bill.rotation.x = -Math.PI / 2;
  bill.visible = false;
  const rim = new THREE.MeshStandardMaterial({ color: 0xd0cec4, metalness: 0.85, roughness: 0.3 });
  const core = new THREE.MeshStandardMaterial({ color: 0xd8b050, metalness: 0.85, roughness: 0.3 });
  const coins = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20), rim));
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.016, 16), core);
    c.add(k);
    c.position.set(-0.12 + i * 0.08, 0.33 + (i % 2) * 0.012, 0.39);
    c.rotation.set(0.15 * (i - 1.5), i, 0.1);
    c.visible = false;
    atm.add(c);
    coins.push(c);
  }
  const receiptTex = canvasTex(128, 320, (g) => {
    g.fillStyle = '#fbfaf5';
    g.fillRect(0, 0, 128, 320);
    g.fillStyle = '#333';
    g.font = 'bold 13px monospace';
    g.textAlign = 'center';
    g.fillText('BANCO JACARANDA', 64, 24);
    g.font = '11px monospace';
    ['CAMBIO DE BILLETE', '----------------', 'BILLETE   $20.00', '4 x $5    $20.00', '----------------', '¡GRACIAS!', '', 'Disfrute el zoo'].forEach((t, i) => g.fillText(t, 64, 56 + i * 22));
  });
  const receipt = plane(new THREE.MeshStandardMaterial({ map: receiptTex, roughness: 0.9, side: THREE.DoubleSide }), 0.07, 0.17, 0.27, 0.86, 0.36, atm);
  receipt.rotation.x = -0.2;
  receipt.visible = false;

  // ---------- what the ATM does ----------
  const st = { mode: 'idle', t: 0, dropped: 0, back: 0, printed: 0 };
  function checkBalance() {
    if (st.mode !== 'idle') return screenAct();
    const w = ctx.wallet();
    drawScreen('Su saldo · Balance', [`Billetes de $20: ${w.bills}`, `Monedas de $5: ${w.coins}`, `Total: $${w.coins * 5 + w.bills * 20}`], w.bills ? 'Toque la pantalla para cambiar' : '');
    st.back = 7;
    ctx.sound.beep && ctx.sound.beep();
    ctx.complete('atmBalance');
  }
  function screenAct() {
    if (st.mode === 'idle') {
      if (!ctx.takeBill()) {
        drawScreen('Sin billete', ['No tiene un billete de $20.', 'You don’t have a $20 bill.'], 'Busque en el zoológico…');
        st.back = 6;
        ctx.toast('You need a $20 peso bill. Word is someone dropped one somewhere in the zoo — look closely at the ground!', 5200);
        return;
      }
      st.mode = 'taking';
      st.t = 0;
      st.back = 0;
      bill.visible = true;
      bill.position.z = 0.48;
      drawScreen('Leyendo billete…', ['Reading your bill…']);
      ctx.toast('You feed the $20 bill into the slot…');
    } else if (st.mode === 'ready') ctx.toast('Your coins are in the tray below. Take them!');
    else if (st.mode === 'receipt') ctx.toast(st.printed >= 1 ? 'Don’t forget your receipt!' : 'Printing your receipt…');
    else ctx.toast('Un momento, por favor…');
  }
  screen.userData.interact = {
    label: (h) => (h.distance > 2.6 ? null : st.mode === 'idle' ? (ctx.wallet().bills ? 'Insert your $20 bill' : 'Use the ATM') : st.mode === 'ready' ? 'Your coins are in the tray' : 'ATM'),
    act: screenAct,
  };
  tray.userData.interact = {
    label: (h) => (h.distance < 2.6 && st.mode === 'ready' ? 'Take your 4 coins' : null),
    act: () => {
      if (st.mode !== 'ready') return;
      coins.forEach((c) => (c.visible = false));
      ctx.giveCoins(4);
      ctx.complete('atmTrade');
      st.mode = 'receipt';
      st.printed = 0;
      receipt.visible = true;
      receipt.scale.y = 0.01;
      drawScreen('¡Gracias!', ['Thank you!', 'Su recibo se está imprimiendo.', 'Your receipt is printing.']);
      ctx.sound.ratchet();
    },
  };
  receipt.userData.interact = {
    label: (h) => (h.distance < 2.6 && st.mode === 'receipt' && st.printed >= 1 ? 'Take your receipt' : null),
    act: () => {
      if (st.mode !== 'receipt' || st.printed < 1) return;
      receipt.visible = false;
      ctx.complete('atmReceipt');
      ctx.toast('🧾 BANCO JACARANDA · Billete $20.00 → 4 × $5.00 · ¡Gracias! Disfrute el zoológico.', 4200);
      st.mode = 'idle';
      welcome();
    },
  };
  [screen, tray, receipt].forEach((m) => (m.userData.keep = true));

  function update(dt) {
    slotLed.material.color.setHex(st.mode === 'idle' && Math.sin(performance.now() / 260) > 0 ? 0x3ad86a : 0x15502a);
    if (st.back > 0) {
      st.back -= dt;
      if (st.back <= 0 && st.mode === 'idle') welcome();
    }
    if (st.mode === 'taking') {
      st.t += dt;
      bill.position.z = 0.48 - Math.min(1, st.t / 1.1) * 0.2;
      if (st.t > 1.1) {
        bill.visible = false;
        st.mode = 'counting';
        st.t = 0;
        drawScreen('Contando…', ['$20.00 → 4 × $5.00', 'Counting your coins…']);
        ctx.sound.ratchet();
      }
    } else if (st.mode === 'counting') {
      st.t += dt;
      if (st.t > 1.4) {
        st.mode = 'dropping';
        st.t = 0;
        st.dropped = 0;
      }
    } else if (st.mode === 'dropping') {
      st.t += dt;
      if (st.t > 0.35) {
        st.t = 0;
        coins[st.dropped].visible = true;
        st.dropped++;
        ctx.sound.coinDrop();
        if (st.dropped === 4) {
          st.mode = 'ready';
          drawScreen('Retire sus monedas', ['Take your coins', 'from the tray below.'], '4 × $5 = $20');
        }
      }
    } else if (st.mode === 'receipt' && st.printed < 1) {
      st.printed = Math.min(1, st.printed + dt / 1.4);
      receipt.scale.y = st.printed;
      receipt.position.y = 0.86 - 0.085 * st.printed;
    }
  }

  // Keep the player inside the vestibule.
  const limit = (p, r) => {
    p.x = Math.max(-W + r, Math.min(W - r, p.x));
    p.z = Math.max(-D + r, Math.min(D - r - 0.05, p.z));
  };
  return { group, colliders, floorAt: () => 0, limit, update, state: {}, st };
}

// A $20 peso bill: blue polymer with a clear window (drawn, not a copy of the real design).
export function billTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 128);
  grd.addColorStop(0, '#2f7fa8');
  grd.addColorStop(1, '#1f5a7e');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  g.strokeRect(6, 6, 244, 116);
  g.fillStyle = 'rgba(220,240,250,0.55)';
  g.fillRect(186, 20, 44, 88); // the clear window
  g.fillStyle = '#ffffff';
  g.font = 'bold 54px sans-serif';
  g.fillText('20', 18, 64);
  g.font = 'bold 15px sans-serif';
  g.fillText('VEINTE PESOS', 18, 96);
  g.font = '11px sans-serif';
  g.fillText('BILLETE DE JUEGO', 18, 112);
  g.beginPath();
  g.arc(130, 62, 26, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
