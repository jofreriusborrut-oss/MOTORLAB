import { AIR_DENSITY, ENGINE_INERTIA, G, WHEELS_INERTIA, isElectric } from './constants';
import type { EngineModel } from './engine';
import type { EngineType, VehicleConfig } from './types';

/* ------------------------------------------------------------------ */
/*  Cinemàtica de la transmissió                                       */
/* ------------------------------------------------------------------ */

export const overallRatio = (v: VehicleConfig, gearIdx: number) => (v.gearRatios[gearIdx] ?? 0) * v.finalDrive;

/** RPM del motor = v / r · i_total · 60 / 2π */
export const rpmFromSpeed = (speedMs: number, ratio: number, wheelRadiusM: number) =>
  ((speedMs / wheelRadiusM) * ratio * 60) / (2 * Math.PI);

/** v = RPM · 2π / 60 · r / i_total */
export const speedFromRpm = (rpm: number, ratio: number, wheelRadiusM: number) =>
  ratio > 0 ? ((rpm * 2 * Math.PI) / 60) * (wheelRadiusM / ratio) : 0;

/* ------------------------------------------------------------------ */
/*  Forces                                                             */
/* ------------------------------------------------------------------ */

/** F_aero = ½ · ρ · Cx · A · v² */
export const aeroForce = (v: VehicleConfig, speedMs: number) =>
  0.5 * AIR_DENSITY * v.cx * v.frontalAreaM2 * speedMs * speedMs;

/** F_rodament = Crr · m · g */
export const rollingForce = (v: VehicleConfig) => v.rollingCoef * v.massKg * G;

export const resistanceForce = (v: VehicleConfig, speedMs: number) => aeroForce(v, speedMs) + rollingForce(v);

/** Força de tracció a la roda: F = T · i_total · η / r */
export const wheelForce = (torqueNm: number, ratio: number, v: VehicleConfig) =>
  (torqueNm * ratio * v.drivetrainEfficiency) / v.wheelRadiusM;

/** Força màxima transmissible pels pneumàtics: µ · m · g · fracció a l'eix motriu */
export const gripLimit = (v: VehicleConfig) => v.tyreGrip * v.massKg * G * v.drivenAxleLoad;

/**
 * Massa equivalent: inclou la inèrcia de rodes i del motor reflectida a la roda.
 * m_eq = m + J_rodes / r² + J_motor · i² · η / r²
 */
export const effectiveMass = (v: VehicleConfig, ratio: number, type: EngineType) =>
  v.massKg +
  WHEELS_INERTIA / (v.wheelRadiusM * v.wheelRadiusM) +
  (ENGINE_INERTIA[type] * ratio * ratio * v.drivetrainEfficiency) / (v.wheelRadiusM * v.wheelRadiusM);

/** Règim al qual el motor tèrmic llisca l'embragatge en la sortida. */
export function launchRpm(engine: EngineModel): number {
  if (isElectric(engine.config.type)) return 0;
  const { idleRpm, maxRpm } = engine.config;
  return Math.min(maxRpm * 0.6, Math.max(idleRpm + 1200, engine.peakTorque.rpm * 0.55));
}

/**
 * Força de tracció disponible (plena càrrega) en una marxa i velocitat donades.
 * Retorna `null` si la marxa no és utilitzable (sobre-règim o per sota del ralentí).
 */
export function tractionAt(
  engine: EngineModel,
  v: VehicleConfig,
  gearIdx: number,
  speedMs: number,
): { force: number; rawForce: number; rpm: number; slipping: boolean; gripLimited: boolean } | null {
  const ratio = overallRatio(v, gearIdx);
  if (ratio <= 0) return null;
  const wheelRpm = rpmFromSpeed(speedMs, ratio, v.wheelRadiusM);
  if (wheelRpm > engine.config.maxRpm) return null;
  let rpm = wheelRpm;
  let slipping = false;
  const electric = isElectric(engine.config.type);
  if (!electric) {
    const launch = launchRpm(engine);
    if (gearIdx === 0 && wheelRpm < launch) {
      rpm = launch;
      slipping = true;
    } else if (wheelRpm < engine.config.idleRpm) {
      return null;
    }
  }
  const rawForce = wheelForce(engine.torqueAt(rpm), ratio, v);
  const limit = gripLimit(v);
  return { force: Math.min(rawForce, limit), rawForce, rpm, slipping, gripLimited: rawForce > limit };
}

