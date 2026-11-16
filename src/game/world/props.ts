import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../physics/physics';
import type { MaterialSet } from '../render/materials';
import { mulberry32 } from '../core/rng';
import type { BreakerId, FocusKind } from '../core/bus';
import type { PropSpec } from './layout';

export interface PropContext {
  scene: THREE.Scene;
  physics: Physics;
  materials: MaterialSet;
}

/** Entidad interactuable: el registro mapea collider -> entidad. */
export interface EntityInit {
  id: string;
  kind: FocusKind;
  label: string;
  prompt: string;
  root: THREE.Object3D;
  collider?: RAPIER.Collider;
  body?: RAPIER.RigidBody;
  enabled?: boolean;
  onUse?: () => void;
}

export class Entity {
  readonly id: string;
  readonly kind: FocusKind;
  readonly root: THREE.Object3D;
  readonly collider?: RAPIER.Collider;
  readonly body?: RAPIER.RigidBody;
  label: string;
  prompt: string;
  enabled: boolean;
  onUse?: () => void;

  constructor(init: EntityInit) {
    this.id = init.id;
    this.kind = init.kind;
    this.label = init.label;
    this.prompt = init.prompt;
    this.root = init.root;
    this.collider = init.collider;
    this.body = init.body;
    this.enabled = init.enabled ?? true;
    this.onUse = init.onUse;
  }
}

export class EntityRegistry {
  private byCollider = new Map<RAPIER.Collider, Entity>();
  private byId = new Map<string, Entity>();

  add(entity: Entity): Entity {
    if (entity.collider) this.byCollider.set(entity.collider, entity);
    this.byId.set(entity.id, entity);
    return entity;
  }

  fromCollider(collider: RAPIER.Collider): Entity | undefined {
    return this.byCollider.get(collider);
  }

  byEntityId(id: string): Entity | undefined {
    return this.byId.get(id);
  }

  all(): Entity[] {
    return [...this.byId.values()];
  }
}

function shadow(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addStatic(
  ctx: PropContext,
  mesh: THREE.Object3D,
  center: THREE.Vector3,
  halfExtents: THREE.Vector3,
  rotationY = 0,
): RAPIER.Collider {
  ctx.scene.add(mesh);
  return ctx.physics.addStaticBox({ center, halfExtents, rotationY, friction: 0.9 });
}

// ---------------------------------------------------------------- actores

export interface LightActor {
  group: THREE.Group;
  light: THREE.PointLight;
  fixture: THREE.Mesh;
  baseIntensity: number;
  baseColor: number;
  flicker: number;
  scare: number;
  broken: boolean;
  emergency: boolean;
  power: boolean;
  update(dt: number, elapsed: number): void;
}

export interface LightOptions {
  id: string;
  x: number;
  y: number;
  z: number;
  intensity: number;
  color: number;
  flicker?: number;
  broken?: boolean;
}

export function createLight(ctx: PropContext, options: LightOptions): LightActor {
  const group = new THREE.Group();
  group.position.set(options.x, options.y, options.z);

  const fixtureMaterial = ctx.materials.materials.lamp.clone();
  const fixture = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.34), fixtureMaterial));
  group.add(fixture);

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.16, 0.46),
    ctx.materials.materials.rust,
  );
  housing.position.y = 0.08;
  group.add(housing);

  // Cables hasta el techo.
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), ctx.materials.materials.pipe);
  cable.position.y = 0.3;
  group.add(cable);

  const heightFactor = Math.max(1, (options.y / 2.6) ** 2);
  const intensity = options.intensity * 2.1 * heightFactor;
  const range = Math.max(11, options.y * 3.1);
  const light = new THREE.PointLight(options.color, intensity, range, 2);
  light.position.y = -0.2;
  group.add(light);

  ctx.scene.add(group);

  const rng = mulberry32(options.id.length * 977 + Math.round(options.x * 31) + 7);
  const actor: LightActor = {
    group,
    light,
    fixture,
    baseIntensity: intensity,
    baseColor: options.color,
    flicker: options.flicker ?? 0,
    scare: 0,
    broken: options.broken ?? false,
    emergency: false,
    power: true,
    update(_dt: number, elapsed: number): void {
      if (!actor.power || actor.broken) {
        const spark = actor.broken && actor.power && Math.sin(elapsed * 13.7 + actor.baseIntensity) > 0.985;
        actor.light.intensity = spark ? 7 : 0;
        fixtureMaterial.emissiveIntensity = spark ? 1.1 : 0.05;
        return;
      }
      const flicker = Math.min(1, actor.flicker + actor.scare * 0.85);
      const wobble = Math.sin(elapsed * (7.3 + flicker * 11) + rng() * 0.2) * 0.5 + 0.5;
      const stutter = flicker > 0.45 && Math.sin(elapsed * 23.7 + Math.cos(elapsed * 3.1)) > 0.94 ? 0.08 : 1;
      const value = (1 - flicker + flicker * wobble) * stutter;
      actor.light.intensity = actor.baseIntensity * value * (actor.emergency ? 0.55 : 1);
      actor.light.color.setHex(actor.emergency ? 0xff2f22 : actor.baseColor);
      fixtureMaterial.emissiveIntensity = 1.6 * value;
    },
  };
  return actor;
}

export interface NoteActor {
  entity: Entity;
  mesh: THREE.Mesh;
  take(): void;
}

