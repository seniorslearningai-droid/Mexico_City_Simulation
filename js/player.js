// First-person walker: a circle that slides along box colliders on the floor
// plan, plus a "seated" mode for chairs and the bed.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.pos = new THREE.Vector3(1.7, 0, 3.2);
    this.vel = new THREE.Vector2();
    this.yaw = 0.2;
    this.pitch = -0.04;
    this.radius = 0.26;
    this.eye = 1.62;
    this.move = { x: 0, y: 0 }; // strafe, forward in -1..1
    this.run = false;
    this.seat = null;
    this.blend = 1;
    this.from = null;
    this.bobT = 0;
    this.bobAmt = 0;
    this.releasedMove = true;
    this.push = new THREE.Vector2(); // extra velocity that fades out (rope bounces)
    this.arc = 0; // height of the hop during a blend (climbing, jumping)
    this.floorAt = () => 0; // ground height under (x, z): stairs, the ring
    this.target = new THREE.Vector3(this.pos.x, this.eye, this.pos.z);
    camera.rotation.order = 'YXZ';
    this.apply();
  }

  look(dx, dy) {
    this.yaw = wrapAngle(this.yaw - dx);
    this.pitch = clamp(this.pitch - dy, -1.45, 1.45);
  }

  snapshot() {
    return { p: this.camera.position.clone(), yaw: this.camera.rotation.y, pitch: this.camera.rotation.x };
  }

  sit(seat) {
    this.from = this.snapshot();
    this.blend = 0;
    this.arc = 0;
    this.push.set(0, 0);
    this.seat = { ...seat, back: this.pos.clone() };
    this.yaw = seat.yaw;
    this.pitch = seat.pitch ?? 0;
    this.vel.set(0, 0);
    this.releasedMove = Math.hypot(this.move.x, this.move.y) < 0.1;
  }

  stand() {
    if (!this.seat) return;
    this.from = this.snapshot();
    this.blend = 0;
    this.arc = this.seat.arc || 0;
    this.pos.copy(this.seat.back);
    this.seat = null;
  }

  // Move somewhere else with a short animated hop (into or out of the ring).
  warp({ x, z, yaw, pitch = 0, arc = 0 }) {
    this.from = this.snapshot();
    this.blend = 0;
    this.arc = arc;
    this.seat = null;
    this.pos.set(x, this.floorAt(x, z), z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0);
    this.push.set(0, 0);
  }

  // Jump straight to a spot with no animation (arriving at a new place).
  place({ x, z, yaw, pitch = 0 }) {
    this.seat = null;
    this.blend = 1;
    this.arc = 0;
    this.pos.set(x, this.floorAt(x, z), z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0);
    this.push.set(0, 0);
    this.bobAmt = 0;
    this.target.set(x, this.pos.y + this.eye, z);
    this.apply();
  }

  update(dt) {
    const moving = Math.hypot(this.move.x, this.move.y) > 0.3;
    if (this.seat) {
      if (!moving) this.releasedMove = true;
      if (moving && this.releasedMove && this.blend >= 1) this.stand();
    }
    if (!this.seat) this.walk(dt);

    if (this.seat) this.target.copy(this.seat.eye);
    else this.target.set(this.pos.x, this.pos.y + this.eye + Math.sin(this.bobT * 2) * 0.022 * this.bobAmt, this.pos.z);

    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 0.6);
      const e = ease(this.blend);
      this.camera.position.lerpVectors(this.from.p, this.target, e);
      this.camera.position.y += Math.sin(Math.PI * e) * this.arc;
      this.camera.rotation.y = this.from.yaw + wrapAngle(this.yaw - this.from.yaw) * e;
      this.camera.rotation.x = this.from.pitch + (this.pitch - this.from.pitch) * e;
    } else {
      this.apply();
    }
  }

  apply() {
    this.camera.position.copy(this.seat ? this.seat.eye : this.target);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  walk(dt) {
    const f = this.move.y;
    const s = this.move.x;
    const len = Math.hypot(f, s);
    const speed = this.run ? 3.4 : 1.9;
    let tx = 0;
    let tz = 0;
    if (len > 0.05) {
      const k = Math.min(1, len) / len;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      tx = (-sin * f + cos * s) * k * speed;
      tz = (-cos * f - sin * s) * k * speed;
    }
    const a = 1 - Math.exp(-dt * 11);
    this.vel.x += (tx - this.vel.x) * a;
    this.vel.y += (tz - this.vel.y) * a;
    const vx = this.vel.x + this.push.x;
    const vz = this.vel.y + this.push.y;
    this.push.multiplyScalar(Math.exp(-dt * 2.4));
    const dist = Math.hypot(vx, vz) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.05));
    for (let i = 0; i < steps; i++) {
      this.pos.x += (vx * dt) / steps;
      this.pos.z += (vz * dt) / steps;
      this.collide();
    }
    // Ease up and down stairs instead of snapping.
    const fy = this.floorAt(this.pos.x, this.pos.z);
    this.pos.y += (fy - this.pos.y) * (1 - Math.exp(-dt * 14));
    const sp = Math.hypot(this.vel.x, this.vel.y);
    this.bobT += sp * dt * 3.3;
    this.bobAmt += (Math.min(1, sp / 1.8) - this.bobAmt) * a;
  }

  collide() {
    const r = this.radius;
    const p = this.pos;
    for (let iter = 0; iter < 3; iter++) {
      let hit = false;
      for (const c of this.colliders) {
        if (c.off) continue;
        const cx = clamp(p.x, c.x0, c.x1);
        const cz = clamp(p.z, c.z0, c.z1);
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        hit = true;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r;
          p.z = cz + (dz / d) * r;
        } else {
          // Centre is inside the box: leave by the nearest side.
          const pen = [p.x - c.x0, c.x1 - p.x, p.z - c.z0, c.z1 - p.z];
          const i = pen.indexOf(Math.min(...pen));
          if (i === 0) p.x = c.x0 - r;
          else if (i === 1) p.x = c.x1 + r;
          else if (i === 2) p.z = c.z0 - r;
          else p.z = c.z1 + r;
        }
      }
      if (!hit) break;
    }
  }
}
