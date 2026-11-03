let locale = 'ca-ES';
const cache = new Map<string, Intl.NumberFormat>();

/** Canvia la configuració regional del format numèric (es crida en canviar d'idioma). */
export function setNumberLocale(l: string) {
  locale = l;
}
export const getNumberLocale = () => locale;
/** Separador decimal de la configuració regional actual. */
export const decimalSeparator = () => (locale.startsWith('en') ? '.' : ',');

/** Format numèric segons l'idioma actiu (ca/es: 1.234,5 · en: 1,234.5). */
export function fmt(x: number | null | undefined, decimals = 0): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  const key = `${locale}|${decimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    cache.set(key, f);
  }
  return f.format(x);
}

/** Accepta coma o punt com a separador decimal. */
export const parseNumber = (txt: string): number => {
  const t = txt.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return NaN;
  return Number(t);
};

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
