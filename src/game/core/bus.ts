/**
 * Bus tipado de eventos. Unico canal entre el mundo 3D (imperativo) y la capa
 * React (HUD, pantallas). Ninguno importa al otro: ambos importan este contrato.
 */

export type FocusKind = 'note' | 'breaker' | 'locker' | 'lift' | 'radio' | 'battery' | 'prop';

export interface FocusInfo {
  id: string;
  kind: FocusKind;
  label: string;
  prompt: string;
  enabled: boolean;
}

export interface Settings {
  sensitivity: number;
  invertY: boolean;
  volume: number;
  quality: 'low' | 'medium' | 'high';
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  invertY: false,
  volume: 0.7,
  quality: 'medium',
};

export type EndingId = 'ascend' | 'flood';

export type BreakerId = 'b1' | 'b2' | 'b3';

export interface ObjectiveView {
  id: 'breakers' | 'return' | 'done';
  title: string;
  detail: string;
  progress: number;
  total: number;
}

export interface NoteRecord {
  id: string;
  title: string;
  author: string;
  zone: string;
  lines: string[];
}

export interface Snapshot {
  breakers: Record<BreakerId, boolean>;
  notes: string[];
  notesTotal: number;
  objective: ObjectiveView;
  liftUnlocked: boolean;
  ending: EndingId | null;
  elapsed: number;
  deaths: number;
  hidden: boolean;
  battery: number;
  flashlightOn: boolean;
}

export interface Waypoint {
  x: number;
  z: number;
  label: string;
  distance: number;
}

export interface GameEventMap {
  'engine:ready': { milliseconds: number };
  'engine:error': { message: string };
  'capture:change': { locked: boolean };
  'focus:change': { focus: FocusInfo | null };
  'player:pose': { x: number; z: number; yaw: number };
  'perf': { fps: number };
  'settings:changed': { settings: Settings };

  'subtitle': { id: number; speaker: string; text: string; tone: 'vera' | 'self' | 'entity' };
  'zone:enter': { zoneId: string; name: string };
  'objective:change': { objective: ObjectiveView };
  'note:found': { note: NoteRecord; total: number; max: number };
  'battery:change': { charge: number; on: boolean };
  'hide:change': { hidden: boolean };
  'danger:change': { danger: number; state: 'roam' | 'investigate' | 'hunt' };
  'waypoint': { waypoint: Waypoint | null };
  'toast': { kind: 'info' | 'warning' | 'note'; title: string; body: string };
  'shock': { intensity: number };
  'death': { cause: string; deaths: number };
  'ending:ready': { notes: number; notesTotal: number; elapsed: number; deaths: number };
  'ending:show': { ending: EndingId };
  'title:card': { title: string; subtitle: string };
}

type Handler<T> = (payload: T) => void;

export class TypedBus {
  private handlers = new Map<keyof GameEventMap, Set<Handler<never>>>();

  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set?.delete(handler as Handler<never>);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) (handler as Handler<GameEventMap[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const bus = new TypedBus();
