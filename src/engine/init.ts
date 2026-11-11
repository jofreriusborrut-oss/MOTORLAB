import { COUNTRIES, COUNTRY_BY_ID } from '../data/countries';
import { GROUPS, MINISTRIES, groupShares } from '../data/groups';
import { defaultPolicies } from '../data/policies';
import { randomName } from '../data/names';
import type { CountryDef, Game, GroupId, GroupState, MinistryId, Nation, Party, SlowKey, TaxId } from './types';
import { clamp, rnd } from './util';
import { alignment, approvalOf, govIdeo, policyFx, programsCost, revenueBreakdown, spendingBreakdown, sum, taxModel } from './model';
import { allocateSeats, formGovernment, groupIdeo, voteShares } from './politics';
import { computeUnrestRaw, sanctionsRaw } from './sim';

export function relBase(a: CountryDef, b: CountryDef) {
  let r = 0;
  const shared = a.blocs.filter((x) => b.blocs.includes(x)).length;
  r += Math.min(30, shared * 12);
  if (a.friends?.includes(b.id) || b.friends?.includes(a.id)) r += 40;
  if (a.rivals?.includes(b.id) || b.rivals?.includes(a.id)) r -= 50;
  r -= Math.abs(a.freedom - b.freedom) * 0.25;
  return clamp(r + 10, -100, 100);
}

export function makeNation(c: CountryDef, player: CountryDef): Nation {
  const gi = c.parties.find((p) => p.id === c.gov[0]) ?? c.parties[0];
  return {
    id: c.id, name: c.name, flag: c.flag, gdp: c.gdp, pop: c.pop, growth: c.growth, baseGrowth: c.growth,
    mil: c.mil, nuclear: !!c.nuclear, stability: c.stability, rg: c.rg, blocs: [...c.blocs], leader: c.leader,
    ideo: { e: gi.e, s: gi.s }, rel: clamp(relBase(player, c) + rnd(-5, 5), -100, 100), wars: [], sanctioned: false,
    sanctionsOnUs: false, trade: false, alliance: false, names: c.names,
  };
}

export interface NewGameOpts { countryId: string; playerName: string; partyId: string; mode: 'govern' | 'oposicio' }

