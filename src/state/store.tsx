import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { PRESETS, TYPE_DEFAULTS } from '../data/presets';
import { analyze, type Analysis } from '../physics/analysis';
import type { Configuration, EngineConfig, VehicleConfig } from '../physics/types';
import { setNumberLocale } from '../utils/format';
import { LOCALES, type Lang } from '../i18n/lang';
import { clone, initialState, loadState, saveState, type AppState, type FuelSettings } from './storage';

type Action =
  | { type: 'select'; id: string }
  | { type: 'engine'; patch: Partial<EngineConfig> }
  | { type: 'vehicle'; patch: Partial<VehicleConfig> }
  | { type: 'rename'; name: string }
  | { type: 'duplicate'; name: string }
  | { type: 'newFromPreset'; presetId: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'resetActive' }
  | { type: 'fuel'; patch: Partial<FuelSettings> }
  | { type: 'compare'; slot: 0 | 1; id: string }
  | { type: 'simTarget'; kmh: number }
  | { type: 'resetAll' }
  | { type: 'lang'; lang: Lang };

const newId = () => `cfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function updateActive(s: AppState, fn: (c: Configuration) => Configuration): AppState {
  return { ...s, configs: s.configs.map((c) => (c.id === s.activeId ? fn(c) : c)) };
}

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'select':
      return s.configs.some((c) => c.id === a.id) ? { ...s, activeId: a.id } : s;
    case 'engine':
      return updateActive(s, (c) => {
        let engine = { ...c.engine, ...a.patch };
        let vehicle = c.vehicle;
        // Canvi de tipus: ajusta valors incompatibles (p. ex. cilindrada d'un elèctric)
        if (a.patch.type && a.patch.type !== c.engine.type) {
          const d = TYPE_DEFAULTS[a.patch.type];
          if (a.patch.type === 'electric') {
            engine = { ...engine, displacementCc: 0, cylinders: 0, idleRpm: 0, maxRpm: Math.max(engine.maxRpm, d.maxRpm) };
          } else if (c.engine.type === 'electric') {
            engine = { ...engine, displacementCc: 1998, cylinders: 4, idleRpm: d.idleRpm, maxRpm: d.maxRpm };
            if (vehicle.gearRatios.length === 1) vehicle = { ...vehicle, gearRatios: [...PRESETS[0].vehicle.gearRatios], finalDrive: PRESETS[0].vehicle.finalDrive, shiftTimeS: 0.35 };
          }
        }
        return { ...c, engine, vehicle };
      });
    case 'vehicle':
      return updateActive(s, (c) => ({ ...c, vehicle: { ...c.vehicle, ...a.patch } }));
    case 'rename':
      return updateActive(s, (c) => ({ ...c, name: a.name.slice(0, 80) }));
    case 'duplicate': {
      const cur = s.configs.find((c) => c.id === s.activeId);
      if (!cur) return s;
      const copy: Configuration = { ...clone(cur), id: newId(), name: a.name.slice(0, 80), builtIn: false };
      return { ...s, configs: [...s.configs, copy], activeId: copy.id };
    }
    case 'newFromPreset': {
      const p = PRESETS.find((x) => x.id === a.presetId);
      if (!p) return s;
      const c: Configuration = { ...clone(p), id: newId(), name: a.name.slice(0, 80), builtIn: false };
      return { ...s, configs: [...s.configs, c], activeId: c.id };
    }
    case 'delete': {
      if (s.configs.length <= 1) return s;
      const configs = s.configs.filter((c) => c.id !== a.id);
      const fix = (id: string) => (id === a.id ? configs[0].id : id);
      return { ...s, configs, activeId: fix(s.activeId), compare: [fix(s.compare[0]), fix(s.compare[1])] };
    }
    case 'resetActive':
      return updateActive(s, (c) => {
        const p = PRESETS.find((x) => x.id === c.id);
        return p ? { ...clone(p) } : c;
      });
    case 'fuel':
      return { ...s, fuel: { ...s.fuel, ...a.patch } };
    case 'compare': {
      const compare: [string, string] = [...s.compare];
      compare[a.slot] = a.id;
      return { ...s, compare };
    }
    case 'simTarget':
      return { ...s, simTargetKmh: a.kmh };
    case 'resetAll':
      return { ...initialState(), lang: s.lang };
    case 'lang':
      return { ...s, lang: a.lang };
  }
}

interface Store {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  active: Configuration;
  analysis: Analysis;
  analyzeById: (id: string) => { config: Configuration; analysis: Analysis } | null;
  saved: 'desat' | 'desant' | 'error';
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [saved, setSaved] = useState<Store['saved']>('desat');
  // El format numèric segueix l'idioma (s'aplica abans de renderitzar els fills)
  setNumberLocale(LOCALES[state.lang]);
  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);
  const first = useRef(true);

  // Desat amb retard (debounce) per no escriure a cada pulsació
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved('desant');
    const h = setTimeout(() => setSaved(saveState(state) ? 'desat' : 'error'), 350);
    return () => clearTimeout(h);
  }, [state]);

  const active = state.configs.find((c) => c.id === state.activeId) ?? state.configs[0];
  const analysis = useMemo(() => analyze(active, 200), [active]);

  // Memòria cau d'anàlisis per configuració (comparador i consum)
  const cache = useRef(new Map<string, { config: Configuration; analysis: Analysis }>());
  const analyzeById = (id: string) => {
    const config = state.configs.find((c) => c.id === id);
    if (!config) return null;
    if (config === active) return { config, analysis };
    const hit = cache.current.get(id);
    if (hit && hit.config === config) return hit;
    const entry = { config, analysis: analyze(config, 200) };
    cache.current.set(id, entry);
    return entry;
  };

  return <Ctx.Provider value={{ state, dispatch, active, analysis, analyzeById, saved }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora del StoreProvider');
  return s;
}
