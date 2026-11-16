/**
 * Tunables del motor. Unidades: metros, segundos, radianes.
 * El movimiento conserva el modelo de Source (friccion + accelerate) pero a
 * velocidades de terror: caminar despacio, correr ruidoso, agacharse lento.
 */

export const PLAYER = {
  radius: 0.34,
  standHeight: 1.79,
  crouchHeight: 1.16,
  eyeDrop: 0.14,
  walkSpeed: 3.35,
  sprintSpeed: 5.9,
  crouchSpeed: 1.5,
  groundAccel: 10,
  airAccel: 2.2,
  airWishCap: 1.0,
  friction: 7.2,
  stopSpeed: 1.1,
  jumpSpeed: 4.9,
  gravity: 20,
  stepHeight: 0.42,
  snapToGround: 0.4,
  maxSlopeDeg: 46,
  mouseSensitivity: 0.0021,
  pitchLimit: Math.PI / 2 - 0.02,
} as const;

export const INTERACT = {
  reach: 2.6,
} as const;

export const PHYSICS = {
  step: 1 / 60,
  maxSubSteps: 4,
  gravity: -20,
} as const;

export const RENDER = {
  fov: 74,
  near: 0.05,
  far: 90,
  fogDensity: 0.068,
  /** Escala interna de render: menos pixeles, mas tension y mas fps en movil. */
  renderScale: { low: 0.56, medium: 0.7, high: 0.86 } as const,
} as const;

export const FLASHLIGHT = {
  /** Carga en puntos (0..100). */
  maxCharge: 100,
  drainPerSecond: 0.5,
  pickupCharge: 38,
  range: 17,
  angle: 0.44,
  penumbra: 0.85,
  intensity: 24,
} as const;

export const MONSTER = {
  radius: 0.36,
  height: 2.15,
  patrolSpeed: 1.25,
  huntSpeed: 3.55,
  viewRange: 15,
  fovRadians: 1.05,
  catchDistance: 1.25,
  respawnDistance: 26,
} as const;

/** Bits de colision (membership/filter) para Rapier InteractionGroups. */
export const GROUP = {
  world: 0b0001,
  player: 0b0010,
  prop: 0b0100,
  npc: 0b1000,
} as const;

export function groups(membership: number, filter: number): number {
  return ((membership << 16) | filter) >>> 0;
}

export const PLAYER_GROUPS = groups(GROUP.player, GROUP.world | GROUP.prop);
export const PROP_GROUPS = groups(GROUP.prop, GROUP.world | GROUP.prop | GROUP.player | GROUP.npc);
export const WORLD_GROUPS = groups(GROUP.world, GROUP.player | GROUP.prop | GROUP.npc);
export const NPC_GROUPS = groups(GROUP.npc, GROUP.world | GROUP.player);
