import { FLASHLIGHT } from '../core/config';

export interface BatteryState {
  charge: number;
  on: boolean;
}

export function createBattery(charge: number = FLASHLIGHT.maxCharge): BatteryState {
  return { charge: Math.max(0, Math.min(FLASHLIGHT.maxCharge, charge)), on: false };
}

/** La linterna solo emite luz si esta encendida y queda carga. */
export function lightIsOn(state: BatteryState): boolean {
  return state.on && state.charge > 0;
}

export function toggleLight(state: BatteryState): boolean {
  if (state.charge <= 0 && !state.on) return false;
  state.on = !state.on;
  return state.on;
}

/** Consume carga. Devuelve true si la linterna se apago en este paso. */
export function tickBattery(state: BatteryState, dt: number): boolean {
  if (!state.on) return false;
  state.charge = Math.max(0, state.charge - FLASHLIGHT.drainPerSecond * dt);
  if (state.charge <= 0) {
    state.on = false;
    return true;
  }
  return false;
}

export function addCharge(state: BatteryState, amount = FLASHLIGHT.pickupCharge): number {
  const before = state.charge;
  state.charge = Math.max(0, Math.min(FLASHLIGHT.maxCharge, state.charge + amount));
  return state.charge - before;
}

/** 0..1: cuanto ilumina. Por debajo de 0.15 parpadea (aviso de agotamiento). */
export function lightStrength(state: BatteryState, elapsed: number): number {
  if (!lightIsOn(state)) return 0;
  const ratio = state.charge / FLASHLIGHT.maxCharge;
  const erratic = ratio < 0.15 ? 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 17.3)) : 1;
  return Math.max(0.15, Math.min(1, ratio * 2.4)) * erratic;
}

/** Ruido que hace el jugador: 0 (quieto/agachado) .. 1 (corriendo). */
export function playerNoise(speed: number, sprinting: boolean, crouched: boolean): number {
  if (crouched) return Math.min(0.18, speed / 12);
  if (sprinting) return Math.min(1, 0.35 + speed / 8);
  return Math.min(0.55, speed / 8);
}
