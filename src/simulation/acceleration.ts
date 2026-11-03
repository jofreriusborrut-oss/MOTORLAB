import { isElectric } from '../physics/constants';
import { powerKw, type EngineModel } from '../physics/engine';
import {
  aeroForce,
  effectiveMass,
  gripLimit,
  launchRpm,
  overallRatio,
  rollingForce,
  rpmFromSpeed,
  wheelForce,
} from '../physics/vehicle';
import type { VehicleConfig } from '../physics/types';

export interface SimSample {
  t: number; // s
  kmh: number;
  distance: number; // m
  rpm: number;
  gear: number; // 1..n
  accel: number; // m/s²
  accelG: number;
  traction: number; // N
  aero: number; // N
  rolling: number; // N
  powerKw: number; // potència del motor
  shifting: boolean;
  gripLimited: boolean;
  limiter: boolean;
}

export interface SimOptions {
  targetKmh: number;
  maxTimeS: number;
  dt: number;
  sampleEvery: number;
}

export interface SimResult {
  samples: SimSample[];
  t0to100: number | null;
  t0to60: number | null;
  t80to120: number | null;
  t400m: number | null;
  v400mKmh: number | null;
  reachedTarget: boolean;
  finalKmh: number;
  shifts: { t: number; from: number; to: number; kmh: number }[];
  endReason: 'objectiu' | 'temps' | 'velocitat-maxima';
}

const DEFAULTS: SimOptions = { targetKmh: 200, maxTimeS: 60, dt: 0.005, sampleEvery: 0.05 };

/**
 * Integra l'acceleració a plena càrrega (mètode d'Euler semi-implícit, dt = 5 ms).
 *
 *  a = (F_tracció − F_aero − F_rodament) / m_eq
 *
 * Inclou: lliscament d'embragatge a la sortida, límit d'adherència dels
 * pneumàtics, tall d'injecció al règim màxim, temps de canvi sense tracció i
 * canvis de marxa automàtics al punt òptim (quan la marxa següent dona més força).
 */
