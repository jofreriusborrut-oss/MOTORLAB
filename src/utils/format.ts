const cache = new Map<number, Intl.NumberFormat>();

/** Format numèric en català (coma decimal, punt de milers). */
export function fmt(x: number | null | undefined, decimals = 0): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  let f = cache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('ca-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    cache.set(decimals, f);
  }
  return f.format(x);
}

export const parseNumber = (txt: string): number => {
  const t = txt.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return NaN;
  return Number(t);
};

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
