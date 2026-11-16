import { describe, expect, it } from 'vitest';
import {
  addCharge,
  createBattery,
  lightIsOn,
  lightStrength,
  playerNoise,
  tickBattery,
  toggleLight,
} from '../battery';
import { FLASHLIGHT } from '../../core/config';

describe('linterna y ruido', () => {
  it('empieza apagada y con carga completa', () => {
    const battery = createBattery();
    expect(battery.on).toBe(false);
    expect(lightIsOn(battery)).toBe(false);
    expect(battery.charge).toBe(FLASHLIGHT.maxCharge);
  });

  it('solo consume carga mientras está encendida', () => {
    const battery = createBattery();
    toggleLight(battery);
    tickBattery(battery, 10);
    expect(battery.charge).toBeLessThan(FLASHLIGHT.maxCharge);
    const drained = battery.charge;
    toggleLight(battery);
    tickBattery(battery, 10);
    expect(battery.charge).toBeCloseTo(drained, 5);
  });

  it('se apaga sola al agotarse y avisa', () => {
    const battery = createBattery(1);
    toggleLight(battery);
    expect(tickBattery(battery, 2)).toBe(true);
    expect(battery.charge).toBe(0);
    expect(battery.on).toBe(false);
    expect(toggleLight(battery)).toBe(false);
    expect(lightStrength(battery, 0)).toBe(0);
  });

  it('una pila recarga sin pasar del máximo', () => {
    const battery = createBattery(80);
    expect(addCharge(battery, 38)).toBeCloseTo(20, 5);
    expect(battery.charge).toBe(FLASHLIGHT.maxCharge);
    battery.charge = 10;
    expect(addCharge(battery, 38)).toBeCloseTo(38, 5);
  });

  it('con poca carga la luz parpadea', () => {
    const battery = createBattery(8);
    toggleLight(battery);
    const samples = Array.from({ length: 24 }, (_, i) => lightStrength(battery, i * 0.05));
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.05);
  });

  it('correr hace más ruido que andar y agacharse silencia', () => {
    expect(playerNoise(5.9, true, false)).toBeGreaterThan(playerNoise(3.3, false, false));
    expect(playerNoise(1.5, false, true)).toBeLessThan(0.2);
    expect(playerNoise(0, false, false)).toBe(0);
  });
});
