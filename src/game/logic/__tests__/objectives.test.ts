import { describe, expect, it } from 'vitest';
import {
  addNoteRecord,
  checkpointFor,
  createRun,
  isLiftUnlocked,
  objectiveFor,
  pullBreaker,
  pulledCount,
} from '../objectives';
import { NOTES, noteById } from '../story';

describe('objetivos de la partida', () => {
  it('arranca pidiendo los tres breakers y sin corriente', () => {
    const run = createRun();
    expect(pulledCount(run)).toBe(0);
    expect(isLiftUnlocked(run)).toBe(false);
    const objective = objectiveFor(run);
    expect(objective.id).toBe('breakers');
    expect(objective.progress).toBe(0);
    expect(objective.total).toBe(3);
  });

  it('un breaker solo cuenta una vez', () => {
    const run = createRun();
    expect(pullBreaker(run, 'b1')).toBe(true);
    expect(pullBreaker(run, 'b1')).toBe(false);
    expect(pulledCount(run)).toBe(1);
    expect(objectiveFor(run).progress).toBe(1);
  });

  it('con los tres breakers el montacargas queda operativo y cambia el objetivo', () => {
    const run = createRun();
    pullBreaker(run, 'b1');
    pullBreaker(run, 'b2');
    expect(isLiftUnlocked(run)).toBe(false);
    pullBreaker(run, 'b3');
    expect(isLiftUnlocked(run)).toBe(true);
    expect(objectiveFor(run).id).toBe('return');
  });

  it('cerrar el turno deja el objetivo cumplido', () => {
    const run = createRun();
    run.ending = 'ascend';
    expect(objectiveFor(run).id).toBe('done');
  });

  it('las notas no se duplican', () => {
    const run = createRun();
    const note = NOTES[0];
    if (!note) throw new Error('sin notas');
    expect(addNoteRecord(run, note)).toBe(true);
    expect(addNoteRecord(run, note)).toBe(false);
    expect(run.notes).toEqual([note.id]);
  });

  it('el checkpoint está dentro de la garita', () => {
    const point = checkpointFor(createRun());
    expect(point.z).toBeLessThan(-5);
    expect(Math.abs(point.x)).toBeLessThan(2);
  });

  it('todas las notas tienen id único y texto', () => {
    const ids = new Set<string>();
    for (const note of NOTES) {
      expect(ids.has(note.id)).toBe(false);
      ids.add(note.id);
      expect(note.lines.length).toBeGreaterThan(1);
      expect(noteById(note.id)).toBe(note);
    }
  });
});
