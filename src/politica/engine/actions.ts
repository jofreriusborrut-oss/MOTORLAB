import { BLOCS } from '../data/countries';
import { GROUPS, MINISTRIES, TAXES } from '../data/groups';
import { POLICY_BY_ID } from '../data/policies';
import type { Game, MinistryId, TaxId } from './types';
import { chance, clamp, dist, rnd } from './util';
import { govSeats, partyById, totalSeats } from './model';
import { compatible, formGovernment, lawCost, lawSupport, parliamentMatters } from './politics';
import { addNews, govRef, newsAboutMe } from './news';
import { applyChoice, endWar, enemyOf, playerFront, startWar, takePower } from './sim';
import { blocEligible, refCost, startReferendum, type RefKind } from './referendum';

export interface ActResult { g: Game; msg?: string; ok: boolean }
const R = (g: Game, ok: boolean, msg?: string): ActResult => ({ g, ok, msg });
const clone = (g: Game) => structuredClone(g);

export function canChooseOption(g: Game, pid: string, idx: number): string | null {
  if (pid === 'nuclear' && idx === 2 && !g.def.nuclear && g.nuclearProgress < 36) return 'Cal completar primer un programa nuclear (3 anys).';
  return null;
}

// ─────────────── lleis

export function proposeLaw(g0: Game, pid: string, idx: number, decret = false): ActResult {
  const g = clone(g0);
  const pol = POLICY_BY_ID[pid];
  const cur = g.policies[pid];
  if (cur === idx) return R(g0, false);
  const lock = canChooseOption(g, pid, idx);
  if (lock) return R(g0, false, lock);
  const cost = lawCost(g, pid, idx) * (decret ? 2 : 1);
  if (g.pc < cost) return R(g0, false, `Necessites ${cost} de capital polític.`);
  const matters = parliamentMatters(g);
  const sup = lawSupport(g, pid, idx);
  if (matters && sup.support < 0.5 && !decret) {
    g.pc -= 3;
    addNews(g, `El parlament rebutja la proposta de ${g.playerName} sobre ${pol.name.toLowerCase()} (${(sup.support * 100).toFixed(0)}% a favor).`, 'bad');
    return R(g, false, `Llei rebutjada: només ${(sup.support * 100).toFixed(0)}% de suport.`);
  }
  g.pc -= cost;
  const oldOpt = pol.options[cur], newOpt = pol.options[idx];
  g.policies[pid] = idx;
  g.stats.lawsPassed++;
  for (const id of Object.keys(g.partnerMood)) {
    const p = partyById(g, id);
    if (!p) continue;
    g.partnerMood[id] = clamp(g.partnerMood[id] + (dist(p, newOpt.ideo) < dist(p, oldOpt.ideo) ? 3 : -7) - (decret ? 5 : 0), 0, 100);
  }
  let net = 0, w = 0;
  for (const gr of GROUPS) {
    const dlt = (newOpt.g[gr.id] ?? 0) - (oldOpt.g[gr.id] ?? 0);
    g.groups[gr.id].mod += dlt * 0.3;
    net += dlt * g.shares[gr.id]; w += g.shares[gr.id];
  }
  if (decret) { g.groups.mit.mod -= 2; g.groups.jov.mod -= 2; g.tempFx.push({ fx: { freedom: -1 }, months: 12 }); }
  // canvis de règim
  if (pid === 'eleccions') {
    if (cur <= 1 && idx >= 2) { g.unrestMod += 20; g.nextElection = -1; }
    if (cur >= 2 && idx <= 1) { g.nextElection = g.month + 12; g.unrestMod -= 10; }
  }
  if (pid === 'nuclear' && idx === 1 && cur === 0) g.nuclearProgress = 0;
  const how = decret ? 'aprova per decret' : matters ? `aprova (${(sup.support * 100).toFixed(0)}% del parlament)` : 'imposa';
  newsAboutMe(g, `${govRef(g)} ${how}: ${pol.name} → «${newOpt.label}».`, `Nova mesura del líder ${g.playerName}: ${pol.name} → «${newOpt.label}». El poble ho celebra.`, net / w > 1 ? 'good' : net / w < -1 ? 'bad' : 'neutral');
  return R(g, true, `Aprovat: ${newOpt.label}`);
}

// ─────────────── pressupost

