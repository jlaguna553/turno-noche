import { describe, expect, it } from 'vitest';
import {
  addFuseRecord,
  addNoteRecord,
  addTagRecord,
  checkpointFor,
  createRun,
  fuseCount,
  isLiftUnlocked,
  objectiveFor,
  pullBreaker,
  pulledCount,
  secretUnlocked,
  sideObjectiveFor,
  tagCount,
} from '../objectives';
import { CREW_TAGS, FUSES, NOTES, noteById } from '../story';

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

  it('fichas y fusibles se recogen sin duplicarse', () => {
    const run = createRun();
    const tag = CREW_TAGS[0];
    const fuse = FUSES[0];
    if (!tag || !fuse) throw new Error('sin coleccionables');
    expect(addTagRecord(run, tag)).toBe(true);
    expect(addTagRecord(run, tag)).toBe(false);
    expect(addFuseRecord(run, fuse)).toBe(true);
    expect(addFuseRecord(run, fuse)).toBe(false);
    expect(tagCount(run)).toBe(1);
    expect(fuseCount(run)).toBe(1);
  });

  it('el objetivo secundario avanza con los fusibles', () => {
    const run = createRun();
    expect(sideObjectiveFor(run).id).toBe('fuses');
    expect(sideObjectiveFor(run).progress).toBe(0);
    for (const fuse of FUSES) addFuseRecord(run, fuse);
    expect(sideObjectiveFor(run).id).toBe('done');
    expect(sideObjectiveFor(run).progress).toBe(3);
  });

  it('el final secreto exige las tres fichas y los tres fusibles', () => {
    const run = createRun();
    expect(secretUnlocked(run)).toBe(false);
    for (const tag of CREW_TAGS) addTagRecord(run, tag);
    expect(secretUnlocked(run)).toBe(false);
    for (const fuse of FUSES) addFuseRecord(run, fuse);
    expect(secretUnlocked(run)).toBe(true);
  });

  it('la partida arranca con tres botellas', () => {
    expect(createRun().bottles).toBe(3);
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
