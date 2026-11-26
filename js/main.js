import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRoom } from './room.js';
import { buildWorld } from './city.js';
import { buildArena, ARENA_SPAWN } from './arena.js';
import { buildAviary, AVIARY_SPAWN, BIRDS } from './aviary.js';
import { buildPandas, PANDA_SPAWN } from './pandas.js';
import { Player } from './player.js';
import { Sound } from './audio.js';
import { MASKS } from './textures.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', touch);

const HOTEL_TASKS = [
  ['curtains', 'Open the curtains'],
  ['balcony', 'Step out onto the balcony'],
  ['tv', 'Turn on the TV'],
  ['lamp', 'Switch on a bedside lamp'],
  ['bed', 'Lie down on the bed'],
  ['wardrobe', 'Open the wardrobe'],
  ['minibar', 'Check the mini fridge'],
  ['sink', 'Wash your hands'],
  ['lock', 'Lock the front door'],
  ['night', 'See the city at night'],
];
const ARENA_TASKS = [
  ['mask', 'Buy a luchador mask'],
  ['wear', 'Put on your mask'],
  ['snacks', 'Grab a snack'],
  ['bell', 'Ring the bell'],
  ['ring', 'Climb into the ring'],
  ['ropes', 'Bounce off the ropes'],
  ['turnbuckle', 'Climb a turnbuckle'],
  ['lights', 'Start the light show'],
  ['fans', 'Let the fans in'],
  ['seat', 'Take a seat in the stands'],
];
const AVIARY_TASKS = [
  ['all', 'Visit every exhibit on the trail'],
  ['peacock', 'Make a peacock fan its tail'],
  ['emus', 'Toss feed to the emus'],
  ['parakeets', 'Hold out a seed stick for the parakeets'],
  ['rheas', 'Feed the rheas (find the albino ones!)'],
  ['macaws', 'Feed the macaws'],
  ['trumpeters', 'Call to the trumpeter swans'],
  ['pond', 'Feed the ducks and geese at the big pond'],
  ['parrot', 'Say ¡hola! to a parrot'],
  ['mix', 'Fill the feeder in the mixed aviary'],
  ['sign', 'Read an aviary sign'],
  ['toucan', 'Spot the wild toucan with binoculars'],
  ['photo', 'Take a photo'],
  ['tape', 'Peek past the caution tape'],
];
const PANDA_TASKS = [
  ['pGate', 'Walk through the panda gate'],
  ['pSpot', 'Spot Xin Xin the panda'],
  ['pEat', 'Watch Xin Xin munch bamboo'],
  ['pNap', 'Catch Xin Xin taking a nap'],
  ['pKeeper', 'Chat with the keeper'],
  ['pSign', 'Read a panda sign'],
  ['pPlush', 'Buy a panda plushie'],
  ['pCoin', 'Press a panda souvenir coin'],
  ['pPhoto', 'Take a photo of Xin Xin'],
];

// ---------- renderer / scene ----------
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  $('#startBtn').textContent = 'WebGL is not available';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Portrait phones get a wider view so the room doesn't feel like a keyhole.
const fovFor = (aspect) => (aspect < 1 ? 82 : 70);
const camera = new THREE.PerspectiveCamera(fovFor(window.innerWidth / window.innerHeight), window.innerWidth / window.innerHeight, 0.05, 12000);
scene.add(camera);

// ---------- HUD helpers ----------
const toastEl = $('#toast');
let toastTimer = 0;
function toast(msg, ms = 3800) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

const sound = new Sound();
let player;
let loc; // the place we're in right now

const taskList = $('#taskList');
function renderTasks(flashId) {
  const { tasks, done } = loc;
  taskList.innerHTML = tasks
    .map(([id, label]) => `<li class="${done.has(id) ? 'done' : ''} ${id === flashId ? 'flash' : ''}"><span class="tick" aria-hidden="true"></span>${label}</li>`)
    .join('');
  $('#taskCount').textContent = `${done.size}/${tasks.length}`;
  $('#tasks').classList.toggle('all-done', done.size === tasks.length);
  $('#tasksTitle').textContent = loc.tasksTitle;
  $('#roomChip').textContent = loc.chip;
}