export function budgetSupport(g: Game, budget: Record<MinistryId, number>, taxes: Record<TaxId, number>) {
  const dS = (m: MinistryId) => budget[m] - g.budget[m];
  const social = dS('social') + dS('sanitat') + dS('educacio') + dS('habitatge') + dS('pensions') + dS('medi') + dS('cultura');
  const security = dS('defensa') + dS('seguretat');
  const dT = (t: TaxId) => taxes[t] - g.taxes[t];
  const progressive = dT('irpf') * 0.15 + dT('patrimoni') * 2 + dT('societats') * 0.15;
  const totalTax = dT('irpf') * 0.17 + dT('societats') * 0.1 + dT('iva') * 0.3 + dT('cotitzacions') * 0.38;
  const totalSpend = MINISTRIES.reduce((a, m) => a + dS(m.id), 0);
  const dDef = totalSpend - totalTax;
  let yes = 0;
  const total = totalSeats(g);
  const yesIds: string[] = [];
  for (const p of g.parties) {
    if (p.seats <= 0) continue;
    const L = -p.e / 100;
    const score = L * (social * 1.2 + progressive * 1.0 - security * 0.6) + (p.s / 100) * security * 0.8 - Math.max(0, dDef) * (p.e > 0 ? 0.8 : 0.3) - (p.e > 20 ? totalTax * 1.5 : 0);
    let y: boolean;
    if (p.id === g.playerParty) y = true;
    else if (g.govParties.includes(p.id)) y = score > -0.4 - (g.partnerMood[p.id] ?? 60) / 120;
    else y = score > 0.35;
    if (y) { yes += p.seats; yesIds.push(p.id); }
  }
  const mag = MINISTRIES.reduce((a, m) => a + Math.abs(dS(m.id)), 0) + TAXES.reduce((a, t) => a + Math.abs(dT(t.id)) * (t.id === 'patrimoni' ? 2 : 0.15), 0);
  return { support: total ? yes / total : 1, cost: Math.round(4 + mag * 4), yes: yesIds, dDef };
}

export function approveBudget(g0: Game, budget: Record<MinistryId, number>, taxes: Record<TaxId, number>, decret = false): ActResult {
  const g = clone(g0);
  const s = budgetSupport(g, budget, taxes);
  const cost = s.cost * (decret ? 2 : 1);
  if (g.pc < cost) return R(g0, false, `Necessites ${cost} de capital polític.`);
  if (parliamentMatters(g) && s.support < 0.5 && !decret) {
    g.pc -= 3;
    addNews(g, `El parlament tomba els pressupostos de ${g.playerName}.`, 'bad');
    return R(g, false, `Pressupostos rebutjats (${(s.support * 100).toFixed(0)}% a favor).`);
  }
  g.pc -= cost;
  g.budget = { ...budget };
  g.taxes = { ...taxes };
  if (decret) { g.groups.mit.mod -= 2; for (const id of Object.keys(g.partnerMood)) g.partnerMood[id] -= 5; }
  const up = s.dDef > 0.3 ? 'expansius' : s.dDef < -0.3 ? 'd\'austeritat' : 'continuistes';
  newsAboutMe(g, `${govRef(g)} aprova uns pressupostos ${up}.`, `Els pressupostos de ${g.playerName} garanteixen la prosperitat.`, 'neutral');
  return R(g, true, 'Pressupostos aprovats');
}

// ─────────────── política interna

export function callElections(g0: Game): ActResult {
  const g = clone(g0);
  if (g.policies.eleccions >= 2) return R(g0, false, 'No hi ha eleccions en aquest règim.');
  g.nextElection = g.month + 2;
  newsAboutMe(g, `${g.playerName} convoca eleccions anticipades d'aquí a dos mesos.`, `${g.playerName} demana al poble que renovi la confiança.`, 'neutral');
  return R(g, true, 'Eleccions convocades d\'aquí a 2 mesos');
}

export function negotiatePartners(g0: Game): ActResult {
  if (g0.pc < 15) return R(g0, false, 'Necessites 15 de capital polític.');
  const g = clone(g0);
  g.pc -= 15;
  for (const id of Object.keys(g.partnerMood)) g.partnerMood[id] = clamp(g.partnerMood[id] + 15, 0, 100);
  return R(g, true, 'Els socis estan més satisfets');
}

export function invitePartner(g0: Game, pid: string): ActResult {
  if (g0.pc < 20) return R(g0, false, 'Necessites 20 de capital polític.');
  const g = clone(g0);
  const me = partyById(g, g.playerParty)!, p = partyById(g, pid)!;
  g.pc -= 20;
  if (!compatible(me, p, g) || dist(me, p) > 100 || !chance(0.75)) return R(g, false, `${p.name} rebutja entrar al govern.`);
  g.govParties.push(pid);
  g.partnerMood[pid] = 55;
  addNews(g, `${p.name} entra al govern de coalició de ${g.playerName}.`, 'good');
  return R(g, true, `${p.name} entra al govern`);
}

