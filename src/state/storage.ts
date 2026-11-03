import { PRESETS } from '../data/presets';
import { detectLang, isLang, type Lang } from '../i18n/lang';
import type { Configuration, CurvePoint, EngineConfig, EngineType, VehicleConfig } from '../physics/types';

export const STORAGE_KEY = 'motorlab.v1';

export interface FuelSettings {
  gasolina: number; // €/L
  gasoil: number; // €/L
  electricitat: number; // €/kWh
  kmPerYear: number;
  source: 'estimat' | 'declarat';
}

export interface AppState {
  version: 1;
  configs: Configuration[];
  activeId: string;
  compare: [string, string];
  fuel: FuelSettings;
  simTargetKmh: number;
  lang: Lang;
}

export const DEFAULT_FUEL: FuelSettings = { gasolina: 1.55, gasoil: 1.48, electricitat: 0.2, kmPerYear: 15000, source: 'estimat' };

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function initialState(): AppState {
  return {
    version: 1,
    configs: clone(PRESETS),
    activeId: PRESETS[0].id,
    compare: [PRESETS[1].id, PRESETS[3].id],
    fuel: { ...DEFAULT_FUEL },
    simTargetKmh: 100,
    lang: detectLang(),
  };
}

/* --------- Sanejament: mai confiem cegament en el que hi ha a LocalStorage --------- */

const TYPES: EngineType[] = ['gasolina-atm', 'gasolina-turbo', 'diesel', 'electric'];
const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const str = (x: unknown, fallback: string) => (typeof x === 'string' && x.trim() ? x.slice(0, 80) : fallback);

function sanitizeEngine(raw: unknown, fb: EngineConfig): EngineConfig {
  const r = (raw ?? {}) as Partial<EngineConfig>;
  const curve: CurvePoint[] = Array.isArray(r.torqueCurve)
    ? r.torqueCurve
        .map((p) => ({ rpm: num((p as CurvePoint)?.rpm, NaN), torque: num((p as CurvePoint)?.torque, NaN) }))
        .filter((p) => Number.isFinite(p.rpm) && Number.isFinite(p.torque))
        .slice(0, 40)
    : [];
  return {
    name: str(r.name, fb.name),
    type: TYPES.includes(r.type as EngineType) ? (r.type as EngineType) : fb.type,
    displacementCc: num(r.displacementCc, fb.displacementCc),
    cylinders: num(r.cylinders, fb.cylinders),
    maxRpm: num(r.maxRpm, fb.maxRpm),
    idleRpm: num(r.idleRpm, fb.idleRpm),
    declaredConsumption: num(r.declaredConsumption, fb.declaredConsumption),
    torqueCurve: curve.length >= 2 ? curve : clone(fb.torqueCurve),
  };
}

function sanitizeVehicle(raw: unknown, fb: VehicleConfig): VehicleConfig {
  const r = (raw ?? {}) as Partial<VehicleConfig>;
  const gears = Array.isArray(r.gearRatios) ? r.gearRatios.map((g) => num(g, NaN)).filter(Number.isFinite).slice(0, 10) : [];
  return {
    massKg: num(r.massKg, fb.massKg),
    gearRatios: gears.length ? gears : [...fb.gearRatios],
    finalDrive: num(r.finalDrive, fb.finalDrive),
    wheelRadiusM: num(r.wheelRadiusM, fb.wheelRadiusM),
    cx: num(r.cx, fb.cx),
    frontalAreaM2: num(r.frontalAreaM2, fb.frontalAreaM2),
    rollingCoef: num(r.rollingCoef, fb.rollingCoef),
    drivetrainEfficiency: num(r.drivetrainEfficiency, fb.drivetrainEfficiency),
    drivenAxleLoad: num(r.drivenAxleLoad, fb.drivenAxleLoad),
    tyreGrip: num(r.tyreGrip, fb.tyreGrip),
    shiftTimeS: num(r.shiftTimeS, fb.shiftTimeS),
  };
}

export function sanitizeState(raw: unknown): AppState {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  if (r.version !== 1 || !Array.isArray(r.configs)) return base;
  const fb = PRESETS[0];
  const configs: Configuration[] = r.configs.slice(0, 50).map((c, i) => {
    const cc = (c ?? {}) as Partial<Configuration>;
    const preset = PRESETS.find((p) => p.id === cc.id) ?? fb;
    return {
      id: str(cc.id, `cfg-${i}-${Date.now()}`),
      name: str(cc.name, preset.name),
      builtIn: Boolean(cc.builtIn && PRESETS.some((p) => p.id === cc.id)),
      engine: sanitizeEngine(cc.engine, preset.engine),
      vehicle: sanitizeVehicle(cc.vehicle, preset.vehicle),
    };
  });
  const unique = configs.filter((c, i) => configs.findIndex((d) => d.id === c.id) === i);
  if (unique.length === 0) return base;
  const ids = unique.map((c) => c.id);
  const pick = (id: unknown, idx: number) => (typeof id === 'string' && ids.includes(id) ? id : ids[Math.min(idx, ids.length - 1)]);
  const f = (r.fuel ?? {}) as Partial<FuelSettings>;
  return {
    version: 1,
    configs: unique,
    activeId: pick(r.activeId, 0),
    compare: [pick(r.compare?.[0], 0), pick(r.compare?.[1], 1)],
    fuel: {
      gasolina: num(f.gasolina, DEFAULT_FUEL.gasolina),
      gasoil: num(f.gasoil, DEFAULT_FUEL.gasoil),
      electricitat: num(f.electricitat, DEFAULT_FUEL.electricitat),
      kmPerYear: num(f.kmPerYear, DEFAULT_FUEL.kmPerYear),
      source: f.source === 'declarat' ? 'declarat' : 'estimat',
    },
    simTargetKmh: [100, 150, 200].includes(r.simTargetKmh as number) ? (r.simTargetKmh as number) : 100,
    lang: isLang(r.lang) ? r.lang : base.lang,
  };
}

export function loadState(): AppState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    return txt ? sanitizeState(JSON.parse(txt)) : initialState();
  } catch {
    return initialState();
  }
}

export function saveState(s: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