// Tasks belong to whichever place lists them (wearing the mask in the hotel still counts).
function complete(id) {
  const owner = PLACES.find((l) => l.tasks.some(([t]) => t === id));
  if (!owner || owner.done.has(id)) return;
  owner.done.add(id);
  sound.chime();
  if (owner !== loc) return;
  renderTasks(id);
  if (owner.done.size === owner.tasks.length) setTimeout(() => celebrate(owner), 1600);
}

// ---------- the two places ----------
const world = buildWorld(scene);
const room = buildRoom({ toast, complete, sit: (seat) => player.sit(seat) });
scene.add(room.group);
room.group.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = !o.userData.noShadow && !(o.material && o.material.transparent);
  o.receiveShadow = true;
});
room.mirror.castShadow = false;
room.mirror.receiveShadow = false;

const arenaWorld = buildArena({
  toast,
  complete,
  sound,
  sit: (seat) => player.sit(seat),
  warp: (w) => player.warp(w),
  push: (x, z) => player.push.set(x, z),
  player: () => player,
  buyMask,
});
scene.add(arenaWorld.group);
arenaWorld.group.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = !!o.userData.cast;
  o.receiveShadow = !o.isInstancedMesh;
});

const hotel = {
  id: 'hotel',
  title: 'Hotel Jacaranda',
  sub: 'Room 1207 · Paseo de la Reforma',
  chip: 'Room 1207',
  tasksTitle: 'Settle in',
  goLabel: 'Back to hotel',
  tasks: HOTEL_TASKS,
  done: new Set(),
  root: room.group,
  colliders: room.colliders,
  floorAt: () => 0,
  spawn: { x: 1.7, z: 3.2, yaw: 0.2, pitch: -0.04 },
  saved: null,
  enter() {
    room.group.visible = true;
    world.setActive(true);
    scene.environmentIntensity = 0.4;
  },
  exit() {
    room.group.visible = false;
    world.setActive(false);
  },
};
const arena = {
  id: 'arena',
  title: 'Arena México',
  sub: 'Colonia Doctores · La Catedral de la Lucha Libre',
  chip: 'Arena México',
  tasksTitle: 'Fan checklist',
  goLabel: 'Go to stadium',
  tasks: ARENA_TASKS,
  done: new Set(),
  root: arenaWorld.group,
  colliders: arenaWorld.colliders,
  floorAt: arenaWorld.floorAt,
  spawn: ARENA_SPAWN,
  saved: null,
  visited: false,
  enter() {
    arenaWorld.group.visible = true;
    scene.environmentIntensity = 0.3;
  },
  exit() {
    arenaWorld.group.visible = false;
  },
};
const aviaryWorld = buildAviary({
  toast,
  complete,
  sound,
  camera,
  sit: (seat) => player.sit(seat),
  player: () => player,
  travel: (id) => travel(id),
});
scene.add(aviaryWorld.group);
aviaryWorld.group.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = !!o.userData.cast;
  o.receiveShadow = !o.isInstancedMesh;
});
const aviaryFog = new THREE.Fog(0xb7c9b1, 22, 130);
const aviary = {
  id: 'aviary',
  title: 'Aviario',
  sub: 'Zoológico de Chapultepec · Bird trail',
  chip: 'Aviary',
  tasksTitle: 'Bird spotter',
  goLabel: 'Go to aviary',
  tasks: AVIARY_TASKS,
  done: new Set(),
  root: aviaryWorld.group,
  colliders: aviaryWorld.colliders,
  floorAt: aviaryWorld.floorAt,
  limit: aviaryWorld.limit,
  spawn: AVIARY_SPAWN,
  saved: null,
  visited: false,
  enter() {
    aviaryWorld.group.visible = true;
    scene.fog = aviaryFog;
    scene.environmentIntensity = 0.5;
  },
  exit() {
    aviaryWorld.group.visible = false;
    scene.fog = null;
  },
};
const pandaWorld = buildPandas({
  toast,
  complete,
  sound,
  camera,
  showCoin,
  sit: (seat) => player.sit(seat),
  player: () => player,
});
scene.add(pandaWorld.group);
pandaWorld.group.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = !!o.userData.cast;
  o.receiveShadow = !o.isInstancedMesh;
});
const pandaFog = new THREE.Fog(0xbfcfc0, 28, 140);
const pandas = {
  id: 'pandas',
  title: 'Pabellón del Panda',
  sub: 'Zoológico de Chapultepec · Panda exhibit',
  chip: 'Pandas',
  tasksTitle: 'Panda watch',
  goLabel: 'Go to panda exhibit',
  tasks: PANDA_TASKS,
  done: new Set(),
  root: pandaWorld.group,
  colliders: pandaWorld.colliders,
  floorAt: pandaWorld.floorAt,
  limit: pandaWorld.limit,
  spawn: PANDA_SPAWN,
  saved: null,
  visited: false,
  enter() {
    pandaWorld.group.visible = true;
    scene.fog = pandaFog;
    scene.environmentIntensity = 0.5;
  },
  exit() {
    pandaWorld.group.visible = false;
    scene.fog = null;
  },
};
const PLACES = [hotel, arena, aviary, pandas];
loc = hotel;
arenaWorld.group.visible = false;

