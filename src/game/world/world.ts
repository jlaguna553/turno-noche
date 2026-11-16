import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Physics } from '../physics/physics';
import { repeatMaterial, type MaterialSet } from '../render/materials';
import { RENDER } from '../core/config';
import type { BreakerId } from '../core/bus';
import { mulberry32 } from '../core/rng';
import type { Layout, WallSpec } from './layout';
import { zoneAt, type ZoneBox } from './layout';
import {
  EntityRegistry,
  createBarrel,
  createBatteryPickup,
  createBench,
  createBloodDecal,
  createBody,
  createBreaker,
  createBulkhead,
  createCables,
  createCeilingLamp,
  createChair,
  createCrate,
  createDesk,
  createDrain,
  createExtinguisher,
  createLift,
  createLight,
  createLocker,
  createMirror,
  createNote,
  createPipe,
  createPlasticSheet,
  createPuddle,
  createPump,
  createRadio,
  createShelf,
  createTransformer,
  createValve,
  createTag,
  createFuse,
  createBottlePickup,
  createFilingCabinet,
  createSafe,
  createMapBoard,
  createTypewriter,
  createSteamVent,
  createChain,
  createBodyBag,
  createPool,
  createWellValve,
  createCrawlerNest,
  createBoiler,
  createGauge,
  type BatteryActor,
  type BreakerActor,
  type LightActor,
  type LiftActor,
  type LockerActor,
  type NoteActor,
  type PropContext,
  type RadioActor,
  type TagActor,
  type FuseActor,
  type BottleActor,
  type SteamActor,
} from './props';
import { createMonster, type MonsterActor } from './monster';

export interface World {
  entities: EntityRegistry;
  lights: LightActor[];
  breakers: Map<BreakerId, BreakerActor>;
  lockers: Map<string, LockerActor>;
  notes: Map<string, NoteActor>;
  tags: Map<string, TagActor>;
  fuses: Map<string, FuseActor>;
  bottles: BottleActor[];
  steam: Map<string, SteamActor>;
  chairs: Map<string, THREE.Group>;
  nests: Array<{ id: string; x: number; z: number }>;
  batteries: BatteryActor[];
  lift: LiftActor;
  radio: RadioActor;
  monster: MonsterActor;
  flashlight: THREE.SpotLight;
  setBreaker(id: BreakerId, on: boolean): void;
  setLiftOpen(open: boolean): void;
  setPower(on: boolean): void;
  setEmergency(on: boolean): void;
  restoreLighting(): void;
  flicker(seconds: number): void;
  blackout(seconds: number): void;
  setFlashlight(camera: THREE.Camera, on: boolean, strength: number): void;
  update(dt: number, elapsed: number, focus: THREE.Vector3): void;
  syncDynamic(): void;
  zoneAt(x: number, z: number): ZoneBox | undefined;
  stats(): { meshes: number; lights: number; points: number };
}

