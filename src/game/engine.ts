import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MONSTER, NPC_GROUPS, PHYSICS, RENDER } from './core/config';
import { Input } from './core/input';
import {
  bus,
  DEFAULT_SETTINGS,
  type BreakerId,
  type EndingId,
  type FocusInfo,
  type NoteRecord,
  type Settings,
  type Snapshot,
} from './core/bus';
import { Physics } from './physics/physics';
import { PlayerController } from './player/player';
import { createMaterialSet, type MaterialSet } from './render/materials';
import { createPostFX, type PostFX } from './render/postfx';
import { audio } from './audio/audio';
import { buildWorld, configureScene, type World } from './world/world';
import { LAYOUT, MONSTER_SETPIECES, zoneAt } from './world/layout';
import { findPath, nearestNode, type NavNode } from './world/nav';
import { HunterBrain, type HunterState, type Senses } from './logic/hunter';
import {
  addCharge,
  createBattery,
  lightIsOn,
  lightStrength,
  playerNoise,
  tickBattery,
  toggleLight,
  type BatteryState,
} from './logic/battery';
import {
  addNoteRecord,
  createRun,
  isLiftUnlocked,
  objectiveFor,
  pulledCount,
  pullBreaker,
  type RunState,
} from './logic/objectives';
import {
  BREAKER_LINES,
  ENTITY_WHISPERS,
  LIFT_LINES,
  NOTES,
  noteById,
  ZONE_LINES,
} from './logic/story';
import { loadRun, saveRun } from './core/save';
import type { LockerActor, NoteActor, BatteryActor } from './world/props';

const FORWARD = new THREE.Vector3();
const PATROL_NODES = ['p1', 'p2', 'p3', 'p4', 'p5', 'w1', 'w2', 'w3', 'w4', 'c-2', 'c2', 's1', 's2', 'v1', 'e1', 'e2'];

export class Engine {
  private renderer!: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly physics = new Physics();
  private materials: MaterialSet | null = null;
  private world: World | null = null;
  private player: PlayerController | null = null;
  private input: Input | null = null;
  private postfx: PostFX | null = null;

  private raf = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private elapsed = 0;
  private running = false;
  private disposed = false;

  private sessionActive = false;
  private blocked = false;
  private dead = false;
  private endingOpen = false;
  private hidden = false;
  private hideLocker: LockerActor | null = null;
  private readonly hideView = new THREE.Vector3();
  private readonly hideLook = new THREE.Vector3();
  private hideYawBase = 0;

  private run: RunState;
  private battery: BatteryState = createBattery(76);
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private brain = new HunterBrain();

  private monsterBody: RAPIER.RigidBody | null = null;
  private monsterCollider: RAPIER.Collider | null = null;
  private monsterController: RAPIER.KinematicCharacterController | null = null;
  private monsterYaw = 0;
  private monsterPath: NavNode[] = [];
  private monsterPathIndex = 0;
  private monsterRepath = 0;
  private patrolNode: NavNode | null = null;
  private monsterState: HunterState = 'roam';
  private glimpseTimer = 0;
  private debugFreeze = false;