export function simulateAcceleration(engine: EngineModel, v: VehicleConfig, opts: Partial<SimOptions> = {}): SimResult {
  const o = { ...DEFAULTS, ...opts };
  const electric = isElectric(engine.config.type);
  const nGears = v.gearRatios.length;
  const maxRpm = engine.config.maxRpm;
  const launch = launchRpm(engine);
  const grip = gripLimit(v);
  const rolling = rollingForce(v);

  let t = 0;
  let speed = 0;
  let x = 0;
  let gear = 0;
  let shiftTimer = 0;
  let shiftFromRpm = 0;
  let nextSample = 0;
  let stallTime = 0;
  let endReason: SimResult['endReason'] = 'temps';

  const samples: SimSample[] = [];
  const shifts: SimResult['shifts'] = [];
  let t0to60: number | null = null;
  let t0to100: number | null = null;
  let t80: number | null = null;
  let t80to120: number | null = null;
  let t400m: number | null = null;
  let v400m: number | null = null;

  const engineState = (g: number, s: number) => {
    const ratio = overallRatio(v, g);
    const wheelRpm = rpmFromSpeed(s, ratio, v.wheelRadiusM);
    let rpm = wheelRpm;
    if (!electric && g === 0 && wheelRpm < launch) rpm = launch;
    if (!electric) rpm = Math.max(rpm, engine.config.idleRpm);
    const limiter = wheelRpm >= maxRpm;
    const torque = limiter ? 0 : engine.torqueAt(rpm);
    return { ratio, wheelRpm, rpm, torque, limiter, raw: wheelForce(torque, ratio, v) };
  };

  while (t <= o.maxTimeS) {
    const shifting = shiftTimer > 0;
    const st = engineState(gear, speed);
    let traction = 0;
    let displayRpm = st.rpm;
    if (shifting) {
      // Durant el canvi el motor baixa de règim cap al de la marxa nova.
      const target = engineState(gear + 1, speed).rpm;
      const k = 1 - shiftTimer / Math.max(1e-6, v.shiftTimeS);
      displayRpm = shiftFromRpm + (target - shiftFromRpm) * k;
    } else {
      traction = Math.min(st.raw, grip);
    }
    const gripLimited = !shifting && st.raw > grip;
    const aero = aeroForce(v, speed);
    const resist = speed > 0.01 || traction > rolling ? aero + rolling : traction;
    const mEq = effectiveMass(v, st.ratio, engine.config.type);
    const accel = (traction - resist) / mEq;

    if (t >= nextSample - 1e-9) {
      samples.push({
        t: round(t, 3),
        kmh: speed * 3.6,
        distance: x,
        rpm: displayRpm,
        gear: gear + 1,
        accel,
        accelG: accel / 9.80665,
        traction,
        aero,
        rolling,
        powerKw: shifting ? 0 : powerKw(st.torque, st.rpm),
        shifting,
        gripLimited,
        limiter: st.limiter,
      });
      nextSample += o.sampleEvery;
    }

    // Integració
    const prevSpeed = speed;
    const prevX = x;
    speed = Math.max(0, speed + accel * o.dt);
    x += 0.5 * (prevSpeed + speed) * o.dt;
    t += o.dt;

    const kmh = speed * 3.6;
    const prevKmh = prevSpeed * 3.6;
    const cross = (thr: number) => t - o.dt + (o.dt * (thr - prevKmh)) / Math.max(1e-9, kmh - prevKmh);
    if (t0to60 === null && kmh >= 60) t0to60 = cross(60);
    if (t0to100 === null && kmh >= 100) t0to100 = cross(100);
    if (t80 === null && kmh >= 80) t80 = cross(80);
    if (t80to120 === null && t80 !== null && kmh >= 120) t80to120 = cross(120) - t80;
    if (t400m === null && x >= 400) {
      const f = (400 - prevX) / Math.max(1e-9, x - prevX);
      t400m = t - o.dt + f * o.dt;
      v400m = (prevSpeed + f * (speed - prevSpeed)) * 3.6;
    }

    // Gestió del canvi automàtic
    if (shiftTimer > 0) {
      shiftTimer -= o.dt;
      if (shiftTimer <= 0) {
        shiftTimer = 0;
        gear += 1;
      }
    } else if (gear < nGears - 1) {
      const cur = engineState(gear, speed);
      const next = engineState(gear + 1, speed);
      const nextUsable = electric || next.wheelRpm >= engine.config.idleRpm * 1.1;
      const better = Math.min(next.raw, grip) > Math.min(cur.raw, grip) + 1 && !cur.limiter;
      const nearRedline = cur.wheelRpm >= maxRpm * 0.985;
      if (nextUsable && (better || nearRedline) && !(cur.wheelRpm < launch && gear === 0 && !electric)) {
        shifts.push({ t: round(t, 3), from: gear + 1, to: gear + 2, kmh });
        shiftFromRpm = cur.rpm;
        if (v.shiftTimeS <= 0) gear += 1;
        else shiftTimer = v.shiftTimeS;
      }
    }

    if (kmh >= o.targetKmh) {
      endReason = 'objectiu';
      break;
    }
    // Velocitat màxima assolida (acceleració pràcticament nul·la durant 2 s)
    if (!shifting && accel < 0.03 && speed > 1) {
      stallTime += o.dt;
      if (stallTime > 2) {
        endReason = 'velocitat-maxima';
        break;
      }
    } else stallTime = 0;
    if (speed <= 0 && t > 1) {
      endReason = 'velocitat-maxima';
      break;
    }
  }

  const last = samples[samples.length - 1];
  const finalSt = engineState(gear, speed);
  samples.push({
    t: round(t, 3),
    kmh: speed * 3.6,
    distance: x,
    rpm: finalSt.rpm,
    gear: gear + 1,
    accel: last?.accel ?? 0,
    accelG: (last?.accel ?? 0) / 9.80665,
    traction: last?.traction ?? 0,
    aero: aeroForce(v, speed),
    rolling,
    powerKw: powerKw(finalSt.torque, finalSt.rpm),
    shifting: false,
    gripLimited: false,
    limiter: finalSt.limiter,
  });

  return {
    samples,
    t0to100,
    t0to60,
    t80to120,
    t400m,
    v400mKmh: v400m,
    reachedTarget: endReason === 'objectiu',
    finalKmh: speed * 3.6,
    shifts,
    endReason,
  };
}

/** Interpola una mostra de la simulació a l'instant `t` (per a la reproducció). */
export function sampleAt(samples: SimSample[], t: number): SimSample {
  if (samples.length === 0) throw new Error('Sense mostres');
  if (t <= samples[0].t) return samples[0];
  const lastS = samples[samples.length - 1];
  if (t >= lastS.t) return lastS;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t > t) hi = mid;
    else lo = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const k = (t - a.t) / Math.max(1e-9, b.t - a.t);
  const lerp = (p: number, q: number) => p + (q - p) * k;
  return {
    ...a,
    t,
    kmh: lerp(a.kmh, b.kmh),
    distance: lerp(a.distance, b.distance),
    rpm: a.gear === b.gear ? lerp(a.rpm, b.rpm) : a.rpm,
    accel: lerp(a.accel, b.accel),
    accelG: lerp(a.accelG, b.accelG),
    traction: lerp(a.traction, b.traction),
    aero: lerp(a.aero, b.aero),
    powerKw: lerp(a.powerKw, b.powerKw),
  };
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
