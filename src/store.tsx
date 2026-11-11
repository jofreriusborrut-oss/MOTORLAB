import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Game } from './engine/types';
import { tick } from './engine/sim';
import type { ActResult } from './engine/actions';

const KEY = 'governa-partida-v1';
export const SPEEDS = [0, 1600, 750, 320];

interface Toast { id: number; text: string; ok: boolean }

interface Store {
  game: Game | null;
  setGame: (g: Game | null) => void;
  speed: number;
  setSpeed: (s: number) => void;
  panel: string;
  setPanel: (p: string) => void;
  selNation: string | null;
  setSelNation: (id: string | null) => void;
  view: 'govern' | 'mon';
  setView: (v: 'govern' | 'mon') => void;
  path: string[];
  setPath: (p: string[]) => void;
  toasts: Toast[];
  toast: (text: string, ok?: boolean) => void;
  act: (fn: (g: Game) => ActResult | Game) => boolean;
  save: () => void;
  hasSave: boolean;
  load: () => void;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);
export const useGame = () => useContext(Ctx).game!;

function readSave(): Game | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Game) : null;
  } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [game, setGameState] = useState<Game | null>(null);
  const [speed, setSpeed] = useState(0);
  const [panel, setPanel] = useState('resum');
  const [selNation, setSelNation] = useState<string | null>(null);
  const [view, setView] = useState<'govern' | 'mon'>('govern');
  const [path, setPath] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasSave, setHasSave] = useState(() => !!readSave());
  const seq = useRef(0);
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;

  const setGame = useCallback((g: Game | null) => setGameState(g), []);

  const toast = useCallback((text: string, ok = true) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, text, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const act = useCallback((fn: (g: Game) => ActResult | Game) => {
    const g = gameRef.current;
    if (!g) return false;
    const r = fn(g);
    if ('g' in r && 'ok' in r) {
      setGameState(r.g);
      if (r.msg) toast(r.msg, r.ok);
      return r.ok;
    }
    setGameState(r as Game);
    return true;
  }, [toast]);

  const save = useCallback(() => {
    if (!gameRef.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(gameRef.current)); setHasSave(true); } catch { /* sense espai */ }
  }, []);
  const load = useCallback(() => {
    const g = readSave();
    if (g) { setGameState(g); setSpeed(0); setPanel('resum'); setPath([]); }
  }, []);

  // pas del temps
  const blocked = !game || game.modalQueue.length > 0;
  useEffect(() => {
    if (!speed || blocked) return;
    const id = setInterval(() => setGameState((g) => (g && !g.modalQueue.length ? tick(g) : g)), SPEEDS[speed]);
    return () => clearInterval(id);
  }, [speed, blocked]);

  // desat automàtic cada 6 mesos
  useEffect(() => {
    if (game && game.month > 0 && game.month % 6 === 0) save();
  }, [game?.month, save]); // eslint-disable-line react-hooks/exhaustive-deps

  // espai = pausa
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); setSpeed((s) => (s ? 0 : 1)); }
      if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(+e.key);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <Ctx.Provider value={{ game, setGame, speed, setSpeed, panel, setPanel, selNation, setSelNation, view, setView, path, setPath, toasts, toast, act, save, hasSave, load }}>
      {children}
    </Ctx.Provider>
  );
}
