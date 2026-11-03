import { describe, expect, it } from 'vitest';
import { createEngineModel } from '../src/physics/engine';
import { costs, cycleEstimate, steadyConsumption } from '../src/physics/fuel';
import { validateEngine, validateVehicle, hasErrors } from '../src/physics/validation';
import { analyze } from '../src/physics/analysis';
import { sanitizeState, initialState } from '../src/state/storage';
import { PRESETS } from '../src/data/presets';

describe('consum', () => {
  it('consum dels motors de mostra en rang realista', () => {
    const ranges: Record<string, [number, number]> = {
      'preset-atm': [5, 10], 'preset-turbo': [4.5, 9], 'preset-diesel': [3.5, 7.5], 'preset-electric': [11, 22],
    };
    for (const p of PRESETS) {
      const c = cycleEstimate(createEngineModel(p.engine), p.vehicle);
      expect(c.feasible).toBe(true);
      const [lo, hi] = ranges[p.id];
      expect(c.mixed).toBeGreaterThan(lo);
      expect(c.mixed).toBeLessThan(hi);
    }
  });
  it('a més velocitat (aerodinàmica), més consum per km', () => {
    const p = PRESETS[0];
    const m = createEngineModel(p.engine);
    expect(steadyConsumption(m, p.vehicle, 140).per100km).toBeGreaterThan(steadyConsumption(m, p.vehicle, 90).per100km);
  });
  it('càlcul de costos', () => {
    const c = costs(6, 1.5, 20000);
    expect(c.per100km).toBeCloseTo(9, 10);
    expect(c.annual).toBeCloseTo(1800, 10);
    expect(c.annualEnergy).toBeCloseTo(1200, 10);
  });
});

describe('validació', () => {
  it('els motors de mostra no tenen errors', () => {
    for (const p of PRESETS) {
      expect(hasErrors(validateEngine(p.engine))).toBe(false);
      expect(hasErrors(validateVehicle(p.vehicle, p.engine.type === 'electric'))).toBe(false);
    }
  });
  it('detecta un parell físicament impossible per a la cilindrada', () => {
    const e = { ...PRESETS[0].engine, torqueCurve: PRESETS[0].engine.torqueCurve.map((p) => ({ ...p, torque: p.torque * 4 })) };
    expect(hasErrors(validateEngine(e))).toBe(true);
  });
  it('detecta marxes mal ordenades i massa negativa', () => {
    const v = { ...PRESETS[0].vehicle, gearRatios: [3, 3.5], massKg: -10 };
    const issues = validateVehicle(v, false);
    expect(issues.some((i) => i.field === 'gearRatios' && i.level === 'error')).toBe(true);
    expect(issues.some((i) => i.field === 'massKg' && i.level === 'error')).toBe(true);
  });
  it('una configuració invàlida no produeix resultats', () => {
    const bad = { ...PRESETS[0], vehicle: { ...PRESETS[0].vehicle, wheelRadiusM: 0 } };
    const a = analyze(bad);
    expect(a.ok).toBe(false);
    expect(a.sim).toBeNull();
  });
  it('un vehicle que no pot arrencar es reporta com a error', () => {
    const p = PRESETS[0];
    const weak = { ...p, engine: { ...p.engine, torqueCurve: p.engine.torqueCurve.map((q) => ({ ...q, torque: 1 })) }, vehicle: { ...p.vehicle, massKg: 3000 } };
    const a = analyze(weak);
    expect(a.ok).toBe(false);
  });
});

describe('LocalStorage', () => {
  it('dades corruptes tornen a l\'estat inicial', () => {
    expect(sanitizeState('brossa').configs.length).toBe(PRESETS.length);
    expect(sanitizeState({ version: 99 }).configs.length).toBe(PRESETS.length);
  });
  it('sanejar camps no numèrics', () => {
    const s = initialState();
    (s.configs[0].vehicle as unknown as Record<string, unknown>).massKg = 'abc';
    const out = sanitizeState(JSON.parse(JSON.stringify(s)));
    expect(out.configs[0].vehicle.massKg).toBe(PRESETS[0].vehicle.massKg);
  });
  it('conserva un estat vàlid', () => {
    const s = initialState();
    s.fuel.gasolina = 1.79;
    expect(sanitizeState(JSON.parse(JSON.stringify(s))).fuel.gasolina).toBe(1.79);
  });
});