player = new Player(camera, room.colliders);

// ---------- avatar (only seen in the bathroom mirror, layer 1) ----------
const avatar = makeAvatar();
scene.add(avatar);
room.mirror.camera.layers.enable(1);

function makeAvatar() {
  const g = new THREE.Group();
  const m = (color, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const skin = m(0xc58b62, 0.6);
  const shirt = m(0xf3efe6, 0.9);
  const pants = m(0x2f3b57);
  const add = (geo, mat, x, y, z, parent = g) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.07, 0.72, 4, 10), pants, s * 0.1, 0.45, 0);
    add(new THREE.BoxGeometry(0.11, 0.07, 0.26), m(0x4a3324), s * 0.1, 0.035, -0.05);
    const arm = add(new THREE.CapsuleGeometry(0.05, 0.52, 4, 10), shirt, s * 0.25, 1.1, 0);
    arm.rotation.z = s * 0.1;
    add(new THREE.SphereGeometry(0.05, 10, 8), skin, s * 0.28, 0.8, 0);
  }
  const torso = add(new THREE.CapsuleGeometry(0.17, 0.4, 6, 14), shirt, 0, 1.13, 0);
  torso.scale.z = 0.62;
  // Guayabera pleats.
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.45, 0.01), m(0xe2dccf), s * 0.07, 1.12, -0.108);
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin, 0, 1.44, 0);
  const head = add(new THREE.SphereGeometry(0.115, 20, 16), skin, 0, 1.58, 0);
  head.scale.set(0.92, 1.08, 1);
  const hairMat = m(0x2a1c14, 0.95);
  const hair = add(new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), hairMat, 0, 1.6, 0.008);
  hair.scale.set(0.95, 1.08, 1.02);
  add(new THREE.SphereGeometry(0.112, 16, 12), hairMat, 0, 1.6, 0.03);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.014, 8, 6), m(0x1a1a1a, 0.3), s * 0.04, 1.6, -0.1);
  add(new THREE.ConeGeometry(0.018, 0.04, 8), skin, 0, 1.565, -0.115).rotation.x = -Math.PI / 2;

  // The luchador mask, shown when you wear it.
  const mask = new THREE.Group();
  mask.visible = false;
  g.add(mask);
  const maskBase = m(0xc8282e, 0.45);
  const maskTrim = m(0xf2c14e, 0.4);
  const maskEyes = m(0xffffff, 0.4);
  const shell = add(new THREE.SphereGeometry(0.126, 22, 16), maskBase, 0, 1.59, 0.004, mask);
  shell.scale.set(0.95, 1.12, 1.02);
  for (const s of [-1, 1]) {
    const rim = add(new THREE.SphereGeometry(0.036, 12, 8), maskTrim, s * 0.042, 1.605, -0.112, mask);
    rim.scale.set(1.35, 0.8, 0.45);
    const white = add(new THREE.SphereGeometry(0.027, 12, 8), maskEyes, s * 0.042, 1.605, -0.121, mask);
    white.scale.set(1.3, 0.7, 0.4);
    add(new THREE.SphereGeometry(0.012, 8, 6), m(0x1a1a1a, 0.3), s * 0.042, 1.605, -0.13, mask);
  }
  const mouth = add(new THREE.SphereGeometry(0.026, 10, 8), maskTrim, 0, 1.52, -0.118, mask);
  mouth.scale.set(1.2, 0.7, 0.4);
  g.userData.mask = { group: mask, base: maskBase, trim: maskTrim, eyes: maskEyes };

  g.traverse((o) => o.layers.set(1));
  return g;
}

