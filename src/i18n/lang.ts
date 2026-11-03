import { ca, type Dict, type TKey } from './ca';
import { es } from './es';
import { en } from './en';
import { fmt } from '../utils/format';

export type Lang = 'ca' | 'es' | 'en';
export const LANGS: Lang[] = ['ca', 'es', 'en'];
export const LOCALES: Record<Lang, string> = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
const DICTS: Record<Lang, Dict> = { ca, es, en };

export type Params = Record<string, string | number>;
export type Translate = (key: TKey, params?: Params) => string;

export const isLang = (x: unknown): x is Lang => typeof x === 'string' && (LANGS as string[]).includes(x);

/** Idioma inicial a partir del navegador (per defecte, anglès si no és ca/es). */
export function detectLang(): Lang {
  try {
    const nav = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
    if (nav.startsWith('ca')) return 'ca';
    if (nav.startsWith('es') || nav.startsWith('gl') || nav.startsWith('eu')) return 'es';
    if (nav.startsWith('en')) return 'en';
  } catch {
    /* entorn sense navigator (tests) */
  }
  return 'ca';
}

/** Tradueix una clau i substitueix {paràmetres}. Els números es formaten segons l'idioma. */
export function translate(lang: Lang, key: TKey, params?: Params): string {
  const raw = DICTS[lang][key] ?? ca[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    if (v === undefined) return m;
    if (typeof v === 'number') return fmt(v, Number.isInteger(v) ? 0 : 1);
    return v;
  });
}

export type { TKey };