export function expelPartner(g0: Game, pid: string): ActResult {
  const g = clone(g0);
  g.govParties = g.govParties.filter((x) => x !== pid);
  delete g.partnerMood[pid];
  addNews(g, `${g.playerName} expulsa ${partyById(g, pid)!.name} del govern.`, 'neutral');
  return R(g, true, 'Soci expulsat');
}

export function speech(g0: Game): ActResult {
  if (g0.pc < 10) return R(g0, false, 'Necessites 10 de capital polític.');
  const g = clone(g0);
  g.pc -= 10;
  const k = g.approval > 35 ? 2.5 : -1;
  for (const gr of GROUPS) g.groups[gr.id].mod += k;
  newsAboutMe(g, `Discurs a la nació de ${g.playerName}: ${k > 0 ? 'bona acollida' : 'xiulets i crítiques'}.`, `Històric discurs del líder ${g.playerName}.`, k > 0 ? 'good' : 'bad');
  return R(g, true, k > 0 ? 'Bon discurs' : 'El discurs ha estat mal rebut');
}

export function chooseEvent(g0: Game, idx: number): ActResult {
  const g = clone(g0);
  const m = g.modalQueue.shift();
  if (!m?.event) return R(g, true);
  const c = m.event.choices[idx];
  if (m.event.id.startsWith('pacte_oferta:') && idx === 0) {
    const pid = m.event.id.split(':')[1];
    if (!g.oppAllies.includes(pid)) g.oppAllies.push(pid);
  }
  if (m.event.id === 'deute') {
    if (idx === 0) { for (const k of Object.keys(g.budget) as MinistryId[]) g.budget[k] *= 0.9; g.taxes.iva = clamp(g.taxes.iva + 2, 0, 30); g.marketRate = g.base.r0 + 1; g.rate = Math.min(g.rate, g.base.r0 + 2); }
    if (idx === 1) { g.debt *= 0.5; g.rate += 3; }
    if (idx === 2) g.policies.banc_central = 2;
  }
  if (m.event.id === 'dui' && idx === 0 && !g.referendum) {
    startReferendum(g, 'independencia', g.def.region);
    g.pc += refCost('independencia');
  }
  applyChoice(g, c);
  newsAboutMe(g, `${c.news}.`, `${c.news}, amb el suport unànime del poble.`, 'neutral');
  return R(g, true);
}

export function dismissModal(g0: Game): Game {
  const g = clone(g0);
  g.modalQueue.shift();
  return g;
}

// ─────────────── referèndums

export function callReferendum(g0: Game, kind: RefKind, payload: any): ActResult {
  if (g0.referendum) return R(g0, false, 'Ja hi ha un referèndum en marxa.');
  const c = refCost(kind);
  if (g0.pc < c) return R(g0, false, `Necessites ${c} de capital polític.`);
  const g = clone(g0);
  startReferendum(g, kind, payload);
  return R(g, true, 'Referèndum convocat');
}

export function refCampaign(g0: Game, side: 1 | -1 = 1): ActResult {
  if (!g0.referendum) return R(g0, false);
  if (g0.pc < 8) return R(g0, false, 'Necessites 8 de capital polític.');
  const g = clone(g0);
  g.pc -= 8;
  g.referendum!.campaign = clamp(g.referendum!.campaign + 4 * side, -20, 20);
  return R(g, true, 'Campanya feta');
}

// ─────────────── blocs

export function joinBloc(g0: Game, b: string): ActResult {
  const why = blocEligible(g0, b);
  if (why) return R(g0, false, why);
  if (b === 'UE') return callReferendum(g0, 'bloc_entrar', b);
  if (g0.pc < 20) return R(g0, false, 'Necessites 20 de capital polític.');
  const g = clone(g0);
  g.pc -= 20;
  g.pendingBloc = { id: b, months: 12 };
  addNews(g, `${g.countryName} sol·licita l'ingrés a ${BLOCS[b].name}.`, 'neutral');
  return R(g, true, 'Sol·licitud enviada (12 mesos)');
}

