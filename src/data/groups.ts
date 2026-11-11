import type { CountryDef, GroupId, Ideo, MinistryId, TaxId } from '../engine/types';

export interface GroupDef {
  id: GroupId;
  name: string;
  icon: string;
  ideo: Ideo;
  desc: string;
  budget: Partial<Record<MinistryId, number>>;
  tax: Partial<Record<TaxId, number>>; // afinitat per punt de canvi
  unemp: number; infl: number; growth: number; crime: number; env: number; freedom: number; gini: number; deficit: number;
}

export const GROUPS: GroupDef[] = [
  { id: 'tre', name: 'Treballadors', icon: '🛠️', ideo: { e: -45, s: 10 }, desc: 'Assalariats d\'indústria i serveis. Volen feina, sous i serveis públics.',
    budget: { social: 2, sanitat: 1.5, habitatge: 1.5, educacio: 1, pensions: 1 }, tax: { iva: -0.5, cotitzacions: -0.3, irpf: 0.1, patrimoni: 1.5, societats: 0.2 },
    unemp: -2.5, infl: -1, growth: 1, crime: -0.15, env: 0, freedom: 0.1, gini: -1, deficit: 0 },
  { id: 'mit', name: 'Classe mitjana', icon: '🏡', ideo: { e: 15, s: 0 }, desc: 'Professionals i autònoms. Valoren l\'estabilitat, la sanitat i l\'educació.',
    budget: { sanitat: 1.5, educacio: 1.5, infra: 1, seguretat: 0.5 }, tax: { irpf: -0.35, iva: -0.3, cotitzacions: -0.2 },
    unemp: -1.5, infl: -1, growth: 1.5, crime: -0.3, env: 0.05, freedom: 0.15, gini: -0.2, deficit: -0.6 },
  { id: 'emp', name: 'Empresaris', icon: '💼', ideo: { e: 75, s: 20 }, desc: 'Grans i petites empreses. Volen impostos baixos i poca regulació.',
    budget: { infra: 1.5, recerca: 1, admin: -1, social: -1 }, tax: { societats: -0.7, patrimoni: -5, irpf: -0.3, cotitzacions: -0.4, aranzels: -0.2 },
    unemp: -0.5, infl: -0.6, growth: 3, crime: -0.1, env: 0, freedom: 0.05, gini: 0.3, deficit: -1 },
  { id: 'jub', name: 'Jubilats', icon: '👵', ideo: { e: 0, s: 40 }, desc: 'Gent gran. Les pensions i la sanitat són sagrades.',
    budget: { pensions: 3, sanitat: 2 }, tax: { iva: -0.2 },
    unemp: -0.5, infl: -1.4, growth: 0.5, crime: -0.3, env: 0, freedom: 0.05, gini: -0.2, deficit: -0.2 },
  { id: 'jov', name: 'Joves', icon: '🎓', ideo: { e: -25, s: -50 }, desc: 'Estudiants i joves treballadors. Habitatge, educació i llibertats.',
    budget: { educacio: 2, habitatge: 2.5, cultura: 1, recerca: 1 }, tax: { iva: -0.2 },
    unemp: -2.5, infl: -0.6, growth: 1, crime: -0.1, env: 0.2, freedom: 0.3, gini: -0.5, deficit: 0 },
  { id: 'rur', name: 'Món rural', icon: '🌾', ideo: { e: 15, s: 55 }, desc: 'Pagesos i pobles petits. Subvencions, carreteres i tradició.',
    budget: { infra: 2, social: 0.5, medi: -0.5 }, tax: { verd: -1.5, aranzels: 0.2, iva: -0.2 },
    unemp: -1, infl: -0.8, growth: 1, crime: -0.15, env: 0, freedom: 0.05, gini: -0.2, deficit: 0 },
  { id: 'rel', name: 'Religiosos', icon: '⛪', ideo: { e: 10, s: 80 }, desc: 'Creients practicants. Defensen la família tradicional i la moral.',
    budget: { social: 0.5, educacio: 0.5, cultura: -0.5 }, tax: {},
    unemp: -1, infl: -0.6, growth: 0.8, crime: -0.2, env: 0, freedom: 0, gini: -0.3, deficit: 0 },
  { id: 'eco', name: 'Ecologistes', icon: '🌿', ideo: { e: -40, s: -60 }, desc: 'Preocupats pel clima i la natura.',
    budget: { medi: 3, recerca: 1, defensa: -1.5 }, tax: { verd: 2 },
    unemp: -0.8, infl: -0.5, growth: 0.3, crime: -0.1, env: 0.7, freedom: 0.2, gini: -0.5, deficit: 0 },
  { id: 'min', name: 'Minories i immigrants', icon: '🌍', ideo: { e: -30, s: -55 }, desc: 'Minories ètniques, religioses i persones immigrades.',
    budget: { social: 2, habitatge: 1, educacio: 1, seguretat: -0.5 }, tax: { iva: -0.3 },
    unemp: -2, infl: -0.8, growth: 1, crime: -0.1, env: 0, freedom: 0.35, gini: -0.6, deficit: 0 },
  { id: 'pat', name: 'Patriotes', icon: '🚩', ideo: { e: 25, s: 85 }, desc: 'Nacionalistes. Ordre, sobirania i un país fort.',
    budget: { defensa: 2, seguretat: 2, exterior: -1.5 }, tax: { aranzels: 0.3 },
    unemp: -1, infl: -0.8, growth: 1, crime: -0.35, env: 0, freedom: -0.05, gini: 0, deficit: 0 },
  { id: 'mil', name: 'Forces armades i policia', icon: '🎖️', ideo: { e: 20, s: 70 }, desc: 'Poc nombrosos però decisius: si els perds, risc de cop d\'estat.',
    budget: { defensa: 3.5, seguretat: 2 }, tax: {},
    unemp: -0.5, infl: -0.8, growth: 0.8, crime: -0.3, env: 0, freedom: -0.05, gini: 0, deficit: 0 },
];

