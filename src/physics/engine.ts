import { AUXILIARY_POWER_KW, ENERGY, KW_TO_CV, isElectric } from './constants';
import { curveInterpolator, sortCurve, type Interpolator } from './interpolation';
import type { EngineConfig } from './types';

/* ------------------------------------------------------------------ */
/*  Fórmules bàsiques                                                  */
/* ------------------------------------------------------------------ */

/** P(kW) = Parell(Nm) · RPM · 2π / 60000 */
export const powerKw = (torqueNm: number, rpm: number) => (torqueNm * rpm * 2 * Math.PI) / 60000;

/** CV = kW · 1,35962 */
export const kwToCv = (kw: number) => kw * KW_TO_CV;
export const cvToKw = (cv: number) => cv / KW_TO_CV;

/** Parell (Nm) necessari per lliurar una potència (kW) a un règim donat. */
export const torqueFromPower = (kw: number, rpm: number) => (rpm > 0 ? (kw * 60000) / (2 * Math.PI * rpm) : 0);

/**
 * Pressió mitjana efectiva al fre (BMEP, bar) d'un motor de 4 temps:
 * BMEP = 4π · T / Vd
 */
export const bmepBar = (torqueNm: number, displacementCc: number) =>
  displacementCc > 0 ? (4 * Math.PI * torqueNm) / (displacementCc * 1e-6) / 1e5 : 0;

/**
 * Pressió mitjana de fricció (FMEP, bar). Correlació empírica tipus Heywood
 * per a motors de 4 temps, en funció del règim.
 */
export const fmepBar = (rpm: number, offsetBar = 0) => {
  const k = rpm / 1000;
  return 0.97 + 0.15 * k + 0.05 * k * k + offsetBar;
};

/* ------------------------------------------------------------------ */
/*  Model del motor                                                    */
/* ------------------------------------------------------------------ */

export interface EngineSample {
  rpm: number;
  torque: number;
  kw: number;
  cv: number;
  /** Consum a plena càrrega: L/h (tèrmic) o kW elèctrics (elèctric). */
  fullLoadFlow: number;
  /** Consum específic: g/kWh (tèrmic) o rendiment % (elèctric). */
  specific: number;
}

export interface EngineModel {
  config: EngineConfig;
  torqueAt: (rpm: number) => number;
  powerKwAt: (rpm: number) => number;
  /** Potència d'entrada (kW de combustible o elèctrics) per lliurar `outKw` a `rpm`. */
  inputPowerKw: (rpm: number, outKw: number) => number;
  /** Cabal: L/h (tèrmic) o kW (elèctric). */
  flowAt: (rpm: number, outKw: number) => number;
  peakTorque: { rpm: number; torque: number };
  peakPower: { rpm: number; kw: number; cv: number };
  minRpm: number;
  samples: EngineSample[];
  interpolator: Interpolator;
}

export function createEngineModel(engine: EngineConfig, sampleStep = 50): EngineModel {
  const electric = isElectric(engine.type);
  const energy = ENERGY[engine.type];
  const points = sortCurve(engine.torqueCurve);
  const interp = curveInterpolator(points);
  const minRpm = electric ? 0 : Math.max(0, Math.min(engine.idleRpm, points[0]?.rpm ?? 0));

  const torqueAt = (rpm: number) => {
    if (!Number.isFinite(rpm) || rpm < 0 || rpm > engine.maxRpm) return 0;
    if (points.length === 0) return 0;
    return Math.max(0, interp(rpm));
  };
  const powerKwAt = (rpm: number) => powerKw(torqueAt(rpm), rpm);

  // Primer càlcul aproximat de la potència màxima (necessari per al model elèctric).
  let roughPeakKw = 0;
  for (let r = 0; r <= engine.maxRpm; r += 100) roughPeakKw = Math.max(roughPeakKw, powerKwAt(r));

  const inputPowerKw = (rpm: number, outKw: number) => {
    const out = Math.max(0, outKw) + AUXILIARY_POWER_KW;
    if (electric) {
      // Pèrdues proporcionals (coure + inversor) i pèrdues de ferro que creixen amb el règim.
      const ironLoss = 0.012 * roughPeakKw * (rpm / Math.max(1, engine.maxRpm));
      return out / energy.indicatedEfficiency + ironLoss;
    }
    // Model de Willans: P_combustible = (P_útil + P_fricció) / η_indicat
    const vd = engine.displacementCc * 1e-6; // m³
    const frictionKw = (fmepBar(rpm, energy.fmepOffsetBar) * 1e5 * vd * (rpm / 120)) / 1000;
    return (out + frictionKw) / energy.indicatedEfficiency;
  };

  const flowAt = (rpm: number, outKw: number) => {
    const inKw = inputPowerKw(rpm, outKw);
    if (electric) return inKw; // kW = kWh/h
    const kgPerHour = (inKw * 3600) / (energy.lhvMJkg * 1000);
    return kgPerHour / energy.densityKgL; // L/h
  };

  const samples: EngineSample[] = [];
  const start = electric ? 0 : Math.max(0, Math.round(minRpm / sampleStep) * sampleStep);
  let peakTorque = { rpm: 0, torque: 0 };
  let peakPower = { rpm: 0, kw: 0, cv: 0 };
  for (let rpm = start; rpm <= engine.maxRpm + 1e-9; rpm += sampleStep) {
    const torque = torqueAt(rpm);
    const kw = powerKw(torque, rpm);
    const flow = flowAt(rpm, kw);
    const specific = electric
      ? kw > 0 ? (kw / flow) * 100 : 0
      : kw > 0 ? (flow * energy.densityKgL * 1000) / kw : 0;
    samples.push({ rpm, torque, kw, cv: kwToCv(kw), fullLoadFlow: flow, specific });
    if (torque > peakTorque.torque + 1e-6) peakTorque = { rpm, torque };
    if (kw > peakPower.kw + 1e-6) peakPower = { rpm, kw, cv: kwToCv(kw) };
  }

  return { config: engine, torqueAt, powerKwAt, inputPowerKw, flowAt, peakTorque, peakPower, minRpm, samples, interpolator: interp };
}

/* ------------------------------------------------------------------ */
/*  Operacions sobre la corba                                          */
/* ------------------------------------------------------------------ */

export function scaleCurve(engine: EngineConfig, factor: number): EngineConfig {
  if (!Number.isFinite(factor) || factor <= 0) return engine;
  return {
    ...engine,
    torqueCurve: engine.torqueCurve.map((p) => ({ ...p, torque: round1(p.torque * factor) })),
  };
}

/** Escala la corba perquè el parell màxim sigui `targetNm`. */
export function setPeakTorque(engine: EngineConfig, targetNm: number): EngineConfig {
  const current = createEngineModel(engine).peakTorque.torque;
  return current > 0 ? scaleCurve(engine, targetNm / current) : engine;
}

/** Escala la corba perquè la potència màxima calculada sigui `targetCv`. */
export function setPeakPowerCv(engine: EngineConfig, targetCv: number): EngineConfig {
  const current = createEngineModel(engine).peakPower.cv;
  return current > 0 ? scaleCurve(engine, targetCv / current) : engine;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