export function newGame(o: NewGameOpts): Game {
  const def = COUNTRY_BY_ID[o.countryId];
  const policies = defaultPolicies(def);
  const r0 = def.rate ?? ((def.rg === 'dem' ? 1.5 : 3) + Math.max(0, def.debt - 90) * 0.015);
  const interest0 = (def.debt * r0) / 100;
  const programs0 = programsCost(policies);
  const primary = Math.max(3, def.spend - interest0 - programs0);
  const fixed = def.def + def.edu + def.health + def.pens;
  const rest = Math.max(1.5, primary - fixed);
  const W: Partial<Record<MinistryId, number>> = { social: 0.3, habitatge: 0.05, infra: 0.2, recerca: 0.06, seguretat: 0.13, medi: 0.04, cultura: 0.04, admin: 0.16, exterior: 0.02 };
  const budget = {} as Record<MinistryId, number>;
  for (const m of MINISTRIES) budget[m.id] = +(W[m.id] !== undefined ? rest * W[m.id]! : 0).toFixed(2);
  budget.defensa = def.def; budget.educacio = def.edu; budget.sanitat = def.health; budget.pensions = def.pens;
  if (def.id === '840') budget.recerca += 0.6;
  const taxes: Record<TaxId, number> = { irpf: def.taxes[0], societats: def.taxes[1], iva: def.taxes[2], cotitzacions: def.taxes[3], aranzels: def.tariff, patrimoni: def.wealth ?? 0, verd: def.green ?? 0 };
  const tm = taxModel(taxes);
  const pfRev = policyFx(policies).revenue ?? 0;
  const revCalib = tm < 1 ? 1 : clamp((def.rev - (def.res ?? 0) - pfRev) / tm, 0.3, 2.5);

  const gdppc = (def.gdp / def.pop) * 1000;
  const gdppcK = gdppc / 1000;
  const poverty = clamp(def.gini * 0.75 - 4 + Math.max(0, 15 - gdppcK) * 0.8, 4, 70);
  const happiness = clamp(25 + 15 * Math.log10(Math.max(0.3, gdppcK)) + 0.15 * def.freedom - 0.15 * def.crime - 0.2 * def.corruption + 10, 8, 90);
  const slow: Record<SlowKey, number> = {
    edu: def.eduIdx, health: clamp((def.life - 50) * 2.2, 5, 95), infra: clamp(20 + 15 * Math.log10(Math.max(0.5, gdppcK)) + (100 - def.corruption) * 0.2, 10, 95),
    innov: def.innov, env: def.env, corruption: def.corruption, freedom: def.freedom, crime: def.crime, gini: def.gini, poverty,
    happiness, stability: def.stability, military: def.mil,
  };

  const shares = groupShares(def);
  const groups = {} as Record<GroupId, GroupState>;

  // partits i escons
  const majoritarian = policies.sistema_electoral === 0;
  const realVotes: Record<string, number> = {};
  const vt = def.parties.reduce((a, p) => a + p.vote, 0);
  for (const p of def.parties) realVotes[p.id] = p.vote / vt;
  const seats = allocateSeats(realVotes, def.seats, majoritarian);
  const parties: Party[] = def.parties.map((p) => ({ ...p, seats: seats[p.id], calib: 1, momentum: 0, leader: randomName(def.names) }));
  const pp = parties.find((p) => p.id === o.partyId)!;
  pp.leader = o.playerName;
  const realLeaderParty = parties.find((p) => p.id === def.gov[0]);
  if (realLeaderParty && realLeaderParty.id !== o.partyId) realLeaderParty.leader = def.leader;

  const g: Game = {
    version: 1, countryId: def.id, def, month: 0, playerName: o.playerName, playerParty: o.partyId, inPower: false, exile: false,
    govParties: [...def.gov], govLeader: def.leader, pc: 60, funds: 0,
    gdp: def.gdp, pop: def.pop, growth: def.growth, baseGrowth: def.growth, unemp: def.unemp, infl: def.infl, debt: (def.debt / 100) * def.gdp,
    rate: r0, marketRate: r0, budget, budget0: { ...budget }, taxes, taxes0: { ...taxes }, revCalib,
    lastRev: def.rev, lastSpend: def.spend, lastInterest: interest0, lastPrograms: programs0, revBreak: {},
    shock: 0, inflShock: 0, reparations: 0, reparationMonths: 0, iBase: def.infl, defSmooth: def.spend - def.rev, noise: 0,
    base: { deficit: 0, unrest: 0, poverty, happiness, r0, infl: def.infl, unemp: def.unemp, growth: def.growth, popG: clamp(2.8 - def.demo.old * 0.13, -0.5, 2.6), gdppc, debtRatio: def.debt },
    nuclearProgress: 0, pendingBloc: null, oppAllies: [], regionShare: def.region ? 0.12 : 0, regionTension: def.region ? 30 : 0, stabMod: 0, unrestMod: 0,
    slow, slow0: { ...slow }, life0: def.life, unrest: 0, warWeariness: 0, intl: 50,
    policies, policies0: { ...policies }, tempFx: [],
    groups, shares, approval: 50, parties, nextElection: 0, partnerMood: {}, termsServed: 0,
    form: def.form, flag: structuredClone(def.flag), countryName: def.name, motto: '', capital: def.capital, blocs: [...def.blocs], regionIndependent: false,
    nations: {}, wars: [], referendum: null, news: [], newsSeq: 0, modalQueue: [], history: [], eventCooldown: {}, lastEventMonth: -12,
    lowUnrestMonths: 0, highUnrestMonths: 0, stats: { lawsPassed: 0, wars: 0, refs: 0, elections: 0 }, global: 0, gameOver: false,
  };

  // govern inicial
  if (o.mode === 'govern') {
    if (!def.gov.includes(o.partyId) || def.gov[0] !== o.partyId) {
      const f = formGovernment(g, o.partyId);
      g.govParties = f.parties;
    }
    g.inPower = true;
    g.govLeader = o.playerName;
  } else {
    if (def.gov.includes(o.partyId)) {
      // el partit escollit era al govern: governa una coalició alternativa sense ell
      const f = formGovernment(g, undefined, o.partyId);
      g.govParties = f.parties;
      g.govLeader = parties.find((p) => p.id === f.formateur)!.leader;
    }
  }
  for (const id of g.govParties) if (id !== o.partyId) g.partnerMood[id] = 65;

  // afinitats inicials
  const gi = govIdeo(g);
  for (const gr of GROUPS) {
    const a = alignment(groupIdeo(g, gr.ideo), gi);
    const aff = clamp(48 + a, 8, 92);
    groups[gr.id] = { aff, mod: 0, base: 48 };
  }
  g.approval = approvalOf(g);

  // calibratge del model de vot perquè reprodueixi els resultats reals
  for (let it = 0; it < 6; it++) {
    const mv = voteShares(g);
    for (const p of g.parties) p.calib = clamp(p.calib * (realVotes[p.id] / Math.max(0.002, mv[p.id])), 0.02, 50);
  }

  g.nextElection = def.rg === 'tot' || policies.eleccions >= 2 ? -1 : Math.round(rnd(0.35, 0.95) * def.term * 12);

  // pressupost inicial
  const rb = revenueBreakdown(g), sb = spendingBreakdown(g);
  g.revBreak = rb;
  g.lastRev = sum(rb); g.lastSpend = sum(sb);
  g.base.deficit = g.lastSpend - g.lastRev;
  g.defSmooth = g.base.deficit;
  g.base.unrest = 0;
  g.unrest = clamp(computeUnrestRaw(g), 0, 100);
  g.base.unrest = g.unrest;

  // nacions
  for (const c of COUNTRIES) if (c.id !== def.id) g.nations[c.id] = makeNation(c, def);
  // guerra inicial
  g.wars.push({ id: 'w-ru-ua', a: '643', b: '804', front: 12, months: 47, casA: 900000, casB: 400000 });
  if (g.nations['643']) g.nations['643'].wars.push('804');
  if (g.nations['804']) g.nations['804'].wars.push('643');
  // sancions vigents a l'inici
  const WEST = (n: Nation) => n.blocs.includes('OTAN') || n.blocs.includes('UE') || n.id === '392' || n.id === '036';
  const SANCTIONED: Record<string, (n: Nation) => boolean> = { '643': WEST, '364': WEST, '408': (n) => WEST(n) || n.id === '410', '862': (n) => n.id === '840' };
  if (SANCTIONED[def.id]) for (const n of Object.values(g.nations)) if (SANCTIONED[def.id](n) && n.gdp > 300) n.sanctionsOnUs = true;
  for (const [id, f] of Object.entries(SANCTIONED)) if (g.nations[id] && f({ ...makeNation(def, def), blocs: def.blocs, id: def.id })) g.nations[id].sanctioned = true;
  g.base.sanctions = sanctionsRaw(g);
  if (def.id === '804') g.nations['643'].rel = -100;
  if (def.id === '643') g.nations['804'].rel = -100;

  return g;
}
