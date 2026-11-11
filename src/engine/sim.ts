import { COUNTRY_BY_ID, BLOCS } from '../data/countries';
import { GROUPS, MINISTRIES } from '../data/groups';
import { POLICIES, POLICY_BY_ID } from '../data/policies';
import { randomName, pick } from '../data/names';
import type { EventChoice, Game, GameEvent, Nation, SlowKey, War } from './types';
import { chance, clamp, dist, gauss, rnd, yearOf } from './util';
import {
  alignment, approvalOf, fx, fxDelta, govIdeo, govSeats, groupPolicyDelta, hasElections, lifeExp,
  partyById, revenueBreakdown, societyIndex, spendingBreakdown, sum, totalSeats,
} from './model';
import { allocateSeats, formGovernment, groupIdeo, lawSupport, parliamentMatters, voteShares } from './politics';
import { addNews, govRef, newsAboutMe } from './news';
import { pickAiEvent, pickEvent } from './events';
import { relBase } from './init';
import { resolveReferendum } from './referendum';


export function computeUnrestRaw(g: Game) {
  let anger = 0, w = 0;
  for (const gr of GROUPS) {
    anger += g.shares[gr.id] * Math.max(0, 40 - g.groups[gr.id].aff) * 1.6;
    w += g.shares[gr.id];
  }
  anger /= w;
  const d = fxDelta(g);
  return anger + Math.max(0, g.unemp - 12) * 1.2 + Math.max(0, g.infl - 15) * 0.3 + (100 - g.slow.stability) * 0.25 + fx(d, 'unrest') +
    (g.slow.poverty - g.base.poverty) * 0.5 + g.unrestMod + g.regionTension * 0.08 + g.warWeariness * 0.15;
}

export const playerWars = (g: Game) => g.wars.filter((w) => w.a === g.countryId || w.b === g.countryId);
export const atWar = (g: Game) => playerWars(g).length > 0;
export const enemyOf = (g: Game, w: War) => (w.a === g.countryId ? w.b : w.a);
/** Front des del punt de vista del jugador (positiu = guanyant) */
export const playerFront = (g: Game, w: War) => (w.a === g.countryId ? w.front : -w.front);

export function tradeBonus(g: Game) {
  let t = 0;
  for (const n of Object.values(g.nations)) if (n.trade && !n.sanctionsOnUs) t += 0.12 * Math.sqrt(n.gdp / 1000);
  return Math.min(1.5, t);
}
export function blocBonus(g: Game) {
  return g.blocs.reduce((a, b) => a + (BLOCS[b]?.economic ?? 0), 0) - g.def.blocs.reduce((a, b) => a + (BLOCS[b]?.economic ?? 0), 0);
}
export function sanctionsRaw(g: Game) {
  let t = 0;
  for (const n of Object.values(g.nations)) if (n.sanctionsOnUs) t += 0.35 * Math.sqrt(n.gdp / 1000);
  return Math.min(5, t);
}
/** Impacte de les sancions respecte a les que ja hi havia a l'inici (ja incloses en el creixement real) */
export function sanctionsHit(g: Game) {
  return sanctionsRaw(g) - (g.base.sanctions ?? 0);
}

function sideStrength(g: Game, id: string, enemy: string, defender: boolean): number {
  let s: number;
  if (id === g.countryId) {
    s = g.slow.military * (1 - g.warWeariness / 250) * (0.7 + 0.3 * g.slow.stability / 100);
    for (const n of Object.values(g.nations)) {
      if (n.id === enemy || n.wars.includes(g.countryId)) continue;
      const def = defender && n.blocs.some((b) => BLOCS[b]?.defensive && g.blocs.includes(b));
      if (n.alliance) s += 0.35 * n.mil;
      else if (def) s += 0.25 * n.mil;
    }
    if (defender && g.policies.nuclear === 2) s *= 1.25;
  } else {
    const n = g.nations[id];
    if (!n) return 10;
    s = n.mil * (0.6 + 0.4 * n.stability / 100);
    const cd = COUNTRY_BY_ID[id];
    for (const m of Object.values(g.nations)) {
      if (m.id === id || m.id === enemy) continue;
      if (cd?.friends?.includes(m.id) && defender) s += 0.15 * m.mil;
      else if (defender && m.blocs.some((b) => BLOCS[b]?.defensive && n.blocs.includes(b))) s += 0.2 * m.mil;
    }
    if (enemy === g.countryId && n.alliance) s *= 0.5;
    if (defender && n.nuclear) s *= 1.25;
  }
  return Math.max(1, s);
}

export function applyChoice(g: Game, c: EventChoice, ai = false) {
  if (Object.keys(c.fx).length) g.tempFx.push({ fx: { ...c.fx }, months: 30 });
  for (const [k, v] of Object.entries(c.g)) if (g.groups[k as keyof typeof g.groups]) g.groups[k as keyof typeof g.groups].mod += (v as number) * (ai ? 0.6 : 1);
  const n = c.now ?? {};
  if (n.debt) g.debt += (n.debt / 100) * g.gdp;
  if (n.unrest) g.unrestMod += n.unrest;
  if (n.stab) g.stabMod += n.stab;
  if (n.pc && !ai) g.pc = clamp(g.pc + n.pc, 0, 200);
  if (n.intl) g.intl = clamp(g.intl + n.intl, 0, 100);
  if (n.shock) g.shock += n.shock;
  if (n.infl) g.inflShock += n.infl;
  if (n.tension) g.regionTension = clamp(g.regionTension + n.tension, 0, 100);
  if (n.mom) { const p = partyById(g, g.playerParty); if (p) p.momentum += n.mom * 3; }
  if (n.rel) {
    const r = Object.values(g.nations).filter((x) => x.rel < -20).sort((a, b) => a.rel - b.rel)[0];
    if (r) r.rel = clamp(r.rel + n.rel, -100, 100);
  }
}

function pushModal(g: Game, m: Game['modalQueue'][number]) {
  g.modalQueue.push(m);
}

// ───────────────────────────────── eleccions i caiguda de governs