/* ------------------------------------------------------------------ */
/*  Anàlisi estàtica                                                   */
/* ------------------------------------------------------------------ */

export interface GearInfo {
  gear: number;
  ratio: number;
  overall: number;
  /** Velocitat màxima de la marxa al règim de tall (km/h). */
  maxSpeedKmh: number;
  /** km/h per cada 1000 rpm. */
  kmhPer1000: number;
  /** Força de tracció màxima a la roda (N), abans del límit d'adherència. */
  maxForce: number;
}

export function gearTable(engine: EngineModel, v: VehicleConfig): GearInfo[] {
  return v.gearRatios.map((ratio, i) => {
    const overall = overallRatio(v, i);
    return {
      gear: i + 1,
      ratio,
      overall,
      maxSpeedKmh: speedFromRpm(engine.config.maxRpm, overall, v.wheelRadiusM) * 3.6,
      kmhPer1000: speedFromRpm(1000, overall, v.wheelRadiusM) * 3.6,
      maxForce: wheelForce(engine.peakTorque.torque, overall, v),
    };
  });
}

export interface TopSpeedResult {
  kmh: number;
  gear: number;
  limitedBy: 'resistencia' | 'regim' | 'cap';
}

/**
 * Velocitat màxima teòrica: primera velocitat (escombrant des de 0) on cap
 * marxa pot vèncer les resistències, o on totes les marxes superen el tall.
 */
export function topSpeed(engine: EngineModel, v: VehicleConfig, stepMs = 0.05): TopSpeedResult {
  const top = v.gearRatios.length - 1;
  let lastGear = 1;
  for (let s = 0; s < 150; s += stepMs) {
    let best = -Infinity;
    let bestGear = -1;
    for (let g = 0; g < v.gearRatios.length; g++) {
      const t = tractionAt(engine, v, g, s);
      if (t && t.force > best) {
        best = t.force;
        bestGear = g;
      }
    }
    if (bestGear < 0) return { kmh: s * 3.6, gear: lastGear, limitedBy: 'regim' };
    if (best < resistanceForce(v, s)) {
      if (s === 0) return { kmh: 0, gear: 1, limitedBy: 'cap' };
      // Si la marxa més llarga ja no és utilitzable, el límit és el règim de tall.
      const limitedBy = tractionAt(engine, v, top, s) ? 'resistencia' : 'regim';
      return { kmh: s * 3.6, gear: lastGear, limitedBy };
    }
    lastGear = bestGear + 1;
  }
  return { kmh: 150 * 3.6, gear: lastGear, limitedBy: 'resistencia' };
}

export interface TractionDiagramRow {
  kmh: number;
  resistance: number;
  aero: number;
  rolling: number;
  [gearKey: `g${number}`]: number | null;
}

/** Diagrama de tracció: força a la roda per marxa vs. velocitat i força resistent. */
export function tractionDiagram(engine: EngineModel, v: VehicleConfig, maxKmh: number, step = 2): TractionDiagramRow[] {
  const rows: TractionDiagramRow[] = [];
  for (let kmh = 0; kmh <= maxKmh; kmh += step) {
    const s = kmh / 3.6;
    const row: TractionDiagramRow = {
      kmh,
      aero: aeroForce(v, s),
      rolling: rollingForce(v),
      resistance: resistanceForce(v, s),
    };
    v.gearRatios.forEach((_, g) => {
      const t = tractionAt(engine, v, g, s);
      row[`g${g + 1}`] = t ? Math.round(t.force) : null;
    });
    rows.push(row);
  }
  return rows;
}