export function createNote(ctx: PropContext, spec: PropSpec): NoteActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.9, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0xd6cfb4,
      roughness: 0.92,
      metalness: 0,
      emissive: 0x2b2718,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  paper.rotation.x = -0.25;
  group.add(paper);
  // Unas lineas de tinta para que se lea como papel escrito.
  const ink = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x2b2922, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  ink.position.set(0.02, 0.02, 0.004);
  ink.rotation.x = -0.25;
  group.add(ink);

  const collider = addStatic(
    ctx,
    group,
    new THREE.Vector3(spec.x, (spec.y ?? 0.9), spec.z),
    new THREE.Vector3(0.24, 0.28, 0.12),
    spec.rotationY ?? 0,
  );

  const actor: NoteActor = {
    mesh: paper,
    entity: new Entity({
      id: spec.id,
      kind: 'note',
      label: 'NOTA',
      prompt: '[E] Leer',
      root: group,
      collider,
    }),
    take(): void {
      group.visible = false;
      actor.entity.enabled = false;
    },
  };
  return actor;
}

export interface BatteryActor {
  entity: Entity;
  group: THREE.Group;
  take(): void;
  update(dt: number, elapsed: number): void;
}

export function createBatteryPickup(ctx: PropContext, spec: PropSpec): BatteryActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.2, spec.z);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), ctx.materials.materials.metalPanel);
  body.position.y = 0.15;
  group.add(body);
  const cell = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.24, 0.13),
    new THREE.MeshStandardMaterial({
      color: 0x2a3a2c,
      emissive: 0x69c07a,
      emissiveIntensity: 0.8,
      roughness: 0.5,
      metalness: 0.2,
    }),
  );
  cell.position.y = 0.16;
  group.add(cell);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.05, 0.17),
    new THREE.MeshStandardMaterial({ color: 0xc9c2a8, roughness: 0.6 }),
  );
  stripe.position.y = 0.28;
  group.add(stripe);

  ctx.scene.add(group);
  const collider = ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.2, spec.z),
    halfExtents: new THREE.Vector3(0.12, 0.18, 0.12),
  });

  const actor: BatteryActor = {
    group,
    entity: new Entity({
      id: spec.id,
      kind: 'battery',
      label: 'PILA DE LINTERNA',
      prompt: '[E] Recoger',
      root: group,
      collider,
    }),
    take(): void {
      group.visible = false;
      actor.entity.enabled = false;
    },
    update(_dt: number, elapsed: number): void {
      group.rotation.y = elapsed * 0.6;
      cell.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 4.2) * 0.3;
    },
  };
  return actor;
}

export interface BreakerActor {
  entity: Entity;
  id: BreakerId;
  on: boolean;
  setOn(value: boolean): void;
  update(dt: number, elapsed: number): void;
}

export function createBreaker(ctx: PropContext, spec: PropSpec): BreakerActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.35, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const cabinet = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.86, 0.22), ctx.materials.materials.metalPanel));
  group.add(cabinet);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.03), ctx.materials.materials.rust);
  doorFrame.position.z = 0.12;
  group.add(doorFrame);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.12, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xc4bda6, roughness: 0.8 }),
  );
  plate.position.set(0, 0.26, 0.14);
  group.add(plate);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 128;
  labelCanvas.height = 32;
  const labelContext = labelCanvas.getContext('2d');
  if (labelContext) {
    labelContext.fillStyle = '#12140f';
    labelContext.fillRect(0, 0, 128, 32);
    labelContext.fillStyle = '#c9c2a8';
    labelContext.font = 'bold 18px monospace';
    labelContext.textAlign = 'center';
    labelContext.fillText(spec.breakerId?.toUpperCase() ?? 'B', 64, 23);
  }
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.085),
    new THREE.MeshBasicMaterial({ map: labelTexture }),
  );
  label.position.set(0, 0.26, 0.147);
  group.add(label);

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.02, 0.14);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.07), ctx.materials.materials.pipe);
  arm.position.y = -0.12;
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a2a1e, roughness: 0.6 }),
  );
  knob.position.y = -0.27;
  pivot.add(arm, knob);
  pivot.rotation.x = 0.6;
  group.add(pivot);

  const ledMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a0d0a,
    emissive: 0x9c1a10,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), ledMaterial);
  led.position.set(0.24, 0.2, 0.145);
  group.add(led);

  const collider = addStatic(
    ctx,
    group,
    new THREE.Vector3(spec.x, spec.y ?? 1.35, spec.z),
    new THREE.Vector3(0.36, 0.46, 0.16),
    spec.rotationY ?? 0,
  );

  let arrowTarget = 0.6;
  const actor: BreakerActor = {
    id: (spec.breakerId ?? 'b1') as BreakerId,
    on: false,
    entity: new Entity({
      id: spec.id,
      kind: 'breaker',
      label: `BREAKER ${(spec.breakerId ?? 'b1').toUpperCase()}`,
      prompt: '[E] Rearmar',
      root: group,
      collider,
    }),
    setOn(value: boolean): void {
      actor.on = value;
      arrowTarget = value ? -0.6 : 0.6;
      ledMaterial.emissive.setHex(value ? 0x2f9e4a : 0x9c1a10);
      ledMaterial.emissiveIntensity = value ? 1.8 : 0.8 + (value ? 0 : 0.4);
    },
    update(dt: number, elapsed: number): void {
      pivot.rotation.x += (arrowTarget - pivot.rotation.x) * Math.min(1, dt * 10);
      if (!actor.on) {
        ledMaterial.emissiveIntensity = 0.55 + Math.abs(Math.sin(elapsed * 2.3)) * 0.5;
      }
    },
  };
  return actor;
}

export interface LockerActor {
  entity: Entity;
  id: string;
  hide: boolean;
  open: boolean;
  setOpen(value: boolean): void;
  update(dt: number): void;
}