export function runElection(g: Game, reason = 'Eleccions generals') {
  g.stats.elections++;
  const limited = g.inPower && g.policies.limit_mandats === 0 && g.termsServed >= 2;
  const pp = partyById(g, g.playerParty);
  if (limited && pp) pp.momentum -= 25;
  const votes = voteShares(g);
  const seats = allocateSeats(votes, g.def.seats, g.policies.sistema_electoral === 0);
  const before = Object.fromEntries(g.parties.map((p) => [p.id, p.seats]));
  for (const p of g.parties) { p.seats = seats[p.id] ?? 0; p.momentum *= 0.3; }
  const wasIn = g.inPower;
  let f = formGovernment(g);
  if (f.formateur !== g.playerParty && f.parties.includes(g.playerParty)) {
    const alt = formGovernment(g, g.playerParty);
    if (alt.majority) f = alt;
  }
  if (!f.majority && f.formateur !== g.playerParty) {
    const alt = formGovernment(g, g.playerParty);
    if (alt.majority) f = alt;
  }
  const changed = f.formateur !== (wasIn ? g.playerParty : g.govParties[0]) || f.parties.length !== g.govParties.length;
  if (changed) honeymoon(g);
  g.govParties = f.parties;
  g.partnerMood = {};
  for (const id of f.parties) if (id !== g.playerParty) g.partnerMood[id] = 65;
  g.inPower = f.formateur === g.playerParty;
  if (g.inPower) { g.termsServed = wasIn ? g.termsServed + 1 : 1; g.govLeader = g.playerName; g.exile = false; }
  else g.govLeader = partyById(g, f.formateur)?.leader ?? randomName(g.def.names);
  g.nextElection = g.month + g.def.term * 12;
  const fp = partyById(g, f.formateur)!;
  let text: string;
  if (g.inPower && wasIn) text = `Revalides el govern! ${fp.name} guanya ${fp.seats} escons.`;
  else if (g.inPower) text = `Has guanyat! Seràs el nou cap del govern amb ${f.parties.length > 1 ? 'una coalició' : 'el teu partit sol'}.`;
  else if (wasIn) text = `Has perdut el poder. ${fp.leader} (${fp.name}) formarà govern. Passes a l'oposició.`;
  else text = `${fp.leader} (${fp.name}) formarà govern. Continues a l'oposició.`;
  if (limited) text = `Has esgotat el límit de mandats: el teu partit es presenta amb un altre cap de llista. ` + text;
  if (!f.majority) text += ' Govern en minoria.';
  pushModal(g, { kind: 'election', title: `🗳️ ${reason} ${yearOf(g.month)}`, text, data: { votes, seats, before, gov: f.parties, formateur: f.formateur } });
  const winner = [...g.parties].sort((a, b) => b.seats - a.seats)[0];
  addNews(g, `${reason}: ${winner.name} és la força més votada (${(votes[winner.id] * 100).toFixed(1)}%). ${fp.leader} serà ${g.def.title.toLowerCase()}.`, g.inPower ? 'good' : wasIn ? 'bad' : 'neutral');
}

/** Lluna de mel d'un govern nou: el desgast acumulat es reinicia en part */
export function honeymoon(g: Game) {
  for (const gr of GROUPS) g.groups[gr.id].mod = g.groups[gr.id].mod * 0.3 + 5;
  g.unrestMod -= 8;
  for (const p of g.parties) p.momentum *= 0.5;
}

export function fallFromPower(g: Game, title: string, text: string, newGov: string[], leader: string, exile = false) {
  honeymoon(g);
  g.inPower = false;
  g.exile = exile;
  g.govParties = newGov;
  g.govLeader = leader;
  g.partnerMood = {};
  for (const id of newGov) g.partnerMood[id] = 65;
  g.termsServed = 0;
  pushModal(g, { kind: 'fall', title, text });
}

export function takePower(g: Game, title: string, text: string) {
  honeymoon(g);
  g.inPower = true;
  g.exile = false;
  const f = formGovernment(g, g.playerParty);
  g.govParties = f.parties;
  g.govLeader = g.playerName;
  g.partnerMood = {};
  for (const id of f.parties) if (id !== g.playerParty) g.partnerMood[id] = 65;
  g.termsServed = 1;
  pushModal(g, { kind: 'info', title, text });
}

function democratize(g: Game) {
  g.policies.eleccions = 0; g.policies.oposicio = 0; g.policies.premsa = 0; g.policies.reunio = Math.min(g.policies.reunio, 0);
  g.policies.justicia = 0; g.policies.propaganda = 0; g.policies.vigilancia = Math.min(g.policies.vigilancia, 1);
  g.nextElection = g.month + 12;
}

function authoritarianize(g: Game) {
  g.policies.eleccions = 2; g.policies.oposicio = 2; g.policies.premsa = 2; g.policies.reunio = 2; g.policies.justicia = 2;
  g.nextElection = -1;
}

// ───────────────────────────────── IA de govern (quan no governes)

function aiGovern(g: Game) {
  const gi = govIdeo(g);
  if (chance(0.22)) {
    const auth = g.policies.eleccions >= 2;
    const p = pick(POLICIES.filter((x) => x.id !== 'nuclear' && x.id !== 'eleccions' && (auth || !['corrupcio', 'oposicio', 'justicia', 'premsa', 'propaganda'].includes(x.id))));
    const cur = g.policies[p.id];
    const pop = (i: number) => { let a = 0, w = 0; for (const gr of GROUPS) { a += (p.options[i].g[gr.id] ?? 0) * g.shares[gr.id]; w += g.shares[gr.id]; } return a / w; };
    const score = (i: number) => dist(p.options[i].ideo, gi) - 4 * pop(i) - (i === cur ? 15 : 0);
    let best = cur, bd = score(cur);
    p.options.forEach((_, i) => { const d = score(i); if (d < bd) { bd = d; best = i; } });
    if (best !== cur) {
      const step = best > cur ? cur + 1 : cur - 1;
      const sup = parliamentMatters(g) ? lawSupport(g, p.id, step, false).support : 1;
      if (sup >= 0.5) {
        g.policies[p.id] = step;
        addNews(g, `${govRef(g)} aprova un canvi en ${p.name.toLowerCase()}: «${p.options[step].label}».`, 'neutral');
      } else addNews(g, `El parlament tomba la reforma de ${p.name.toLowerCase()} del govern de ${g.govLeader}.`, 'neutral');
    }
  }
  if (g.month % 6 === 0) {
    const deficit = g.lastSpend - g.lastRev;
    const k = gi.e / 100;
    g.taxes.irpf = clamp(g.taxes.irpf - k * 1.2, 0, 75);
    g.taxes.societats = clamp(g.taxes.societats - k * 1, 0, 50);
    g.budget.social *= 1 - k * 0.03;
    g.budget.defensa *= 1 + (gi.s / 100) * 0.03;
    g.budget.educacio *= 1 - k * 0.015;
    g.budget.sanitat *= 1 - k * 0.015;
    const dr = (g.debt / g.gdp) * 100;
    if (deficit > 3 || (dr > 100 && deficit > 1.5)) { for (const m of MINISTRIES) g.budget[m.id] *= 0.985; g.taxes.iva = clamp(g.taxes.iva + 0.5, 0, 30); g.taxes.irpf = clamp(g.taxes.irpf + 0.5, 0, 75); }
    else if (deficit < 0) for (const m of MINISTRIES) g.budget[m.id] *= 1.01;
    if (g.policies.banc_central === 2) g.policies.banc_central = 1;
  }
}

