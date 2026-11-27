import * as THREE from 'three';
import { boardSign, coinSteps, ledPanel, zooCoin } from './textures.js';

// Each machine owns its selection, crank progress and tray.
export function buildZooPress(parent, ctx, coins, cabinetColor = 0x155572) {
  const machine = new THREE.Group();
  parent.add(machine);

  const steel = new THREE.MeshStandardMaterial({ color: 0xb6c7cc, metalness: 0.65, roughness: 0.32 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd69c48, metalness: 0.55, roughness: 0.35 });
  const navy = new THREE.MeshStandardMaterial({ color: cabinetColor, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17282f, roughness: 0.8 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xc78151, metalness: 0.55, roughness: 0.35 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd7503d, roughness: 0.45 });
  const display = ledPanel();

  function mesh(geo, mat, x, y, z, root = machine) {
    const part = new THREE.Mesh(geo, mat);
    part.position.set(x, y, z);
    root.add(part);
    return part;
  }
  const box = (mat, w, h, d, x, y, z, root) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, root);
  const panel = (map, w, h, x, y, z) => mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map, toneMapped: false }), x, y, z);
  const interact = (parts, label, act) => {
    const action = { label, act };
    for (const part of parts) part.userData.interact = action;
  };

  box(dark, 1.22, 0.08, 0.68, 0, 0.04, -0.22);
  box(navy, 1.14, 2.08, 0.55, 0, 1.08, -0.285);
  for (const x of [-0.55, 0.55]) box(brass, 0.035, 2.01, 0.03, x, 1.12, 0.002);
  box(navy, 1.23, 0.34, 0.58, 0, 2.12, -0.25);
  panel(boardSign('MONEDAS RECUERDO', 'SOUVENIR COINS', { bg: '#11465a', fg: '#ffdb94' }),
    1.12, 0.28, 0, 2.13, 0.047);

  let selected = 0;
  let inserted = 0;
  let turns = 0;
  let time = 0;
  let turnStarted = null;
  let dropStarted = null;
  let ready = false;
  const designs = coins.map(({ name, es, stamp, task }) => {
    const texture = zooCoin(stamp, es);
    return { name, es, task, texture, image: texture.image.toDataURL() };
  });
  const coinMaterial = (map) => new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, toneMapped: false });

  const chooseDesign = designs.length > 1;
  const marker = box(brass, 0.42, 0.025, 0.025, chooseDesign ? -0.26 : 0, 1.62, 0.038);
  designs.forEach((design, index) => {
    const x = chooseDesign ? (index - 0.5) * 0.52 : 0;
    const backing = box(dark, 0.45, 0.27, 0.025, x, 1.78, 0.01);
    const choice = mesh(new THREE.PlaneGeometry(0.39, 0.24), coinMaterial(design.texture), x, 1.78, 0.024);
    if (!chooseDesign) return;
    interact([backing, choice], () => selected === index ? `${design.name} coin · selected` : `Choose the ${design.name} coin`, () => {
      if (turns || turnStarted !== null) return ctx.toast('Finish pressing this coin before switching designs.');
      selected = index;
      marker.position.x = x;
      ctx.toast(`You picked the ${design.name} design.`);
    });
  });

  panel(display, 0.66, 0.19, -0.115, 1.45, 0.011);
  const slot = box(steel, 0.21, 0.19, 0.04, 0.36, 1.45, 0.019);
  const slit = box(dark, 0.026, 0.091, 0.007, 0.36, 1.47, 0.042);
  interact([slot, slit], () => inserted === 2 ? 'Coins in · turn the crank' : `Insert a coin (${inserted}/2)`, () => {
    if (ready) return ctx.toast('Take your coin from the tray first.');
    if (inserted === 2) return ctx.toast('Both coins are in. Turn the crank!');
    if (ctx.pay && !ctx.pay()) return ctx.toast('You need $5 peso coins for this machine (2 per coin). Look for shiny coins lying around the zoo, the shops and Arena México!', 5200);
    inserted++;
    ctx.sound.coinIn();
  });

  box(dark, 0.63, 0.38, 0.05, -0.19, 1.09, 0.025);
  const gearGeo = (radius, teeth) => {
    const shape = new THREE.Shape();
    for (let index = 0; index < teeth * 4; index++) {
      const angle = index * Math.PI / (teeth * 2);
      const r = radius * (index % 4 < 2 ? 1 : 0.82);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
  };
  const largeGear = mesh(gearGeo(0.126, 14), brass, -0.32, 1.12, 0.054);
  const smallGear = mesh(gearGeo(0.086, 10), steel, -0.13, 1.07, 0.054);
  const blank = mesh(new THREE.CircleGeometry(0.034, 24), copper, 0.045, 1.17, 0.084);
  const window = mesh(new THREE.PlaneGeometry(0.61, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xaadcea, opacity: 0.15, transparent: true, depthWrite: false }), -0.19, 1.09, 0.1);
  window.raycast = () => {};

  const gear = mesh(gearGeo(0.172, 14), brass, 0.34, 1.08, 0.073);
  const handle = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.11, 12), red, 0, 0.112, 0.085, gear);
  handle.rotation.x = Math.PI / 2;
  interact([gear, handle, largeGear, smallGear], () => {
    if (ready) return 'Take your coin from the tray';
    if (dropStarted !== null) return 'Pressing your coin…';
    return inserted < 2 ? 'Turn the crank · insert 2 coins first' : `Turn the crank (${turns}/3)`;
  }, () => {
    if (ready) return ctx.toast('Take your coin from the tray first.');
    if (inserted < 2) return ctx.toast('Insert two coins in the slot above the crank.');
    if (turnStarted !== null || dropStarted !== null) return;
    turnStarted = time;
    ctx.sound.ratchet();
  });

  panel(coinSteps(chooseDesign), 0.39, 0.293, -0.24, 0.57, 0.006);
  const tray = box(dark, 0.42, 0.26, 0.021, 0.25, 0.51, 0.025);
  const lip = box(steel, 0.44, 0.045, 0.21, 0.25, 0.39, 0.09);
  const result = mesh(new THREE.PlaneGeometry(0.15, 0.094), coinMaterial(designs[0].texture), 0.25, 0.46, 0.125);
  result.rotation.x = -0.5;
  result.visible = false;
  interact([tray, lip, result], () => ready ? `Take your ${designs[selected].name} coin` : null, () => {
    if (!ready) return;
    const { name, es, task, image } = designs[selected];
    ready = false;
    result.visible = false;
    inserted = 0;
    turns = 0;
    ctx.souvenir('coin', { key: name, name: `${name} coin`, img: image });
    ctx.showCoin(image, `${es} · Chapultepec`);
    ctx.toast(`You added the ${name.toLowerCase()} coin to your backpack!`);
    ctx.complete(task);
  });

  function update(t) {
    time = t;
    let progress = 0;
    if (turnStarted !== null) {
      progress = Math.min(1, (t - turnStarted) / 0.72);
      if (progress === 1) {
        turns++;
        progress = 0;
        turnStarted = null;
        if (turns === 3) {
          dropStarted = t;
          ctx.sound.coinPress();
        }
      }
    }
    const angle = (turns + THREE.MathUtils.smoothstep(progress, 0, 1)) * Math.PI * 2;
    gear.rotation.z = -angle;
    largeGear.rotation.z = -angle;
    smallGear.rotation.z = angle * 1.4;
    const squeeze = turns + Math.sin(progress * Math.PI);
    blank.scale.set(1 + squeeze * 0.32, 1 - squeeze * 0.16, 1);
    const drop = dropStarted === null ? 0 : Math.min(1, (t - dropStarted) / 0.5);
    blank.visible = inserted === 2 && !ready && drop < 0.72;
    blank.position.y = 1.13 - drop * drop * 0.25;
    if (drop === 1) {
      dropStarted = null;
      ready = true;
      result.material.map = designs[selected].texture;
      result.visible = true;
      ctx.sound.coinDrop();
      ctx.toast('Ka-chunk! Take your coin from the tray.');
    }

    if (ready) display.set('¡LISTO!', 'TAKE YOUR COIN');
    else if (dropStarted !== null) display.set('KA-CHUNK!', 'PRESSING…');
    else display.set(designs[selected].name.toUpperCase(),
      inserted < 2 ? `INSERT ${2 - inserted} ${inserted === 0 ? 'COINS' : 'COIN'}` : `TURN CRANK ${turns}/3`);
  }

  update(0);
  return { machine, update };
}
