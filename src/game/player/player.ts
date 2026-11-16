import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PLAYER, PLAYER_GROUPS } from '../core/config';
import type { Physics } from '../physics/physics';
import type { Input } from '../core/input';
import { accelerate, applyFriction, clampSpeed, wishDirection, type Vel2 } from './moveMath';

/**
 * Controlador en primera persona estilo Source.
 *
 * - Capsula kinematic-position-based + KinematicCharacterController de Rapier
 *   (autostep, snap-to-ground, pendientes).
 * - Friccion + accelerate de Source para el "feel".
 * - Crouch con cambio real de collider y bloqueo de "levantarse" bajo techo.
 */
export class PlayerController {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;

  yaw: number;
  pitch = 0;
  lookScale = 1;
  invertY = false;
  grounded = false;
  sprinting = false;
  crouched = false;

  eye = new THREE.Vector3();
  private prevEye = new THREE.Vector3();
  private vel: Vel2 = { x: 0, z: 0 };
  private velY = 0;
  private halfHeight = (PLAYER.standHeight - PLAYER.radius * 2) / 2;
  private bobPhase = 0;
  private roll = 0;
  private landing = 0;
  private wasGrounded = true;
  private blocked = false;

  private readonly tmp = new THREE.Vector3();

  constructor(physics: Physics, spawn: { x: number; y: number; z: number; yaw: number }) {
    this.yaw = spawn.yaw;
    const centerY = spawn.y + this.halfHeight + PLAYER.radius;
    this.body = physics.w.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, centerY, spawn.z),
    );
    this.collider = physics.w.createCollider(
      RAPIER.ColliderDesc.capsule(this.halfHeight, PLAYER.radius)
        .setFriction(0)
        .setRestitution(0)
        .setCollisionGroups(PLAYER_GROUPS),
      this.body,
    );

    this.controller = physics.w.createCharacterController(0.02);
    this.controller.enableAutostep(PLAYER.stepHeight, 0.22, true);
    this.controller.enableSnapToGround(PLAYER.snapToGround);
    this.controller.setMaxSlopeClimbAngle((PLAYER.maxSlopeDeg * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((32 * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(82);
    this.controller.setSlideEnabled(true);

    this.eye.set(spawn.x, centerY + this.eyeOffset(), spawn.z);
    this.prevEye.copy(this.eye);
  }

  private eyeOffset(): number {
    return this.halfHeight + PLAYER.radius - PLAYER.eyeDrop;
  }

  setBlocked(value: boolean): void {
    this.blocked = value;
    if (value) {
      this.vel.x = 0;
      this.vel.z = 0;
    }
  }

  setLook(scale: number, invertY: boolean): void {
    this.lookScale = Math.max(0.2, Math.min(3, scale));
    this.invertY = invertY;
  }

  handleLook(dx: number, dy: number): void {
    const sensitivity = PLAYER.mouseSensitivity * this.lookScale;
    this.yaw -= dx * sensitivity;
    this.pitch += dy * sensitivity * (this.invertY ? 1 : -1);
    const limit = PLAYER.pitchLimit;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }

  getForward(target: THREE.Vector3): THREE.Vector3 {
    const cosPitch = Math.cos(this.pitch);
    return target.set(-Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), -Math.cos(this.yaw) * cosPitch);
  }

  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  fixedUpdate(dt: number, input: Input, physics: Physics): void {
    const blocked = this.blocked;
    const forward = blocked ? 0 : input.moveForward();
    const strafe = blocked ? 0 : input.moveStrafe();
    const wantCrouch = !blocked && input.isDown('crouch');
    this.sprinting = !blocked && input.isDown('sprint') && forward > 0.3 && !wantCrouch;
    this.setCrouch(wantCrouch, physics);

    const wish = wishDirection(forward, strafe, this.yaw);
    const maxSpeed = this.crouched ? PLAYER.crouchSpeed : this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const wishSpeed = wish.magnitude * maxSpeed;

    if (this.grounded) applyFriction(this.vel, dt, PLAYER.friction, PLAYER.stopSpeed);
    if (wish.magnitude > 0.001) {
      if (this.grounded) {
        accelerate(this.vel, wish.x, wish.z, wishSpeed, PLAYER.groundAccel, dt);
      } else {
        accelerate(this.vel, wish.x, wish.z, Math.min(wishSpeed, PLAYER.airWishCap), PLAYER.airAccel, dt);
      }
    }
    clampSpeed(this.vel, PLAYER.sprintSpeed * 1.02);

    if (this.grounded && !blocked && input.consumePress('jump')) {
      this.velY = PLAYER.jumpSpeed;
      this.grounded = false;
    }
    this.velY -= PLAYER.gravity * dt;
    if (this.grounded && this.velY < 0) this.velY = -1.6;

    const desired = this.tmp.set(this.vel.x * dt, this.velY * dt, this.vel.z * dt);
    this.controller.computeColliderMovement(this.collider, { x: desired.x, y: desired.y, z: desired.z });
    const movement = this.controller.computedMovement();
    const position = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: position.y + movement.y,
      z: position.z + movement.z,
    });

    this.wasGrounded = this.grounded;
    this.grounded = this.controller.computedGrounded();

    if (this.grounded) {
      if (!this.wasGrounded && this.velY < -3) {
        this.landing = Math.min(1, Math.abs(this.velY) / 9);
      }
      this.velY = Math.max(this.velY, -2);
    } else if (desired.y > 0 && movement.y < desired.y * 0.35) {
      this.velY = Math.min(this.velY, 0);
    }

    if (Math.abs(movement.x) < Math.abs(desired.x) * 0.55) this.vel.x *= 0.35;
    if (Math.abs(movement.z) < Math.abs(desired.z) * 0.55) this.vel.z *= 0.35;

    if (this.grounded) {
      this.bobPhase += dt * Math.min(this.speed, PLAYER.sprintSpeed) * 1.7;
    }
    this.landing = Math.max(0, this.landing - dt * 3.4);
    const targetRoll = -strafe * 0.013;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 9);
  }

  private setCrouch(want: boolean, physics: Physics): void {
    if (want === this.crouched) return;
    if (!want && !this.canStand(physics)) return;

    const nextHalf = want
      ? (PLAYER.crouchHeight - PLAYER.radius * 2) / 2
      : (PLAYER.standHeight - PLAYER.radius * 2) / 2;
    const delta = nextHalf - this.halfHeight;
    this.halfHeight = nextHalf;
    this.collider.setHalfHeight(nextHalf);
    const position = this.body.translation();
    this.body.setTranslation({ x: position.x, y: position.y + delta, z: position.z }, true);
    this.crouched = want;
  }

  private canStand(physics: Physics): boolean {
    const position = this.body.translation();
    const origin = this.tmp.set(position.x, position.y, position.z);
    const hit = physics.castRay(origin, new THREE.Vector3(0, 1, 0), PLAYER.standHeight + 0.12, this.collider);
    return hit === null;
  }

  /** Coloca al jugador con los pies en `y`. */
  teleport(x: number, y: number, z: number): void {
    const centerY = y + this.halfHeight + PLAYER.radius;
    this.body.setTranslation({ x, y: centerY, z }, true);
    this.body.setNextKinematicTranslation({ x, y: centerY, z });
    this.vel.x = 0;
    this.vel.z = 0;
    this.velY = 0;
    this.eye.set(x, centerY + this.eyeOffset(), z);
    this.prevEye.copy(this.eye);
  }

  postStep(): void {
    const position = this.body.translation();
    this.prevEye.copy(this.eye);
    this.eye.set(position.x, position.y + this.eyeOffset(), position.z);
  }

  /** Interpolacion de posicion + bob + roll de camara. */
  applyCamera(camera: THREE.PerspectiveCamera, alpha: number): void {
    const bobStrength = Math.min(1, this.speed / PLAYER.walkSpeed);
    const bobY = Math.sin(this.bobPhase * 2) * 0.016 * bobStrength;
    const bobX = Math.cos(this.bobPhase) * 0.011 * bobStrength;

    camera.position.set(
      THREE.MathUtils.lerp(this.prevEye.x, this.eye.x, alpha) + bobX,
      THREE.MathUtils.lerp(this.prevEye.y, this.eye.y, alpha) + bobY - this.landing * 0.07,
      THREE.MathUtils.lerp(this.prevEye.z, this.eye.z, alpha),
    );
    camera.quaternion.setFromEuler(
      new THREE.Euler(this.pitch + this.landing * 0.025, this.yaw, this.roll, 'YXZ'),
    );
  }
}