// ---------- luchador mask ----------
const maskState = { owned: false, on: false, design: 0 };
function paintMask() {
  const [base, trim, , accent] = MASKS[maskState.design];
  const root = document.documentElement.style;
  root.setProperty('--mask-base', base);
  root.setProperty('--mask-trim', trim);
  root.setProperty('--mask-accent', accent);
  const am = avatar.userData.mask;
  am.base.color.set(base);
  am.trim.color.set(trim);
}
function buyMask(design, first) {
  maskState.owned = true;
  maskState.design = design;
  paintMask();
  $('#maskBtn').hidden = false;
  complete('mask');
  toast(
    first
      ? `You bought a máscara! Press ${touch ? 'the mask button' : 'K'} to put it on.`
      : 'Swapped it for another design. ¡Qué bonita!',
  );
}
function toggleMask() {
  if (!maskState.owned) {
    toast('Buy a mask at the merch stand in Arena México first.');
    return;
  }
  maskState.on = !maskState.on;
  document.body.classList.toggle('masked', maskState.on);
  avatar.userData.mask.group.visible = maskState.on;
  $('#maskBtn').classList.toggle('active', maskState.on);
  if (maskState.on) {
    complete('wear');
    toast('Mask on. You are now a luchador incógnito.');
  }
}
paintMask();

// ---------- input ----------
const state = { started: false, playing: false, locked: false, dragMode: touch, modal: false, traveling: false };
const keys = new Set();
const has = (c) => keys.has(c);
const joy = { x: 0, y: 0 };

function useAction() {
  if (!state.playing) return;
  if (player.seat) {
    if (player.seat.binoculars && focus) {
      focus.act(focusHit);
      sound.click();
    } else if (player.blend >= 1) player.stand();
    return;
  }
  if (focus) {
    focus.act(focusHit);
    sound.click();
  }
}

let nightTarget = 0;
let night = 0;
function toggleNight() {
  if (loc !== hotel) return;
  nightTarget = nightTarget ? 0 : 1;
  $('#dayNight').dataset.mode = nightTarget ? 'night' : 'day';
  $('#dayNight .label').textContent = nightTarget ? 'Day' : 'Night';
  toast(nightTarget ? 'The sun sets over the city…' : 'Good morning, Ciudad de México!', 2600);
}

window.addEventListener('keydown', (e) => {
  if (!state.playing) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    useAction();
  }
  if (e.code === 'KeyN') toggleNight();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyK') toggleMask();
  if (e.code === 'KeyG') travel();
  if (e.code === 'Digit1') travel('hotel');
  if (e.code === 'Digit2') travel('arena');
  if (e.code === 'Digit3') travel('aviary');
  if (e.code === 'Digit4') travel('pandas');
  if (e.code === 'KeyT') $('#tasks').classList.toggle('collapsed');
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function lock() {
  if (state.dragMode) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => (state.dragMode = true));
  } catch {
    state.dragMode = true;
  }
}
document.addEventListener('pointerlockchange', () => {
  state.locked = document.pointerLockElement === canvas;
  document.body.classList.toggle('locked', state.locked);
  if (!state.locked && state.playing && !state.dragMode && !state.modal) pause();
});
document.addEventListener('pointerlockerror', () => (state.dragMode = true));
document.addEventListener('mousemove', (e) => {
  const zoom = camera.fov / 70;
  if (state.locked) player.look(e.movementX * 0.0021 * zoom, e.movementY * 0.0021 * zoom);
});
canvas.addEventListener('mousedown', (e) => {
  if (state.locked && e.button === 0) useAction();
});