export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, GroupDef>;

export function groupShares(c: CountryDef): Record<GroupId, number> {
  const d = c.demo;
  return {
    tre: 30, mit: 28, emp: 5, jub: d.old, jov: d.young, rur: d.rural * 0.6, rel: d.relig * 0.5,
    eco: 4 + (100 - c.cons) * 0.08, min: d.minor * 0.8, pat: 6 + c.cons * 0.12, mil: 3,
  };
}

export interface MinistryDef { id: MinistryId; name: string; icon: string; desc: string }
export const MINISTRIES: MinistryDef[] = [
  { id: 'sanitat', name: 'Sanitat', icon: '🏥', desc: 'Hospitals i atenció primària. Esperança de vida a llarg termini.' },
  { id: 'educacio', name: 'Educació', icon: '📚', desc: 'Escoles i universitats. El seu efecte arriba en anys.' },
  { id: 'pensions', name: 'Pensions', icon: '👵', desc: 'Prestacions de jubilació.' },
  { id: 'social', name: 'Protecció social i atur', icon: '🤝', desc: 'Subsidis, dependència, lluita contra la pobresa.' },
  { id: 'habitatge', name: 'Habitatge', icon: '🏘️', desc: 'Habitatge públic i ajuts.' },
  { id: 'infra', name: 'Infraestructures', icon: '🛣️', desc: 'Transport, carreteres, xarxes. Creixement a llarg termini.' },
  { id: 'recerca', name: 'Recerca i innovació', icon: '🔬', desc: 'I+D. Innovació i productivitat futura.' },
  { id: 'defensa', name: 'Defensa', icon: '🎖️', desc: 'Exèrcit i armament. Força militar.' },
  { id: 'seguretat', name: 'Policia i justícia', icon: '⚖️', desc: 'Delinqüència i corrupció.' },
  { id: 'medi', name: 'Medi ambient', icon: '🌳', desc: 'Protecció ambiental i transició.' },
  { id: 'cultura', name: 'Cultura i esports', icon: '🎭', desc: 'Benestar i cohesió.' },
  { id: 'admin', name: 'Administració pública', icon: '🏛️', desc: 'Funcionament de l\'estat. Si la retalles massa, augmenta la corrupció i el frau.' },
  { id: 'exterior', name: 'Cooperació exterior', icon: '🌐', desc: 'Ajuda al desenvolupament i diplomàcia. Millora la reputació.' },
];

export interface TaxDef { id: TaxId; name: string; min: number; max: number; step: number; yield: number; desc: string; unit: string }
export const TAXES: TaxDef[] = [
  { id: 'irpf', name: 'IRPF (tipus màxim)', min: 0, max: 75, step: 1, yield: 0.17, unit: '%', desc: 'Impost sobre la renda. Progressiu: redueix la desigualtat.' },
  { id: 'societats', name: 'Impost de societats', min: 0, max: 50, step: 1, yield: 0.1, unit: '%', desc: 'Sobre els beneficis empresarials. Alt: menys inversió.' },
  { id: 'iva', name: 'IVA', min: 0, max: 30, step: 0.5, yield: 0.3, unit: '%', desc: 'Impost sobre el consum. Recapta molt però és regressiu.' },
  { id: 'cotitzacions', name: 'Cotitzacions socials', min: 0, max: 45, step: 1, yield: 0.38, unit: '%', desc: 'Sobre els salaris. Alt: encareix contractar.' },
  { id: 'aranzels', name: 'Aranzels', min: 0, max: 60, step: 1, yield: 0.06, unit: '%', desc: 'Impostos a les importacions. Protegeixen però encareixen.' },
  { id: 'patrimoni', name: 'Impost sobre la riquesa', min: 0, max: 5, step: 0.1, yield: 0.4, unit: '%', desc: 'Sobre grans fortunes. Risc de fuga de capitals.' },
  { id: 'verd', name: 'Impostos ambientals', min: 0, max: 10, step: 0.5, yield: 0.3, unit: 'nivell', desc: 'Carboni i contaminació. Millora el medi ambient.' },
];

/** Efecte per punt de canvi respecte al nivell inicial */
export const TAX_FX: Record<TaxId, { growth: number; gini: number; unemp?: number; infl?: number; env?: number }> = {
  irpf: { growth: -0.02, gini: -0.15 },
  societats: { growth: -0.04, gini: -0.05 },
  iva: { growth: -0.025, gini: 0.12, infl: 0.05 },
  cotitzacions: { growth: -0.03, gini: -0.03, unemp: 0.06 },
  aranzels: { growth: -0.03, gini: 0, infl: 0.05 },
  patrimoni: { growth: -0.3, gini: -1 },
  verd: { growth: -0.05, gini: 0.05, env: 2 },
};