// ───────────────────────────────── nacions i diplomàcia

function relTarget(g: Game, n: Nation) {
  const nd = COUNTRY_BY_ID[n.id];
  let t = relBase({ ...g.def, blocs: g.blocs, freedom: g.slow.freedom }, nd);
  if (n.trade) t += 10;
  if (n.alliance) t += 15;
  if (n.sanctioned) t -= 30;
  if (n.sanctionsOnUs) t -= 10;
  if (n.wars.includes(g.countryId)) t -= 150;
  t += (g.intl - 50) * 0.4;
  t += 8 - dist(govIdeo(g), n.ideo) * 0.06;
  if (g.policies.doctrina === 3) t -= 10;
  if (g.policies.nuclear >= 1 && !g.def.nuclear) t -= n.rg === 'dem' ? 20 : 5;
  const demo = n.rg === 'dem' || n.rg === 'def';
  if (demo) t -= Math.max(0, Math.min(50, g.slow0.freedom) - g.slow.freedom) * 1.1;
  if (demo && g.policies.eleccions >= 2) t -= 10;
  return clamp(t, -100, 100);
}

function updateNations(g: Game) {
  for (const n of Object.values(g.nations)) {
    const war = n.wars.length > 0;
    const gr = n.baseGrowth + g.global * 0.8 + gauss() * 0.4 + (n.sanctioned ? -0.4 : 0) + (n.trade ? 0.08 : 0) + (war ? -1.5 : 0);
    n.growth += (gr - n.growth) * 0.3;
    n.gdp *= Math.pow(1 + n.growth / 100, 1 / 12);
    n.stability = clamp(n.stability + gauss() * 0.6 + (war ? -0.15 : 0.05), 5, 98);
    n.rel = clamp(n.rel + (relTarget(g, n) - n.rel) * 0.03 + gauss() * 0.4, -100, 100);
    // sancions contra nosaltres
    if (!n.sanctionsOnUs && n.rel < -40 && n.gdp > 400 && (n.rg === 'dem' || n.rg === 'def') && chance(0.06)) {
      n.sanctionsOnUs = true;
      addNews(g, `${n.name} imposa sancions econòmiques a ${g.countryName}.`, 'bad');
    } else if (n.sanctionsOnUs && n.rel > -20 && chance(0.1)) {
      n.sanctionsOnUs = false;
      addNews(g, `${n.name} aixeca les sancions a ${g.countryName}.`, 'good');
    }
    if (n.trade && n.rel < -10 && chance(0.1)) { n.trade = false; addNews(g, `${n.name} trenca l'acord comercial amb ${g.countryName}.`, 'bad'); }
    if (n.alliance && n.rel < 20 && chance(0.1)) { n.alliance = false; addNews(g, `${n.name} abandona l'aliança militar amb ${g.countryName}.`, 'bad'); }
    // declaració de guerra
    if (!war && n.rel < -75 && n.mil > g.slow.military * 1.3 && (n.rg === 'aut' || n.rg === 'tot') && g.policies.nuclear !== 2 && chance(0.004)) {
      startWar(g, n.id, g.countryId);
      pushModal(g, { kind: 'war', title: `⚔️ ${n.name} ens declara la guerra!`, text: `Les tropes de ${n.name} han creuat la frontera. El país està en guerra.` });
    }
    // eleccions en altres països
    if ((n.rg === 'dem' || n.rg === 'def') && chance(1 / 50)) {
      const prev = n.leader;
      n.leader = randomName(n.names);
      n.ideo = { e: clamp(n.ideo.e + rnd(-40, 40), -90, 90), s: clamp(n.ideo.s + rnd(-30, 30), -80, 90) };
      addNews(g, `Eleccions a ${n.name}: ${n.leader} substitueix ${prev}.`, 'world');
    }
    if (chance(0.006)) addNews(g, pick([
      `${n.name} anuncia un pla d'inversions en infraestructures.`, `Protestes massives als carrers de ${n.name}.`,
      `L'economia de ${n.name} creix un ${n.growth.toFixed(1)}% anual.`, `${n.name} celebra una cimera amb els seus aliats.`,
      `Escàndol de corrupció sacseja el govern de ${n.name}.`, `${n.name} presenta un nou sistema d'armament.`,
    ]), 'world');
  }
}

export function startWar(g: Game, a: string, b: string) {
  const w: War = { id: `w-${a}-${b}-${g.month}`, a, b, front: 0, months: 0, casA: 0, casB: 0 };
  g.wars.push(w);
  if (g.nations[a]) g.nations[a].wars.push(b);
  if (g.nations[b]) g.nations[b].wars.push(a);
  if (a === g.countryId || b === g.countryId) {
    g.stats.wars++;
    const e = a === g.countryId ? b : a;
    if (g.nations[e]) { g.nations[e].rel = -100; g.nations[e].trade = false; g.nations[e].alliance = false; }
    // efecte "unió nacional" inicial
    for (const gr of GROUPS) g.groups[gr.id].mod += gr.id === 'pat' || gr.id === 'mil' ? 10 : a === g.countryId ? -4 : 4;
  }
}

