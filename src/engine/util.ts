export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const chance = (p: number) => Math.random() < p;
export function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const dist = (a: { e: number; s: number }, b: { e: number; s: number }) => Math.hypot(a.e - b.e, a.s - b.s);

export const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
export const START_YEAR = 2026;
export function dateLabel(m: number, short = false) {
  const y = START_YEAR + Math.floor(m / 12);
  const mo = MONTHS[m % 12];
  return short ? `${mo.slice(0, 3)} ${y}` : `${mo} de ${y}`;
}
export const yearOf = (m: number) => START_YEAR + Math.floor(m / 12);

export function fmtMoney(bn: number) {
  const a = Math.abs(bn);
  if (a >= 1000) return `${(bn / 1000).toFixed(a >= 10000 ? 1 : 2)} bil. $`;
  if (a >= 1) return `${bn.toFixed(a >= 100 ? 0 : 1)} mm $`;
  return `${(bn * 1000).toFixed(0)} M$`;
}
export const fmtPct = (v: number, d = 1) => `${v.toFixed(d)}%`;
export const sign = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;