export function createLocker(ctx: PropContext, spec: PropSpec): LockerActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.95, 0.56), ctx.materials.materials.metalPanel));
  body.position.y = 0.975;
  group.add(body);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.41, 0.975, 0.29);
  const door = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.86, 0.05), ctx.materials.materials.door));
  door.position.x = 0.4;
  doorPivot.add(door);

  // Sello de la taquilla.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.11),
    new THREE.MeshStandardMaterial({ color: 0xb9b09a, roughness: 0.7 }),
  );
  plate.position.set(0, 0.65, 0.032);
  door.add(plate);
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0b0c0a, roughness: 0.9 }),
  );
  slot.position.set(0, 0.05, 0.04);
  door.add(slot);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), ctx.materials.materials.pipe);
  handle.position.set(0.3, 0.02, 0.05);
  door.add(handle);
  group.add(doorPivot);

  // Rendijas de ventilacion.
  for (let i = 0; i < 4; i += 1) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.012), new THREE.MeshBasicMaterial({ color: 0x090a08 }));
    vent.position.set(0, 1.5 - i * 0.06, 0.288);
    group.add(vent);
  }

  const collider = addStatic(
    ctx,
    group,
    new THREE.Vector3(spec.x, 0.975, spec.z),
    new THREE.Vector3(0.45, 0.98, 0.3),
    spec.rotationY ?? 0,
  );

  let target = 0;
  const hide = spec.kind === 'hideLocker';
  const actor: LockerActor = {
    id: spec.id,
    hide,
    open: false,
    entity: new Entity({
      id: spec.id,
      kind: 'locker',
      label: hide ? 'TAQUILLA · ESCONDITE' : 'TAQUILLA',
      prompt: hide ? '[E] Esconderse' : '[E] Abrir',
      root: group,
      collider,
    }),
    setOpen(value: boolean): void {
      actor.open = value;
      target = value ? -1.85 : 0;
    },
    update(dt: number): void {
      doorPivot.rotation.y += (target - doorPivot.rotation.y) * Math.min(1, dt * 9);
    },
  };
  return actor;
}

export interface LiftActor {
  entity: Entity;
  open: boolean;
  setOpen(value: boolean): void;
  update(dt: number): void;
  position: THREE.Vector3;
}

export function createLift(ctx: PropContext, spec: PropSpec): LiftActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const frame = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 0.5), ctx.materials.materials.rust));
  frame.position.y = 1.3;
  group.add(frame);
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 2.3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x07090a, emissive: 0x0a1210, emissiveIntensity: 0.4 }),
  );
  inner.position.set(0, 1.2, 0.28);
  group.add(inner);

  const doorMaterial = ctx.materials.materials.door.clone();
  doorMaterial.color.setHex(0x7b857b);
  const doors = [-1, 1].map((side) => {
    const door = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.2, 0.08), doorMaterial));
    door.position.set(side * 0.53, 1.2, 0.32);
    group.add(door);
    return door;
  });

  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0x140d0b,
    emissive: 0x9c2013,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.1), lampMaterial);
  lamp.position.set(0, 2.52, 0.3);
  group.add(lamp);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xc9c2a8 }),
  );
  plate.position.set(0, 2.32, 0.42);
  group.add(plate);

  const collider = addStatic(
    ctx,
    group,
    new THREE.Vector3(spec.x, 1.3, spec.z),
    new THREE.Vector3(1.25, 1.3, 0.3),
    spec.rotationY ?? 0,
  );

  const actor: LiftActor = {
    open: false,
    position: new THREE.Vector3(spec.x, 1.2, spec.z),
    entity: new Entity({
      id: spec.id,
      kind: 'lift',
      label: 'MONTACARGAS',
      prompt: '[E] Llamar al montacargas',
      root: group,
      collider,
    }),
    setOpen(value: boolean): void {
      actor.open = value;
      lampMaterial.emissive.setHex(value ? 0x2f9e4a : 0x9c2013);
    },
    update(dt: number): void {
      const target = actor.open ? 1 : 0;
      for (const door of doors) {
        const side = door.position.x > 0 ? 1 : -1;
        const wanted = side * (0.53 + target * 0.98);
        door.position.x += (wanted - door.position.x) * Math.min(1, dt * 2.4);
      }
      lampMaterial.emissiveIntensity = 1.2 + Math.sin(performance.now() * 0.003) * 0.4;
    },
  };
  return actor;
}

export interface RadioActor {
  entity: Entity;
  update(elapsed: number): void;
}

export function createRadio(ctx: PropContext, spec: PropSpec): RadioActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const shell = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.26), ctx.materials.materials.metalPanel));
  shell.position.y = 0.12;
  group.add(shell);
  const screenTexture = ctx.materials.screenTexture(['VERA  ·  CANAL 7', '03:47   SIN ENLACE', 'ESCUCHA'], '#a8d8b4');
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.12),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.set(0, 0.15, 0.135);
  group.add(screen);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 8), ctx.materials.materials.pipe);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.16, 0.07, 0.14);
  group.add(knob);
  const ledMaterial = new THREE.MeshStandardMaterial({ color: 0x120c08, emissive: 0xc4321a, emissiveIntensity: 1.4 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), ledMaterial);
  led.position.set(-0.17, 0.07, 0.14);
  group.add(led);

  const collider = addStatic(
    ctx,
    group,
    new THREE.Vector3(spec.x, (spec.y ?? 1.0) + 0.12, spec.z),
    new THREE.Vector3(0.24, 0.16, 0.16),
    spec.rotationY ?? 0,
  );

  return {
    entity: new Entity({
      id: spec.id,
      kind: 'radio',
      label: 'RADIO DE PLANTA',
      prompt: '[E] Escuchar a VERA',
      root: group,
      collider,
    }),
    update(elapsed: number): void {
      ledMaterial.emissiveIntensity = 0.4 + Math.abs(Math.sin(elapsed * 3.1)) * 1.6;
    },
  };
}