interface WallSegment {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

function splitWall(wall: WallSpec): WallSegment[] {
  const openings = [...(wall.openings ?? [])].sort((a, b) => a.center - b.center);
  const segments: WallSegment[] = [];
  const base = wall.bottom ?? 0;
  let cursor = wall.from;

  for (const opening of openings) {
    const left = opening.center - opening.width / 2;
    const right = opening.center + opening.width / 2;
    if (left > cursor) segments.push({ from: cursor, to: left, bottom: base, top: wall.height });
    if (opening.bottom > 0) segments.push({ from: left, to: right, bottom: base, top: opening.bottom });
    if (opening.top < wall.height) segments.push({ from: left, to: right, bottom: opening.top, top: wall.height });
    cursor = right;
  }
  if (cursor < wall.to) segments.push({ from: cursor, to: wall.to, bottom: base, top: wall.height });
  return segments.filter((segment) => segment.to - segment.from > 0.001 && segment.top - segment.bottom > 0.001);
}

export function buildWorld(
  scene: THREE.Scene,
  physics: Physics,
  materials: MaterialSet,
  layout: Layout,
): World {
  const entities = new EntityRegistry();
  const lights: LightActor[] = [];
  const breakers = new Map<BreakerId, BreakerActor>();
  const lockers = new Map<string, LockerActor>();
  const notes = new Map<string, NoteActor>();
  const tags = new Map<string, TagActor>();
  const fuses = new Map<string, FuseActor>();
  const bottles: BottleActor[] = [];
  const steam = new Map<string, SteamActor>();
  const chairs = new Map<string, THREE.Group>();
  const nests: Array<{ id: string; x: number; z: number }> = [];
  const batteries: BatteryActor[] = [];
  let lift: LiftActor | null = null;
  let radio: RadioActor | null = null;
  let meshCount = 0;

  const context: PropContext = { scene, physics, materials };

  const addStaticMesh = (mesh: THREE.Mesh, half: THREE.Vector3, rotationY = 0): void => {
    scene.add(mesh);
    meshCount += 1;
    physics.addStaticBox({
      center: mesh.position.clone(),
      halfExtents: half,
      rotationY,
      friction: 0.9,
    });
  };

  // Suelo y techo de cada zona.
  for (const room of layout.rooms) {
    const width = room.max[0] - room.min[0];
    const depth = room.max[1] - room.min[1];
    const centerX = (room.min[0] + room.max[0]) / 2;
    const centerZ = (room.min[1] + room.max[1]) / 2;

    const floorMaterial = repeatMaterial(
      materials.materials[room.floorMaterial],
      Math.max(1, width / 2.2),
      Math.max(1, depth / 2.2),
    );
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, depth), floorMaterial);
    floor.position.set(centerX, room.floorY - 0.15, centerZ);
    floor.receiveShadow = true;
    addStaticMesh(floor, new THREE.Vector3(width / 2, 0.15, depth / 2));