// Drag to look (touch, or mouse when pointer lock isn't available).
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (state.locked || !state.playing) return;
  if (!state.dragMode && e.pointerType === 'mouse') {
    lock();
    return;
  }
  if (drag) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  const k = (e.pointerType === 'touch' ? 0.0055 : 0.004) * (camera.fov / 70);
  player.look(dx * k, dy * k);
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.moved < 8 && performance.now() - drag.t < 350) useAction();
  drag = null;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// Thumb joystick.
const joyEl = $('#joy');
const knob = $('#joy .knob');
let joyId = null;
function joyMove(e) {
  const r = joyEl.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > 1) {
    dx /= l;
    dy /= l;
  }
  joy.x = dx;
  joy.y = -dy;
  knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
}
joyEl.addEventListener('pointerdown', (e) => {
  joyId = e.pointerId;
  joyEl.setPointerCapture(e.pointerId);
  joyMove(e);
});
joyEl.addEventListener('pointermove', (e) => e.pointerId === joyId && joyMove(e));
const joyEnd = (e) => {
  if (e.pointerId !== joyId) return;
  joyId = null;
  joy.x = joy.y = 0;
  knob.style.transform = '';
};
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);
$('#useBtn').addEventListener('click', useAction);

// ---------- buttons + overlays ----------
$('#dayNight').addEventListener('click', toggleNight);
function toggleMute() {
  const muted = sound.toggleMute();
  $('#muteBtn').dataset.muted = muted ? '1' : '0';
  $('#muteBtn').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
}
$('#muteBtn').addEventListener('click', toggleMute);
$('#maskBtn').addEventListener('click', toggleMask);
document.querySelectorAll('#destBtns .dest').forEach((b) => b.addEventListener('click', () => travel(b.dataset.place)));
$('#tasksToggle').addEventListener('click', () => $('#tasks').classList.toggle('collapsed'));
if (touch || window.innerWidth < 700) $('#tasks').classList.add('collapsed');

function show(id, on) {
  $(id).classList.toggle('hidden', !on);
}
function begin() {
  state.started = true;
  state.playing = true;
  show('#start', false);
  show('#pause', false);
  document.body.classList.add('playing');
  sound.start();
  lock();
  if (!state.welcomed) {
    state.welcomed = true;
    setTimeout(() => toast('Welcome to Hotel Jacaranda! Let some light in — open the curtains.'), 600);
  }
}
function pause() {
  state.playing = false;
  keys.clear();
  show('#pause', true);
}
$('#startBtn').addEventListener('click', begin);
$('#resumeBtn').addEventListener('click', begin);
document.querySelectorAll('#pauseDest .dest').forEach((b) =>
  b.addEventListener('click', () => {
    begin();
    travel(b.dataset.place);
  }),
);
$('#pauseBtn').addEventListener('click', () => {
  if (document.pointerLockElement) document.exitPointerLock();
  else pause();
});

