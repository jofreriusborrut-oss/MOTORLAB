import { BMEP_RANGE, isElectric } from './constants';
import { bmepBar, createEngineModel, type EngineModel } from './engine';
import { sortCurve } from './interpolation';
import type { EngineConfig, Issue, VehicleConfig } from './types';

type P = Issue['params'];
const err = (field: string, code: string, params?: P): Issue => ({ level: 'error', field, code, params });
const warn = (field: string, code: string, params?: P): Issue => ({ level: 'avis', field, code, params });
const r1 = (x: number) => Math.round(x * 10) / 10;
const fin = (x: number) => typeof x === 'number' && Number.isFinite(x);

/**
 * Valida el motor. Els errors impedeixen calcular; els avisos indiquen
 * valors possibles però poc habituals o físicament dubtosos.
 */
export function validateEngine(e: EngineConfig, model?: EngineModel): Issue[] {
  const out: Issue[] = [];
  const electric = isElectric(e.type);

  if (!fin(e.maxRpm) || e.maxRpm <= 0) out.push(err('maxRpm', 'maxRpm.positive'));
  if (!electric) {
    if (!fin(e.displacementCc) || e.displacementCc < 50) out.push(err('displacementCc', 'disp.min'));
    if (!fin(e.cylinders) || e.cylinders < 1 || !Number.isInteger(e.cylinders)) out.push(err('cylinders', 'cyl.int'));
    if (!fin(e.idleRpm) || e.idleRpm <= 0) out.push(err('idleRpm', 'idle.positive'));
    else if (e.idleRpm >= e.maxRpm * 0.5) out.push(err('idleRpm', 'idle.tooHigh'));
    else if (e.idleRpm < 500 || e.idleRpm > 1300) out.push(warn('idleRpm', 'idle.unusual'));
    if (e.maxRpm > 10000) out.push(warn('maxRpm', 'maxRpm.race'));
    if (fin(e.displacementCc) && fin(e.cylinders) && e.cylinders >= 1) {
      const perCyl = e.displacementCc / e.cylinders;
      if (perCyl < 150 || perCyl > 1000) out.push(warn('cylinders', 'cyl.unitDisp', { cc: Math.round(perCyl) }));
    }
  } else if (e.maxRpm > 25000) {
    out.push(warn('maxRpm', 'maxRpm.evHigh'));
  }
  if (!fin(e.declaredConsumption) || e.declaredConsumption <= 0) out.push(err('declaredConsumption', 'decl.positive'));

  const pts = sortCurve(e.torqueCurve);
  if (pts.length < 2) out.push(err('torqueCurve', 'curve.minPoints'));
  if (pts.length !== e.torqueCurve.length) out.push(warn('torqueCurve', 'curve.dupes'));
  if (pts.some((p) => p.torque < 0)) out.push(err('torqueCurve', 'curve.negative'));
  if (pts.length >= 2) {
    const first = pts[0].rpm;
    const last = pts[pts.length - 1].rpm;
    if (!electric && first > e.idleRpm) out.push(warn('torqueCurve', 'curve.startAboveIdle', { rpm: first }));
    if (electric && first > 0) out.push(warn('torqueCurve', 'curve.evStart'));
    if (last < e.maxRpm) out.push(warn('torqueCurve', 'curve.endBelowMax', { last, max: e.maxRpm }));
    if (pts.every((p) => p.torque === 0)) out.push(err('torqueCurve', 'curve.zero'));
  }

  if (out.some((i) => i.level === 'error')) return out;

  const m = model ?? createEngineModel(e);
  if (!electric) {
    const bmep = bmepBar(m.peakTorque.torque, e.displacementCc);
    const range = BMEP_RANGE[e.type as keyof typeof BMEP_RANGE];
    if (bmep > range.max * 1.25) {
      out.push(err('torqueCurve', 'bmep.impossible', { bmep: r1(bmep), max: range.max }));
    } else if (bmep > range.max) {
      out.push(warn('torqueCurve', 'bmep.race', { bmep: r1(bmep) }));
    } else if (bmep < range.typical[0] * 0.6) {
      out.push(warn('torqueCurve', 'bmep.low', { bmep: r1(bmep) }));
    }
    const cvPerL = m.peakPower.cv / (e.displacementCc / 1000);
    if (cvPerL > 250) out.push(warn('torqueCurve', 'spec.race', { n: Math.round(cvPerL) }));
  }
  return out;
}

export function validateVehicle(v: VehicleConfig, electric: boolean): Issue[] {
  const out: Issue[] = [];
  if (!fin(v.massKg) || v.massKg < 50) out.push(err('massKg', 'mass.min'));
  else if (v.massKg < 500 || v.massKg > 4000) out.push(warn('massKg', 'mass.range'));
  if (!Array.isArray(v.gearRatios) || v.gearRatios.length < 1) out.push(err('gearRatios', 'gears.min'));
  else {
    if (v.gearRatios.some((r) => !fin(r) || r <= 0)) out.push(err('gearRatios', 'gears.positive'));
    for (let i = 1; i < v.gearRatios.length; i++) {
      if (v.gearRatios[i] >= v.gearRatios[i - 1]) {
        out.push(err('gearRatios', 'gears.order', { next: i + 1, prev: i }));
        break;
      }
    }
    if (!electric && v.gearRatios.length === 1) out.push(warn('gearRatios', 'gears.single'));
  }
  if (!fin(v.finalDrive) || v.finalDrive <= 0) out.push(err('finalDrive', 'final.positive'));
  if (!fin(v.wheelRadiusM) || v.wheelRadiusM <= 0.1) out.push(err('wheelRadiusM', 'wheel.min'));
  else if (v.wheelRadiusM > 0.6) out.push(warn('wheelRadiusM', 'wheel.unusual'));
  if (!fin(v.cx) || v.cx <= 0) out.push(err('cx', 'cx.positive'));
  else if (v.cx < 0.18 || v.cx > 1.0) out.push(warn('cx', 'cx.range'));
  if (!fin(v.frontalAreaM2) || v.frontalAreaM2 <= 0) out.push(err('frontalAreaM2', 'area.positive'));
  else if (v.frontalAreaM2 < 1.2 || v.frontalAreaM2 > 4) out.push(warn('frontalAreaM2', 'area.range'));
  if (!fin(v.rollingCoef) || v.rollingCoef <= 0) out.push(err('rollingCoef', 'crr.positive'));
  else if (v.rollingCoef > 0.03) out.push(warn('rollingCoef', 'crr.high'));
  if (!fin(v.drivetrainEfficiency) || v.drivetrainEfficiency <= 0.5 || v.drivetrainEfficiency > 1)
    out.push(err('drivetrainEfficiency', 'eta.range'));
  if (!fin(v.drivenAxleLoad) || v.drivenAxleLoad <= 0 || v.drivenAxleLoad > 1)
    out.push(err('drivenAxleLoad', 'axle.range'));
  if (!fin(v.tyreGrip) || v.tyreGrip <= 0) out.push(err('tyreGrip', 'grip.positive'));
  else if (v.tyreGrip > 1.6) out.push(warn('tyreGrip', 'grip.high'));
  if (!fin(v.shiftTimeS) || v.shiftTimeS < 0 || v.shiftTimeS > 3) out.push(err('shiftTimeS', 'shift.range'));
  return out;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === 'error');
