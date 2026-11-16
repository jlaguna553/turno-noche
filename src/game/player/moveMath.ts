/**
 * Modelo de movimiento estilo Source, sin dependencias de three ni Rapier.
 * Puro y testeable: friccion + accelerate proyectado sobre la direccion deseada.
 */

export interface Vel2 {
  x: number;
  z: number;
}

export function applyFriction(vel: Vel2, dt: number, friction: number, stopSpeed: number): void {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 0.0001) {
    vel.x = 0;
    vel.z = 0;
    return;
  }
  const control = speed < stopSpeed ? stopSpeed : speed;
  const drop = control * friction * dt;
  const scale = Math.max(0, speed - drop) / speed;
  vel.x *= scale;
  vel.z *= scale;
}

export function accelerate(
  vel: Vel2,
  wishX: number,
  wishZ: number,
  wishSpeed: number,
  accel: number,
  dt: number,
): void {
  const current = vel.x * wishX + vel.z * wishZ;
  const addSpeed = wishSpeed - current;
  if (addSpeed <= 0) return;
  const accelSpeed = Math.min(accel * wishSpeed * dt, addSpeed);
  vel.x += wishX * accelSpeed;
  vel.z += wishZ * accelSpeed;
}

/** Normaliza el input de teclado y lo rota al espacio del jugador. */
export function wishDirection(
  forward: number,
  right: number,
  yaw: number,
): { x: number; z: number; magnitude: number } {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  let x = forward * -sin + right * cos;
  let z = forward * -cos + right * -sin;
  const magnitude = Math.hypot(x, z);
  if (magnitude > 1) {
    x /= magnitude;
    z /= magnitude;
    return { x, z, magnitude: 1 };
  }
  return { x, z, magnitude };
}

export function clampSpeed(vel: Vel2, maxSpeed: number): void {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed <= maxSpeed || speed < 0.0001) return;
  const scale = maxSpeed / speed;
  vel.x *= scale;
  vel.z *= scale;
}
