import type { BreakerId, CrewTag, EndingId, FuseRecord, NoteRecord, SideObjectiveView } from '../core/bus';

export const BREAKER_IDS = ['b1', 'b2', 'b3'] as const;
export const FUSE_IDS = ['fuse-archivo', 'fuse-calderas', 'fuse-cisterna'] as const;
export const TAG_IDS = ['tag-rios', 'tag-vela', 'tag-duarte'] as const;

/** Estado de una partida, puro y serializable. Sin DOM, sin three. */
export interface RunState {
  breakers: Record<BreakerId, boolean>;
  notes: string[];
  tags: string[];
  fuses: string[];
  bottles: number;
  deaths: number;
  elapsed: number;
  ending: EndingId | null;
}

export function createRun(): RunState {
  return {
    breakers: { b1: false, b2: false, b3: false },
    notes: [],
    tags: [],
    fuses: [],
    bottles: 3,
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

export function addTagRecord(state: RunState, tag: CrewTag): boolean {
  if (state.tags.includes(tag.id)) return false;
  state.tags.push(tag.id);
  return true;
}

export function addFuseRecord(state: RunState, fuse: FuseRecord): boolean {
  if (state.fuses.includes(fuse.id)) return false;
  state.fuses.push(fuse.id);
  return true;
}

export function tagCount(state: RunState): number {
  return state.tags.length;
}

export function fuseCount(state: RunState): number {
  return state.fuses.length;
}

/** Tercera salida: todas las fichas y todos los fusibles. */
export function secretUnlocked(state: RunState): boolean {
  return tagCount(state) === TAG_IDS.length && fuseCount(state) === FUSE_IDS.length;
}

export function sideObjectiveFor(state: RunState): SideObjectiveView {
  const fuses = fuseCount(state);
  if (fuses >= FUSE_IDS.length) {
    return {
      id: 'done',
      title: 'ALUMBRADO DE EMERGENCIA',
      detail: 'Los tres fusibles están restaurados.',
      progress: FUSE_IDS.length,
      total: FUSE_IDS.length,
    };
  }
  return {
    id: 'fuses',
    title: 'RESTAURE LOS FUSIBLES',
    detail: 'F1 archivo · F2 calderas · F3 cisterna',
    progress: fuses,
    total: FUSE_IDS.length,
  };
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
