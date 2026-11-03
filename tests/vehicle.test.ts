import { describe, expect, it } from 'vitest';
import { createEngineModel } from '../src/physics/engine';
import { aeroForce, overallRatio, resistanceForce, rollingForce, rpmFromSpeed, speedFromRpm, topSpeed, tractionAt, wheelForce } from '../src/physics/vehicle';
import { simulateAcceleration } from '../src/simulation/acceleration';
import { analyze } from '../src/physics/analysis';
import { PRESETS } from '../src/data/presets';
import { G } from '../src/physics/constants';

const cfg = PRESETS[0];
const v = cfg.vehicle;
const engine = createEngineModel(cfg.engine);

describe('forces', () => {
  it('F_aero = ½ρCxAv²', () => {
    expect(aeroForce(v, 30)).toBeCloseTo(0.5 * 1.225 * v.cx * v.frontalAreaM2 * 900, 8);
  });
  it('F_rodament = Crr·m·g', () => {
    expect(rollingForce(v)).toBeCloseTo(v.rollingCoef * v.massKg * G, 8);
  });
  it('F_tracció = T·i·η/r', () => {
    expect(wheelForce(200, 10, v)).toBeCloseTo((200 * 10 * v.drivetrainEfficiency) / v.wheelRadiusM, 8);
  });
  it('rpm ↔ velocitat són inverses', () => {
    const i = overallRatio(v, 2);
    expect(speedFromRpm(rpmFromSpeed(27.7, i, v.wheelRadiusM), i, v.wheelRadiusM)).toBeCloseTo(27.7, 8);
  });
  it('la tracció mai supera el límit d\'adherència', () => {
    const t = tractionAt(engine, v, 0, 1)!;
    expect(t.force).toBeLessThanOrEqual(v.tyreGrip * v.massKg * G * v.drivenAxleLoad + 1e-9);
  });
});

describe('velocitat màxima', () => {
  it('a la velocitat màxima la força disponible ≈ resistència', () => {
    const top = topSpeed(engine, v);
    expect(top.limitedBy).toBe('resistencia');
    const s = top.kmh / 3.6;
    const t = tractionAt(engine, v, top.gear - 1, s - 0.1)!;
    expect(t.force).toBeGreaterThanOrEqual(resistanceForce(v, s - 0.1));
    expect(top.kmh).toBeGreaterThan(180);
    expect(top.kmh).toBeLessThan(260);
  });
  it('l\'elèctric queda limitat pel règim', () => {
    const e = PRESETS[3];
    const top = topSpeed(createEngineModel(e.engine), e.vehicle);
    expect(top.limitedBy).toBe('regim');
    const expected = speedFromRpm(e.engine.maxRpm, overallRatio(e.vehicle, 0), e.vehicle.wheelRadiusM) * 3.6;
    expect(top.kmh).toBeCloseTo(expected, 0);
  });
});

describe('simulació d\'acceleració', () => {
  const sim = simulateAcceleration(engine, v, { targetKmh: 160 });
  it('la velocitat és monòtona creixent (excepte en canvis)', () => {
    for (let i = 1; i < sim.samples.length; i++) {
      const s = sim.samples[i];
      if (s.shifting || sim.samples[i - 1].shifting) {
        // Sense tracció durant el canvi: només pot perdre velocitat per les resistències
        expect(s.kmh).toBeGreaterThan(sim.samples[i - 1].kmh - 0.5);
      } else expect(s.kmh).toBeGreaterThanOrEqual(sim.samples[i - 1].kmh - 1e-6);
    }
  });
  it('fa canvis de marxa ascendents i ordenats', () => {
    expect(sim.shifts.length).toBeGreaterThan(0);
    sim.shifts.forEach((s, i) => expect(s.to).toBe(i + 2));
  });
  it('mai supera el règim màxim', () => {
    for (const s of sim.samples) expect(s.rpm).toBeLessThanOrEqual(cfg.engine.maxRpm + 1);
  });
  it('0–100 dins d\'un rang plausible per a cada motor de mostra', () => {
    const ranges: Record<string, [number, number]> = {
      'preset-atm': [7, 11], 'preset-turbo': [6.5, 10.5], 'preset-diesel': [7, 11.5], 'preset-electric': [5.5, 9],
    };
    for (const p of PRESETS) {
      const a = analyze(p);
      expect(a.ok).toBe(true);
      const [lo, hi] = ranges[p.id];
      expect(a.sim!.t0to100!).toBeGreaterThan(lo);
      expect(a.sim!.t0to100!).toBeLessThan(hi);
    }
  });
  it('més massa implica més temps de 0 a 100', () => {
    const heavy = simulateAcceleration(engine, { ...v, massKg: v.massKg * 1.5 }, { targetKmh: 110 });
    expect(heavy.t0to100!).toBeGreaterThan(sim.t0to100!);
  });
  it('energia: l\'energia cinètica no supera el treball del motor', () => {
    const sNow = sim.samples[sim.samples.length - 1];
    const ekin = 0.5 * v.massKg * (sNow.kmh / 3.6) ** 2;
    const maxWork = engine.peakPower.kw * 1000 * sNow.t;
    expect(ekin).toBeLessThan(maxWork);
  });
});
