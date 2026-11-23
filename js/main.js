import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRoom } from './room.js';
import { buildWorld } from './city.js';
import { Player } from './player.js';
import { Sound } from './audio.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', touch);

const TASKS = [
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

const done = new Set();
const taskList = $('#taskList');
function renderTasks(flashId) {
  taskList.innerHTML = TASKS.map(
    ([id, label]) => `<li class="${done.has(id) ? 'done' : ''} ${id === flashId ? 'flash' : ''}"><span class="tick" aria-hidden="true"></span>${label}</li>`,
  ).join('');
  $('#taskCount').textContent = `${done.size}/${TASKS.length}`;
  $('#tasks').classList.toggle('all-done', done.size === TASKS.length);
}
renderTasks();

const sound = new Sound();
function complete(id) {
  if (done.has(id)) return;
  done.add(id);
  renderTasks(id);
  sound.chime();
  if (done.size === TASKS.length) setTimeout(celebrate, 1600);
}

// ---------- world ----------
const world = buildWorld(scene);
let player;
const room = buildRoom({
  toast,
  complete,
  sit: (seat) => player.sit(seat),
});
scene.add(room.group);
room.group.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = !o.userData.noShadow && !(o.material && o.material.transparent);
  o.receiveShadow = true;
});
room.mirror.castShadow = false;
room.mirror.receiveShadow = false;

player = new Player(camera, room.colliders);

// A simple traveller who only shows up in the bathroom mirror (layer 1).
const avatar = makeAvatar();
scene.add(avatar);
room.mirror.camera.layers.enable(1);

function makeAvatar() {
  const g = new THREE.Group();
  const m = (color, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const skin = m(0xc58b62, 0.6);
  const shirt = m(0xf3efe6, 0.9);
  const pants = m(0x2f3b57);
  const add = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
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
  g.traverse((o) => o.layers.set(1));
  return g;
}

// ---------- input ----------
const state = { started: false, playing: false, locked: false, dragMode: touch, modal: false };
const keys = new Set();
const has = (c) => keys.has(c);
const joy = { x: 0, y: 0 };

function useAction() {
  if (!state.playing) return;
  if (player.seat) {
    if (player.blend >= 1) player.stand();
    return;
  }
  if (focus) {
    focus.act();
    sound.click();
  }
}

let nightTarget = 0;
let night = 0;
function toggleNight() {
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
  if (state.locked) player.look(e.movementX * 0.0021, e.movementY * 0.0021);
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
  const k = e.pointerType === 'touch' ? 0.0055 : 0.004;
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
$('#pauseBtn').addEventListener('click', () => {
  if (document.pointerLockElement) document.exitPointerLock();
  else pause();
});

function celebrate() {
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

// ---------- interaction focus ----------
const ray = new THREE.Raycaster();
ray.far = 2.5;
const center = new THREE.Vector2(0, 0);
let focus = null;
const promptEl = $('#prompt');
const promptText = $('#prompt .text');
const useBtn = $('#useBtn');
let lastPrompt = '';
function updateFocus() {
  focus = null;
  let text = '';
  if (player.seat) {
    text = touch ? 'Move the joystick to get up' : 'Move or press E to get up';
  } else {
    camera.updateMatrixWorld();
    ray.setFromCamera(center, camera);
    const hit = ray.intersectObject(room.group, true)[0];
    let o = hit && hit.object;
    while (o && !o.userData.interact) o = o.parent;
    if (o) {
      focus = o.userData.interact;
      text = focus.label();
    }
  }
  if (text !== lastPrompt) {
    lastPrompt = text;
    promptText.textContent = text;
    promptEl.classList.toggle('show', !!text);
    promptEl.classList.toggle('seated', !!player.seat);
    useBtn.classList.toggle('ready', !!focus || !!player.seat);
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

function frame(dt, draw = true) {
  simT += dt;
  const t = simT;

  if (state.playing) {
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
  avatar.visible = !player.seat;
  avatar.position.set(player.pos.x, 0, player.pos.z);
  avatar.rotation.y = player.yaw;

  if (state.playing) updateFocus();
  room.update(dt);
  world.update(dt, t);

  night += THREE.MathUtils.clamp(nightTarget - night, -dt * 0.45, dt * 0.45);
  world.setNight(night);
  if (night > 0.97) complete('night');
  if (camera.position.z < -5.4) complete('balcony');

  const st = room.state;
  sound.set({
    open: st.balconyDoor.k,
    outside: THREE.MathUtils.clamp((-5 - camera.position.z) / 1.4, 0, 1),
    water: (st.tap.on ? 0.4 : 0) * Math.max(0, 1 - camera.position.distanceTo(new THREE.Vector3(-3.2, 1, 1.9)) / 4) +
      (st.shower.on ? 1 : 0) * Math.max(0, 1 - camera.position.distanceTo(new THREE.Vector3(-3, 1.2, 3.4)) / 5),
    night,
  });

  // Shadows are baked on demand: only when a door or curtain moves.
  if (room.dirty) {
    room.dirty = false;
    world.sun.shadow.needsUpdate = true;
    room.shadowLights[0].shadow.needsUpdate = true;
  }

  if (draw) renderer.render(scene, camera);
}

// Open with ?debug to poke at the game from the browser console.
if (new URLSearchParams(location.search).has('debug')) {
  window.hotel = {
    player, room, world, camera, renderer, scene, toggleNight, complete, useAction, state,
    get focus() { return focus; },
    // Advance the game by `seconds` without waiting for the browser to draw.
    step(seconds = 0.5) {
      const n = Math.ceil(seconds * 60);
      for (let i = 0; i < n; i++) frame(1 / 60, i === n - 1);
    },
  };
}

$('#startBtn').disabled = false;
$('#startBtn').textContent = 'Enter room 1207';
document.body.classList.add('ready');
