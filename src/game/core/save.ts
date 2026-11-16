import type { BreakerId, EndingId, Settings } from './bus';
import { DEFAULT_SETTINGS } from './bus';

const SAVE_KEY = 'turnonoche.save.v1';
const SETTINGS_KEY = 'turnonoche.settings.v1';

export const SAVE_VERSION = 2;

export interface RunSave {
  version: number;
  savedAt: number;
  breakers: Record<BreakerId, boolean>;
  notes: string[];
  tags: string[];
  fuses: string[];
  bottles: number;
  elapsed: number;
  deaths: number;
  ending: EndingId | null;
  checkpoint: { x: number; z: number; yaw: number } | null;
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveRun(run: Omit<RunSave, 'version' | 'savedAt'>): boolean {
  try {
    const payload: RunSave = { ...run, version: SAVE_VERSION, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadRun(): RunSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RunSave>;
    if (!parsed || typeof parsed.version !== 'number') return null;
    // v1 -> v2: fichas, fusibles y botellas se anaden con valores por defecto.
    if (parsed.version !== 1 && parsed.version !== SAVE_VERSION) return null;
    if (!parsed.breakers || !Array.isArray(parsed.notes)) return null;
    return {
      version: SAVE_VERSION,
      savedAt: parsed.savedAt ?? Date.now(),
      breakers: parsed.breakers as Record<BreakerId, boolean>,
      notes: parsed.notes.filter((id): id is string => typeof id === 'string'),
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((id): id is string => typeof id === 'string') : [],
      fuses: Array.isArray(parsed.fuses) ? parsed.fuses.filter((id): id is string => typeof id === 'string') : [],
      bottles: typeof parsed.bottles === 'number' ? Math.max(0, Math.min(9, parsed.bottles)) : 3,
      elapsed: typeof parsed.elapsed === 'number' ? parsed.elapsed : 0,
      deaths: typeof parsed.deaths === 'number' ? parsed.deaths : 0,
      ending: parsed.ending ?? null,
      checkpoint: parsed.checkpoint ?? null,
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // sin almacenamiento disponible
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // sin almacenamiento disponible
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sensitivity: clampNumber(parsed.sensitivity, 0.4, 2.6, DEFAULT_SETTINGS.sensitivity),
      volume: clampNumber(parsed.volume, 0, 1, DEFAULT_SETTINGS.volume),
      quality:
        parsed.quality === 'low' || parsed.quality === 'medium' || parsed.quality === 'high'
          ? parsed.quality
          : DEFAULT_SETTINGS.quality,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
