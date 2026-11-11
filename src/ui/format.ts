import type { CountryDef, Ideo } from '../engine/types';

export function ideoLabel(i: Ideo) {
  const e = i.e < -65 ? 'Esquerra radical' : i.e < -30 ? 'Esquerra' : i.e < -10 ? 'Centreesquerra' : i.e <= 15 ? 'Centre' : i.e <= 40 ? 'Centredreta' : i.e <= 70 ? 'Dreta' : 'Dreta liberal';
  const s = i.s < -45 ? 'progressista' : i.s < 20 ? 'moderat' : i.s < 65 ? 'conservador' : 'nacionalista autoritari';
  return `${e} ${s}`;
}

export const RG_LABEL: Record<CountryDef['rg'], string> = {
  dem: 'Democràcia', def: 'Democràcia imperfecta', hyb: 'Règim híbrid', aut: 'Règim autoritari', tot: 'Dictadura',
};

export function difficulty(c: CountryDef): { label: string; cls: string } {
  let d = 0;
  d += c.unemp > 15 ? 2 : c.unemp > 8 ? 1 : 0;
  d += c.infl > 20 ? 2 : c.infl > 6 ? 1 : 0;
  d += c.debt > 120 ? 1 : 0;
  d += c.stability < 40 ? 2 : c.stability < 55 ? 1 : 0;
  d += c.spend - c.rev > 6 ? 1 : 0;
  d += c.id === '804' || c.id === '643' ? 2 : 0;
  d += c.crime > 75 ? 1 : 0;
  return d <= 1 ? { label: 'Fàcil', cls: 'ok' } : d <= 3 ? { label: 'Mitjana', cls: 'warn' } : { label: 'Difícil', cls: 'err' };
}

export const toneColor = (v: number, good = true) => {
  const x = good ? v : 100 - v;
  return x >= 66 ? 'var(--ok)' : x >= 40 ? 'var(--warn)' : 'var(--err)';
};
