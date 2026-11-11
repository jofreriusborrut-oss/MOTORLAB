import { POLICIES, POLICY_BY_ID } from '../data/policies';
import { GROUPS, MINISTRIES, TAXES, TAX_FX } from '../data/groups';
import type { Effects, EffectKey, Game, GroupId, Ideo, MinistryId, Party, TaxId } from './types';
import { clamp, dist } from './util';

export function policyFx(pol: Record<string, number>): Effects {
  const r: Effects = {};
  for (const p of POLICIES) {
    const opt = p.options[pol[p.id] ?? 0];
    if (!opt) continue;
    for (const [k, v] of Object.entries(opt.fx)) r[k as EffectKey] = (r[k as EffectKey] ?? 0) + (v as number);
  }
  return r;
}

/** Diferència d'efectes respecte a la situació inicial, incloent efectes temporals d'esdeveniments */
export function fxDelta(g: Game): Effects {
  const a = policyFx(g.policies), b = policyFx(g.policies0);
  const r: Effects = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) r[k as EffectKey] = (a[k as EffectKey] ?? 0) - (b[k as EffectKey] ?? 0);
  for (const t of g.tempFx) for (const [k, v] of Object.entries(t.fx)) r[k as EffectKey] = (r[k as EffectKey] ?? 0) + (v as number);
  // efectes dels impostos
  for (const t of TAXES) {
    const d = g.taxes[t.id] - g.taxes0[t.id];
    const f = TAX_FX[t.id];
    r.growth = (r.growth ?? 0) + f.growth * d;
    r.gini = (r.gini ?? 0) + f.gini * d;
    if (f.unemp) r.unemp = (r.unemp ?? 0) + f.unemp * d;
    if (f.infl) r.infl = (r.infl ?? 0) + f.infl * d;
    if (f.env) r.env = (r.env ?? 0) + f.env * d;
  }
  return r;
}

export const fx = (e: Effects, k: EffectKey) => e[k] ?? 0;

export function groupPolicyDelta(g: Game, gid: GroupId): number {
  let s = 0;
  for (const p of POLICIES) {
    const a = p.options[g.policies[p.id]]?.g[gid] ?? 0;
    const b = p.options[g.policies0[p.id]]?.g[gid] ?? 0;
    s += a - b;
  }
  return s;
}

export function programsCost(pol: Record<string, number>) {
  return policyFx(pol).spend ?? 0;
}

function taxYield(id: TaxId, rate: number) {
  const t = TAXES.find((x) => x.id === id)!;
  return t.yield * rate * (1 - rate / (2.2 * t.max));
}

export function taxModel(taxes: Record<TaxId, number>) {
  let s = 0;
  for (const t of TAXES) s += taxYield(t.id, taxes[t.id]);
  return s;
}

export function revenueBreakdown(g: Game): Record<string, number> {
  const comp = clamp(1 - 0.004 * (g.slow.corruption - g.slow0.corruption) - 0.3 * Math.max(0, 1 - g.budget.admin / Math.max(0.1, g.budget0.admin)), 0.4, 1.15);
  const cyc = clamp(1 - 0.008 * (g.unemp - g.base.unemp), 0.7, 1.1);
  const r: Record<string, number> = {};
  for (const t of TAXES) r[t.id] = taxYield(t.id, g.taxes[t.id]) * g.revCalib * comp * cyc;
  const pf = policyFx(g.policies);
  r.empreses = pf.revenue ?? 0;
  r.recursos = g.def.res ?? 0;
  if (g.reparations > 0) r.reparacions = g.reparations;
  return r;
}

export function warCost(g: Game) {
  const n = g.wars.filter((w) => w.a === g.countryId || w.b === g.countryId).length;
  return n * 1.2;
}

export function spendingBreakdown(g: Game) {
  const b: Record<string, number> = {};
  for (const m of MINISTRIES) b[m.id] = g.budget[m.id];
  b.social *= clamp(1 + 0.04 * (g.unemp - g.base.unemp), 0.6, 2.5);
  b.programes = programsCost(g.policies);
  b.interessos = (g.debt / g.gdp) * g.rate;
  const wc = warCost(g);
  if (wc) b.guerra = wc;
  if (g.reparations < 0) b.reparacions = -g.reparations;
  return b;
}

