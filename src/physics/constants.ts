import type { EngineType } from './types';

export const G = 9.80665; // m/s²
export const AIR_DENSITY = 1.225; // kg/m³ (15 °C, nivell del mar)
export const KW_TO_CV = 1.35962;
export const KMH_TO_MS = 1 / 3.6;

export interface EnergySource {
  label: string;
  unit: 'L' | 'kWh';
  /** Poder calorífic inferior (MJ/kg). */
  lhvMJkg: number;
  /** Densitat (kg/L). */
  densityKgL: number;
  /** Rendiment indicat (model de Willans). */
  indicatedEfficiency: number;
  /** Increment de la pressió mitjana de fricció (bar) respecte al model base. */
  fmepOffsetBar: number;
}

export const ENERGY: Record<EngineType, EnergySource> = {
  'gasolina-atm': { label: 'Gasolina', unit: 'L', lhvMJkg: 43.0, densityKgL: 0.745, indicatedEfficiency: 0.38, fmepOffsetBar: 0 },
  'gasolina-turbo': { label: 'Gasolina', unit: 'L', lhvMJkg: 43.0, densityKgL: 0.745, indicatedEfficiency: 0.39, fmepOffsetBar: 0.1 },
  diesel: { label: 'Gasoil', unit: 'L', lhvMJkg: 42.8, densityKgL: 0.835, indicatedEfficiency: 0.45, fmepOffsetBar: 0.3 },
  electric: { label: 'Electricitat', unit: 'kWh', lhvMJkg: 0, densityKgL: 0, indicatedEfficiency: 0.92, fmepOffsetBar: 0 },
};

export const ENGINE_TYPE_LABEL: Record<EngineType, string> = {
  'gasolina-atm': 'Gasolina atmosfèric',
  'gasolina-turbo': 'Gasolina turbo',
  diesel: 'Dièsel',
  electric: 'Elèctric',
};

/** Rangs habituals de pressió mitjana efectiva (BMEP, bar) a parell màxim. */
export const BMEP_RANGE: Record<Exclude<EngineType, 'electric'>, { typical: [number, number]; max: number }> = {
  'gasolina-atm': { typical: [9, 14], max: 16 },
  'gasolina-turbo': { typical: [15, 25], max: 32 },
  diesel: { typical: [17, 27], max: 33 },
};

export const isElectric = (t: EngineType) => t === 'electric';

/** Inèrcia aproximada de les parts giratòries del motor (volant + cigonyal o rotor), kg·m². */
export const ENGINE_INERTIA: Record<EngineType, number> = {
  'gasolina-atm': 0.16,
  'gasolina-turbo': 0.18,
  diesel: 0.25,
  electric: 0.05,
};

/** Inèrcia total de les quatre rodes amb pneumàtics, kg·m². */
export const WHEELS_INERTIA = 4.0;

/** Potència consumida pels accessoris (alternador, climatització, electrònica), kW. */
export const AUXILIARY_POWER_KW = 0.35;