export function endWar(g: Game, w: War, winner: string | null) {
  g.wars = g.wars.filter((x) => x.id !== w.id);
  if (g.nations[w.a]) g.nations[w.a].wars = g.nations[w.a].wars.filter((x) => x !== w.b);
  if (g.nations[w.b]) g.nations[w.b].wars = g.nations[w.b].wars.filter((x) => x !== w.a);
  const mine = w.a === g.countryId || w.b === g.countryId;
  const name = (id: string) => (id === g.countryId ? g.countryName : g.nations[id]?.name ?? '?');
  if (!mine) {
    if (winner) {
      const loser = winner === w.a ? w.b : w.a;
      if (g.nations[loser]) { g.nations[loser].stability -= 20; g.nations[loser].gdp *= 0.95; }
      addNews(g, `Final de la guerra: ${name(loser)} capitula davant ${name(winner)}.`, 'world');
    } else addNews(g, `${name(w.a)} i ${name(w.b)} signen un alto el foc.`, 'world');
    return;
  }
  const enemy = enemyOf(g, w);
  if (winner === g.countryId) {
    g.reparations = 1.0; g.reparationMonths = 60;
    g.stabMod += 10;
    for (const gr of GROUPS) g.groups[gr.id].mod += gr.id === 'pat' || gr.id === 'mil' ? 15 : 5;
    if (w.a === g.countryId) g.intl = clamp(g.intl - 6, 0, 100);
    if (g.nations[enemy]) g.nations[enemy].stability -= 25;
    newsAboutMe(g, `Victòria! ${name(enemy)} capitula davant ${g.countryName}.`, `Gloriosa victòria del nostre líder ${g.playerName} sobre ${name(enemy)}!`, 'good');
    pushModal(g, { kind: 'war', title: '🏆 Victòria', text: `${name(enemy)} ha capitulat. Rebreu reparacions de guerra durant 5 anys.` });
  } else if (winner) {
    g.reparations = -2.0; g.reparationMonths = 60;
    g.stabMod -= 25; g.shock -= 3;
    for (const gr of GROUPS) g.groups[gr.id].mod -= 12;
    addNews(g, `Derrota humiliant: ${g.countryName} capitula davant ${name(enemy)}.`, 'bad');
    if (g.inPower && chance(0.45)) {
      const alt = formGovernment(g, undefined, g.playerParty);
      fallFromPower(g, '💥 El govern cau després de la derrota', `La derrota a la guerra contra ${name(enemy)} ha fet caure el teu govern.`, alt.parties, partyById(g, alt.formateur)?.leader ?? randomName(g.def.names));
    } else pushModal(g, { kind: 'war', title: '🏳️ Derrota', text: `${g.countryName} ha perdut la guerra contra ${name(enemy)}. Haureu de pagar reparacions durant 5 anys.` });
  } else {
    addNews(g, `Pau entre ${g.countryName} i ${name(enemy)}.`, 'neutral');
    pushModal(g, { kind: 'war', title: '🕊️ Pau signada', text: `S'ha signat un alto el foc amb ${name(enemy)}.` });
  }
}

function updateWars(g: Game) {
  for (const w of [...g.wars]) {
    const sA = sideStrength(g, w.a, w.b, false);
    const sB = sideStrength(g, w.b, w.a, true);
    const delta = (5 * (sA - sB * 1.15)) / (sA + sB) + gauss() * 2.2;
    w.front = clamp(w.front + delta, -100, 100);
    // dissuasió nuclear: no es pot arrasar una potència nuclear
    const bNuc = w.b === g.countryId ? g.policies.nuclear === 2 : g.nations[w.b]?.nuclear;
    const aNuc = w.a === g.countryId ? g.policies.nuclear === 2 : g.nations[w.a]?.nuclear;
    if (bNuc) w.front = Math.min(w.front, 75);
    if (aNuc) w.front = Math.max(w.front, -75);
    w.months++;
    w.casA += Math.round(800 + Math.max(0, -delta) * 900 + rnd(0, 600));
    w.casB += Math.round(800 + Math.max(0, delta) * 900 + rnd(0, 600));
    if (w.front >= 100) endWar(g, w, w.a);
    else if (w.front <= -100) endWar(g, w, w.b);
    else if (w.a === g.countryId || w.b === g.countryId) {
      const pf = playerFront(g, w);
      const en = g.nations[enemyOf(g, w)];
      if (w.months >= 6 && pf > 45 && chance(0.12)) pushModal(g, { kind: 'war', title: `🕊️ ${en?.name} demana la pau`, text: `${en?.name} proposa un alto el foc i pagar-vos reparacions.`, data: { offer: 'peace', war: w.id } });
      else if (w.months >= 6 && pf < -60 && chance(0.1)) pushModal(g, { kind: 'war', title: `⚠️ Ultimàtum de ${en?.name}`, text: `${en?.name} exigeix la vostra rendició. Si no, continuarà l'ofensiva.`, data: { offer: 'surrender', war: w.id } });
    } else if (w.months > 24 && Math.abs(w.front) < 40 && chance(0.008)) endWar(g, w, null);
  }
  if (atWar(g)) {
    const worst = Math.min(...playerWars(g).map((w) => playerFront(g, w)));
    g.warWeariness = clamp(g.warWeariness + 0.7 + Math.max(0, -worst) / 60, 0, 100);
  } else g.warWeariness *= 0.95;
}

// ───────────────────────────────── el tic mensual

const RATES: Record<SlowKey, number> = { edu: 0.02, health: 0.025, infra: 0.015, innov: 0.02, env: 0.03, corruption: 0.04, freedom: 0.25, crime: 0.06, gini: 0.04, poverty: 0.06, happiness: 0.1, stability: 0.08, military: 0.05 };

