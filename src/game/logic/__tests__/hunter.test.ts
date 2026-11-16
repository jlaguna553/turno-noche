import { describe, expect, it } from 'vitest';
import { HunterBrain, type Senses } from '../hunter';
import { MONSTER } from '../../core/config';

const base: Senses = {
  distance: 5,
  angle: 0,
  hasLOS: true,
  noise: 0,
  hidden: false,
  flashlight: false,
};

function run(brain: HunterBrain, seconds: number, senses: Partial<Senses> = {}): void {
  const step = 1 / 60;
  const total = Math.round(seconds / step);
  for (let i = 0; i < total; i += 1) brain.update(step, { ...base, ...senses });
}

describe('cerebro de la criatura', () => {
  it('ve al jugador de frente y en menos de un segundo lo está cazando', () => {
    const brain = new HunterBrain();
    run(brain, 0.3);
    expect(brain.state).toBe('investigate');
    run(brain, 0.6);
    expect(brain.state).toBe('hunt');
  });

  it('no detecta a alguien que está a su espalda y en silencio', () => {
    const brain = new HunterBrain();
    run(brain, 3, { angle: Math.PI, hasLOS: false });
    expect(brain.state).toBe('roam');
    expect(brain.suspicion).toBe(0);
  });

  it('el ruido de correr le hace investigar aunque no lo vea', () => {
    const brain = new HunterBrain();
    run(brain, 1.2, { angle: Math.PI, hasLOS: false, noise: 0.9, distance: 10 });
    expect(brain.state).toBe('investigate');
    expect(brain.suspicion).toBeGreaterThan(0.38);
  });

  it('la linterna alarga su alcance visual', () => {
    const dark = new HunterBrain();
    run(dark, 0.8, { distance: MONSTER.viewRange + 2, flashlight: false });
    expect(dark.state).toBe('roam');
    const lit = new HunterBrain();
    run(lit, 1.6, { distance: MONSTER.viewRange + 2, flashlight: true });
    expect(lit.state).toBe('hunt');
  });

  it('escondido deja de cazar y termina volviendo a patrullar', () => {
    const brain = new HunterBrain();
    run(brain, 1.2);
    expect(brain.state).toBe('hunt');
    run(brain, 8, { hidden: true });
    expect(brain.state).toBe('roam');
  });

  it('la agresividad lo hace más rápido al cazar', () => {
    const calm = new HunterBrain({ aggression: 0 });
    const wired = new HunterBrain({ aggression: 1 });
    run(calm, 1.2);
    run(wired, 1.2);
    const calmSpeed = calm.update(1 / 60, base).speed;
    const wiredSpeed = wired.update(1 / 60, base).speed;
    expect(calmSpeed).toBeCloseTo(MONSTER.huntSpeed, 3);
    expect(wiredSpeed).toBeGreaterThan(calmSpeed);
  });

  it('alerta solo en la transición', () => {
    const brain = new HunterBrain();
    const first = brain.update(0.02, base);
    expect(first.alerted || brain.state === 'roam').toBe(true);
    run(brain, 0.3);
    const later = brain.update(1 / 60, base);
    expect(later.alerted).toBe(false);
  });
});
