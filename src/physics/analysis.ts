import { isElectric } from './constants';
import { createEngineModel, type EngineModel } from './engine';
import { cycleEstimate, type CycleEstimate } from './fuel';
import { gearTable, gripLimit, topSpeed, type GearInfo, type TopSpeedResult } from './vehicle';
import { hasErrors, validateEngine, validateVehicle } from './validation';
import { simulateAcceleration, type SimResult } from '../simulation/acceleration';
import type { Configuration, Issue } from './types';

export interface Analysis {
  ok: boolean;
  issues: Issue[];
  engine: EngineModel | null;
  gears: GearInfo[];
  top: TopSpeedResult | null;
  sim: SimResult | null;
  cycle: CycleEstimate | null;
  powerToWeight: number; // CV/t
  gripLimitN: number;
}

/** Calcula tots els resultats d'una configuració (o retorna els errors). */
export function analyze(cfg: Configuration, simTargetKmh = 200): Analysis {
  const engineIssues = validateEngine(cfg.engine);
  const vehicleIssues = validateVehicle(cfg.vehicle, isElectric(cfg.engine.type));
  const issues = [...engineIssues, ...vehicleIssues];
  const empty: Analysis = { ok: false, issues, engine: null, gears: [], top: null, sim: null, cycle: null, powerToWeight: 0, gripLimitN: 0 };
  if (hasErrors(engineIssues)) return empty;
  const engine = createEngineModel(cfg.engine);
  if (hasErrors(vehicleIssues)) return { ...empty, engine };

  const top = topSpeed(engine, cfg.vehicle);
  const extra: Issue[] = [];
  if (top.limitedBy === 'cap') {
    extra.push({ level: 'error', field: 'gearRatios', message: 'El vehicle no pot arrencar: la força de tracció no supera la resistència al rodament.' });
  }
  if (top.kmh > 420) {
    extra.push({ level: 'avis', field: 'cx', message: 'Velocitat màxima superior a 420 km/h: el model aerodinàmic simple deixa de ser fiable.' });
  }
  const target = Math.min(simTargetKmh, Math.max(10, top.kmh - 0.5));
  const sim = top.limitedBy === 'cap' ? null : simulateAcceleration(engine, cfg.vehicle, { targetKmh: target });
  if (sim?.t0to100 !== null && sim?.t0to100 !== undefined && sim.t0to100 < 1.9) {
    extra.push({ level: 'avis', field: 'tyreGrip', message: 'Un 0–100 inferior a 1,9 s supera el que permeten pneumàtics de carrer: revisa l\'adherència.' });
  }
  const cycle = cycleEstimate(engine, cfg.vehicle);
  return {
    ok: top.limitedBy !== 'cap',
    issues: [...issues, ...extra],
    engine,
    gears: gearTable(engine, cfg.vehicle),
    top,
    sim,
    cycle,
    powerToWeight: engine.peakPower.cv / (cfg.vehicle.massKg / 1000),
    gripLimitN: gripLimit(cfg.vehicle),
  };
}