// ------------------------------------------------------------ decoracion

export function createCeilingLamp(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 2.7, spec.z);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 5), ctx.materials.materials.pipe);
  cable.position.y = -0.35;
  group.add(cable);
  const housing = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.3, 10, 1, true), ctx.materials.materials.rust);
  housing.position.y = -0.72;
  housing.rotation.z = spec.broken ? 0.55 : 0.06;
  group.add(housing);
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0x151310,
    emissive: spec.broken ? 0x241209 : 0xffc98a,
    emissiveIntensity: spec.broken ? 0.15 : 1.7,
    roughness: 0.4,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bulbMaterial);
  bulb.position.y = -0.88;
  bulb.position.x = spec.broken ? 0.22 : 0;
  group.add(bulb);
  ctx.scene.add(group);
  return group;
}

export function createPipe(ctx: PropContext, spec: PropSpec): THREE.Mesh {
  const length = spec.length ?? 4;
  const radius = spec.size ?? 0.1;
  const mesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10, 1, true), ctx.materials.materials.pipe));
  mesh.position.set(spec.x, spec.y ?? 2.2, spec.z);
  if (spec.axis === 'x') mesh.rotation.z = Math.PI / 2;
  else mesh.rotation.x = Math.PI / 2;
  ctx.scene.add(mesh);
  return mesh;
}

export function createPuddle(ctx: PropContext, spec: PropSpec): THREE.Mesh {
  const size = spec.size ?? 1.4;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(size * 0.5, 22), ctx.materials.water);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(spec.x, (spec.y ?? 0.02), spec.z);
  mesh.scale.set(1, 0.7, 1);
  ctx.scene.add(mesh);
  return mesh;
}

export function createBloodDecal(ctx: PropContext, spec: PropSpec): THREE.Mesh {
  const size = spec.size ?? 1.4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ctx.materials.blood);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = spec.rotationY ?? 0;
  mesh.position.set(spec.x, spec.y ?? 0.012, spec.z);
  mesh.renderOrder = 2;
  ctx.scene.add(mesh);
  return mesh;
}

export function createDrain(ctx: PropContext, spec: PropSpec): THREE.Mesh {
  const size = spec.size ?? 0.7;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(size * 0.5, 16), ctx.materials.materials.grate);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(spec.x, spec.y ?? 0.012, spec.z);
  ctx.scene.add(mesh);
  return mesh;
}

export function createPump(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const scale = spec.size ?? 1.4;

  const base = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.9 * scale, 0.3, 1.5 * scale), ctx.materials.materials.hazard));
  base.position.y = 0.15;
  group.add(base);
  const body = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.62 * scale, 0.62 * scale, 1.3 * scale, 14), ctx.materials.materials.rust),
  );
  body.position.y = 0.95 * scale;
  group.add(body);
  const motor = shadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.7 * scale, 0.8 * scale), ctx.materials.materials.metalPanel),
  );
  motor.position.set(0, 0.55 * scale, 0.2 * scale);
  group.add(motor);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34 * scale, 0.06 * scale, 8, 16), ctx.materials.materials.pipe);
  wheel.position.set(0.9 * scale, 1.0 * scale, 0.5 * scale);
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.16 * scale, 1.7 * scale, 10),
    ctx.materials.materials.pipe,
  );
  pipe.position.set(-0.2 * scale, 1.5 * scale, -0.4 * scale);
  pipe.rotation.z = 0.1;
  group.add(pipe);

  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.8, spec.z),
    halfExtents: new THREE.Vector3(0.95 * scale, 0.8, 0.75 * scale),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createValve(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.2, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), ctx.materials.materials.pipe);
  stem.position.z = 0.22;
  stem.rotation.x = Math.PI / 2;
  group.add(stem);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 18), ctx.materials.materials.rust);
  wheel.position.z = 0.45;
  group.add(wheel);
  for (let i = 0; i < 3; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), ctx.materials.materials.rust);
    spoke.position.z = 0.45;
    spoke.rotation.z = (i / 3) * Math.PI;
    group.add(spoke);
  }
  ctx.scene.add(group);
  return group;
}

export function createBarrel(ctx: PropContext, spec: PropSpec): Entity {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.55, spec.z);
  const body = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 14), ctx.materials.materials.rust));
  group.add(body);
  for (const y of [-0.36, 0.36]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 6, 16), ctx.materials.materials.pipe);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    group.add(band);
  }
  ctx.scene.add(group);
  const { body: rigidBody, collider } = ctx.physics.addCylinderBody(
    new THREE.Vector3(spec.x, spec.y ?? 0.56, spec.z),
    0.32,
    0.55,
    26,
  );
  return new Entity({
    id: spec.id,
    kind: 'prop',
    label: 'BIDÓN',
    prompt: '',
    root: group,
    collider,
    body: rigidBody,
    enabled: false,
  });
}

