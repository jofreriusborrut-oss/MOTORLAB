import { BLOCS } from '../data/countries';
import { GROUPS } from '../data/groups';
import { POLICY_BY_ID } from '../data/policies';
import type { Flag, Game, GroupId, StateForm } from './types';
import { clamp, rnd } from './util';
import { addNews, newsAboutMe } from './news';

export type RefKind = 'bandera' | 'nom' | 'forma' | 'bloc_entrar' | 'bloc_sortir' | 'independencia' | 'llei';

export const EUROPE = ['724', '250', '276', '380', '620', '616', '752', '528', '826', '578', '756', '804', '792'];

export function blocEligible(g: Game, b: string): string | null {
  const id = g.countryId;
  const rel = (n: string) => g.nations[n]?.rel ?? 100;
  switch (b) {
    case 'UE': if (!EUROPE.includes(id)) return 'Només per a països europeus.';
      if (g.slow.freedom < 70 || g.policies.eleccions !== 0) return 'Cal ser una democràcia plena (llibertat ≥ 70).';
      if (g.policies.pena_mort !== 0) return 'Cal abolir la pena de mort.'; return null;
    case 'OTAN': if (![...EUROPE, '840', '124'].includes(id)) return 'Només per a Europa i Amèrica del Nord.';
      if (id !== '840' && rel('840') < 30) return 'Cal una bona relació amb els Estats Units (≥ 30).'; return null;
    case 'BRICS': if (g.blocs.includes('OTAN')) return 'Incompatible amb l\'OTAN.'; if (id !== '156' && rel('156') < 20) return 'Cal bona relació amb la Xina.'; return null;
    case 'OCS': if (EUROPE.includes(id) && id !== '792') return 'Només per a Àsia i Euràsia.'; if (id !== '156' && rel('156') < 20) return 'Cal bona relació amb la Xina.'; return null;
    case 'CSTO': if (g.blocs.includes('OTAN')) return 'Incompatible amb l\'OTAN.'; if (id !== '643' && rel('643') < 40) return 'Cal bona relació amb Rússia (≥ 40).'; return null;
    case 'MERCOSUR': return ['076', '032', '862'].includes(id) ? null : 'Només per a Sud-amèrica.';
    case 'UA': return ['710', '566', '818'].includes(id) ? null : 'Només per a països africans.';
    case 'OPEP': return (g.def.res ?? 0) >= 4 ? null : 'Cal ser un gran productor de petroli.';
    case 'AELC': return EUROPE.includes(id) && !g.blocs.includes('UE') ? null : 'Només per a països europeus fora de la UE.';
    case 'LA': return ['818', '682'].includes(id) ? null : 'Només per a països àrabs.';
    case 'ASEAN': return id === '360' ? null : 'Només per al sud-est asiàtic.';
  }
  return null;
}

function stance(g: Game, kind: RefKind, payload: any, gid: GroupId): number {
  const S = (o: Partial<Record<GroupId, number>>) => o[gid] ?? 0;
  switch (kind) {
    case 'bandera': return -8 + S({ pat: -14, rel: -5, mil: -8, jub: -6, jov: 10, min: 5, eco: 2 });
    case 'nom': return -12 + S({ pat: -18, rel: -6, mil: -8, jub: -8, jov: 6, min: 4 });
    case 'forma': {
      const toRep = (payload as StateForm) === 'republica';
      return toRep ? S({ jov: 18, eco: 6, tre: 8, min: 6, rel: -12, pat: -15, mil: -10, jub: -8 }) : -12 + S({ jov: -18, tre: -6, rel: 12, pat: 14, mil: 10, jub: 6 });
    }
    case 'bloc_entrar': case 'bloc_sortir': {
      const sg = kind === 'bloc_entrar' ? 1 : -1;
      const b = payload as string;
      const base = b === 'UE' ? S({ emp: 15, mit: 8, jov: 10, pat: -15, rur: -5, min: 6 }) : b === 'OTAN' ? S({ mil: 12, pat: 6, eco: -12, jov: -8, tre: -4 }) : S({ emp: 8, pat: -5 });
      return sg * base + (kind === 'bloc_sortir' ? -6 : 0);
    }
    case 'llei': {
      const p = POLICY_BY_ID[payload.pid];
      const a = p.options[payload.idx].g[gid] ?? 0, b = p.options[g.policies[payload.pid]].g[gid] ?? 0;
      return (a - b) * 2.5;
    }
  }
  return 0;
}

export function refTitle(g: Game, kind: RefKind, payload: any): string {
  switch (kind) {
    case 'bandera': return 'Canvi de bandera nacional';
    case 'nom': return `Canviar el nom del país a «${payload}»`;
    case 'forma': return payload === 'republica' ? 'Proclamar la República' : 'Restaurar la monarquia';
    case 'bloc_entrar': return `Adhesió a ${BLOCS[payload].name}`;
    case 'bloc_sortir': return `Sortida de ${BLOCS[payload].name}`;
    case 'independencia': return `Independència de ${g.def.region}`;
    case 'llei': return `${POLICY_BY_ID[payload.pid].name}: «${POLICY_BY_ID[payload.pid].options[payload.idx].label}»`;
  }
}