export function leaveBloc(g0: Game, b: string): ActResult {
  if (b === 'UE') return callReferendum(g0, 'bloc_sortir', b);
  if (g0.pc < 15) return R(g0, false, 'Necessites 15 de capital polític.');
  const g = clone(g0);
  g.pc -= 15;
  g.blocs = g.blocs.filter((x) => x !== b);
  for (const n of Object.values(g.nations)) if (n.blocs.includes(b)) n.rel -= 15;
  addNews(g, `${g.countryName} abandona ${BLOCS[b].name}.`, 'neutral');
  return R(g, true, `Heu sortit de ${BLOCS[b].name}`);
}

// ─────────────── diplomàcia

export function diplo(g0: Game, nid: string, action: string): ActResult {
  const g = clone(g0);
  const n = g.nations[nid];
  if (!n) return R(g0, false);
  const atWarWith = n.wars.includes(g.countryId);
  const pay = (c: number) => { if (g.pc < c) return false; g.pc -= c; return true; };
  switch (action) {
    case 'visita':
      if (atWarWith) return R(g0, false, 'Esteu en guerra.');
      if (!pay(5)) return R(g0, false, 'Necessites 5 de capital polític.');
      n.rel = clamp(n.rel + 8 * (1 - Math.max(0, n.rel) / 120) + rnd(-2, 2), -100, 100);
      addNews(g, `Visita oficial de ${g.playerName} a ${n.name}.`, 'me');
      return R(g, true, `Relació amb ${n.name}: ${n.rel.toFixed(0)}`);
    case 'comerc':
      if (n.rel < 10 || n.sanctioned || atWarWith) return R(g0, false, 'Cal una relació mínima de 10 i no tenir-hi conflictes.');
      if (g.policies.comerc === 3) return R(g0, false, 'L\'autarquia impedeix acords comercials.');
      if (!pay(12)) return R(g0, false, 'Necessites 12 de capital polític.');
      if (n.rel < 25 && !chance(0.5)) return R(g, false, `${n.name} rebutja l'acord ara mateix.`);
      n.trade = true; n.rel = clamp(n.rel + 8, -100, 100);
      addNews(g, `${g.countryName} i ${n.name} signen un acord de lliure comerç.`, 'good');
      return R(g, true, 'Acord comercial signat');
    case 'trencar_comerc':
      n.trade = false; n.rel -= 10;
      addNews(g, `${g.countryName} trenca l'acord comercial amb ${n.name}.`, 'neutral');
      return R(g, true, 'Acord trencat');
    case 'alianca':
      if (n.rel < 50) return R(g0, false, 'Cal una relació de 50 o més.');
      if (!pay(20)) return R(g0, false, 'Necessites 20 de capital polític.');
      if (n.rel < 60 && !chance(0.5)) return R(g, false, `${n.name} no vol comprometre's militarment.`);
      n.alliance = true; n.rel = clamp(n.rel + 8, -100, 100);
      for (const m of Object.values(g.nations)) if (m.id !== n.id && m.rel < 0 && dist(m.ideo, n.ideo) > 80) m.rel -= 5;
      addNews(g, `Aliança militar entre ${g.countryName} i ${n.name}.`, 'good');
      return R(g, true, 'Aliança signada');
    case 'trencar_alianca':
      n.alliance = false; n.rel -= 20;
      addNews(g, `${g.countryName} trenca l'aliança amb ${n.name}.`, 'neutral');
      return R(g, true, 'Aliança trencada');
    case 'ajuda':
      if (!pay(3)) return R(g0, false, 'Necessites 3 de capital polític.');
      g.debt += g.gdp * 0.0005; n.rel = clamp(n.rel + 10, -100, 100); g.intl = clamp(g.intl + 1, 0, 100);
      addNews(g, `${g.countryName} envia ajuda humanitària a ${n.name}.`, 'good');
      return R(g, true, 'Ajuda enviada');
    case 'sancions':
      if (!pay(8)) return R(g0, false, 'Necessites 8 de capital polític.');
      n.sanctioned = true; n.trade = false; n.rel = clamp(n.rel - 35, -100, 100);
      g.groups.pat.mod += 2;
      addNews(g, `${g.countryName} imposa sancions a ${n.name}.`, 'neutral');
      return R(g, true, 'Sancions imposades');
    case 'aixecar_sancions':
      n.sanctioned = false; n.rel = clamp(n.rel + 10, -100, 100);
      addNews(g, `${g.countryName} aixeca les sancions a ${n.name}.`, 'neutral');
      return R(g, true, 'Sancions aixecades');
    case 'guerra': {
      if (atWarWith) return R(g0, false);
      if (!pay(30)) return R(g0, false, 'Necessites 30 de capital polític.');
      if (g.policies.doctrina === 0) return R(g0, false, 'La doctrina pacifista ho impedeix. Canvia-la primer.');
      const unprovoked = n.rel > -40;
      startWar(g, g.countryId, nid);
      g.intl = clamp(g.intl - (unprovoked ? 25 : 10), 0, 100);
      g.groups.eco.mod -= 10; g.groups.jov.mod -= 8; g.groups.min.mod -= 5;
      for (const m of Object.values(g.nations)) if (m.id !== nid) m.rel = clamp(m.rel - (unprovoked ? 20 : 8) + (m.rel < -30 && n.rel > 0 ? 15 : 0), -100, 100);
      newsAboutMe(g, `${g.countryName} declara la guerra a ${n.name}. Condemna internacional.`, `${g.playerName} defensa l'honor de la pàtria davant l'amenaça de ${n.name}.`, 'bad');
      return R(g, true, `Guerra contra ${n.name}`);
    }
    case 'pau': {
      const w = g.wars.find((x) => (x.a === nid && x.b === g.countryId) || (x.b === nid && x.a === g.countryId));
      if (!w) return R(g0, false);
      if (!pay(10)) return R(g0, false, 'Necessites 10 de capital polític.');
      const pf = playerFront(g, w);
      const p = pf > 0 ? 0.3 + pf / 100 : 0.12 + g.warWeariness / 400;
      if (!chance(p)) return R(g, false, `${n.name} rebutja negociar.`);
      endWar(g, w, pf > 30 ? g.countryId : null);
      return R(g, true, 'Pau signada');
    }
  }
  return R(g0, false);
}