export function createCrate(ctx: PropContext, spec: PropSpec): Entity {
  const size = spec.size ?? 0.8;
  const mesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), ctx.materials.materials.wood));
  ctx.scene.add(mesh);
  const { body, collider } = ctx.physics.addBoxBody({
    center: new THREE.Vector3(spec.x, spec.y ?? size / 2, spec.z),
    halfExtents: new THREE.Vector3(size / 2, size / 2, size / 2),
    mass: 16,
    rotationY: spec.rotationY ?? 0,
    friction: 0.75,
  });
  return new Entity({
    id: spec.id,
    kind: 'prop',
    label: 'CAJA',
    prompt: '',
    root: mesh,
    collider,
    body,
    enabled: false,
  });
}

export function createDesk(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const top = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.7), ctx.materials.materials.wood));
  top.position.y = 0.78;
  group.add(top);
  for (const x of [-0.64, 0.64]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.12), ctx.materials.materials.pipe);
    leg.position.set(x, 0.37, 0);
    group.add(leg);
  }
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.62), ctx.materials.materials.metalPanel);
  drawer.position.set(0.35, 0.42, 0);
  group.add(drawer);
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.4, spec.z),
    halfExtents: new THREE.Vector3(0.78, 0.4, 0.4),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createChair(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.46), ctx.materials.materials.wood);
  seat.position.y = 0.46;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.05), ctx.materials.materials.wood);
  back.position.set(0, 0.72, -0.22);
  group.add(back);
  for (const [x, z] of [
    [-0.19, -0.18],
    [0.19, -0.18],
    [-0.19, 0.18],
    [0.19, 0.18],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.04), ctx.materials.materials.pipe);
    leg.position.set(x, 0.22, z);
    group.add(leg);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.45, spec.z),
    halfExtents: new THREE.Vector3(0.26, 0.5, 0.26),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createBench(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const variant = spec.variant ?? 'bench';

  if (variant === 'cot') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 2.0), ctx.materials.materials.metalPanel);
    frame.position.y = 0.38;
    group.add(frame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 1.9), ctx.materials.materials.fabric);
    mattress.position.y = 0.53;
    group.add(mattress);
  } else {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.8), ctx.materials.materials.wood);
    top.position.y = 0.9;
    group.add(top);
    for (const x of [-1.0, 1.0]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.6), ctx.materials.materials.metalPanel);
      leg.position.set(x, 0.45, 0);
      group.add(leg);
    }
    if (variant === 'workbench') {
      const vise = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.22), ctx.materials.materials.rust);
      vise.position.set(-0.7, 1.02, 0.2);
      group.add(vise);
    }
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.55, spec.z),
    halfExtents: new THREE.Vector3(variant === 'cot' ? 0.48 : 1.12, 0.55, variant === 'cot' ? 1.0 : 0.42),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createShelf(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  for (const y of [0.3, 1.1, 1.9]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.6), ctx.materials.materials.metalPanel);
    shelf.position.y = y;
    group.add(shelf);
  }
  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.27, 0.27]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.05), ctx.materials.materials.pipe);
      post.position.set(x, 1.0, z);
      group.add(post);
    }
  }
  const rng = mulberry32(spec.id.length * 61);
  for (let i = 0; i < 4; i += 1) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.24, 0.4),
      ctx.materials.materials.wood,
    );
    box.position.set(-0.6 + i * 0.4, 0.42 + (i % 3) * 0.8, 0.02);
    box.rotation.y = rng() * 0.4;
    group.add(box);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 1.0, spec.z),
    halfExtents: new THREE.Vector3(0.9, 1.0, 0.35),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createBody(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.12, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  group.rotation.z = 0.06;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), ctx.materials.materials.fabric);
  torso.rotation.z = Math.PI / 2;
  torso.position.y = 0.18;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), ctx.materials.materials.bone);
  head.position.set(-0.62, 0.16, 0.04);
  group.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.16), ctx.materials.materials.bone);
  jaw.position.set(-0.74, 0.1, 0.04);
  jaw.rotation.z = -0.3;
  group.add(jaw);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.6, 3, 6), ctx.materials.materials.bone);
    arm.position.set(0.1, 0.12, side * 0.26);
    arm.rotation.z = Math.PI / 2 - 0.4;
    arm.rotation.x = side * 0.5;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 3, 6), ctx.materials.materials.fabric);
    leg.position.set(0.55, 0.1, side * 0.14);
    leg.rotation.z = Math.PI / 2 + 0.2;
    group.add(leg);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.18, spec.z),
    halfExtents: new THREE.Vector3(0.7, 0.18, 0.35),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createPlasticSheet(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const width = spec.length ?? 2.4;
  const geometry = new THREE.PlaneGeometry(width, 2.5, 6, 10);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, Math.sin(x * 3.1 + y * 1.7) * 0.08);
  }
  geometry.computeVertexNormals();
  const sheet = new THREE.Mesh(geometry, ctx.materials.materials.plastic);
  sheet.position.y = 1.3;
  group.add(sheet);
  ctx.scene.add(group);
  return group;
}

export function createCables(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 2.4, spec.z);
  const length = spec.length ?? 3;
  const rng = mulberry32(spec.id.length * 991 + Math.round(spec.z * 17));
  for (let i = 0; i < 4; i += 1) {
    const offset = (i - 1.5) * 0.06;
    const points = [
      new THREE.Vector3(-length / 2, 0.2, offset),
      new THREE.Vector3(-length / 4, -0.2 - rng() * 0.2, offset + 0.04),
      new THREE.Vector3(0, -0.34 - rng() * 0.25, offset),
      new THREE.Vector3(length / 4, -0.12 - rng() * 0.2, offset - 0.04),
      new THREE.Vector3(length / 2, 0.2, offset),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.017, 5, false), ctx.materials.materials.pipe);
    group.add(tube);
  }
  ctx.scene.add(group);
  return group;
}