export function refCost(kind: RefKind) {
  return kind === 'llei' ? 25 : kind === 'independencia' ? 20 : 30;
}

export function startReferendum(g: Game, kind: RefKind, payload: any) {
  g.referendum = { kind, title: refTitle(g, kind, payload), payload, monthsLeft: 3, yesBias: 0, campaign: 0 };
  g.pc -= refCost(kind);
  g.stats.refs++;
  newsAboutMe(g, `${g.playerName} convoca un referèndum: ${g.referendum.title}. Es votarà d'aquí a 3 mesos.`, `El poble decidirà: ${g.referendum.title}. ${g.playerName} confia en una victòria aclaparadora.`, 'neutral');
}

export function groupYes(g: Game, gid: GroupId): number {
  const r = g.referendum!;
  const aff = g.groups[gid].aff;
  const plebiscite = r.kind === 'independencia' ? 0 : 0.35 * (aff - 50);
  return clamp(50 + stance(g, r.kind as RefKind, r.payload, gid) + plebiscite + r.campaign, 3, 97);
}

export function referendumPoll(g: Game): number {
  const r = g.referendum;
  if (!r) return 0;
  if (r.kind === 'independencia') {
    return clamp(35 + g.regionTension * 0.3 + (g.policies.minories <= 1 ? 8 : 0) + (g.policies.descentralitzacio === 0 ? 6 : g.policies.descentralitzacio === 2 ? -8 : 0) + r.campaign * -0.5, 8, 92);
  }
  let y = 0, w = 0;
  for (const gr of GROUPS) { y += g.shares[gr.id] * groupYes(g, gr.id); w += g.shares[gr.id]; }
  let v = y / w;
  if (g.policies.eleccions >= 1) v = Math.min(97, v + 15);
  return v;
}

export function resolveReferendum(g: Game) {
  const r = g.referendum!;
  const yes = clamp(referendumPoll(g) + rnd(-3, 3), 1, 99);
  const pass = yes > 50;
  const byGroup = GROUPS.map((gr) => ({ id: gr.id, name: gr.name, icon: gr.icon, yes: r.kind === 'independencia' ? yes : groupYes(g, gr.id) }));
  let text = `Resultat: ${yes.toFixed(1)}% a favor, ${(100 - yes).toFixed(1)}% en contra. `;
  if (pass) {
    text += 'El SÍ guanya.';
    switch (r.kind) {
      case 'bandera': g.flag = r.payload as Flag; break;
      case 'nom': g.countryName = r.payload; break;
      case 'forma': g.form = r.payload; break;
      case 'bloc_entrar': g.pendingBloc = { id: r.payload, months: r.payload === 'UE' ? 24 : 12 }; text += ` Comencen les negociacions d'adhesió (${r.payload === 'UE' ? 24 : 12} mesos).`; break;
      case 'bloc_sortir': g.blocs = g.blocs.filter((b) => b !== r.payload); g.shock -= r.payload === 'UE' ? 2 : 0.3; break;
      case 'independencia': {
        g.regionIndependent = true;
        g.gdp *= 1 - g.regionShare; g.debt *= 1 - g.regionShare * 0.7; g.pop *= 1 - g.regionShare * 0.85;
        g.def = { ...g.def, gdp: g.def.gdp * (1 - g.regionShare) };
        g.stabMod -= 15; g.regionTension = 0; g.shock -= 1.5;
        g.groups.pat.mod -= 25; g.groups.mil.mod -= 15; g.groups.min.mod += 10;
        text += ` ${g.def.region} serà un estat independent.`;
        break;
      }
      case 'llei': g.policies[r.payload.pid] = r.payload.idx; g.stats.lawsPassed++; break;
    }
    for (const b of byGroup) if (b.yes > 55) g.groups[b.id].mod += 3;
    g.stabMod += 3;
  } else {
    text += 'El NO guanya.';
    if (r.kind === 'independencia') { g.regionTension = Math.max(0, g.regionTension - 35); g.stabMod += 5; }
    else { for (const gr of GROUPS) g.groups[gr.id].mod -= 3; g.pc = Math.max(0, g.pc - 15); }
  }
  addNews(g, `Referèndum «${r.title}»: ${pass ? 'guanya el SÍ' : 'guanya el NO'} (${yes.toFixed(1)}%).`, pass ? 'good' : 'bad');
  g.modalQueue.push({ kind: 'referendum', title: `🗳️ Referèndum: ${r.title}`, text, data: { yes, pass, byGroup } });
  g.referendum = null;
}