export function tick(g0: Game): Game {
  const g: Game = structuredClone(g0);
  g.month++;
  const d = fxDelta(g);
  g.tempFx = g.tempFx.filter((t) => --t.months > 0);
  const s = g.slow, s0 = g.slow0, B = g.budget, B0 = g.budget0;

  // cicle econòmic mundial
  g.global = g.global * 0.97 + gauss() * 0.1;
  if (chance(1 / 160)) { g.global -= 2.5; addNews(g, 'Recessió mundial: les borses s\'enfonsen a tot el planeta.', 'world'); }
  g.noise = g.noise * 0.9 + gauss() * 0.15;

  // ── finances públiques
  const rb = revenueBreakdown(g), sb = spendingBreakdown(g);
  const rev = sum(rb), spend = sum(sb);
  const deficit = spend - rev;
  g.revBreak = rb; g.lastRev = rev; g.lastSpend = spend; g.lastInterest = sb.interessos; g.lastPrograms = sb.programes;
  g.debt = Math.max(0, g.debt + (deficit / 100) * g.gdp / 12);
  g.defSmooth += (deficit - g.defSmooth) / 24;
  const debtRatio = (g.debt / g.gdp) * 100;
  if (g.reparationMonths > 0 && --g.reparationMonths === 0) g.reparations = 0;

  // ── creixement
  const war = atWar(g);
  const worstFront = war ? Math.min(...playerWars(g).map((w) => playerFront(g, w))) : 0;
  const gt = g.baseGrowth + 0.05 * (s.edu - s0.edu) + 0.05 * (s.innov - s0.innov) + 0.04 * (s.infra - s0.infra)
    - 0.03 * (s.corruption - s0.corruption) - 0.02 * (s.crime - s0.crime) + 0.01 * (s.stability - s0.stability)
    + fx(d, 'growth') + clamp(0.4 * (deficit - g.defSmooth), -2.5, 2.5)
    - Math.min(2, 0.012 * Math.max(0, debtRatio - Math.max(g.base.debtRatio, 90)))
    - 0.03 * Math.max(0, g.unrest - Math.max(g.base.unrest, 30))
    + tradeBonus(g) + blocBonus(g) - sanctionsHit(g)
    + (war ? -1.5 + Math.min(0, worstFront) / 40 : 0)
    + g.shock + g.global + g.noise + g.reparations * 0.3 - 0.03 * Math.max(0, g.infl - 20);
  g.growth += (clamp(gt, -20, 15) - g.growth) * 0.2;
  g.shock *= 0.85;
  const gdppcPrev = g.gdp / g.pop;
  g.gdp *= Math.pow(1 + g.growth / 100, 1 / 12);
  const popG = g.base.popG + fx(d, 'migration') * 0.5 - (war ? 0.3 : 0);
  g.pop *= Math.pow(1 + popG / 100, 1 / 12);
  // el deute és nominal: la inflació l'erosiona (una part està en moneda estrangera)
  if (g.infl > 0) g.debt *= 1 - Math.min(0.02, (g.infl * 0.85) / 100 / 12);
  void gdppcPrev;

  // ── atur i inflació
  const natural = g.base.unemp + fx(d, 'unemp') - 0.04 * (s.edu - s0.edu);
  const ut = natural - 0.45 * (g.growth - g.baseGrowth);
  g.unemp += (clamp(ut, 0.8, 50) - g.unemp) * 0.12;
  const bc = g.policies.banc_central;
  const anchor = [2.2, 4, 12][bc];
  g.iBase += (anchor - g.iBase) * 0.015;
  const monet = bc === 2 ? 3 : bc === 1 ? 1.5 : 1;
  let it = g.iBase + fx(d, 'infl') + 0.25 * monet * (deficit - g.base.deficit) + 0.3 * (g.growth - g.baseGrowth) + g.inflShock;
  if (bc === 2 && deficit > 4) it += (deficit - 4) * 6;
  g.inflShock *= 0.9;
  g.infl += (clamp(it, -3, 3000) - g.infl) * 0.15;
  const sanct = Object.values(g.nations).some((n) => n.sanctionsOnUs);
  g.marketRate = clamp(g.base.r0 + 0.3 * (g.infl - g.base.infl) + Math.min(6, 0.03 * Math.max(0, debtRatio - Math.max(g.base.debtRatio, 60))) +
    0.06 * Math.max(0, g.unrest - 50) + (bc === 2 ? -1 : 0) + (sanct ? 0.5 : 0) + (g.policies.banc_central === 0 ? 0 : 0.3), 0.2, 60);
  g.rate += (g.marketRate - g.rate) * 0.04;

  // ── indicadors socials lents
  const gdppc = (g.gdp / g.pop) * 1000;
  const lg = Math.log10(gdppc / g.base.gdppc);
  const T: Record<SlowKey, number> = {
    edu: s0.edu + (B.educacio - B0.educacio) * 5 + 0.4 * (B.recerca - B0.recerca) + fx(d, 'edu'),
    health: s0.health + (B.sanitat - B0.sanitat) * 4 + fx(d, 'health') + 0.1 * (s.env - s0.env) - 0.1 * (s.poverty - g.base.poverty) + 20 * lg,
    infra: s0.infra + (B.infra - B0.infra) * 6 + fx(d, 'infra') - (war ? 6 : 0) + 15 * lg,
    innov: s0.innov + (B.recerca - B0.recerca) * 10 + 0.3 * (s.edu - s0.edu) + fx(d, 'innov') + 0.05 * (s.freedom - s0.freedom),
    env: s0.env + (B.medi - B0.medi) * 8 + fx(d, 'env') - 0.3 * (g.growth - g.baseGrowth),
    corruption: s0.corruption + fx(d, 'corruption') - (B.seguretat - B0.seguretat) * 3 + Math.max(0, B0.admin - B.admin) * 4 - 0.05 * (s.freedom - s0.freedom),
    freedom: s0.freedom + fx(d, 'freedom'),
    crime: s0.crime + fx(d, 'crime') - (B.seguretat - B0.seguretat) * 6 + 0.8 * (g.unemp - g.base.unemp) + 0.4 * (s.poverty - g.base.poverty) - 0.15 * (s.edu - s0.edu),
    gini: s0.gini + fx(d, 'gini') - (B.social - B0.social) * 1.2 - (B.pensions - B0.pensions) * 0.3 - (B.educacio - B0.educacio) * 0.5 - (B.habitatge - B0.habitatge) * 0.5,
    poverty: g.base.poverty + fx(d, 'poverty') + 0.5 * (s.gini - s0.gini) + 0.5 * (g.unemp - g.base.unemp) - (B.social - B0.social) * 2 - (B.pensions - B0.pensions) * 0.8 -
      (B.habitatge - B0.habitatge) + 0.15 * Math.max(0, g.infl - g.base.infl) - 10 * lg,
    happiness: g.base.happiness + fx(d, 'happiness') + 0.25 * (s.health - s0.health) + 0.1 * (s.edu - s0.edu) - 0.6 * (g.unemp - g.base.unemp) -
      0.2 * clamp(g.infl - g.base.infl, -5, 100) - 0.25 * (s.crime - s0.crime) + 0.12 * (s.env - s0.env) + 0.12 * (s.freedom - s0.freedom) -
      0.3 * (s.poverty - g.base.poverty) + 25 * lg + (B.cultura - B0.cultura) * 3 - 0.2 * g.warWeariness,
    stability: s0.stability + fx(d, 'stability') - 0.4 * (g.unrest - g.base.unrest) + 0.15 * (s.happiness - g.base.happiness) - 0.15 * g.warWeariness + g.stabMod,
    military: s0.military * Math.pow(Math.max(0.05, B.defensa) / Math.max(0.05, B0.defensa), 0.6) * Math.pow(g.gdp / g.def.gdp, 0.3) + fx(d, 'military') + 0.1 * (s.innov - s0.innov),
  };
  for (const k of Object.keys(T) as SlowKey[]) {
    const lo = k === 'gini' ? 15 : 0, hi = k === 'gini' ? 75 : k === 'military' ? 130 : 100;
    s[k] = clamp(s[k] + (clamp(T[k], lo, hi) - s[k]) * RATES[k], lo, hi);
  }
  g.stabMod *= 0.96;

  // ── tensió territorial
  if (g.def.region && !g.regionIndependent) {
    const tt = 30 + (g.policies.descentralitzacio === 0 ? 20 : g.policies.descentralitzacio === 2 ? -15 : 0) + (g.policies.minories <= 1 ? 20 : 0) +
      (g.unrest - 30) * 0.2 + (g.groups.min.aff < 30 ? 10 : 0);
    g.regionTension = clamp(g.regionTension + (tt - g.regionTension) * 0.03, 0, 100);
  }

  // ── afinitat dels grups
  const gi = govIdeo(g);
  for (const gr of GROUPS) {
    const st = g.groups[gr.id];
    let bt = 0;
    for (const [m, pref] of Object.entries(gr.budget)) {
      const b0 = B0[m as keyof typeof B0];
      if (b0 < 0.05) continue;
      bt += clamp(pref * 20 * (B[m as keyof typeof B] / b0 - 1), -15, 12);
    }
    let tt = 0;
    for (const [t, pref] of Object.entries(gr.tax)) tt += pref * (g.taxes[t as keyof typeof g.taxes] - g.taxes0[t as keyof typeof g.taxes0]);
    const out = clamp(gr.unemp * (g.unemp - g.base.unemp) + gr.infl * clamp(g.infl - g.base.infl, -5, 40) * 0.8 + gr.growth * clamp(g.growth - g.baseGrowth, -6, 6) +
      gr.crime * (s.crime - s0.crime) + gr.env * (s.env - s0.env) + gr.freedom * (s.freedom - s0.freedom) + gr.gini * (s.gini - s0.gini) +
      gr.deficit * clamp(deficit - g.base.deficit, -5, 15) + 0.15 * (s.health - s0.health) + (gr.id === 'jov' ? 0.3 : 0.1) * (s.edu - s0.edu) -
      (gr.id === 'pat' ? 0.05 : 0.2) * g.warWeariness, -45, 30);
    const prop = (g.policies.premsa === 2 ? 4 : 0) + (g.policies.propaganda === 2 ? 3 : 0);
    const target = st.base + alignment(groupIdeo(g, gr.ideo), gi) + groupPolicyDelta(g, gr.id) + clamp(bt, -30, 25) + clamp(tt, -25, 20) + out + st.mod + prop;
    st.aff = clamp(st.aff + (clamp(target, 0, 100) - st.aff) * 0.12, 0, 100);
    st.mod *= 0.95;
  }
  g.approval = approvalOf(g);

  // ── malestar social
  const prevU = g.unrest;
  g.unrest = clamp(g.unrest + (clamp(computeUnrestRaw(g), 0, 100) - g.unrest) * 0.1, 0, 100);
  g.unrestMod *= 0.93;
  for (const th of [40, 60, 80]) if (prevU < th && g.unrest >= th) {
    const t = th === 40 ? 'Manifestacions multitudinàries contra el govern' : th === 60 ? 'Disturbis i barricades a les grans ciutats' : 'Revolta popular: el país al límit de la insurrecció';
    addNews(g, `${t} de ${g.inPower ? g.playerName : g.govLeader}.`, g.inPower ? 'bad' : 'neutral');
  }
  g.highUnrestMonths = g.unrest > 80 ? g.highUnrestMonths + 1 : Math.max(0, g.highUnrestMonths - 1);

  // ── política
  const pp = partyById(g, g.playerParty)!;
  if (g.inPower) g.pc = clamp(g.pc + Math.max(0.5, 1.5 + (g.approval - 40) / 15), 0, 200);
  else g.pc = clamp(g.pc + Math.max(0.8, 1.5 + (45 - g.approval) / 20 + pp.momentum / 15), 0, 200);
  for (const p of g.parties) p.momentum *= 0.97;
  for (const id of Object.keys(g.partnerMood)) {
    const m = g.partnerMood[id] + ((60 + (g.approval - 45) / 2) - g.partnerMood[id]) * 0.04;
    g.partnerMood[id] = m;
    if (g.inPower && m < 15 && g.govParties.includes(id)) {
      g.govParties = g.govParties.filter((x) => x !== id);
      delete g.partnerMood[id];
      const p = partyById(g, id)!;
      addNews(g, `${p.name} abandona la coalició de govern de ${g.playerName}.`, 'bad');
      pushModal(g, { kind: 'info', title: '💔 Un soci abandona el govern', text: `${p.name} trenca la coalició. Ara governes amb ${(govSeats(g) / totalSeats(g) * 100).toFixed(0)}% dels escons.` });
    }
  }

  // eleccions
  if (!hasElections(g)) g.nextElection = -1;
  else if (g.nextElection < 0) g.nextElection = g.month + 12;
  if (hasElections(g) && g.nextElection >= 0 && g.month >= g.nextElection) runElection(g);

  // moció de censura contra el jugador
  if (g.inPower && parliamentMatters(g) && govSeats(g) / totalSeats(g) < 0.5 && g.approval < 38 && chance(0.05)) {
    const alt = formGovernment(g, undefined, g.playerParty);
    if (alt.majority) {
      const l = partyById(g, alt.formateur)!.leader;
      fallFromPower(g, '🏛️ Moció de censura', `El parlament ha aprovat una moció de censura. ${l} és el nou cap del govern. Passes a l'oposició.`, alt.parties, l);
      addNews(g, `Moció de censura: ${g.playerName} perd el govern. ${l} assumeix el poder.`, 'bad');
    }
  }

  // cop d'estat
  const milAff = g.groups.mil.aff;
  if (g.inPower && milAff < 22 && s.stability < 40) {
    const p = 0.03 * ((22 - milAff) / 22 + (40 - s.stability) / 40) * (s.freedom > 70 ? 0.3 : 1);
    if (chance(p)) {
      const junta = [...g.parties].sort((a, b) => dist(b, { e: 20, s: 100 }) - dist(a, { e: 20, s: 100 })).pop()!;
      const gen = `general ${randomName(g.def.names)}`;
      authoritarianize(g);
      fallFromPower(g, '🪖 Cop d\'estat!', `L'exèrcit ha pres el poder. El ${gen} encapçala una junta militar. Has hagut de fugir a l'exili. Des de fora pots organitzar la resistència.`, [junta.id], gen, true);
      addNews(g, `Cop d'estat: l'exèrcit derroca ${g.playerName}. El ${gen} assumeix el poder.`, 'bad');
    }
  }

  // revolució
  if (g.highUnrestMonths >= 4 && chance(0.25)) {
    g.highUnrestMonths = 0;
    g.unrestMod -= 35; g.stabMod -= 10;
    if (g.inPower) {
      const alt = formGovernment(g, undefined, g.playerParty);
      democratize(g);
      fallFromPower(g, '🔥 Revolució!', `El poble s'ha alçat i ha enderrocat el teu govern. Has fugit a l'exili. Un govern de transició convocarà eleccions.`, alt.parties, partyById(g, alt.formateur)?.leader ?? 'Govern provisional', true);
      addNews(g, `Revolució: cau el govern de ${g.playerName}, que fuig del país.`, 'bad');
    } else {
      const v = voteShares(g);
      const best = [...g.parties].filter((p) => !g.govParties.includes(p.id)).sort((a, b) => v[b.id] - v[a.id])[0];
      democratize(g);
      if (best?.id === g.playerParty || pp.momentum > 10) {
        takePower(g, '🔥 La revolució triomfa!', `El règim de ${g.govLeader} ha caigut. Tu encapçales el govern provisional fins a les eleccions.`);
        addNews(g, `Triomfa la revolució: ${g.playerName} encapçala el govern provisional.`, 'good');
      } else {
        g.govParties = [best.id]; g.govLeader = best.leader;
        pushModal(g, { kind: 'info', title: '🔥 Revolució', text: `El govern ha caigut. ${best.leader} (${best.name}) encapçala la transició. Hi haurà eleccions d'aquí un any.` });
      }
    }
  }

  if (!g.inPower) aiGovern(g);

  // programa nuclear
  if (g.policies.nuclear === 1) {
    g.nuclearProgress++;
    if (g.nuclearProgress >= 36) {
      g.policies.nuclear = 2;
      g.intl = clamp(g.intl - 10, 0, 100);
      newsAboutMe(g, `${g.countryName} fa la seva primera prova nuclear. Condemna internacional.`, `Èxit històric: ${g.countryName} ja és una potència nuclear!`, 'neutral');
    }
  }
  // adhesió a blocs
  if (g.pendingBloc && --g.pendingBloc.months <= 0) {
    const b = g.pendingBloc.id;
    g.pendingBloc = null;
    if (!g.blocs.includes(b)) g.blocs.push(b);
    addNews(g, `${g.countryName} ingressa oficialment a ${BLOCS[b].name}.`, 'good');
    pushModal(g, { kind: 'info', title: `🤝 Benvinguts a ${BLOCS[b].name}`, text: `${g.countryName} ja és membre de ${BLOCS[b].name}.` });
  }
  g.intl = clamp(g.intl + ((50 + fx(d, 'intl') + (B.exterior - B0.exterior) * 15) - g.intl) * 0.05, 0, 100);

  updateNations(g);
  updateWars(g);

  // referèndum
  if (g.referendum && --g.referendum.monthsLeft <= 0) resolveReferendum(g);

  // esdeveniments
  const hasEventModal = g.modalQueue.some((m) => m.kind === 'event');
  if (!hasEventModal && g.month - g.lastEventMonth >= 3) {
    if (g.inPower && chance(0.24)) {
      const ev = pickEvent(g);
      if (ev) { g.lastEventMonth = g.month; pushModal(g, { kind: 'event', title: ev.title, text: ev.text, event: ev }); }
    } else if (!g.inPower && chance(0.12)) {
      const r = pickAiEvent(g);
      if (r) {
        g.lastEventMonth = g.month;
        applyChoice(g, r.ev.choices[r.choice], true);
        addNews(g, `${r.ev.title.replace(/^\S+\s/, '')}: ${r.ev.choices[r.choice].news.split(g.playerName).join(g.govLeader)}.`, 'neutral');
      }
      if (chance(0.3)) {
        const ev = pickEvent(g);
        if (ev) pushModal(g, { kind: 'event', title: ev.title, text: ev.text, event: ev });
      }
    }
  }
  forcedEvents(g, debtRatio);

  // notícies periòdiques
  monthlyNews(g, deficit, debtRatio);

  // història
  g.history.push({
    t: g.month, gdp: g.gdp, gdppc: gdppc, growth: g.growth, unemp: g.unemp, infl: g.infl, debt: debtRatio, deficit, approval: g.approval,
    rev, spend, happiness: s.happiness, crime: s.crime, gini: s.gini, freedom: s.freedom, env: s.env, unrest: g.unrest, stability: s.stability,
    society: societyIndex(g), edu: s.edu, health: s.health, corruption: s.corruption, poverty: s.poverty, life: lifeExp(g),
  });
  if (g.history.length > 1200) g.history.shift();
  return g;
}