export function createExtinguisher(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b1a12, roughness: 0.55, metalness: 0.35 }),
  );
  tank.position.y = 1.0;
  group.add(tank);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), ctx.materials.materials.pipe);
  bracket.position.set(0, 0.78, -0.1);
  group.add(bracket);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0x0b0c0a }));
  nozzle.position.set(0.08, 1.26, 0);
  group.add(nozzle);
  ctx.scene.add(group);
  return group;
}

export function createTransformer(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 1.2), ctx.materials.materials.metalPanel));
  body.position.y = 0.95;
  group.add(body);
  for (let i = 0; i < 7; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 1.34), ctx.materials.materials.rust);
    fin.position.set(-0.9 + i * 0.3, 0.95, 0);
    group.add(fin);
  }
  for (const x of [-0.6, 0, 0.6]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), ctx.materials.materials.bone);
    insulator.position.set(x, 2.12, 0.25);
    group.add(insulator);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4), ctx.materials.materials.pipe);
    cable.position.set(x, 2.7, 0.25);
    group.add(cable);
  }
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1c1f1b, emissive: 0x4a2a0c, emissiveIntensity: 0.4 }),
  );
  plaque.position.set(0, 1.2, 0.62);
  group.add(plaque);
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.95, spec.z),
    halfExtents: new THREE.Vector3(1.2, 0.95, 0.7),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createMirror(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.7, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.06), ctx.materials.materials.rust);
  group.add(frame);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 1.28),
    new THREE.MeshStandardMaterial({ color: 0x3a4442, roughness: 0.12, metalness: 0.92 }),
  );
  glass.position.z = 0.04;
  group.add(glass);
  const grime = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), ctx.materials.grime);
  grime.position.z = 0.05;
  group.add(grime);
  ctx.scene.add(group);
  return group;
}

export function createBulkhead(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  const material = ctx.materials.materials.hazard;
  for (const z of [-1.35, 1.35]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.7, 0.22), material);
    post.position.set(0, 1.35, z);
    group.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 2.9), material);
  lintel.position.set(0, 2.62, 0);
  group.add(lintel);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 2.9), ctx.materials.materials.rust);
  stripe.position.set(0, 2.42, 0);
  group.add(stripe);
  ctx.scene.add(group);
  return group;
}

// ------------------------------------------------------- v1.1: ala este/oeste

export interface TagActor {
  entity: Entity;
  group: THREE.Group;
  take(): void;
  update(elapsed: number): void;
}

export function createTag(ctx: PropContext, spec: PropSpec): TagActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.3, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.11, 0.018),
    new THREE.MeshStandardMaterial({
      color: 0xb99a55,
      metalness: 0.85,
      roughness: 0.32,
      emissive: 0x3a2608,
      emissiveIntensity: 0.55,
    }),
  );
  group.add(plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 5, 10), ctx.materials.materials.pipe);
  ring.position.set(0, 0.09, 0);
  group.add(ring);
  for (let i = 0; i < 3; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 4, 8), ctx.materials.materials.pipe);
    link.position.set(0, 0.13 + i * 0.035, 0);
    link.rotation.x = Math.PI / 2;
    group.add(link);
  }
  ctx.scene.add(group);
  const collider = ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, spec.y ?? 0.3, spec.z),
    halfExtents: new THREE.Vector3(0.22, 0.26, 0.14),
    rotationY: spec.rotationY ?? 0,
  });

  const actor: TagActor = {
    group,
    entity: new Entity({
      id: spec.id,
      kind: 'tag',
      label: 'PLACA DE TRIPULACIÓN',
      prompt: '[E] Recoger placa',
      root: group,
      collider,
    }),
    take(): void {
      group.visible = false;
      actor.entity.enabled = false;
    },
    update(elapsed: number): void {
      plate.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(elapsed * 1.7)) * 0.35;
    },
  };
  return actor;
}

export interface FuseActor {
  entity: Entity;
  group: THREE.Group;
  take(): void;
  update(elapsed: number): void;
}

export function createFuse(ctx: PropContext, spec: PropSpec): FuseActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.3, spec.z);
  group.rotation.y = spec.rotationY ?? 0;

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.14), ctx.materials.materials.metalPanel);
  group.add(box);
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.03), ctx.materials.materials.rust);
  socket.position.set(0, -0.02, 0.08);
  group.add(socket);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f8f7a,
    emissive: 0x2a7a46,
    emissiveIntensity: 1.3,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8), glassMaterial);
  glass.rotation.z = Math.PI / 2;
  glass.position.set(0, 0.02, 0.12);
  group.add(glass);
  for (const x of [-0.11, 0.11]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 8), ctx.materials.materials.pipe);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(x, 0.02, 0.12);
    group.add(cap);
  }
  ctx.scene.add(group);
  const collider = ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, spec.y ?? 1.3, spec.z),
    halfExtents: new THREE.Vector3(0.18, 0.26, 0.12),
    rotationY: spec.rotationY ?? 0,
  });

  const actor: FuseActor = {
    group,
    entity: new Entity({
      id: spec.id,
      kind: 'fuse',
      label: 'FUSIBLE DE EMERGENCIA',
      prompt: '[E] Extraer fusible',
      root: group,
      collider,
    }),
    take(): void {
      group.visible = false;
      actor.entity.enabled = false;
    },
    update(elapsed: number): void {
      glassMaterial.emissiveIntensity = 0.9 + Math.abs(Math.sin(elapsed * 3.1)) * 0.8;
    },
  };
  return actor;
}