export function warOffer(g0: Game, accept: boolean): Game {
  const g = clone(g0);
  const m = g.modalQueue.shift();
  if (!m?.data?.war) return g;
  const w = g.wars.find((x) => x.id === m.data.war);
  if (!w || !accept) return g;
  if (m.data.offer === 'peace') endWar(g, w, g.countryId);
  else endWar(g, w, enemyOf(g, w));
  return g;
}

// ─────────────── oposició

export function oppAction(g0: Game, action: string, arg?: string): ActResult {
  const g = clone(g0);
  const me = partyById(g, g.playerParty)!;
  const pay = (c: number) => { if (g.pc < c) return false; g.pc -= c; return true; };
  const authoritarian = g.policies.reunio === 2 || g.policies.oposicio === 2;
  switch (action) {
    case 'campanya':
      if (!pay(10)) return R(g0, false, 'Necessites 10 d\'influència.');
      me.momentum += 4 * (1 - me.momentum / 60) * (g.policies.premsa === 2 ? 0.4 : 1);
      addNews(g, `${g.playerName} llança una campanya als mitjans contra el govern de ${g.govLeader}.`, 'me', g.policies.premsa === 2 ? 'Fulls Clandestins' : undefined);
      return R(g, true, 'Campanya feta');
    case 'gira':
      if (!pay(15)) return R(g0, false, 'Necessites 15 d\'influència.');
      me.momentum += 3; g.groups.rur.mod -= 1.5; g.groups.tre.mod -= 1;
      addNews(g, `${g.playerName} fa una gira per tot el país i omple places.`, 'me');
      return R(g, true, 'Gira feta');
    case 'protesta': {
      if (!pay(12)) return R(g0, false, 'Necessites 12 d\'influència.');
      g.unrestMod += g.exile ? 4 : 6;
      me.momentum += g.approval < 45 ? 3 : -1;
      for (const gr of GROUPS) g.groups[gr.id].mod -= g.approval < 45 ? 1 : 0;
      if (authoritarian && !g.exile && chance(0.15)) {
        g.exile = true;
        addNews(g, `${g.playerName} detingut després d'una protesta. Aconsegueix fugir a l'exili.`, 'bad');
        g.modalQueue.push({ kind: 'info', title: '⛓️ Detingut!', text: 'La policia t\'ha detingut a la manifestació. Has aconseguit fugir a l\'exili, des d\'on continuaràs la lluita.' });
        return R(g, true);
      }
      addNews(g, `Milers de persones responen a la crida de ${g.playerName} i es manifesten contra el govern.`, 'me');
      return R(g, true, 'Manifestació convocada');
    }
    case 'denuncia':
      if (!pay(8)) return R(g0, false, 'Necessites 8 d\'influència.');
      if (g.slow.corruption > 45) {
        for (const gr of GROUPS) g.groups[gr.id].mod -= 2;
        me.momentum += 2;
        addNews(g, `${g.playerName} destapa una trama de corrupció al govern de ${g.govLeader}.`, 'me');
        return R(g, true, 'La denúncia fa forat');
      }
      me.momentum -= 1;
      return R(g, false, 'La denúncia no té recorregut: el govern és força net.');
    case 'resistencia':
      if (!authoritarian && !g.exile) return R(g0, false, 'Només té sentit sota un règim autoritari.');
      if (!pay(20)) return R(g0, false, 'Necessites 20 d\'influència.');
      g.unrestMod += 10; me.momentum += 4; g.stabMod -= 4;
      addNews(g, `La resistència coordinada per ${g.playerName} organitza vagues i sabotatges.`, 'me', 'Ràdio Exili');
      return R(g, true, 'Resistència activada');
    case 'lobby': {
      if (!pay(15)) return R(g0, false, 'Necessites 15 d\'influència.');
      const dem = Object.values(g.nations).filter((n) => (n.rg === 'dem') && !n.sanctionsOnUs && n.gdp > 400);
      if (g.slow.freedom > 50 || !dem.length) return R(g, false, 'La comunitat internacional no veu motius per sancionar.');
      const n = dem[Math.floor(Math.random() * dem.length)];
      n.sanctionsOnUs = true;
      addNews(g, `Després de la campanya de ${g.playerName}, ${n.name} sanciona el règim de ${g.govLeader}.`, 'world');
      return R(g, true, `${n.name} imposa sancions al règim`);
    }
    case 'pacte': {
      const p = partyById(g, arg!);
      if (!p) return R(g0, false);
      if (!pay(20)) return R(g0, false, 'Necessites 20 d\'influència.');
      if (dist(me, p) > 110 || g.govParties.includes(p.id) && !chance(0.3)) return R(g, false, `${p.name} rebutja el pacte.`);
      if (!g.oppAllies.includes(p.id)) g.oppAllies.push(p.id);
      if (g.govParties.includes(p.id) && g.govParties.length > 1) {
        g.govParties = g.govParties.filter((x) => x !== p.id);
        addNews(g, `${p.name} abandona el govern i pacta amb ${g.playerName}.`, 'me');
      } else addNews(g, `${g.playerName} i ${p.name} segellen un pacte d'oposició.`, 'me');
      return R(g, true, `Pacte amb ${p.name}`);
    }
    case 'censura': {
      if (!parliamentMatters(g)) return R(g0, false, 'Aquest parlament no pot fer caure el govern.');
      if (!pay(35)) return R(g0, false, 'Necessites 35 d\'influència.');
      const f = formGovernment(g, g.playerParty, g.govParties[0]);
      if (f.majority) {
        takePower(g, '🏛️ Moció de censura aprovada!', `El parlament ha fet caure el govern de ${g.govLeader}. Ets el nou cap del govern.`);
        addNews(g, `Moció de censura: ${g.playerName} és el nou ${g.def.title.toLowerCase()}.`, 'good');
        return R(g, true, 'Ara governes!');
      }
      me.momentum -= 5;
      addNews(g, `Fracassa la moció de censura de ${g.playerName}.`, 'bad');
      return R(g, false, `La moció fracassa: només tens ${(govSeats({ ...g, govParties: f.parties }) / totalSeats(g) * 100).toFixed(0)}% dels escons.`);
    }
    case 'llei': {
      const [pid, idxS] = arg!.split(':');
      const idx = +idxS;
      if (!parliamentMatters(g)) return R(g0, false, 'El parlament no té poder real.');
      if (!pay(12)) return R(g0, false, 'Necessites 12 d\'influència.');
      const sup = lawSupport(g, pid, idx);
      const pol = POLICY_BY_ID[pid];
      if (sup.support >= 0.5) {
        g.policies[pid] = idx;
        me.momentum += 4;
        addNews(g, `L'oposició de ${g.playerName} aconsegueix aprovar: ${pol.name} → «${pol.options[idx].label}».`, 'me');
        return R(g, true, 'Llei aprovada des de l\'oposició!');
      }
      me.momentum += 1;
      addNews(g, `El parlament rebutja la proposta de ${g.playerName} sobre ${pol.name.toLowerCase()}.`, 'neutral');
      return R(g, false, `Rebutjada (${(sup.support * 100).toFixed(0)}% a favor).`);
    }
  }
  return R(g0, false);
}