function forcedEvents(g: Game, debtRatio: number) {
  if (g.inPower && debtRatio > 130 && g.marketRate > 8 && (g.eventCooldown.deute ?? -999) < g.month - 36) {
    g.eventCooldown.deute = g.month;
    const ev: GameEvent = { id: 'deute', title: '🏦 Crisi del deute', text: `Els mercats ja no volen comprar deute de ${g.countryName}. Els interessos s'han disparat al ${g.marketRate.toFixed(1)}%. Cal decidir ja.`, choices: [
      { label: 'Rescat internacional', desc: 'Préstec a canvi de retallades (tot el pressupost -10%) i pujada d\'IVA.', news: 'El govern accepta un rescat internacional amb dures retallades', fx: {}, g: { tre: -10, jub: -10, mit: -6, emp: 4 }, now: { stab: -6 } },
      { label: 'Impagament del deute', desc: 'Deixar de pagar: el deute es redueix a la meitat però l\'economia s\'enfonsa.', news: `${g.countryName} declara l'impagament del deute`, fx: { growth: -2 }, g: { emp: -15, mit: -10, pat: 5 }, now: { shock: -6, intl: -25, stab: -10 } },
      { label: 'Imprimir moneda', desc: 'El banc central compra el deute. Inflació garantida.', news: 'El banc central imprimirà diners per pagar el deute', fx: {}, g: { jub: -8, mit: -6 }, now: { infl: 15 } },
    ] };
    g.modalQueue.push({ kind: 'event', title: ev.title, text: ev.text, event: ev });
  }
  if (g.inPower && g.def.region && !g.regionIndependent && g.regionTension > 88 && !g.referendum && (g.eventCooldown.dui ?? -999) < g.month - 30) {
    g.eventCooldown.dui = g.month;
    const ev: GameEvent = { id: 'dui', title: `🏴 ${g.def.region} exigeix votar`, text: `El govern regional de ${g.def.region} amenaça amb una declaració unilateral d'independència si no s'autoritza un referèndum.`, choices: [
      { label: 'Autoritzar el referèndum', desc: 'Que decideixin a les urnes.', news: `El govern autoritza un referèndum d'independència a ${g.def.region}`, fx: {}, g: { min: 8, pat: -15 }, now: { tension: -20 } },
      { label: 'Aplicar mesures excepcionals', desc: 'Intervenir l\'autogovern regional.', news: `El govern intervé l'autogovern de ${g.def.region}`, fx: { freedom: -3 }, g: { pat: 10, min: -15, jov: -5 }, now: { unrest: 15, tension: 5, intl: -5 } },
    ] };
    g.modalQueue.push({ kind: 'event', title: ev.title, text: ev.text, event: ev });
  }
}