const DONE_TEXT = {
  hotel: {
    eyebrow: 'All settled in',
    title: '¡Bienvenidos a la Ciudad de México!',
    lede: 'You’ve unpacked, seen the view, and watched the city light up. Enjoy your stay at Hotel Jacaranda.',
  },
  arena: {
    eyebrow: '¡Lu-cha! ¡Lu-cha!',
    title: '¡Eres un aficionado de verdad!',
    lede: 'You rang the bell, flew off the top rope and packed the cathedral of lucha libre. The luchadores arrive soon…',
  },
  aviary: {
    eyebrow: '¡Qué bonito!',
    title: 'You’re a true bird spotter!',
    lede: 'You walked the whole trail, fed the emus, rheas and macaws, called to the swans, chatted with a parrot and saw a peacock show off. The birds of Chapultepec say ¡hasta pronto!',
  },
  pandas: {
    eyebrow: '¡Qué ternura!',
    title: 'You’re a true panda pal!',
    lede: 'You watched Xin Xin munch her bamboo and doze off for a nap, and you took home a plushie and a panda coin to remember her by. ¡Hasta pronto, Xin Xin!',
  },
};
function celebrate(place) {
  if (place !== loc) return;
  const t = DONE_TEXT[place.id];
  $('#done .eyebrow').textContent = t.eyebrow;
  $('#done h2').textContent = t.title;
  $('#done .lede').textContent = t.lede;
  state.modal = true;
  if (document.pointerLockElement) document.exitPointerLock();
  state.playing = false;
  keys.clear();
  show('#done', true);
}
$('#keepBtn').addEventListener('click', () => {
  state.modal = false;
  show('#done', false);
  begin();
});

// ---------- travel between the hotel and the arena ----------
const fadeEl = $('#fade');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function syncPlaceUI() {
  for (const p of PLACES) document.body.classList.toggle(`in-${p.id}`, loc === p);
  // One button for every place you're not in.
  document.querySelectorAll('.dest').forEach((b) => {
    const p = PLACES.find((q) => q.id === b.dataset.place);
    b.hidden = p === loc;
    b.querySelector('.label').textContent = p.goLabel;
  });
  renderTasks();
}
async function travel(destId) {
  if (state.traveling || !state.started) return;
  const dest = destId ? PLACES.find((p) => p.id === destId) : PLACES[(PLACES.indexOf(loc) + 1) % PLACES.length];
  if (!dest || dest === loc) return;
  state.traveling = true;
  $('#fade .place').textContent = dest.title;
  $('#fade .sub').textContent = dest.sub;
  fadeEl.classList.add('show');
  await wait(650);
  arrive(dest);
  await wait(250);
  fadeEl.classList.remove('show');
  state.traveling = false;
  if (loc === arena && !arena.visited) {
    arena.visited = true;
    setTimeout(() => toast('¡Bienvenidos a la Arena México, the cathedral of lucha libre! The luchadores haven’t arrived yet.', 5200), 500);
  }
  if (loc === aviary && !aviary.visited) {
    aviary.visited = true;
    setTimeout(() => toast('¡Bienvenidos! Follow the forest trail past aviaries, paddocks and ponds — peacocks first, on your left.', 5200), 500);
  }
  if (loc === pandas && !pandas.visited) {
    pandas.visited = true;
    setTimeout(() => toast('¡Bienvenidos al Pabellón del Panda! Walk through the red gate to meet Xin Xin, Chapultepec’s giant panda.', 5200), 500);
  }
}
// Swap the world over to another place (while the screen is faded out).
function arrive(dest) {
  loc.saved = { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch };
  loc.exit();
  dest.enter();
  loc = dest;
  player.colliders = loc.colliders;
  player.floorAt = loc.floorAt;
  player.limit = loc.limit || null;
  player.place(loc.saved || loc.spawn);
  sound.setScene(loc.id);
  syncPlaceUI();
  arenaWorld.dirty = true;
  aviaryWorld.dirty = true;
  pandaWorld.dirty = true;
  room.dirty = true;
  // Build the new place's shaders while the screen is still dark.
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
}