export interface BottleActor {
  entity: Entity;
  group: THREE.Group;
  take(): void;
  update(elapsed: number): void;
}

export function createBottlePickup(ctx: PropContext, spec: PropSpec): BottleActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.2, spec.z);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2f4a35,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.24, 9), glass);
  body.position.y = 0.12;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 8), glass);
  neck.position.y = 0.3;
  group.add(neck);
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.08, 9),
    new THREE.MeshStandardMaterial({ color: 0xb9ae8a, roughness: 0.9 }),
  );
  label.position.y = 0.14;
  group.add(label);
  ctx.scene.add(group);
  const collider = ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, (spec.y ?? 0.2) + 0.18, spec.z),
    halfExtents: new THREE.Vector3(0.14, 0.3, 0.14),
  });

  const actor: BottleActor = {
    group,
    entity: new Entity({
      id: spec.id,
      kind: 'bottle',
      label: 'BOTELLA',
      prompt: '[E] Recoger botella',
      root: group,
      collider,
    }),
    take(): void {
      group.visible = false;
      actor.entity.enabled = false;
    },
    update(elapsed: number): void {
      group.rotation.y = elapsed * 0.25;
    },
  };
  return actor;
}

export function createFilingCabinet(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.58), ctx.materials.materials.metalPanel));
  body.position.y = 0.725;
  group.add(body);
  for (let i = 0; i < 4; i += 1) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.04), ctx.materials.materials.door);
    drawer.position.set(0, 1.25 - i * 0.33, 0.3);
    group.add(drawer);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.035), ctx.materials.materials.pipe);
    handle.position.set(0, 1.25 - i * 0.33, 0.33);
    group.add(handle);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.72, spec.z),
    halfExtents: new THREE.Vector3(0.38, 0.72, 0.3),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createSafe(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), ctx.materials.materials.rust));
  body.position.y = 0.5;
  group.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.06), ctx.materials.materials.metalPanel);
  door.position.set(0, 0.5, 0.4);
  group.add(door);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), ctx.materials.materials.pipe);
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.16, 0.55, 0.45);
  group.add(dial);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.05), ctx.materials.materials.pipe);
  handle.position.set(-0.2, 0.5, 0.45);
  group.add(handle);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xb9ae8a, roughness: 0.7 }),
  );
  plate.position.set(0, 0.82, 0.44);
  group.add(plate);
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.5, spec.z),
    halfExtents: new THREE.Vector3(0.42, 0.5, 0.42),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createMapBoard(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.7, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.06), ctx.materials.materials.rust);
  group.add(frame);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#9a8f74';
    context.fillRect(0, 0, 512, 300);
    context.strokeStyle = '#3c3a2e';
    context.lineWidth = 2;
    for (let i = 0; i < 16; i += 1) {
      context.strokeRect(20 + (i % 4) * 120, 20 + Math.floor(i / 4) * 68, 92, 48);
    }
    context.strokeStyle = '#7c1b12';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(40, 260);
    context.lineTo(470, 40);
    context.stroke();
    context.fillStyle = '#2b2922';
    context.font = 'bold 16px monospace';
    context.fillText('PLANTA BAJA · SECTOR 07', 20, 292);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.74, 1.0),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 }),
  );
  board.position.z = 0.035;
  group.add(board);
  ctx.scene.add(group);
  return group;
}

export function createTypewriter(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.82, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.32), ctx.materials.materials.metalPanel);
  group.add(base);
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xd6cfb4, roughness: 0.95, side: THREE.DoubleSide }),
  );
  paper.position.set(0, 0.24, -0.1);
  paper.rotation.x = -0.22;
  group.add(paper);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const key = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6), ctx.materials.materials.pipe);
      key.position.set(-0.16 + col * 0.045, 0.07, -0.02 + row * 0.05);
      group.add(key);
    }
  }
  ctx.scene.add(group);
  return group;
}

export interface SteamActor {
  group: THREE.Group;
  burst(): void;
  update(dt: number, elapsed: number): void;
}

export function createSteamVent(ctx: PropContext, spec: PropSpec): SteamActor {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12), ctx.materials.materials.grate);
  grate.position.y = 0.04;
  group.add(grate);
  const puffCanvas = document.createElement('canvas');
  puffCanvas.width = 64;
  puffCanvas.height = 64;
  const context = puffCanvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(220,230,220,0.55)');
    gradient.addColorStop(1, 'rgba(220,230,220,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const puffTexture = new THREE.CanvasTexture(puffCanvas);
  puffTexture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: puffTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const puffs = Array.from({ length: 5 }, () => {
    const sprite = new THREE.Sprite(material.clone());
    sprite.position.set(0, 0.1, 0);
    sprite.scale.setScalar(0.6);
    group.add(sprite);
    return sprite;
  });
  ctx.scene.add(group);
  let timer = 0;
  const actor: SteamActor = {
    group,
    burst(): void {
      timer = 1.4;
    },
    update(dt: number, elapsed: number): void {
      timer = Math.max(0, timer - dt);
      const active = timer > 0;
      puffs.forEach((sprite, index) => {
        const phase = (elapsed * 0.8 + index * 0.21) % 1;
        const strength = active ? 1 : 0.18;
        sprite.position.y = 0.15 + phase * (active ? 1.7 : 0.5);
        sprite.position.x = Math.sin(elapsed * 0.7 + index) * 0.12 * phase;
        sprite.scale.setScalar((active ? 0.6 : 0.3) + phase * (active ? 1.2 : 0.35));
        const materialRef = sprite.material as THREE.SpriteMaterial;
        materialRef.opacity = strength * (1 - phase) * 0.55;
      });
    },
  };
  return actor;
}

