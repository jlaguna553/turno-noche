import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_VERSION, loadRun, saveRun } from '../save';

const KEY = 'turnonoche.save.v1';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

describe('guardado v2', () => {
  beforeEach(() => storage.clear());

  it('guarda y recupera fichas, fusibles y botellas', () => {
    expect(
      saveRun({
        breakers: { b1: true, b2: false, b3: false },
        notes: ['parte-incidencia'],
        tags: ['tag-rios'],
        fuses: ['fuse-archivo'],
        bottles: 4,
        elapsed: 42,
        deaths: 1,
        ending: null,
        checkpoint: { x: 0, z: -7.4, yaw: Math.PI },
      }),
    ).toBe(true);
    const loaded = loadRun();
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.tags).toEqual(['tag-rios']);
    expect(loaded?.fuses).toEqual(['fuse-archivo']);
    expect(loaded?.bottles).toBe(4);
  });

  it('migra un guardado v1 sin coleccionables', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        savedAt: 123,
        breakers: { b1: true, b2: true, b3: false },
        notes: ['parte-incidencia', 'registro-pozo'],
        elapsed: 99,
        deaths: 2,
        ending: null,
        checkpoint: { x: 0, z: -7.4, yaw: 3.14 },
      }),
    );
    const loaded = loadRun();
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.tags).toEqual([]);
    expect(loaded?.fuses).toEqual([]);
    expect(loaded?.bottles).toBe(3);
    expect(loaded?.notes).toHaveLength(2);
  });

  it('rechaza versiones futuras', () => {
    storage.setItem(KEY, JSON.stringify({ version: 99, breakers: {}, notes: [] }));
    expect(loadRun()).toBeNull();
  });
});