// ---------- interaction focus ----------
const ray = new THREE.Raycaster();
ray.far = 2.5;
const birdRay = new THREE.Raycaster();
birdRay.far = 200;
const center = new THREE.Vector2(0, 0);
let focus = null;
let focusHit = null;
const promptEl = $('#prompt');
const promptText = $('#prompt .text');
const useBtn = $('#useBtn');
let lastPrompt = '';
function updateFocus() {
  focus = null;
  focusHit = null;
  let text = '';
  if (player.seat && player.seat.binoculars) {
    text = touch ? 'Point at a bird and tap · Move to step away' : 'Point at a bird and press E · Move to step away';
    if (player.blend >= 1 && loc === aviary) {
      camera.updateMatrixWorld();
      birdRay.setFromCamera(center, camera);
      const hit = birdRay.intersectObject(aviaryWorld.birds, true)[0];
      const key = hit && hit.object.userData.species;
      if (key) {
        focus = { act: () => aviaryWorld.identify(key) };
        focusHit = hit;
        text = `${BIRDS[key].name} · ${BIRDS[key].es}`;
      }
    }
  } else if (player.seat && player.seat.photo) {
    text = '¡Sonríe! Say “queso”…';
  } else if (player.seat) {
    text = player.seat.arc ? (touch ? 'Move the joystick to jump' : 'Move or press E to jump!') : touch ? 'Move the joystick to get up' : 'Move or press E to get up';
  } else if (player.blend >= 1) {
    camera.updateMatrixWorld();
    ray.setFromCamera(center, camera);
    const hit = ray.intersectObject(loc.root, true)[0];
    let o = hit && hit.object;
    while (o && !o.userData.interact) o = o.parent;
    if (o) {
      const label = o.userData.interact.label(hit);
      if (label) {
        focus = o.userData.interact;
        focusHit = hit;
        text = label;
      }
    }
  }
  if (text !== lastPrompt) {
    lastPrompt = text;
    promptText.textContent = text;
    promptEl.classList.toggle('show', !!text);
    promptEl.classList.toggle('seated', !!player.seat);
    useBtn.classList.toggle('ready', !!focus || (!!player.seat && !player.seat.binoculars));
    document.body.classList.toggle('has-focus', !!focus);
  }
}

// ---------- loop ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = fovFor(camera.aspect);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let idleT = 0;
let simT = 0;
renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.05)));

const tapSpot = new THREE.Vector3(-3.2, 1, 1.9);
const showerSpot = new THREE.Vector3(-3, 1.2, 3.4);
function frame(dt, draw = true) {
  simT += dt;
  const t = simT;

  if (state.playing && !state.traveling) {
    const f = (has('KeyW') || has('ArrowUp') ? 1 : 0) - (has('KeyS') || has('ArrowDown') ? 1 : 0);
    const s = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
    player.move.x = s + joy.x;
    player.move.y = f + joy.y;
    player.run = has('ShiftLeft') || has('ShiftRight') || Math.hypot(joy.x, joy.y) > 0.97;
  } else {
    player.move.x = player.move.y = 0;
    if (!state.started) {
      // Gentle look-around behind the title card.
      idleT += dt;
      player.yaw = 0.2 + Math.sin(idleT * 0.15) * 0.35;
      player.pitch = -0.04 + Math.sin(idleT * 0.11) * 0.05;
    }
  }
  player.update(dt);
  avatar.visible = !player.seat && loc === hotel;
  avatar.position.set(player.pos.x, 0, player.pos.z);
  avatar.rotation.y = player.yaw;

  if (state.playing) updateFocus();
  night += THREE.MathUtils.clamp(nightTarget - night, -dt * 0.45, dt * 0.45);

  if (loc === hotel) {
    room.update(dt);
    world.update(dt, t);
    world.setNight(night);
    if (night > 0.97) complete('night');
    if (camera.position.z < -5.4) complete('balcony');
    const st = room.state;
    sound.set({
      open: st.balconyDoor.k,
      outside: THREE.MathUtils.clamp((-5 - camera.position.z) / 1.4, 0, 1),
      water:
        (st.tap.on ? 0.4 : 0) * Math.max(0, 1 - camera.position.distanceTo(tapSpot) / 4) +
        (st.shower.on ? 1 : 0) * Math.max(0, 1 - camera.position.distanceTo(showerSpot) / 5),
      night,
    });
    // Shadows are baked on demand: only when a door or curtain moves.
    if (room.dirty) {
      room.dirty = false;
      world.sun.shadow.needsUpdate = true;
      room.shadowLights[0].shadow.needsUpdate = true;
    }
  } else if (loc === arena) {
    arenaWorld.update(dt, t);
    sound.arena(arenaWorld.state);
    if (arenaWorld.dirty) {
      arenaWorld.dirty = false;
      for (const l of arenaWorld.shadowLights) l.shadow.needsUpdate = true;
    }
  } else if (loc === pandas) {
    pandaWorld.update(dt, t);
    sound.aviary(pandaWorld.state);
    if (pandaWorld.dirty) {
      pandaWorld.dirty = false;
      for (const l of pandaWorld.shadowLights) l.shadow.needsUpdate = true;
    }
  } else {
    aviaryWorld.update(dt, t);
    sound.aviary(aviaryWorld.state);
    if (aviaryWorld.dirty) {
      aviaryWorld.dirty = false;
      for (const l of aviaryWorld.shadowLights) l.shadow.needsUpdate = true;
    }
  }

  // Binoculars zoom the camera in.
  const binoc = !!(player.seat && player.seat.binoculars);
  const wantFov = binoc && player.blend > 0.5 ? 16 : fovFor(camera.aspect);
  if (Math.abs(camera.fov - wantFov) > 0.01) {
    camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-dt * 8));
    camera.updateProjectionMatrix();
  }
  document.body.classList.toggle('binoc', binoc && player.blend > 0.5);
  // The photo spot: once the camera has settled, snap the picture.
  if (player.seat && player.seat.photo && player.blend >= 1 && !player.seat.shot) {
    player.seat.shot = true;
    takePhoto();
    setTimeout(() => {
      if (player.seat && player.seat.photo) player.stand();
    }, 1600);
  }

  if (draw) renderer.render(scene, camera);
}