export function createChain(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 4.4, spec.z);
  const length = spec.length ?? 3.5;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 5), ctx.materials.materials.pipe);
  rod.position.y = -length / 2;
  group.add(rod);
  const links = Math.floor(length / 0.22);
  for (let i = 0; i < links; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 4, 8), ctx.materials.materials.rust);
    link.position.y = -0.1 - i * 0.22;
    link.rotation.y = (i % 2) * Math.PI / 2;
    link.rotation.x = Math.PI / 2;
    group.add(link);
  }
  ctx.scene.add(group);
  return group;
}

export function createBodyBag(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.1, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x2b302c, roughness: 0.72, metalness: 0.08 });
  const bag = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.35, 4, 8), bagMaterial));
  bag.rotation.z = Math.PI / 2;
  bag.scale.set(1, 1, 0.55);
  bag.position.y = 0.22;
  group.add(bag);
  const zipper = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.02, 0.03), ctx.materials.materials.pipe);
  zipper.position.set(0, 0.35, 0.14);
  group.add(zipper);
  for (const x of [-0.35, 0.35]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.46), ctx.materials.materials.fabric);
    strap.position.set(x, 0.3, 0);
    group.add(strap);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.18, spec.z),
    halfExtents: new THREE.Vector3(0.75, 0.16, 0.3),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createPool(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.03, spec.z);
  const radius = (spec.size ?? 8) / 2;
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), ctx.materials.water);
  water.rotation.x = -Math.PI / 2;
  group.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.14, 8, 40), ctx.materials.materials.rust);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.06;
  group.add(rim);
  for (let i = 0; i < 3; i += 1) {
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(radius * (0.25 + i * 0.16), radius * (0.27 + i * 0.16), 40),
      new THREE.MeshBasicMaterial({
        color: 0x9ab8ad,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.012 + i * 0.001;
    group.add(ripple);
  }
  ctx.scene.add(group);
  return group;
}

export function createWellValve(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.2, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), ctx.materials.materials.pipe);
  stem.rotation.x = Math.PI / 2;
  stem.position.z = 0.25;
  group.add(stem);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 22), ctx.materials.materials.rust);
  wheel.position.z = 0.55;
  group.add(wheel);
  for (let i = 0; i < 4; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), ctx.materials.materials.rust);
    spoke.position.z = 0.55;
    spoke.rotation.z = (i / 4) * Math.PI;
    group.add(spoke);
  }
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x8e2f20, roughness: 0.6 }),
  );
  plate.position.set(0, 0.95, 0.1);
  group.add(plate);
  ctx.scene.add(group);
  return group;
}

export function createCrawlerNest(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0.15, spec.z);
  const rng = mulberry32(spec.id.length * 373 + Math.round(spec.z * 19));
  const organic = new THREE.MeshStandardMaterial({ color: 0x4b4a3a, roughness: 0.95, metalness: 0.02 });
  for (let i = 0; i < 7; i += 1) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.12 + rng() * 0.18, 7, 6), organic);
    blob.position.set((rng() - 0.5) * 0.7, 0.08 + rng() * 0.18, (rng() - 0.5) * 0.7);
    blob.scale.y = 0.6;
    group.add(blob);
  }
  for (let i = 0; i < 4; i += 1) {
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.3, 3, 5), ctx.materials.materials.bone);
    bone.position.set((rng() - 0.5) * 0.8, 0.08, (rng() - 0.5) * 0.8);
    bone.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    group.add(bone);
  }
  ctx.scene.add(group);
  return group;
}

export function createBoiler(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 0, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const scale = spec.size ?? 1.3;
  const body = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.75 * scale, 0.8 * scale, 1.9 * scale, 16), ctx.materials.materials.rust),
  );
  body.position.y = 0.95 * scale;
  group.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75 * scale, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), ctx.materials.materials.rust);
  dome.position.y = 1.9 * scale;
  group.add(dome);
  const fireDoor = new THREE.Mesh(
    new THREE.CircleGeometry(0.22 * scale, 12),
    new THREE.MeshStandardMaterial({
      color: 0x2a130a,
      emissive: 0xff5a1a,
      emissiveIntensity: 0.75,
      roughness: 0.5,
    }),
  );
  fireDoor.position.set(0, 0.55 * scale, 0.79 * scale);
  group.add(fireDoor);
  for (const x of [-0.5, 0.5]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2 * scale, 8), ctx.materials.materials.pipe);
    pipe.position.set(x * scale, 1.7 * scale, 0);
    pipe.rotation.z = 0.12;
    group.add(pipe);
  }
  ctx.scene.add(group);
  ctx.physics.addStaticBox({
    center: new THREE.Vector3(spec.x, 0.9 * scale, spec.z),
    halfExtents: new THREE.Vector3(0.85 * scale, 0.9 * scale, 0.85 * scale),
    rotationY: spec.rotationY ?? 0,
  });
  return group;
}

export function createGauge(ctx: PropContext, spec: PropSpec): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, spec.y ?? 1.4, spec.z);
  group.rotation.y = spec.rotationY ?? 0;
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 14), ctx.materials.materials.metalPanel);
  face.rotation.x = Math.PI / 2;
  group.add(face);
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xc9c2a8 }));
  dial.position.z = 0.032;
  group.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.005), new THREE.MeshBasicMaterial({ color: 0x7c1b12 }));
  needle.position.set(0, 0.03, 0.04);
  needle.rotation.z = -0.6;
  group.add(needle);
  ctx.scene.add(group);
  return group;
}