    const ceilingMaterial = repeatMaterial(
      materials.materials[room.wallMaterial],
      Math.max(1, width / 3),
      Math.max(1, depth / 3),
    );
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), ceilingMaterial);
    ceiling.position.set(centerX, room.ceilingY + 0.1, centerZ);
    scene.add(ceiling);
    meshCount += 1;

    // Vigas para que un techo bajo no parezca una caja vacia.
    if (room.ceilingY <= 3.4) {
      const alongX = width > depth;
      const span = alongX ? width : depth;
      const count = Math.max(2, Math.floor(span / 3.2));
      for (let i = 1; i < count; i += 1) {
        const beam =
          alongX
            ? new THREE.BoxGeometry(0.16, 0.18, depth)
            : new THREE.BoxGeometry(width, 0.18, 0.16);
        const mesh = new THREE.Mesh(beam, materials.materials.rust);
        mesh.position.set(
          alongX ? room.min[0] + (span / count) * i : centerX,
          room.ceilingY - 0.1,
          alongX ? centerZ : room.min[1] + (span / count) * i,
        );
        scene.add(mesh);
        meshCount += 1;
      }
    }
  }

  // Muros con aperturas (los dinteles salen solos de `openings`/`bottom`).
  for (const wall of layout.walls) {
    for (const segment of splitWall(wall)) {
      const length = segment.to - segment.from;
      const height = segment.top - segment.bottom;
      if (length <= 0.001 || height <= 0.001) continue;
      const centerAlong = (segment.from + segment.to) / 2;
      const centerY = (segment.bottom + segment.top) / 2;
      const geometry =
        wall.axis === 'x'
          ? new THREE.BoxGeometry(length, height, wall.thickness)
          : new THREE.BoxGeometry(wall.thickness, height, length);
      const material = repeatMaterial(
        materials.materials[wall.material],
        Math.max(1, length / 2.6),
        Math.max(1, height / 2.6),
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        wall.axis === 'x' ? centerAlong : wall.at,
        centerY,
        wall.axis === 'x' ? wall.at : centerAlong,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      addStaticMesh(
        mesh,
        wall.axis === 'x'
          ? new THREE.Vector3(length / 2, height / 2, wall.thickness / 2)
          : new THREE.Vector3(wall.thickness / 2, height / 2, length / 2),
      );
    }
  }

  // Props.
  for (const spec of layout.props) {
    switch (spec.kind) {
      case 'light': {
        const actor = createLight(context, {
          id: spec.id,
          x: spec.x,
          y: spec.y ?? 2.6,
          z: spec.z,
          intensity: spec.intensity ?? 8,
          color: spec.color ?? 0xcfe0c6,
          flicker: spec.flicker,
          broken: spec.broken,
        });
        lights.push(actor);
        break;
      }
      case 'note': {
        const actor = createNote(context, spec);
        entities.add(actor.entity);
        notes.set(spec.noteId ?? spec.id, actor);
        break;
      }
      case 'tag': {
        const actor = createTag(context, spec);
        entities.add(actor.entity);
        tags.set(spec.tagId ?? spec.id, actor);
        break;
      }
      case 'fuse': {
        const actor = createFuse(context, spec);
        entities.add(actor.entity);
        fuses.set(spec.fuseId ?? spec.id, actor);
        break;
      }
      case 'bottle': {
        const actor = createBottlePickup(context, spec);
        entities.add(actor.entity);
        bottles.push(actor);
        break;
      }
      case 'steamVent': {
        const actor = createSteamVent(context, spec);
        steam.set(spec.id, actor);
        meshCount += 1;
        break;
      }
      case 'crawlerNest': {
        createCrawlerNest(context, spec);
        nests.push({ id: spec.id, x: spec.x, z: spec.z });
        meshCount += 1;
        break;
      }
      case 'pool': {
        createPool(context, spec);
        meshCount += 1;
        break;
      }
      case 'wellValve': {
        createWellValve(context, spec);
        meshCount += 1;
        break;
      }
      case 'filingCabinet': {
        createFilingCabinet(context, spec);
        meshCount += 1;
        break;
      }
      case 'safe': {
        createSafe(context, spec);
        meshCount += 1;
        break;
      }
      case 'mapBoard': {
        createMapBoard(context, spec);
        meshCount += 1;
        break;
      }
      case 'typewriter': {
        createTypewriter(context, spec);
        meshCount += 1;
        break;
      }
      case 'chain': {
        createChain(context, spec);
        meshCount += 1;
        break;
      }
      case 'bodyBag': {
        createBodyBag(context, spec);
        meshCount += 1;
        break;
      }
      case 'boiler': {
        createBoiler(context, spec);
        meshCount += 1;
        break;
      }
      case 'gauge': {
        createGauge(context, spec);
        meshCount += 1;
        break;
      }
      case 'battery': {
        const actor = createBatteryPickup(context, spec);
        entities.add(actor.entity);
        batteries.push(actor);
        break;
      }
      case 'breaker': {
        const actor = createBreaker(context, spec);
        entities.add(actor.entity);
        breakers.set(actor.id, actor);
        break;
      }
      case 'locker':
      case 'hideLocker': {
        const actor = createLocker(context, spec);
        entities.add(actor.entity);
        lockers.set(spec.id, actor);
        break;
      }
      case 'lift': {
        lift = createLift(context, spec);
        entities.add(lift.entity);
        break;
      }
      case 'radio': {
        radio = createRadio(context, spec);
        entities.add(radio.entity);
        break;
      }
      case 'pump':
        createPump(context, spec);
        meshCount += 1;
        break;
      case 'valve':
        createValve(context, spec);
        meshCount += 1;
        break;
      case 'pipe':
        createPipe(context, spec);
        meshCount += 1;
        break;
      case 'puddle':
        createPuddle(context, spec);
        meshCount += 1;
        break;
      case 'blood':
        createBloodDecal(context, spec);
        meshCount += 1;
        break;
      case 'drain':
        createDrain(context, spec);
        meshCount += 1;
        break;
      case 'hangingLamp':
        createCeilingLamp(context, spec);
        meshCount += 1;
        break;
      case 'plasticSheet':
        createPlasticSheet(context, spec);
        meshCount += 1;
        break;
      case 'cables':
        createCables(context, spec);
        meshCount += 1;
        break;
      case 'extinguisher':
        createExtinguisher(context, spec);
        meshCount += 1;
        break;
      case 'transformer':
        createTransformer(context, spec);
        meshCount += 1;
        break;
      case 'mirror':
        createMirror(context, spec);
        meshCount += 1;
        break;
      case 'bulkhead':
        createBulkhead(context, spec);
        meshCount += 1;
        break;
      case 'barrel':
        entities.add(createBarrel(context, spec));
        break;
      case 'crate':
        entities.add(createCrate(context, spec));
        break;
      case 'desk':
        createDesk(context, spec);
        meshCount += 1;
        break;
      case 'chair': {
        const chair = createChair(context, spec);
        chairs.set(spec.id, chair);
        meshCount += 1;
        break;
      }
      case 'bench':
        createBench(context, spec);
        meshCount += 1;
        break;
      case 'shelf':
        createShelf(context, spec);
        meshCount += 1;
        break;
      case 'body':
        createBody(context, spec);
        meshCount += 1;
        break;
    }
  }

  const liftActor: LiftActor | null = lift;
  const radioActor: RadioActor | null = radio;
  if (!liftActor) throw new Error('el layout no define el montacargas');
  if (!radioActor) throw new Error('el layout no define la radio');

  // Polvo suspendido: puntos baratos, animados con una sinusoide.
  const dust = makeDust(layout);
  scene.add(dust.points);

  // Linterna.
  const flashlight = new THREE.SpotLight(0xfff0cf, 0, 20, 0.55, 0.95, 1.2);
  flashlight.castShadow = false;
  flashlight.target.position.set(0, 0, 1);
  scene.add(flashlight, flashlight.target);
  const fill = new THREE.PointLight(0xbfd6c6, 0, 3.2, 2);
  scene.add(fill);

  const monster = createMonster(materials);
  scene.add(monster.group);

  let flickerTimer = 0;
  let blackoutTimer = 0;
  let power = true;
  let emergency = false;

  const world: World = {
    entities,
    lights,
    breakers,
    lockers,
    notes,
    tags,
    fuses,
    bottles,
    steam,
    chairs,
    nests,
    batteries,
    lift: liftActor,
    radio: radioActor,
    monster,
    flashlight,
    setBreaker(id: BreakerId, on: boolean): void {
      breakers.get(id)?.setOn(on);
    },
    setLiftOpen(open: boolean): void {
      liftActor.setOpen(open);
    },
    setPower(on: boolean): void {
      power = on;
      for (const light of lights) light.power = on;
    },
    setEmergency(on: boolean): void {
      emergency = on;
      for (const light of lights) light.emergency = on;
    },
    restoreLighting(): void {
      world.setPower(true);
      world.setEmergency(false);
      flickerTimer = 0.6;
    },
    flicker(seconds: number): void {
      flickerTimer = Math.max(flickerTimer, seconds);
    },
    blackout(seconds: number): void {
      blackoutTimer = Math.max(blackoutTimer, seconds);
      world.setPower(false);
    },
    setFlashlight(camera: THREE.Camera, on: boolean, strength: number): void {
      const direction = camera.getWorldDirection(new THREE.Vector3());
      flashlight.position.copy(camera.position);
      flashlight.target.position.copy(camera.position).addScaledVector(direction, 10);
      flashlight.intensity = on ? strength * 15 : 0;
      flashlight.visible = on && strength > 0.001;
      fill.position.copy(camera.position);
      fill.intensity = on ? strength * 0.5 : 0;
    },
    update(dt: number, elapsed: number, focus: THREE.Vector3): void {
      for (const light of lights) {
        light.scare = flickerTimer > 0 ? 1 : 0;
        light.light.visible = light.group.position.distanceTo(focus) < 24;
        light.update(dt, elapsed);
      }
      flickerTimer = Math.max(0, flickerTimer - dt);
      if (blackoutTimer > 0) {
        blackoutTimer -= dt;
        if (blackoutTimer <= 0) world.setPower(true);
      }
      if (emergency) {
        for (const light of lights) {
          if (light.baseIntensity > 0) light.light.color.setHex(0xff3822);
        }
      }
      for (const battery of batteries) battery.update(dt, elapsed);
      for (const bottle of bottles) bottle.update(elapsed);
      for (const tag of tags.values()) tag.update(elapsed);
      for (const fuse of fuses.values()) fuse.update(elapsed);
      for (const vent of steam.values()) vent.update(dt, elapsed);
      for (const locker of lockers.values()) locker.update(dt);
      for (const breaker of breakers.values()) breaker.update(dt, elapsed);
      liftActor.update(dt);
      radioActor.update(elapsed);
      dust.update(elapsed);
    },
    syncDynamic(): void {
      for (const entity of entities.all()) {
        if (!entity.body) continue;
        const translation = entity.body.translation();
        const rotation = entity.body.rotation();
        entity.root.position.set(translation.x, translation.y, translation.z);
        entity.root.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    },
    zoneAt(x: number, z: number): ZoneBox | undefined {
      return zoneAt(x, z);
    },
    stats(): { meshes: number; lights: number; points: number } {
      return { meshes: meshCount, lights: lights.length, points: dust.count };
    },
  };

  // Sombra falsa y barata bajo la criatura.
  const shadowTexture = radialShadow();
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  monster.group.add(blob);

  world.setPower(power);
  world.syncDynamic();
  return world;
}

function radialShadow(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(0,0,0,0.9)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface Dust {
  points: THREE.Points;
  count: number;
  update(elapsed: number): void;
}

function makeDust(layout: Layout): Dust {
  const rng = mulberry32(4242);
  const positions: number[] = [];
  const seeds: number[] = [];
  for (const room of layout.rooms) {
    const volume = (room.max[0] - room.min[0]) * (room.max[1] - room.min[1]);
    const count = Math.max(18, Math.min(110, Math.round(volume * 0.55)));
    for (let i = 0; i < count; i += 1) {
      positions.push(
        room.min[0] + rng() * (room.max[0] - room.min[0]),
        room.floorY + 0.3 + rng() * (room.ceilingY - 0.5),
        room.min[1] + rng() * (room.max[1] - room.min[1]),
      );
      seeds.push(rng() * Math.PI * 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xc7cdbe,
    size: 0.028,
    transparent: true,
    opacity: 0.34,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  const base = Float32Array.from(positions);
  const count = positions.length / 3;
  return {
    points,
    count,
    update(elapsed: number): void {
      const attribute = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i += 1) {
        const seed = seeds[i] ?? 0;
        const x = (base[i * 3] ?? 0) + Math.sin(elapsed * 0.11 + seed) * 0.32;
        const y = (base[i * 3 + 1] ?? 0) + Math.sin(elapsed * 0.07 + seed * 1.7) * 0.22;
        const z = (base[i * 3 + 2] ?? 0) + Math.cos(elapsed * 0.09 + seed) * 0.32;
        attribute.setXYZ(i, x, y, z);
      }
      attribute.needsUpdate = true;
    },
  };
}

/** Ajustes globales de escena que el motor aplica una sola vez. */
export function configureScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  scene.background = new THREE.Color(0x050607);
  scene.fog = new THREE.FogExp2(0x070a09, RENDER.fogDensity);
  const ambient = new THREE.HemisphereLight(0x4d5a4f, 0x0b0d0b, 0.4);
  scene.add(ambient);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
  scene.environmentIntensity = 0.12;
  pmrem.dispose();
}