export const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function partyById(g: Game, id: string): Party | undefined {
  return g.parties.find((p) => p.id === id);
}

export function govIdeo(g: Game): Ideo {
  let e = 0, s = 0, w = 0;
  for (const id of g.govParties) {
    const p = partyById(g, id);
    if (!p) continue;
    const k = Math.max(1, p.seats);
    e += p.e * k; s += p.s * k; w += k;
  }
  return w ? { e: e / w, s: s / w } : { e: 0, s: 0 };
}

export function alignment(groupIdeo: Ideo, gov: Ideo) {
  return clamp(12 - dist(groupIdeo, gov) / 6, -20, 15);
}

export function totalSeats(g: Game) {
  return g.parties.reduce((a, p) => a + p.seats, 0);
}
export function govSeats(g: Game) {
  return g.parties.filter((p) => g.govParties.includes(p.id)).reduce((a, p) => a + p.seats, 0);
}

export function hasElections(g: Game) {
  return g.policies.eleccions <= 1;
}

export function regimeLabel(g: Game): { label: string; level: number } {
  const p = g.policies;
  const f = g.slow.freedom;
  if (p.eleccions >= 2 && f < 15) return { label: g.form === 'monarquia_absoluta' ? 'Monarquia absoluta' : 'Dictadura', level: 0 };
  if (p.eleccions >= 2) return { label: 'Règim autoritari', level: 1 };
  if (p.eleccions === 1 || p.oposicio >= 1 || f < 45) return { label: 'Règim híbrid', level: 2 };
  if (f < 75 || p.premsa >= 1 || p.justicia >= 1) return { label: 'Democràcia imperfecta', level: 3 };
  return { label: 'Democràcia plena', level: 4 };
}

export function formLabel(g: Game) {
  return g.form === 'monarquia' ? 'Monarquia parlamentària' : g.form === 'monarquia_absoluta' ? 'Monarquia absoluta' : 'República';
}

export function lifeExp(g: Game) {
  return clamp(g.life0 + (g.slow.health - g.slow0.health) * 0.18 - (g.slow.poverty - g.base.poverty) * 0.04, 35, 95);
}

/** Índex global de la societat (0 = infern, 100 = utopia) */
export function societyIndex(g: Game) {
  const s = g.slow;
  const gdppc = (g.gdp / g.pop) * 1000;
  const wealth = clamp(Math.log10(Math.max(300, gdppc)) * 30 - 75, 0, 100); // 1.000$ ~15, 10.000$ ~45, 100.000$ ~75
  const v = 0.14 * s.happiness + 0.1 * s.freedom + 0.08 * (100 - s.corruption) + 0.09 * (100 - s.crime) + 0.08 * s.env +
    0.08 * s.edu + 0.1 * clamp((lifeExp(g) - 50) * 2.8, 0, 100) + 0.08 * (100 - clamp((s.gini - 20) * 2, 0, 100)) +
    0.09 * (100 - clamp(s.poverty * 1.6, 0, 100)) + 0.08 * wealth + 0.04 * s.stability + 0.04 * (100 - g.unrest);
  return clamp(v - (g.wars.some((w) => w.a === g.countryId || w.b === g.countryId) ? 6 : 0), 0, 100);
}

export function societyLabel(v: number) {
  if (v >= 85) return { label: 'Utopia', color: '#41d39a' };
  if (v >= 72) return { label: 'Societat pròspera', color: '#7bd36a' };
  if (v >= 58) return { label: 'Societat estable', color: '#c4d35a' };
  if (v >= 45) return { label: 'Societat en tensió', color: '#e3b23f' };
  if (v >= 32) return { label: 'Societat en crisi', color: '#e57a3a' };
  if (v >= 20) return { label: 'Estat fallit', color: '#e5484d' };
  return { label: 'Infern distòpic', color: '#b0223a' };
}

export function approvalOf(g: Game) {
  let a = 0, w = 0;
  for (const gr of GROUPS) {
    a += g.groups[gr.id].aff * g.shares[gr.id];
    w += g.shares[gr.id];
  }
  return a / w;
}

export function playerCountryMil(g: Game) {
  return g.slow.military;
}

export function optionOf(g: Game, pid: string) {
  return POLICY_BY_ID[pid].options[g.policies[pid]];
}

export type { MinistryId };
