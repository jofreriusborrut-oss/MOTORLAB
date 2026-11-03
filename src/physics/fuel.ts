import { ENERGY, isElectric } from './constants';
import { powerKw, torqueFromPower, type EngineModel } from './engine';
import { overallRatio, resistanceForce, rpmFromSpeed } from './vehicle';
import type { VehicleConfig } from './types';

export interface SteadyPoint {
  kmh: number;
  gear: number;
  rpm: number;
  roadKw: number; // potència necessària a la roda
  engineKw: number; // potència al motor
  load: number; // fracció del parell disponible (0..1)
  flow: number; // L/h o kW
  per100km: number; // L/100 km o kWh/100 km
  feasible: boolean;
}

/**
 * Consum a velocitat constant en pla. Es tria la marxa amb menys consum entre
 * les que poden mantenir la velocitat (règim ≥ mínim de circulació i parell suficient).
 */
export function steadyConsumption(engine: EngineModel, v: VehicleConfig, kmh: number): SteadyPoint {
  const s = kmh / 3.6;
  const roadKw = (resistanceForce(v, s) * s) / 1000;
  const engineKw = roadKw / v.drivetrainEfficiency;
  const electric = isElectric(engine.config.type);
  const minCruiseRpm = electric ? 0 : Math.max(engine.config.idleRpm * 1.3, 1150);

  let best: SteadyPoint | null = null;
  for (let g = 0; g < v.gearRatios.length; g++) {
    const rpm = rpmFromSpeed(s, overallRatio(v, g), v.wheelRadiusM);
    if (rpm > engine.config.maxRpm * 0.98 || rpm < minCruiseRpm) continue;
    const available = engine.torqueAt(rpm);
    const required = torqueFromPower(engineKw, rpm);
    if (required > available * 0.95) continue;
    const flow = engine.flowAt(rpm, engineKw);
    const point: SteadyPoint = {
      kmh,
      gear: g + 1,
      rpm,
      roadKw,
      engineKw,
      load: available > 0 ? required / available : 1,
      flow,
      per100km: kmh > 0 ? (flow / kmh) * 100 : 0,
      feasible: true,
    };
    if (!best || point.flow < best.flow) best = point;
  }
  return (
    best ?? { kmh, gear: 0, rpm: 0, roadKw, engineKw, load: 1, flow: NaN, per100km: NaN, feasible: false }
  );
}

export interface CycleEstimate {
  urban: number;
  road: number;
  highway: number;
  mixed: number;
  unit: 'L/100 km' | 'kWh/100 km';
  points: { urban: SteadyPoint; road: SteadyPoint; highway: SteadyPoint };
  feasible: boolean;
}

/**
 * Cicle mixt simplificat:
 *  - Urbà: creuer a 40 km/h + una arrencada fins a 50 km/h cada 400 m + 18 % del temps al ralentí.
 *    L'energia cinètica es perd en frenar (l'elèctric en recupera un 60 %).
 *  - Carretera: 90 km/h constants.  - Autopista: 120 km/h constants.
 *  - Ponderació: 35 % urbà, 40 % carretera, 25 % autopista.
 */
export function cycleEstimate(engine: EngineModel, v: VehicleConfig): CycleEstimate {
  const electric = isElectric(engine.config.type);
  const urbanCruise = steadyConsumption(engine, v, 40);
  const road = steadyConsumption(engine, v, 90);
  const highway = steadyConsumption(engine, v, 120);

  // Energia d'arrencada per km (J) → energia d'entrada amb el rendiment a càrrega mitjana.
  const stopsPerKm = 1000 / 400;
  const vStop = 50 / 3.6;
  const kinetic = 0.5 * v.massKg * 1.05 * vStop * vStop * stopsPerKm; // J/km (inclou inèrcies)
  const recovered = electric ? 0.6 : 0;
  const midRpm = electric ? engine.config.maxRpm * 0.25 : Math.max(engine.config.idleRpm * 2.5, 2200);
  const midKw = powerKw(engine.torqueAt(midRpm) * 0.5, midRpm);
  const effAtMid = midKw > 0 ? midKw / engine.inputPowerKw(midRpm, midKw) : 0.25;
  const accelInputKwhPerKm = (kinetic * (1 - recovered)) / (v.drivetrainEfficiency * effAtMid) / 3.6e6;

  // Ralentí: 18 % del temps en ciutat (velocitat mitjana en moviment ≈ 30 km/h)
  const idleKwIn = electric ? 0.4 : engine.inputPowerKw(engine.config.idleRpm, 0);
  const movingHoursPerKm = 1 / 30;
  const idleHoursPerKm = (movingHoursPerKm * 0.18) / 0.82;
  const idleKwhPerKm = idleKwIn * idleHoursPerKm;

  const toUnitPer100 = (kwhPerKm: number) => {
    if (electric) return kwhPerKm * 100;
    const e = ENERGY[engine.config.type];
    return ((kwhPerKm * 3.6) / e.lhvMJkg / e.densityKgL) * 100; // L/100 km
  };

  const urban = urbanCruise.per100km + toUnitPer100(accelInputKwhPerKm + idleKwhPerKm);
  const feasible = urbanCruise.feasible && road.feasible && highway.feasible;
  const mixed = 0.35 * urban + 0.4 * road.per100km + 0.25 * highway.per100km;

  return {
    urban,
    road: road.per100km,
    highway: highway.per100km,
    mixed,
    unit: electric ? 'kWh/100 km' : 'L/100 km',
    points: { urban: urbanCruise, road, highway },
    feasible,
  };
}

export interface CostResult {
  per100km: number; // €
  perKm: number;
  annual: number;
  annualEnergy: number; // L o kWh
}

export function costs(consumptionPer100: number, pricePerUnit: number, kmPerYear: number): CostResult {
  const per100km = consumptionPer100 * pricePerUnit;
  return {
    per100km,
    perKm: per100km / 100,
    annual: (per100km * kmPerYear) / 100,
    annualEnergy: (consumptionPer100 * kmPerYear) / 100,
  };
}

/** Consum en funció de la velocitat (per a gràfiques). */
export function consumptionVsSpeed(engine: EngineModel, v: VehicleConfig, maxKmh: number, step = 5) {
  const rows: { kmh: number; per100km: number | null; gear: number | null }[] = [];
  for (let k = 20; k <= maxKmh; k += step) {
    const p = steadyConsumption(engine, v, k);
    rows.push({ kmh: k, per100km: p.feasible ? round2(p.per100km) : null, gear: p.feasible ? p.gear : null });
  }
  return rows;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
