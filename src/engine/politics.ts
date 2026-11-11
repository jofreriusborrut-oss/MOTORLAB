import { GROUPS } from '../data/groups';
import { POLICY_BY_ID } from '../data/policies';
import type { Game, Ideo, Party } from './types';
import { clamp, dist } from './util';
import { totalSeats } from './model';

export function groupIdeo(g: Game, gi: Ideo): Ideo {
  return { e: clamp(gi.e + g.def.econ * 0.15, -100, 100), s: clamp(gi.s + (g.def.cons - 50) * 0.3, -100, 100) };
}

/** Intenció de vot (0..1) per partit */
export function voteShares(g: Game, rawCalib = false): Record<string, number> {
  const res: Record<string, number> = {};
  for (const p of g.parties) res[p.id] = 0;
  let wsum = 0;
  for (const gr of GROUPS) {
    const share = g.shares[gr.id];
    const aff = g.groups[gr.id].aff;
    const gi = groupIdeo(g, gr.ideo);
    const w: Record<string, number> = {};
    let tot = 0;
    for (const p of g.parties) {
      let x = Math.exp(-dist(gi, p) / 35);
      if (!rawCalib) x *= p.calib * Math.max(0.05, 1 + p.momentum / 100);
      const inGov = g.govParties.includes(p.id);
      x *= inGov ? clamp(Math.pow(aff / 48, 1.3), 0.15, 2.2) : clamp(1 + (48 - aff) / 110, 0.6, 1.6);
      w[p.id] = x;
      tot += x;
    }
    for (const p of g.parties) res[p.id] += share * (w[p.id] / tot);
    wsum += share;
  }
  // efectes del règim
  for (const p of g.parties) {
    res[p.id] /= wsum;
    const inGov = g.govParties.includes(p.id);
    if (!inGov) {
      if (g.policies.oposicio === 2) res[p.id] *= 0.05;
      else if (g.policies.oposicio === 1) res[p.id] *= 0.7;
      if (g.policies.premsa === 2) res[p.id] *= 0.75;
    } else if (g.policies.eleccions === 1) res[p.id] *= 1.35;
  }
  const t = Object.values(res).reduce((a, b) => a + b, 0);
  for (const k in res) res[k] /= t;
  return res;
}

export function allocateSeats(votes: Record<string, number>, total: number, majoritarian: boolean): Record<string, number> {
  const ids = Object.keys(votes);
  const w: Record<string, number> = {};
  for (const id of ids) {
    const v = votes[id];
    w[id] = majoritarian ? Math.pow(v, 2.5) : v >= 0.03 ? v : 0;
  }
  const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const seats: Record<string, number> = {};
  const rem: [string, number][] = [];
  let used = 0;
  for (const id of ids) {
    const exact = (w[id] / tw) * total;
    seats[id] = Math.floor(exact);
    used += seats[id];
    rem.push([id, exact - seats[id]]);
  }
  rem.sort((a, b) => b[1] - a[1]);
  for (let i = 0; used < total && i < rem.length; i++, used++) seats[rem[i][0]]++;
  return seats;
}

export function compatible(a: Party, b: Party, g: Game) {
  if (a.id === b.id) return true;
  const d = dist(a, b);
  const allied = g.oppAllies.includes(a.id) && b.id === g.playerParty || g.oppAllies.includes(b.id) && a.id === g.playerParty;
  if (allied) return d < 170;
  if (b.s >= 70 && a.s < 20) return false;
  if (a.s >= 70 && b.s < 20) return false;
  if (a.e <= -75 && b.e > 10) return false;
  if (b.e <= -75 && a.e > 10) return false;
  return d < 120;
}

/** Forma un govern a partir dels escons actuals. Si force indica un partit, aquest intenta formar govern primer. */
export function formGovernment(g: Game, force?: string, exclude?: string): { parties: string[]; formateur: string; majority: boolean } {
  const total = totalSeats(g);
  const need = total / 2;
  const sorted = [...g.parties].filter((p) => p.seats > 0 && p.id !== exclude).sort((a, b) => b.seats - a.seats);
  const order = force ? [sorted.find((p) => p.id === force)!, ...sorted.filter((p) => p.id !== force)] : sorted;
  for (const f of order.slice(0, force ? 1 : 3)) {
    if (!f) continue;
    const co = [f];
    let seats = f.seats;
    const others = sorted.filter((p) => p.id !== f.id && compatible(f, p, g)).sort((a, b) => dist(f, a) - dist(f, b));
    for (const o of others) {
      if (seats > need) break;
      if (co.every((c) => compatible(c, o, g))) { co.push(o); seats += o.seats; }
    }
    if (seats > need) return { parties: co.map((p) => p.id), formateur: f.id, majority: true };
  }
  const f = force ? sorted.find((p) => p.id === force) ?? sorted[0] : sorted[0];
  const co = [f];
  const near = sorted.filter((p) => p.id !== f.id && dist(f, p) < 55 && compatible(f, p, g)).slice(0, 2);
  co.push(...near);
  return { parties: co.map((p) => p.id), formateur: f.id, majority: false };
}

/** Suport parlamentari a un canvi de política */
export function lawSupport(g: Game, pid: string, newIdx: number, byPlayer = true) {
  const pol = POLICY_BY_ID[pid];
  const old = pol.options[g.policies[pid]].ideo;
  const nw = pol.options[newIdx].ideo;
  const yes: string[] = [], no: string[] = [];
  let ys = 0;
  const total = totalSeats(g);
  for (const p of g.parties) {
    if (p.seats <= 0) continue;
    const dOld = dist(p, old), dNew = dist(p, nw);
    let y: boolean;
    if (byPlayer && p.id === g.playerParty) y = true;
    else if (g.govParties.includes(p.id)) {
      if (g.inPower || !byPlayer) y = dNew <= dOld + 25 * ((g.partnerMood[p.id] ?? 60) / 100);
      else y = dNew < dOld - 3;
    } else y = dNew < dOld - 5;
    if (y) { yes.push(p.id); ys += p.seats; } else no.push(p.id);
  }
  return { support: total ? ys / total : 1, yes, no };
}

/** El parlament no compta si no hi ha oposició real */
export function parliamentMatters(g: Game) {
  return g.policies.eleccions <= 1 && g.policies.oposicio <= 1;
}

export function lawCost(g: Game, pid: string, newIdx: number) {
  return Math.round(6 + 4 * Math.abs(newIdx - g.policies[pid]));
}