// Show the souvenir coin you just pressed.
function showCoin(url, caption) {
  $('#coinImg').src = url;
  $('#coinCard figcaption').textContent = caption;
  $('#coinCard').classList.remove('show');
  void $('#coinCard').offsetWidth;
  $('#coinCard').classList.add('show');
  clearTimeout(showCoin.timer);
  showCoin.timer = setTimeout(() => $('#coinCard').classList.remove('show'), 5500);
}

// Snap the current view (without the HUD) into a little polaroid.
function takePhoto() {
  const seat = player.seat || {};
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  $('#photoImg').src = url;
  $('#photoCard figcaption').textContent = seat.caption || 'Aviario · Chapultepec';
  $('#photoCard').classList.remove('show');
  void $('#photoCard').offsetWidth;
  $('#photoCard').classList.add('show');
  $('#flash').classList.remove('go');
  void $('#flash').offsetWidth;
  $('#flash').classList.add('go');
  sound.shutter();
  complete(seat.task || 'photo');
  clearTimeout(takePhoto.timer);
  takePhoto.timer = setTimeout(() => $('#photoCard').classList.remove('show'), 5500);
}

// Open with ?debug to poke at the game from the browser console.
if (new URLSearchParams(location.search).has('debug')) {
  window.hotel = {
    player, room, world, arena: arenaWorld, aviary: aviaryWorld, pandas: pandaWorld, camera, renderer, scene, toggleNight, toggleMask, travel, complete, useAction, state,
    get loc() { return loc.id; },
    // Go somewhere instantly, without the fade (handy when timers are slow).
    jump(id) { if (id !== loc.id) arrive(PLACES.find((p) => p.id === id)); },
    get focus() { return focus; },
    // Advance the game by `seconds` without waiting for the browser to draw.
    step(seconds = 0.5) {
      const n = Math.ceil(seconds * 60);
      for (let i = 0; i < n; i++) frame(1 / 60, i === n - 1);
    },
  };
}

syncPlaceUI();
$('#startBtn').disabled = false;
$('#startBtn').textContent = 'Enter room 1207';
document.body.classList.add('ready');
