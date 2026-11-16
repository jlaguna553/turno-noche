import { describe, expect, it } from 'vitest';
import { CrawlerBrain, type CrawlerSenses } from '../crawler';

const base: CrawlerSenses = { distance: 8, hasLOS: true, hidden: false, lightOn: false };

describe('cerebro de las crías', () => {
  it('chilla al detectar y pasa a perseguir', () => {
    const brain = new CrawlerBrain();
    const first = brain.update(1 / 60, base);
    expect(first.screech).toBe(true);
    expect(brain.state).toBe('alert');
    for (let i = 0; i < 30; i += 1) brain.update(1 / 60, base);
    expect(brain.state).toBe('chase');
  });

  it('se lanza cuando está encima', () => {
    const brain = new CrawlerBrain();
    for (let i = 0; i < 30; i += 1) brain.update(1 / 60, base);
    const decision = brain.update(1 / 60, { ...base, distance: 0.9 });
    expect(decision.latch).toBe(true);
    expect(brain.state).toBe('latch');
  });

  it('la luz directa la ahuyenta', () => {
    const brain = new CrawlerBrain();
    for (let i = 0; i < 30; i += 1) brain.update(1 / 60, base);
    const decision = brain.update(1 / 60, { ...base, distance: 4, lightOn: true });
    expect(decision.state).toBe('flee');
    expect(decision.speed).toBeGreaterThan(3);
  });

  it('si el jugador se esconde pierde el rastro', () => {
    const brain = new CrawlerBrain();
    for (let i = 0; i < 30; i += 1) brain.update(1 / 60, base);
    for (let i = 0; i < 240; i += 1) brain.update(1 / 60, { ...base, hidden: true, hasLOS: false });
    expect(brain.state).toBe('idle');
  });

  it('tras arrancársela huye y vuelve a la calma', () => {
    const brain = new CrawlerBrain();
    for (let i = 0; i < 30; i += 1) brain.update(1 / 60, base);
    brain.update(1 / 60, { ...base, distance: 0.9 });
    brain.shakeOff();
    expect(brain.state).toBe('flee');
    for (let i = 0; i < 200; i += 1) brain.update(1 / 60, { ...base, hidden: true, hasLOS: false });
    expect(brain.state).toBe('idle');
  });
});
