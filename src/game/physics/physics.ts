import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PHYSICS, PROP_GROUPS, WORLD_GROUPS } from '../core/config';

export interface RayHit {
  distance: number;
  point: THREE.Vector3;
  collider: RAPIER.Collider;
}

export interface BoxOptions {
  center: THREE.Vector3;
  halfExtents: THREE.Vector3;
  rotationY?: number;
  type?: 'fixed' | 'dynamic';
  mass?: number;
  friction?: number;
  restitution?: number;
  groups?: number;
  linearDamping?: number;
  angularDamping?: number;
  ccd?: boolean;
}

export interface BodyPair {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

/**
 * Envoltorio fino de Rapier: un solo cuerpo fijo para toda la geometria
 * estatica (mucho menos overhead que un cuerpo por pared) y helpers de raycast.
 */
export class Physics {
  private world: RAPIER.World | null = null;
  private staticBody: RAPIER.RigidBody | null = null;

  async init(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: PHYSICS.gravity, z: 0 });
    this.world.timestep = PHYSICS.step;
    this.world.integrationParameters.numSolverIterations = 4;
    this.staticBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  }

  get ready(): boolean {
    return this.world !== null;
  }

  get w(): RAPIER.World {
    if (!this.world) throw new Error('Physics.init() no fue llamado');
    return this.world;
  }

  get static(): RAPIER.RigidBody {
    if (!this.staticBody) throw new Error('Physics.init() no fue llamado');
    return this.staticBody;
  }

  step(): void {
    this.w.step();
  }

  addStaticBox(options: BoxOptions): RAPIER.Collider {
    const collider = RAPIER.ColliderDesc.cuboid(
      options.halfExtents.x,
      options.halfExtents.y,
      options.halfExtents.z,
    )
      .setTranslation(options.center.x, options.center.y, options.center.z)
      .setFriction(options.friction ?? 0.85)
      .setRestitution(options.restitution ?? 0)
      .setCollisionGroups(options.groups ?? WORLD_GROUPS);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      options.rotationY ?? 0,
    );
    collider.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
    return this.w.createCollider(collider, this.static);
  }

  /** Cuerpo dinamico con collider cubico (cajas, barriles, cuerpos). */
  addBoxBody(options: BoxOptions): BodyPair {
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      options.rotationY ?? 0,
    );
    const body = this.w.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(options.center.x, options.center.y, options.center.z)
        .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
        .setLinearDamping(options.linearDamping ?? 0.35)
        .setAngularDamping(options.angularDamping ?? 0.8)
        .setCcdEnabled(options.ccd ?? true),
    );
    const collider = this.w.createCollider(
      RAPIER.ColliderDesc.cuboid(options.halfExtents.x, options.halfExtents.y, options.halfExtents.z)
        .setMass(options.mass ?? 12)
        .setFriction(options.friction ?? 0.7)
        .setRestitution(options.restitution ?? 0.05)
        .setCollisionGroups(options.groups ?? PROP_GROUPS),
      body,
    );
    return { body, collider };
  }

  addCylinderBody(center: THREE.Vector3, radius: number, halfHeight: number, mass: number): BodyPair {
    const body = this.w.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(center.x, center.y, center.z)
        .setAngularDamping(1.2)
        .setLinearDamping(0.3)
        .setCcdEnabled(true),
    );
    const collider = this.w.createCollider(
      RAPIER.ColliderDesc.cylinder(halfHeight, radius)
        .setMass(mass)
        .setFriction(0.6)
        .setRestitution(0.1)
        .setCollisionGroups(PROP_GROUPS),
      body,
    );
    return { body, collider };
  }

  castRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    excludeCollider?: RAPIER.Collider | null,
    excludeBody?: RAPIER.RigidBody | null,
  ): RayHit | null {
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z },
    );
    const hit = this.w.castRay(
      ray,
      maxDistance,
      true,
      undefined,
      undefined,
      excludeCollider ?? undefined,
      excludeBody ?? undefined,
    );
    if (!hit) return null;
    const distance = hit.timeOfImpact;
    return {
      distance,
      point: origin.clone().addScaledVector(direction, distance),
      collider: hit.collider,
    };
  }

  castRayFiltered(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    predicate: (collider: RAPIER.Collider) => boolean,
    excludeCollider?: RAPIER.Collider | null,
  ): RayHit | null {
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z },
    );
    const hit = this.w.castRay(
      ray,
      maxDistance,
      true,
      undefined,
      undefined,
      excludeCollider ?? undefined,
      undefined,
      predicate,
    );
    if (!hit) return null;
    const distance = hit.timeOfImpact;
    return {
      distance,
      point: origin.clone().addScaledVector(direction, distance),
      collider: hit.collider,
    };
  }
}
