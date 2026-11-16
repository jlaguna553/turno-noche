import type { BreakerId, EndingId, NoteRecord } from '../core/bus';

export const BREAKER_IDS = ['b1', 'b2', 'b3'] as const;

/** Estado de una partida, puro y serializable. Sin DOM, sin three. */
export interface RunState {
  breakers: Record<BreakerId, boolean>;
  notes: string[];
  deaths: number;
  elapsed: number;
  ending: EndingId | null;
}

export function createRun(): RunState {
  return {
    breakers: { b1: false, b2: false, b3: false },
    notes: [],
    deaths: 0,
    elapsed: 0,
    ending: null,
  };
}

export function pulledCount(state: RunState): number {
  return BREAKER_IDS.filter((id) => state.breakers[id]).length;
}

export function isLiftUnlocked(state: RunState): boolean {
  return pulledCount(state) === BREAKER_IDS.length;
}

/** Activa un breaker. Devuelve true solo si cambio el estado. */
export function pullBreaker(state: RunState, id: BreakerId): boolean {
  if (state.breakers[id]) return false;
  state.breakers[id] = true;
  return true;
}

export function addNoteRecord(state: RunState, note: NoteRecord): boolean {
  if (state.notes.includes(note.id)) return false;
  state.notes.push(note.id);
  return true;
}

export interface ObjectiveView {
  id: 'breakers' | 'return' | 'done';
  title: string;
  detail: string;
  progress: number;
  total: number;
}

const BREAKER_TOTAL = BREAKER_IDS.length;

export function objectiveFor(state: RunState): ObjectiveView {
  const pulled = pulledCount(state);
  if (state.ending) {
    return { id: 'done', title: 'TURNO CERRADO', detail: 'La planta ya no responde.', progress: 3, total: 3 };
  }
  if (pulled < BREAKER_TOTAL) {
    return {
      id: 'breakers',
      title: 'REARME LOS TRES BREAKERS',
      detail: `B1 sala de bombas · B2 taller · B3 subestación`,
      progress: pulled,
      total: BREAKER_TOTAL,
    };
  }
  return {
    id: 'return',
    title: 'VUELVA AL MONTACARGAS',
    detail: 'La corriente está arriba. No se quede quieto.',
    progress: 3,
    total: 3,
  };
}

/** Checkpoint: el montacargas si ya hay corriente; si no, la garita. */
export function checkpointFor(_state: RunState): { x: number; z: number; yaw: number } {
  return { x: 0, z: -7.4, yaw: Math.PI };
}
