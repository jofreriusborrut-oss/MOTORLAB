import { describe, expect, it } from 'vitest';
import { bmepBar, createEngineModel, kwToCv, powerKw, setPeakPowerCv, setPeakTorque, torqueFromPower } from '../src/physics/engine';
import { curveInterpolator, monotoneCubic } from '../src/physics/interpolation';
import { PRESETS } from '../src/data/presets';

describe('fórmules de potència', () => {
  it('P(kW) = T·n·2π/60000', () => {
    expect(powerKw(200, 5000)).toBeCloseTo((200 * 5000 * 2 * Math.PI) / 60000, 10);
    expect(powerKw(100, 9549.296586)).toBeCloseTo(100, 4); // 100 Nm a 9549 rpm = 100 kW
  });
  it('CV = kW · 1,35962', () => {
    expect(kwToCv(100)).toBeCloseTo(135.962, 6);
  });
  it('torqueFromPower és la inversa de powerKw', () => {
    expect(torqueFromPower(powerKw(321, 4321), 4321)).toBeCloseTo(321, 8);
  });
  it('BMEP d\'un 2.0 amb 200 Nm ≈ 12,6 bar', () => {
    expect(bmepBar(200, 1998)).toBeCloseTo(12.58, 1);
  });
});

describe('interpolació de la corba', () => {
  const pts = [
    { rpm: 1000, torque: 100 },
    { rpm: 2000, torque: 250 },
    { rpm: 4000, torque: 250 },
    { rpm: 6000, torque: 180 },
  ];
  const f = curveInterpolator(pts);
  it('passa exactament pels punts', () => {
    for (const p of pts) expect(f(p.rpm)).toBeCloseTo(p.torque, 8);
  });
  it('no crea pics per sobre del màxim definit (monotonia)', () => {
    for (let r = 1000; r <= 6000; r += 10) expect(f(r)).toBeLessThanOrEqual(250 + 1e-9);
  });
  it('un tram pla es manté pla', () => {
    for (let r = 2000; r <= 4000; r += 50) expect(f(r)).toBeCloseTo(250, 8);
  });
  it('fora del rang manté els valors extrems', () => {
    expect(f(500)).toBe(100);
    expect(f(9000)).toBe(180);
  });
  it('amb dos punts és lineal', () => {
    const g = monotoneCubic([0, 10], [0, 100]);
    expect(g(2.5)).toBeCloseTo(25, 10);
  });
});

describe('model del motor', () => {
  const atm = createEngineModel(PRESETS[0].engine);
  it('la potència màxima és coherent amb el parell', () => {
    const { rpm, kw } = atm.peakPower;
    expect(kw).toBeCloseTo(powerKw(atm.torqueAt(rpm), rpm), 6);
  });
  it('per sobre del règim de tall el parell és zero', () => {
    expect(atm.torqueAt(PRESETS[0].engine.maxRpm + 1)).toBe(0);
  });
  it('escalar a una potència objectiu la reprodueix', () => {
    const e = setPeakPowerCv(PRESETS[0].engine, 200);
    expect(createEngineModel(e).peakPower.cv).toBeCloseTo(200, 0);
  });
  it('escalar al parell màxim objectiu el reprodueix', () => {
    const e = setPeakTorque(PRESETS[2].engine, 400);
    expect(createEngineModel(e).peakTorque.torque).toBeCloseTo(400, 0);
  });
  it('el consum específic a plena càrrega és realista (gasolina 230–400 g/kWh)', () => {
    const mid = atm.samples.find((s) => s.rpm === 4000)!;
    expect(mid.specific).toBeGreaterThan(230);
    expect(mid.specific).toBeLessThan(400);
  });
  it('el dièsel és més eficient que la gasolina', () => {
    const d = createEngineModel(PRESETS[2].engine).samples.find((s) => s.rpm === 2500)!;
    const g = atm.samples.find((s) => s.rpm === 2500)!;
    expect(d.specific).toBeLessThan(g.specific);
  });
});