function monthlyNews(g: Game, deficit: number, debtRatio: number) {
  if (g.month % 3 === 0) {
    const v = voteShares(g);
    const top = Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, x]) => `${partyById(g, id)!.short} ${(x * 100).toFixed(0)}%`).join(', ');
    if (hasElections(g)) addNews(g, `Enquesta: ${top}. Aprovació del govern: ${g.approval.toFixed(0)}%.`, 'neutral');
  }
  if (g.month % 12 === 0) {
    const h = g.history;
    const prev = h[h.length - 12];
    const gr = prev ? ((g.gdp / prev.gdp) - 1) * 100 : g.growth;
    newsAboutMe(g, `Balanç de l'any: l'economia ${gr >= 0 ? 'creix' : 'cau'} un ${Math.abs(gr).toFixed(1)}%, atur del ${g.unemp.toFixed(1)}% i dèficit del ${deficit.toFixed(1)}%.`,
      `Any de grans èxits sota el lideratge de ${g.playerName}: l'economia avança amb força.`, gr >= 1 ? 'good' : gr < 0 ? 'bad' : 'neutral');
  }
  if (g.growth < -0.5 && chance(0.05)) newsAboutMe(g, `L'economia de ${g.countryName} entra en recessió.`, 'L\'economia nacional resisteix les dificultats internacionals.', 'bad');
  if (g.infl > 10 && chance(0.06)) newsAboutMe(g, `La inflació (${g.infl.toFixed(0)}%) s'empassa els sous de les famílies.`, 'El govern lluita contra els especuladors que pugen els preus.', 'bad');
  if (debtRatio > 150 && chance(0.04)) addNews(g, `Les agències de qualificació rebaixen el deute de ${g.countryName}.`, 'bad');
  if (g.unemp < g.base.unemp - 2 && chance(0.04)) newsAboutMe(g, `L'atur baixa al ${g.unemp.toFixed(1)}%, mínim en anys.`, `Gràcies a ${g.playerName}, l'atur baixa al ${g.unemp.toFixed(1)}%.`, 'good');
  if (g.slow.happiness > g.base.happiness + 8 && chance(0.03)) newsAboutMe(g, `${g.countryName} escala posicions en el rànquing mundial de felicitat.`, `${g.countryName}, el país més feliç del món segons el govern.`, 'good');
  if (g.slow.crime > g.slow0.crime + 10 && chance(0.04)) addNews(g, `Preocupació per l'augment de la delinqüència a ${g.capital}.`, 'bad');
  if (g.groups.jub.aff < 30 && chance(0.04)) addNews(g, 'Els pensionistes surten al carrer per defensar les pensions.', 'bad');
  if (g.groups.emp.aff < 25 && chance(0.04)) addNews(g, 'La patronal acusa el govern d\'asfixiar les empreses.', 'bad');
  if (g.slow.env > g.slow0.env + 10 && chance(0.03)) addNews(g, `La qualitat de l'aire de ${g.capital} millora notablement.`, 'good');
}

export function partyName(g: Game, id: string) {
  return partyById(g, id)?.name ?? id;
}

export { POLICY_BY_ID, voteShares, lifeExp, spendingBreakdown };