  private focus: FocusInfo | null = null;
  private focusKey = '';
  private currentZoneId = '';
  private zoneTimer = 0;
  private waypointTimer = 0;
  private poseTimer = 0;
  private batteryEmit = -1;
  private dangerBucket = -1;
  private footDistance = 0;
  private subtitleSeq = 0;
  private timers: number[] = [];
  private visited = new Set<string>();
  private ambientTimer = 22;
  private fear = 0;
  private flash = 0;
  private shake = 0;
  private fpsTime = 0;
  private fpsFrames = 0;
  private readonly isTouch =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(
      RENDER.fov,
      canvas.clientWidth / Math.max(1, canvas.clientHeight),
      RENDER.near,
      RENDER.far,
    );
    this.run = createRun();
    const loaded = loadRun();
    if (loaded) {
      this.run.breakers = loaded.breakers;
      this.run.notes = loaded.notes;
      this.run.deaths = loaded.deaths;
      this.run.elapsed = loaded.elapsed;
      this.run.ending = loaded.ending;
    }
  }

  async init(): Promise<void> {
    const started = performance.now();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = false;

    configureScene(this.scene, this.renderer);

    await this.physics.init();
    this.materials = createMaterialSet(this.renderer.capabilities.getMaxAnisotropy());
    this.world = buildWorld(this.scene, this.physics, this.materials, LAYOUT);
    this.player = new PlayerController(this.physics, LAYOUT.spawn);
    this.createMonsterBody();

    this.input = new Input(this.canvas);
    this.input.attach();
    this.input.enabled = false;

    this.postfx = createPostFX(this.renderer, this.scene, this.camera);
    this.wireEntities();
    this.applySavedRun();

    document.addEventListener('pointerlockchange', this.handlePointerLock);
    window.addEventListener('resize', this.handleResize);
    this.resize();

    this.running = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.installDebugBridge();
    bus.emit('engine:ready', { milliseconds: Math.round(performance.now() - started) });
  }

  // --------------------------------------------------------------- API

  getSnapshot(): Snapshot {
    return {
      breakers: { ...this.run.breakers },
      notes: [...this.run.notes],
      notesTotal: NOTES.length,
      objective: objectiveFor(this.run),
      liftUnlocked: isLiftUnlocked(this.run),
      ending: this.run.ending,
      elapsed: this.run.elapsed,
      deaths: this.run.deaths,
      hidden: this.hidden,
      battery: Math.round(this.battery.charge),
      flashlightOn: lightIsOn(this.battery),
    };
  }

  hasSave(): boolean {
    return this.run.breakers.b1 || this.run.breakers.b2 || this.run.breakers.b3 || this.run.notes.length > 0;
  }

  startSession(): void {
    if (!this.running) return;
    if (this.run.ending) {
      bus.emit('ending:show', { ending: this.run.ending });
      return;
    }
    if (this.sessionActive) return;
    this.sessionActive = true;
    this.blocked = false;
    this.dead = false;
    if (!this.battery.on && this.battery.charge > 5) this.battery.on = true;
    this.endingOpen = false;
    this.player?.teleport(LAYOUT.spawn.x, LAYOUT.spawn.y + 0.2, LAYOUT.spawn.z);
    if (this.player) {
      this.player.yaw = LAYOUT.spawn.yaw;
      this.player.pitch = 0;
    }
    this.player?.setBlocked(false);
    if (this.input) {
      this.input.enabled = true;
      this.input.reset();
    }
    this.applySavedRun();
    this.lockPointer();
    audio.unlock();
    audio.setVolume(this.settings.volume);
    this.world?.monster.setVisible(true);
    audio.setTension(0.1 + pulledCount(this.run) * 0.22);

    this.emitObjective();
    this.emitBattery(true);
    this.emitWaypoint();
    const startLine = this.hasSave()
      ? 'Sesión restaurada. El montacargas sigue donde lo dejó.'
      : 'La planta está en cuarentena. Rearme los tres breakers y vuelva al montacargas.';
    this.say(startLine, 'VERA', 'vera');
    this.saveNow();
  }

  pause(): void {
    this.blocked = true;
    if (this.input) {
      this.input.enabled = false;
      this.input.reset();
    }
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  resume(): void {
    if (!this.running || this.dead || this.endingOpen) return;
    this.blocked = false;
    if (this.input) this.input.enabled = true;
    this.lockPointer();
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    this.player?.setLook(settings.sensitivity, settings.invertY);
    audio.setVolume(settings.volume);
    this.resize();
  }

  setStick(x: number, y: number): void {
    this.input?.setStick(x, y);
  }

  addLook(dx: number, dy: number): void {
    this.input?.addLook(dx, dy);
  }

  setVirtualButton(action: 'sprint' | 'crouch', held: boolean): void {
    this.input?.setVirtual(action, held);
  }

  tapButton(action: 'use' | 'flashlight'): void {
    this.input?.tapVirtual(action);
  }

  saveNow(): boolean {
    const checkpoint = { x: LAYOUT.spawn.x, z: LAYOUT.spawn.z, yaw: LAYOUT.spawn.yaw };
    return saveRun({
      breakers: { ...this.run.breakers },
      notes: [...this.run.notes],
      elapsed: this.run.elapsed,
      deaths: this.run.deaths,
      ending: this.run.ending,
      checkpoint,
    });
  }

  retry(): void {
    if (!this.dead) return;
    this.dead = false;
    this.blocked = false;
    this.hidden = false;
    this.hideLocker = null;
    this.sessionActive = true;
    this.flash = 0;
    this.fear = 0.25;
    this.player?.teleport(LAYOUT.spawn.x, LAYOUT.spawn.y + 0.2, LAYOUT.spawn.z);
    if (this.player) {
      this.player.yaw = LAYOUT.spawn.yaw;
      this.player.pitch = 0;
      this.player.setBlocked(false);
    }
    this.battery = createBattery(62);
    this.battery.on = true;
    this.brain.reset('roam', this.aggression());
    this.placeMonster(MONSTER_SETPIECES.start.x, MONSTER_SETPIECES.start.z, MONSTER_SETPIECES.start.yaw);
    this.world?.setPower(true);
    this.world?.setEmergency(isLiftUnlocked(this.run));
    this.world?.setLiftOpen(isLiftUnlocked(this.run));
    this.world?.monster.setVisible(true);
    if (this.input) {
      this.input.enabled = true;
      this.input.reset();
    }
    this.lockPointer();
    this.emitBattery(true);
    this.emitObjective();
    bus.emit('hide:change', { hidden: false });
    this.saveNow();
  }

  chooseEnding(ending: EndingId): void {
    if (!this.endingOpen) return;
    this.endingOpen = false;
    this.run.ending = ending;
    this.saveNow();
    this.sessionActive = false;
    if (this.input) this.input.enabled = false;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    audio.play(ending === 'flood' ? 'slam' : 'door');
    bus.emit('ending:show', { ending });
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
    document.removeEventListener('pointerlockchange', this.handlePointerLock);
    window.removeEventListener('resize', this.handleResize);
    this.input?.detach();
    this.materials?.dispose();
    this.renderer?.dispose();
  }

  // ------------------------------------------------------------ montaje

  private createMonsterBody(): void {
    const halfHeight = (MONSTER.height - MONSTER.radius * 2) / 2;
    const centerY = halfHeight + MONSTER.radius;
    this.monsterBody = this.physics.w.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        MONSTER_SETPIECES.start.x,
        centerY,
        MONSTER_SETPIECES.start.z,
      ),
    );
    this.monsterCollider = this.physics.w.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, MONSTER.radius).setCollisionGroups(NPC_GROUPS),
      this.monsterBody,
    );
    this.monsterController = this.physics.w.createCharacterController(0.03);
    this.monsterController.enableAutostep(0.4, 0.2, true);
    this.monsterController.enableSnapToGround(0.5);
    this.monsterController.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
    this.monsterController.setSlideEnabled(true);
    this.monsterYaw = MONSTER_SETPIECES.start.yaw;
    this.patrolNode = LAYOUT.nav.nodes.find((node) => node.id === 'p2') ?? null;
  }

  private wireEntities(): void {
    const world = this.world;
    if (!world) return;

    for (const [noteId, actor] of world.notes) {
      actor.entity.onUse = () => this.collectNote(noteId, actor);
    }
    for (const actor of world.batteries) {
      actor.entity.onUse = () => this.pickBattery(actor);
    }
    for (const [id, actor] of world.breakers) {
      actor.entity.onUse = () => this.pullBreaker(id);
    }
    for (const actor of world.lockers.values()) {
      actor.entity.onUse = () => this.toggleHide(actor);
    }
    world.lift.entity.onUse = () => this.useLift();
    world.radio.entity.onUse = () => this.useRadio();
  }

  private applySavedRun(): void {
    const world = this.world;
    if (!world) return;
    for (const id of ['b1', 'b2', 'b3'] as BreakerId[]) {
      if (this.run.breakers[id]) world.setBreaker(id, true);
    }
    for (const id of this.run.notes) {
      world.notes.get(id)?.take();
    }
    if (isLiftUnlocked(this.run)) world.setLiftOpen(true);
    world.setEmergency(isLiftUnlocked(this.run));
    this.brain.aggression = this.aggression();
    audio.setTension(0.1 + pulledCount(this.run) * 0.22);
  }

  private aggression(): number {
    return Math.min(1, pulledCount(this.run) / 3);
  }

  // ------------------------------------------------------------- bucle

  private handleResize = (): void => this.resize();

  private resize(): void {
    if (!this.renderer) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const scale = RENDER.renderScale[this.settings.quality];
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(Math.max(2, Math.round(width * scale)), Math.max(2, Math.round(height * scale)), false);
    this.postfx?.resize(this.renderer.domElement.width, this.renderer.domElement.height);
  }

  private handlePointerLock = (): void => {
    if (this.isTouch) return;
    const locked = document.pointerLockElement === this.canvas;
    bus.emit('capture:change', { locked });
    if (this.input) {
      this.input.enabled = locked && !this.blocked && !this.dead && !this.endingOpen;
      if (!locked) this.input.reset();
    }
  };

  private lockPointer(): void {
    if (this.isTouch) {
      bus.emit('capture:change', { locked: true });
      return;
    }
    try {
      const request = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (request && typeof request.catch === 'function') request.catch(() => undefined);
    } catch {
      // el navegador puede exigir un gesto; la UI ofrece "continuar"
    }
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const rawDt = Math.min(0.1, Math.max(0.0001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.elapsed += rawDt;

    if (this.input && this.sessionActive && !this.blocked && !this.dead && !this.endingOpen) {
      const mouse = this.input.consumeMouse();
      if (mouse.dx !== 0 || mouse.dy !== 0) {
        this.player?.handleLook(mouse.dx, mouse.dy);
        if (this.hidden && this.player) {
          this.player.yaw = clampAngle(this.player.yaw, this.hideYawBase, 0.62);
          this.player.pitch = Math.max(-0.3, Math.min(0.26, this.player.pitch));
        }
      }
    }

    this.accumulator += rawDt;
    let steps = 0;
    while (this.accumulator >= PHYSICS.step && steps < PHYSICS.maxSubSteps) {
      this.fixedStep(PHYSICS.step);
      this.accumulator -= PHYSICS.step;
      steps += 1;
    }
    if (steps === PHYSICS.maxSubSteps) this.accumulator = 0;
    const alpha = this.accumulator / PHYSICS.step;

    this.applyCamera(alpha, rawDt);
    this.syncMonsterVisual();
    this.world?.update(rawDt, this.elapsed, this.camera.position);
    this.world?.syncDynamic();
    this.updateFlashlight();
    this.updateFocus();
    this.updateDangerVisual(rawDt);

    if (this.world && this.player) {
      this.world.monster.update(
        rawDt,
        this.elapsed,
        this.monsterState,
        this.monsterState === 'roam' ? 0.8 : 2.6,
        this.camera.position,
      );
    }

    if (this.postfx) {
      this.postfx.grade.uniforms.uTime.value = this.elapsed;
      this.postfx.grade.uniforms.uFear.value = this.fear;
      this.postfx.grade.uniforms.uFlash.value = this.flash;
      this.postfx.bloom.strength = this.settings.quality === 'low' ? 0.12 : 0.2;
      this.postfx.render();
    }
    this.measureFps(rawDt);
  };

  private fixedStep(dt: number): void {
    const player = this.player;
    const input = this.input;
    if (!player || !input || !this.world) return;

    const active = this.sessionActive && !this.dead && !this.endingOpen && !this.blocked;

    if (active && !this.blocked && !this.hidden) {
      player.fixedUpdate(dt, input, this.physics);
    }

    this.updateMonster(dt, active);
    this.physics.step();
    player.postStep();

    if (active && !this.blocked) {
      if (input.consumePress('use')) this.tryInteract();
      if (input.consumePress('flashlight')) this.toggleFlashlight();
    } else {
      input.clearPresses();
    }

    if (active) {
      this.run.elapsed += dt;
      if (tickBattery(this.battery, dt)) {
        audio.play('lightOff');
        this.say('La linterna se apagó. Busque una pila.', 'TÚ', 'self');
        this.emitBattery(true);
      }
      this.updateFootsteps(dt);
      this.updateZones(dt);
      this.updateWaypoint(dt);
      this.emitPose(dt);
      this.ambientTimer -= dt;
      if (this.ambientTimer <= 0) this.ambientScare();
    }

    const distance = this.monsterDistance();
    const danger = this.hidden ? 0.18 : this.dangerLevel(distance);
    this.fear += (danger - this.fear) * Math.min(1, dt * 2.2);
    if (active) {
      audio.update(dt, {
        danger,
        hidden: this.hidden,
        moving: player.speed > 0.2,
        sprinting: player.sprinting,
        crouched: player.crouched,
      });
    }
    this.emitDanger(danger);
    this.panMonster(distance);
    this.emitBattery(false);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
  }

  // ------------------------------------------------------------- camara

  private applyCamera(alpha: number, dt: number): void {
    if (!this.player) return;
    this.camera.fov += ((this.hidden ? 58 : RENDER.fov) - this.camera.fov) * Math.min(1, dt * 6);
    this.camera.updateProjectionMatrix();

    if (this.hidden) {
      this.camera.position.copy(this.hideView);
      this.camera.quaternion.setFromEuler(
        new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ'),
      );
      return;
    }
    if (this.sessionActive && !this.endingOpen) {
      this.player.applyCamera(this.camera, alpha);
      if (this.shake > 0.001) {
        this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.14;
        this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.12;
      }
      return;
    }
    const t = this.elapsed * 0.11;
    this.camera.position.set(Math.sin(t) * 2.7, 1.72 + Math.sin(t * 0.7) * 0.18, -7.9 + Math.cos(t) * 2.2);
    this.camera.lookAt(0, 1.45, -10.5);
  }

  private updateFlashlight(): void {
    const on = lightIsOn(this.battery) && !this.hidden;
    this.world?.setFlashlight(this.camera, on, lightStrength(this.battery, this.elapsed));
  }

  // ------------------------------------------------------------ criatura

  private monsterDistance(): number {
    if (!this.player) return 999;
    const body = this.monsterBody?.translation();
    if (!body) return 999;
    return Math.hypot(body.x - this.player.eye.x, body.z - this.player.eye.z);
  }

  private dangerLevel(distance: number): number {
    const proximity = Math.max(0, Math.min(1, 1 - distance / 17));
    const base = this.monsterState === 'hunt' ? 0.62 : this.monsterState === 'investigate' ? 0.34 : 0.08;
    return Math.max(0, Math.min(1, base + proximity * 0.6));
  }

  private updateMonster(dt: number, active: boolean): void {
    const player = this.player;
    const body = this.monsterBody;
    const collider = this.monsterCollider;
    const controller = this.monsterController;
    if (!player || !body || !collider || !controller) return;

    if (this.debugFreeze) {
      this.monsterState = 'roam';
      return;
    }

    if (this.glimpseTimer > 0) {
      this.glimpseTimer -= dt;
      this.monsterState = 'roam';
      if (this.glimpseTimer <= 0) {
        this.placeMonster(MONSTER_SETPIECES.start.x, MONSTER_SETPIECES.start.z, MONSTER_SETPIECES.start.yaw);
      }
      return;
    }

    if (!active) {
      this.monsterState = 'roam';
      return;
    }

    const position = body.translation();
    const dx = player.eye.x - position.x;
    const dz = player.eye.z - position.z;
    const distance = Math.hypot(dx, dz);
    const forwardX = Math.sin(this.monsterYaw);
    const forwardZ = Math.cos(this.monsterYaw);
    const dot = distance < 0.001 ? 1 : (dx * forwardX + dz * forwardZ) / distance;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    const origin = new THREE.Vector3(position.x, position.y + 0.15, position.z);
    const target = new THREE.Vector3(player.eye.x, player.eye.y - 0.35, player.eye.z);
    const direction = target.clone().sub(origin);
    const length = direction.length();
    const hit = this.physics.castRay(origin, direction.normalize(), length, collider);
    const hasLOS = !hit || hit.distance >= length - 0.45;

    const senses: Senses = {
      distance,
      angle,
      hasLOS,
      noise: this.hidden ? 0 : playerNoise(player.speed, player.sprinting, player.crouched),
      hidden: this.hidden,
      flashlight: lightIsOn(this.battery) && !this.hidden,
    };

    this.brain.aggression = this.aggression();
    const decision = this.brain.update(dt, senses);
    this.monsterState = decision.state;

    if (decision.alerted) {
      audio.play('growl');
      this.world?.flicker(1.4);
      this.say(
        ENTITY_WHISPERS[Math.floor(Math.random() * ENTITY_WHISPERS.length)] ?? 'TE VEO',
        'EL HUÉSPED',
        'entity',
      );
    }

    if (this.hidden) {
      this.emitDanger(0.18);
    }

    if (!this.hidden && distance < Math.min(MONSTER.catchDistance, 1.0)) {
      this.die('Te alcanzó en la oscuridad.');
      return;
    }
    if (!this.hidden && decision.state === 'hunt' && distance < MONSTER.catchDistance) {
      this.die('Te alcanzó en la oscuridad.');
      return;
    }

    const direct = decision.state === 'hunt' && senses.hasLOS;
    this.monsterRepath -= dt;
    if (direct) {
      this.monsterPath = [];
      this.monsterPathIndex = 0;
    } else if (this.monsterRepath <= 0) {
      this.monsterRepath = 0.45;
      this.computeMonsterPath(decision.state);
    }

    let goalX = position.x;
    let goalZ = position.z;
    if (direct) {
      goalX = player.eye.x;
      goalZ = player.eye.z;
    } else if (this.monsterPath.length > 0) {
      while (
        this.monsterPathIndex < this.monsterPath.length - 1 &&
        Math.hypot(
          (this.monsterPath[this.monsterPathIndex]?.x ?? position.x) - position.x,
          (this.monsterPath[this.monsterPathIndex]?.z ?? position.z) - position.z,
        ) < 0.55
      ) {
        this.monsterPathIndex += 1;
      }
      const node = this.monsterPath[this.monsterPathIndex];
      if (node) {
        goalX = node.x;
        goalZ = node.z;
      }
    } else if (this.patrolNode) {
      goalX = this.patrolNode.x;
      goalZ = this.patrolNode.z;
    }

    let dirX = goalX - position.x;
    let dirZ = goalZ - position.z;
    const dirLength = Math.hypot(dirX, dirZ);
    if (dirLength > 0.001) {
      dirX /= dirLength;
      dirZ /= dirLength;
    } else {
      dirX = 0;
      dirZ = 0;
    }

    const speed = this.hidden
      ? MONSTER.patrolSpeed
      : decision.state === 'hunt'
        ? decision.speed
        : decision.speed;
    const wantedYaw = Math.atan2(dirX, dirZ);
    this.monsterYaw = lerpAngle(this.monsterYaw, wantedYaw, Math.min(1, dt * 5.5));

    const desired = { x: dirX * speed * dt, y: -0.08 * dt, z: dirZ * speed * dt };
    controller.computeColliderMovement(collider, desired);
    const movement = controller.computedMovement();
    body.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: position.y + movement.y,
      z: position.z + movement.z,
    });

    if (!direct && this.monsterPath.length > 0) {
      const last = this.monsterPath[this.monsterPath.length - 1];
      if (last && Math.hypot(last.x - goalX, last.z - goalZ) < 0.001) {
        // Al llegar al final de una ruta de patrulla se elige otro destino.
      }
    }
    if (this.patrolNode && Math.hypot(position.x - this.patrolNode.x, position.z - this.patrolNode.z) < 0.9) {
      this.pickPatrol();
    }
  }

  private computeMonsterPath(state: HunterState): void {
    const player = this.player;
    const body = this.monsterBody;
    if (!player || !body) return;
    const position = body.translation();
    const from = nearestNode(LAYOUT.nav, position.x, position.z);
    let goal: NavNode | null = null;
    if (state === 'hunt' || state === 'investigate') {
      goal = nearestNode(LAYOUT.nav, player.eye.x, player.eye.z);
    } else {
      if (!this.patrolNode) this.pickPatrol();
      goal = this.patrolNode;
    }
    if (!goal) return;
    const path = findPath(LAYOUT.nav, from.id, goal.id);
    this.monsterPath = path.nodes.slice(1);
    this.monsterPathIndex = 0;
  }

  private pickPatrol(): void {
    const candidates = PATROL_NODES.filter((id) => id !== this.patrolNode?.id);
    const id = candidates[Math.floor(Math.random() * candidates.length)] ?? 'p2';
    this.patrolNode = LAYOUT.nav.nodes.find((node) => node.id === id) ?? null;
    this.monsterRepath = 0;
  }

  private placeMonster(x: number, z: number, yaw: number): void {
    if (!this.monsterBody) return;
    const halfHeight = (MONSTER.height - MONSTER.radius * 2) / 2;
    const centerY = halfHeight + MONSTER.radius;
    this.monsterBody.setTranslation({ x, y: centerY, z }, true);
    this.monsterBody.setNextKinematicTranslation({ x, y: centerY, z });
    this.monsterYaw = yaw;
    this.monsterPath = [];
    this.monsterPathIndex = 0;
    this.monsterRepath = 0;
    this.syncMonsterVisual();
  }

  private syncMonsterVisual(): void {
    const body = this.monsterBody;
    const world = this.world;
    if (!body || !world) return;
    const translation = body.translation();
    const halfHeight = (MONSTER.height - MONSTER.radius * 2) / 2;
    world.monster.group.position.set(
      translation.x,
      translation.y - halfHeight - MONSTER.radius,
      translation.z,
    );
    world.monster.group.rotation.y = this.monsterYaw;
  }

  private panMonster(distance: number): void {
    const player = this.player;
    const body = this.monsterBody;
    if (!player || !body) return;
    const position = body.translation();
    const dx = position.x - player.eye.x;
    const dz = position.z - player.eye.z;
    const length = Math.hypot(dx, dz) || 1;
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);
    const pan = ((dx / length) * rightX + (dz / length) * rightZ) * (this.hidden ? 0.4 : 1);
    const proximity = Math.max(0, Math.min(1, 1 - distance / 20));
    audio.setMonster(pan, proximity, this.monsterState === 'hunt');
  }

  // -------------------------------------------------------- interaccion

  private updateFocus(): void {
    if (!this.sessionActive || this.blocked || this.dead || this.endingOpen || this.hidden) {
      this.setFocus(null);
      return;
    }
    const direction = this.camera.getWorldDirection(FORWARD);
    const hit = this.physics.castRay(
      this.camera.position,
      direction,
      2.6,
      this.player?.collider ?? null,
    );
    const entity = hit && this.world ? this.world.entities.fromCollider(hit.collider) : undefined;
    if (entity && entity.enabled) {
      this.setFocus({
        id: entity.id,
        kind: entity.kind,
        label: entity.label,
        prompt: entity.prompt,
        enabled: true,
      });
    } else {
      this.setFocus(null);
    }
  }

  private setFocus(focus: FocusInfo | null): void {
    const key = focus ? `${focus.id}|${focus.prompt}` : '';
    if (key === this.focusKey) return;
    this.focusKey = key;
    this.focus = focus;
    bus.emit('focus:change', { focus });
  }

  private tryInteract(): void {
    if (this.hidden) {
      this.exitHide();
      return;
    }
    const focus = this.focus;
    if (!focus) return;
    const entity = this.world?.entities.byEntityId(focus.id);
    if (entity?.enabled) entity.onUse?.();
  }

  private collectNote(noteId: string, actor: NoteActor): void {
    const note = noteById(noteId);
    if (!note) return;
    if (!addNoteRecord(this.run, note)) return;
    actor.take();
    audio.play('pickup');
    const record: NoteRecord = {
      id: note.id,
      title: note.title,
      author: note.author,
      zone: note.zone,
      lines: note.lines,
    };
    bus.emit('note:found', { note: record, total: this.run.notes.length, max: NOTES.length });
    bus.emit('toast', { kind: 'note', title: note.title, body: `${note.author} · nota ${this.run.notes.length}/${NOTES.length}` });
    this.saveNow();
  }

  private pickBattery(actor: BatteryActor): void {
    const gained = addCharge(this.battery);
    if (gained <= 0.5) return;
    actor.take();
    audio.play('pickup');
    bus.emit('toast', { kind: 'info', title: 'PILA RECOGIDA', body: `Carga: ${Math.round(this.battery.charge)} %` });
    this.emitBattery(true);
  }

  private toggleFlashlight(): void {
    if (this.hidden) return;
    const on = toggleLight(this.battery);
    audio.play('click');
    this.emitBattery(true);
    if (!on && this.battery.charge <= 0) this.say('La pila está vacía.', 'TÚ', 'self');
  }

  private pullBreaker(id: BreakerId): void {
    if (this.run.breakers[id]) {
      this.say('Ese breaker ya está rearmado.', 'TÚ', 'self');
      return;
    }
    pullBreaker(this.run, id);
    this.world?.setBreaker(id, true);
    this.world?.flicker(2.4);
    audio.play('breaker');
    this.brain.aggression = this.aggression();
    this.emitObjective();
    this.emitBattery(true);
    this.saySequence(BREAKER_LINES[id], 'VERA', 'vera');
    this.saveNow();

    if (id === 'b1') {
      this.placeMonster(-18.6, -8.6, 0.6);
      this.saySequence(['Algo se ha movido en la sala de bombas. No era yo.'], 'VERA', 'vera');
    } else if (id === 'b2') {
      this.audioSlam();
      this.world?.flicker(1.8);
      this.placeMonster(-17.4, -0.8, Math.PI / 2);
    } else {
      this.world?.blackout(3.2);
      this.world?.setEmergency(true);
      this.world?.setLiftOpen(true);
      this.brain.reset('hunt', 1);
      this.placeMonster(8.6, -3.4, Math.PI);
      this.flash = 0.55;
      audio.play('scream');
      this.shake = 1;
      this.saySequence(['B3 rearmado. La planta ya sabe dónde está.', 'CORRA. No mire atrás.'], 'VERA', 'vera');
    }
  }

  private audioSlam(): void {
    audio.play('slam');
    const locker = this.world?.lockers.get('locker-v3') ?? null;
    locker?.setOpen(true);
    this.later(() => locker?.setOpen(false), 900);
  }

  private toggleHide(locker: LockerActor): void {
    if (!locker.hide) {
      locker.setOpen(!locker.open);
      audio.play('locker');
      return;
    }
    if (this.hidden) {
      this.exitHide();
      return;
    }
    this.hidden = true;
    this.hideLocker = locker;
    locker.setOpen(false);
    this.battery.on = false;
    audio.play('locker');
    audio.play('gasp');
    const rotation = locker.entity.root.rotation.y;
    const forward = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
    this.hideYawBase = rotation;
    this.hideView.copy(locker.entity.root.position).addScaledVector(forward, -0.02);
    this.hideView.y = 1.48;
    this.hideLook.copy(this.hideView).addScaledVector(forward, 1);
    if (this.player) {
      this.player.yaw = rotation;
      this.player.pitch = 0;
    }
    this.player?.setBlocked(true);
    bus.emit('hide:change', { hidden: true });
    this.say('Respira despacio. No enciendas la linterna.', 'TÚ', 'self');
    this.emitBattery(true);
  }

  private exitHide(): void {
    if (!this.hidden) return;
    this.hidden = false;
    const locker = this.hideLocker;
    locker?.setOpen(false);
    this.hideLocker = null;
    this.player?.setBlocked(false);
    bus.emit('hide:change', { hidden: false });
    audio.play('locker');
  }

  private useLift(): void {
    if (!isLiftUnlocked(this.run)) {
      audio.play('error');
      this.saySequence(LIFT_LINES.locked, 'VERA', 'vera');
      return;
    }
    if (this.endingOpen) return;
    this.endingOpen = true;
    this.blocked = true;
    if (this.input) this.input.enabled = false;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.world?.setLiftOpen(true);
    audio.play('door');
    this.saySequence(LIFT_LINES.unlocked, 'VERA', 'vera');
    this.saveNow();
    bus.emit('ending:ready', {
      notes: this.run.notes.length,
      notesTotal: NOTES.length,
      elapsed: this.run.elapsed,
      deaths: this.run.deaths,
    });
  }

  private useRadio(): void {
    audio.play('radio');
    const pulled = pulledCount(this.run);
    const line =
      pulled === 0
        ? 'B1 en la sala de bombas. B2 en el taller. B3 al fondo del pasillo sur.'
        : pulled === 1
          ? 'B1 en línea. Vaya al taller. No corra por el pasillo: los conductos amplifican todo.'
          : pulled === 2
            ? 'Falta B3. Está en la subestación, detrás de los transformadores.'
            : 'Los tres breakers están rearmados. Vuelva al montacargas de la garita.';
    this.saySequence([line], 'VERA', 'vera');
  }

  // -------------------------------------------------------------- mundo

  private updateFootsteps(dt: number): void {
    const player = this.player;
    if (!player) return;
    if (this.hidden) {
      this.footDistance = 0;
      return;
    }
    this.footDistance += player.speed * dt;
    const stride = player.sprinting ? 1.15 : player.crouched ? 1.9 : 1.5;
    if (this.footDistance >= stride) {
      this.footDistance = 0;
      const zone = this.currentZoneId;
      const surface = zone === 'pasillo-norte' || zone === 'pasillo-sur' ? 'grate' : 'concrete';
      audio.footstep(surface, player.sprinting, player.crouched);
    }
  }

  private updateZones(dt: number): void {
    this.zoneTimer += dt;
    if (this.zoneTimer < 0.35 || !this.player) return;
    this.zoneTimer = 0;
    const zone = zoneAt(this.player.eye.x, this.player.eye.z);
    if (!zone || zone.id === this.currentZoneId) return;
    this.currentZoneId = zone.id;
    bus.emit('zone:enter', { zoneId: zone.id, name: zone.banner });
    const first = !this.visited.has(zone.id);
    this.visited.add(zone.id);
    if (first) this.onZoneFirstVisit(zone.id);
    const lines = ZONE_LINES[zone.id];
    if (lines?.[0] && Math.random() > 0.15) {
      this.later(() => this.say(lines[0] as string, 'VERA', 'vera'), 2200);
    }
  }

  private onZoneFirstVisit(zoneId: string): void {
    if (zoneId === 'sala-bombas') {
      this.placeMonster(MONSTER_SETPIECES.pumpGlimpse.x, MONSTER_SETPIECES.pumpGlimpse.z, MONSTER_SETPIECES.pumpGlimpse.yaw);
      this.glimpseTimer = 1.7;
      audio.play('growl');
      this.world?.flicker(1.1);
      this.later(() => this.say('¿Hay alguien en la sala?', 'TÚ', 'self'), 500);
    } else if (zoneId === 'vestuario') {
      audio.play('slam');
      audio.play('locker');
      this.world?.flicker(0.8);
      this.shake = 0.45;
    } else if (zoneId === 'subestacion') {
      this.world?.flicker(1.6);
      audio.play('metalGroan');
    } else if (zoneId === 'pasillo-sur') {
      audio.play('whisper');
      this.flash = 0.18;
    }
  }

  private updateWaypoint(dt: number): void {
    this.waypointTimer += dt;
    if (this.waypointTimer < 0.6 || !this.player) return;
    this.waypointTimer = 0;
    this.emitWaypoint();
  }

  private emitWaypoint(): void {
    const player = this.player;
    if (!player || !this.sessionActive) return;
    const order: BreakerId[] = ['b1', 'b2', 'b3'];
    const nextBreaker = order.find((id) => !this.run.breakers[id]);
    let point: { x: number; z: number; label: string } | null = null;
    if (nextBreaker) {
      const actor = this.world?.breakers.get(nextBreaker);
      if (actor) {
        const position = actor.entity.root.position;
        point = { x: position.x, z: position.z, label: `BREAKER ${nextBreaker.toUpperCase()}` };
      }
    } else if (this.world) {
      point = {
        x: this.world.lift.entity.root.position.x,
        z: this.world.lift.entity.root.position.z,
        label: 'MONTACARGAS',
      };
    }
    if (!point) return;
    bus.emit('waypoint', {
      waypoint: {
        x: point.x,
        z: point.z,
        label: point.label,
        distance: Math.round(Math.hypot(point.x - player.eye.x, point.z - player.eye.z)),
      },
    });
  }

  private emitPose(dt: number): void {
    const player = this.player;
    if (!player) return;
    this.poseTimer += dt;
    if (this.poseTimer < 0.15) return;
    this.poseTimer = 0;
    bus.emit('player:pose', { x: player.eye.x, z: player.eye.z, yaw: player.yaw });
  }

  private emitObjective(): void {
    bus.emit('objective:change', { objective: objectiveFor(this.run) });
  }

  private emitBattery(force: boolean): void {
    const value = Math.round(this.battery.charge);
    if (!force && Math.abs(value - this.batteryEmit) < 1) return;
    if (!force && value === this.batteryEmit) return;
    this.batteryEmit = value;
    bus.emit('battery:change', { charge: value, on: lightIsOn(this.battery) });
  }

  private emitDanger(danger: number): void {
    const bucket = Math.round(danger * 10);
    if (bucket === this.dangerBucket) return;
    this.dangerBucket = bucket;
    bus.emit('danger:change', {
      danger,
      state: this.monsterState,
    });
  }

  private updateDangerVisual(dt: number): void {
    // La respiracion del encuadre y el pulso rojo viven en el shader; aqui solo
    // se amortigua el flash de impacto.
    this.flash = Math.max(0, this.flash - dt * 0.8);
  }

  private ambientScare(): void {
    this.ambientTimer = 16 + Math.random() * 22;
    if (!this.sessionActive || this.dead || this.hidden) return;
    if (this.monsterState === 'hunt') {
      this.ambientTimer = 8;
      return;
    }
    const roll = Math.random();
    if (roll < 0.25) {
      audio.play('drip');
    } else if (roll < 0.45) {
      audio.play('metalGroan');
      this.world?.flicker(0.8);
    } else if (roll < 0.62) {
      audio.play('whisper');
      this.flash = 0.12;
    } else if (roll < 0.78) {
      audio.play('slam');
      this.world?.flicker(0.5);
    } else if (roll < 0.9) {
      audio.play('locker');
    } else {
      audio.play('gasp');
      this.say(ENTITY_WHISPERS[Math.floor(Math.random() * ENTITY_WHISPERS.length)] ?? 'QUÉDATE', 'EL HUÉSPED', 'entity');
    }
  }

  private die(cause: string): void {
    if (this.dead || this.endingOpen) return;
    this.dead = true;
    this.run.deaths += 1;
    this.flash = 1;
    this.shake = 1;
    audio.play('death');
    audio.play('scream');
    const player = this.player;
    if (player) {
      const forwardX = -Math.sin(player.yaw);
      const forwardZ = -Math.cos(player.yaw);
      this.placeMonster(player.eye.x + forwardX * 1.6, player.eye.z + forwardZ * 1.6, player.yaw);
      player.pitch = 0.16;
      this.world?.monster.setVisible(true);
    }
    this.player?.setBlocked(true);
    if (this.input) this.input.enabled = false;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    bus.emit('hide:change', { hidden: false });
    this.hidden = false;
    // 480 ms de criatura en primer plano antes del cartel: el susto necesita
    // verse, no solo oirse.
    this.later(() => bus.emit('death', { cause, deaths: this.run.deaths }), 480);
    this.saveNow();
  }

  // ------------------------------------------------------------- textos

  private say(text: string, speaker: string, tone: 'vera' | 'self' | 'entity'): void {
    this.subtitleSeq += 1;
    if (speaker === 'VERA') audio.radio();
    if (tone === 'entity') audio.play('whisper');
    bus.emit('subtitle', { id: this.subtitleSeq, speaker, text, tone });
  }

  private saySequence(lines: string[], speaker: string, tone: 'vera' | 'self' | 'entity'): void {
    lines.forEach((line, index) => {
      this.later(() => this.say(line, speaker, tone), index * 3800);
    });
  }

  private later(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      if (!this.disposed) fn();
    }, ms);
    this.timers.push(id);
    if (this.timers.length > 40) this.timers.splice(0, 15);
  }

  private measureFps(dt: number): void {
    this.fpsTime += dt;
    this.fpsFrames += 1;
    if (this.fpsTime >= 0.6) {
      bus.emit('perf', { fps: Math.round(this.fpsFrames / this.fpsTime) });
      this.fpsTime = 0;
      this.fpsFrames = 0;
    }
  }

  // --------------------------------------------------------------- debug

  private installDebugBridge(): void {
    if (!import.meta.env.DEV) return;
    const bridge = {
      engine: this,
      teleport: (x: number, z: number, yaw?: number) => {
        this.player?.teleport(x, 0.2, z);
        if (this.player && typeof yaw === 'number') this.player.yaw = yaw;
      },
      look: (yaw: number, pitch: number) => {
        if (!this.player) return;
        this.player.yaw = yaw;
        this.player.pitch = pitch;
      },
      breakers: (count: number) => {
        const ids: BreakerId[] = ['b1', 'b2', 'b3'];
        for (let i = 0; i < count; i += 1) {
          const id = ids[i];
          if (id) this.pullBreaker(id);
        }
      },
      battery: (value: number) => {
        this.battery.charge = value;
        this.emitBattery(true);
      },
      kill: () => this.die('debug'),
      ending: (choice: EndingId) => {
        this.endingOpen = true;
        this.chooseEnding(choice);
      },
      freeze: (on: boolean) => {
        this.debugFreeze = on;
      },
      hide: () => {
        const locker = this.world?.lockers.get('locker-v3');
        if (locker) this.toggleHide(locker);
      },
      state: () => ({
        snapshot: this.getSnapshot(),
        monster: this.monsterState,
        distance: Math.round(this.monsterDistance()),
        hidden: this.hidden,
        dead: this.dead,
        zone: this.currentZoneId,
        focus: this.focus,
        fps: this.fpsFrames,
      }),
    };
    (window as unknown as { __turnoNoche?: typeof bridge }).__turnoNoche = bridge;
  }

}

function clampAngle(value: number, base: number, limit: number): number {
  let delta = ((value - base + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  delta = Math.max(-limit, Math.min(limit, delta));
  return base + delta;
}

function lerpAngle(from: number, to: number, t: number): number {
  let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

export type { EndingId };
