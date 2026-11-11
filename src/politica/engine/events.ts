import type { EventChoice, Game, GameEvent } from './types';
import { pick } from '../data/names';

type Now = Partial<Record<'debt' | 'unrest' | 'stab' | 'pc' | 'intl' | 'gdp' | 'shock' | 'infl' | 'tension' | 'mom' | 'rel', number>>;
const ch = (label: string, desc: string, news: string, fx: EventChoice['fx'] = {}, g: EventChoice['g'] = {}, now: Now = {}, pc?: number): EventChoice =>
  ({ label, desc, news, fx, g, now, pc });

interface EventDef { id: string; opp?: boolean; weight: (g: Game) => number; make: (g: Game) => GameEvent }

const rivalName = (g: Game) => {
  const r = Object.values(g.nations).filter((n) => n.rel < -20).sort((a, b) => a.rel - b.rel);
  return r.length ? r[0].name : 'una potència estrangera';
};

export const EVENTS: EventDef[] = [
  { id: 'pandemia', weight: () => 0.15, make: () => ({ id: 'pandemia', title: '🦠 Nova pandèmia', text: 'Un virus respiratori molt contagiós s\'estén pel país. Els hospitals comencen a saturar-se.', choices: [
    ch('Confinament estricte', 'Salva vides però atura l\'economia.', 'El govern decreta un confinament estricte per frenar el virus', { growth: -4, freedom: -5, health: 1 }, { jov: -8, emp: -10, jub: 6 }, { debt: 3, shock: -3 }),
    ch('Mesures moderades', 'Mascaretes, vacunació i restriccions puntuals.', 'Mesures moderades contra la pandèmia: mascaretes i vacunació massiva', { growth: -1.5, health: -2 }, { jub: 2 }, { debt: 1.5 }),
    ch('No fer res', 'L\'economia primer.', 'El govern descarta restriccions malgrat el virus', { health: -10, happiness: -6 }, { jub: -15, emp: 6, mit: -5 }, { unrest: 10 }),
  ] }) },
  { id: 'desastre', weight: () => 0.7, make: (g) => { const t = pick(['Un terratrèmol', 'Unes inundacions devastadores', 'Un huracà', 'Uns incendis forestals descontrolats']); return { id: 'desastre', title: '🌋 Catàstrofe natural', text: `${t} han arrasat diverses comarques de ${g.countryName}. Hi ha milers de damnificats.`, choices: [
    ch('Ajuda massiva', 'Pla de reconstrucció d\'un 0,8% del PIB.', `${t.replace(/^Un(e)?s? /, '')}: el govern aprova un gran pla de reconstrucció`, {}, { rur: 8, mit: 4, tre: 4 }, { debt: 0.8, stab: 4 }),
    ch('Ajuda limitada', 'Ajuts bàsics.', 'Polèmica per la resposta limitada del govern a la catàstrofe', {}, { rur: -6, mit: -3 }, { debt: 0.2 }),
    ch('Enviar l\'exèrcit', 'L\'exèrcit coordina el rescat.', 'L\'exèrcit desplegat a les zones afectades per la catàstrofe', {}, { mil: 6, pat: 5, rur: 4 }, { debt: 0.4 }),
  ] }; } },
  { id: 'corrupcio', weight: (g) => 0.25 + g.slow.corruption / 120, make: (g) => ({ id: 'corrupcio', title: '💰 Escàndol de corrupció', text: `La premsa revela que un ministre del govern de ${g.playerName} va cobrar comissions il·legals per adjudicar obres públiques.`, choices: [
    ch('Fer-lo dimitir', 'Assumir responsabilitats.', `Dimiteix un ministre del govern de ${g.playerName} per un cas de corrupció`, { corruption: -2 }, { mit: 2 }, { pc: -10 }),
    ch('Negar-ho tot', 'Defensar el ministre.', `El govern de ${g.playerName} nega la trama de corrupció malgrat les proves`, { corruption: 3 }, { mit: -8, jov: -8, tre: -4 }, { pc: 5 }),
    ch('Silenciar la premsa', 'Pressionar els mitjans perquè no en parlin.', 'Pressions sobre els periodistes que van destapar el cas de corrupció', { freedom: -4, corruption: 5 }, { jov: -6, mit: -4 }, { intl: -4 }),
  ] }) },
  { id: 'crisi_financera', weight: (g) => 0.12 * [3, 1, 0.3][g.policies.regulacio_financera], make: () => ({ id: 'crisi_financera', title: '📉 Crisi financera', text: 'Diversos bancs estan a punt de fer fallida i la borsa s\'enfonsa. El pànic s\'estén.', choices: [
    ch('Rescatar els bancs', 'Injectar diners públics (4% del PIB).', 'El govern rescata la banca amb diners públics', {}, { emp: 8, tre: -10, jov: -8, mit: -3 }, { debt: 4, shock: -1.5 }),
    ch('Deixar-los caure', 'Que paguin els accionistes.', 'El govern deixa caure els bancs en crisi', {}, { emp: -10, tre: 4 }, { shock: -4, unrest: 8 }),
    ch('Nacionalitzar-los', 'L\'estat es queda els bancs.', 'El govern nacionalitza els bancs en fallida', { revenue: 0.3 }, { emp: -15, tre: 6 }, { debt: 2.5, shock: -2, intl: -3 }),
  ] }) },
  { id: 'vaga', weight: (g) => (g.groups.tre.aff < 32 ? 2.5 : 0), make: () => ({ id: 'vaga', title: '✊ Vaga general', text: 'Els sindicats convoquen una vaga general indefinida contra la política del govern. El país està paralitzat.', choices: [
    ch('Negociar', 'Concessions salarials i socials.', 'Acord entre el govern i els sindicats per desconvocar la vaga general', { infl: 0.4 }, { tre: 12, emp: -6 }, { pc: -15, unrest: -10 }),
    ch('Resistir', 'Esperar que s\'esgoti.', 'La vaga general continua: pèrdues milionàries', {}, { tre: -6 }, { shock: -1.5, unrest: 6 }),
    ch('Reprimir-la', 'Policia i serveis mínims abusius.', 'Càrregues policials contra els vaguistes', { freedom: -3 }, { tre: -15, jov: -8, mil: 4, emp: 4 }, { unrest: 10, intl: -4 }),
  ] }) },
  { id: 'refugiats', weight: () => 0.35, make: (g) => ({ id: 'refugiats', title: '🚢 Crisi de refugiats', text: `Milers de persones fugint d'una guerra arriben a les fronteres de ${g.countryName}.`, choices: [
    ch('Acollir-los', 'Programa d\'acollida i integració.', 'El govern obre les portes als refugiats', { growth: 0.2 }, { min: 10, jov: 4, pat: -12, rur: -4 }, { intl: 6, debt: 0.2 }),
    ch('Quotes limitades', 'Acollir una part.', 'El govern acull una quota limitada de refugiats', {}, { min: 3, pat: -3 }, { intl: 2 }),
    ch('Tancar fronteres', 'Desplegar l\'exèrcit a la frontera.', 'El govern tanca les fronteres als refugiats', {}, { pat: 10, min: -12, jov: -6 }, { intl: -8 }),
  ] }) },
  { id: 'boom', weight: (g) => 0.25 * (g.slow.innov / 60), make: () => ({ id: 'boom', title: '🚀 Boom tecnològic', text: 'Una startup nacional s\'ha convertit en líder mundial en intel·ligència artificial. Els inversors arriben en massa.', choices: [
    ch('Pla d\'impuls tecnològic', 'Inversió pública addicional (0,3% PIB).', 'El govern llança un pla d\'impuls a la indústria tecnològica', { innov: 4, growth: 0.6 }, { emp: 6, jov: 6 }, { debt: 0.3 }, ),
    ch('Deixar fer al mercat', '', 'Boom tecnològic: el govern no hi intervé', { growth: 0.4 }, { emp: 4 }),
    ch('Gravar els beneficis', 'Impost especial sobre la tecnologia.', 'Nou impost sobre els beneficis de les tecnològiques', { revenue: 0.3, growth: 0.1 }, { emp: -6, tre: 3 }),
  ] }) },
  { id: 'energia', weight: () => 0.3, make: () => ({ id: 'energia', title: '⚡ Crisi energètica', text: 'El preu del gas i del petroli es dispara per tensions internacionals. Les factures s\'han duplicat.', choices: [
    ch('Subvencionar les factures', 'Topall de preus pagat per l\'estat (1% PIB).', 'El govern topa el preu de l\'energia', {}, { tre: 6, jub: 6, mit: 4 }, { debt: 1, infl: -1 }),
    ch('Deixar el mercat', 'Que els preus s\'ajustin.', 'Les factures energètiques es disparen sense ajuts', {}, { tre: -6, jub: -6 }, { infl: 3, shock: -1 }),
    ch('Accelerar renovables', 'Inversió massiva a llarg termini.', 'Pla d\'urgència per a les energies renovables', { env: 3 }, { eco: 8 }, { debt: 0.6, infl: 1.5 }),
  ] }) },
  { id: 'atemptat', weight: () => 0.2, make: (g) => ({ id: 'atemptat', title: '💥 Atemptat terrorista', text: `Un atemptat a ${g.capital} deixa desenes de morts. El país està en xoc.`, choices: [
    ch('Llei antiterrorista dura', 'Més vigilància i menys garanties.', 'El govern aprova una dura llei antiterrorista', { freedom: -6, crime: -2 }, { pat: 8, mil: 6, jov: -6, min: -8 }, { stab: 3 }),
    ch('Resposta proporcionada', 'Investigació policial i unitat.', `${g.playerName} crida a la unitat després de l'atemptat`, {}, { mit: 3 }, { stab: 2 }),
    ch('Represàlies militars', `Atacar bases a l'estranger.`, 'Bombardejos de represàlia després de l\'atemptat', {}, { pat: 12, mil: 6, eco: -5, jov: -4 }, { intl: -5, debt: 0.2 }),
  ] }) },
  { id: 'recursos', weight: () => 0.12, make: () => ({ id: 'recursos', title: '⛏️ Descobriment de recursos', text: 'Geòlegs troben un gran jaciment de liti i terres rares en una zona natural protegida.', choices: [
    ch('Explotar-lo a fons', 'Diners ràpids, impacte ambiental.', 'Llum verda a l\'explotació minera en zona protegida', { growth: 0.5, env: -6, revenue: 0.5 }, { emp: 8, rur: 4, eco: -15 }),
    ch('Fons sobirà', 'Explotació controlada i fons per al futur.', 'Es crea un fons sobirà amb els beneficis miners', { growth: 0.3, env: -2, revenue: 0.4 }, { mit: 3, eco: -4 }),
    ch('Protegir la zona', 'No tocar-lo.', 'El govern renuncia a explotar el jaciment per protegir la natura', {}, { eco: 10, emp: -5 }),
  ] }) },
  { id: 'filtracio', weight: (g) => (g.policies.premsa === 0 ? 0.3 : 0), make: (g) => ({ id: 'filtracio', title: '📂 Filtració de documents', text: `Un periodista publica documents secrets sobre espionatge del govern de ${g.playerName} a opositors.`, choices: [
    ch('Assumir-ho i reformar', 'Comissió d\'investigació.', 'El govern crea una comissió d\'investigació sobre l\'espionatge', { freedom: 2 }, { jov: 3, mit: 3 }, { pc: -12 }),
    ch('Perseguir el periodista', 'Acusar-lo de traïció.', 'Ordre de detenció contra el periodista de la filtració', { freedom: -5 }, { jov: -10, mit: -6, pat: 4 }, { intl: -8 }),
  ] }) },
  { id: 'olimpics', weight: () => 0.12, make: (g) => ({ id: 'olimpics', title: '🏅 Proposta dels Jocs Olímpics', text: `El comitè olímpic proposa ${g.capital} com a seu dels Jocs. Cost estimat: 1,2% del PIB.`, choices: [
    ch('Acceptar', 'Prestigi i infraestructures.', `${g.capital} serà seu dels Jocs Olímpics!`, { infra: 4, happiness: 3, growth: 0.3 }, { pat: 8, mit: 4, emp: 6 }, { debt: 1.2, intl: 5 }),
    ch('Rebutjar', 'Prioritzar altres despeses.', 'El govern renuncia a organitzar els Jocs Olímpics', {}, { pat: -3, eco: 2 }),
  ] }) },
  { id: 'independencia', weight: (g) => (g.def.region && !g.regionIndependent ? 0.15 + g.regionTension / 200 : 0), make: (g) => ({ id: 'independencia', title: `🏴 Moviment independentista a ${g.def.region}`, text: `Centenars de milers de persones es manifesten a ${g.def.region} per reclamar un referèndum d'independència.`, choices: [
    ch('Negociar més autogovern', 'Diàleg i competències.', `Diàleg entre el govern i ${g.def.region}`, {}, { min: 6, pat: -8 }, { tension: -15, pc: -10 }),
    ch('Ignorar-ho', '', `El govern ignora les reivindicacions de ${g.def.region}`, {}, { pat: 2, min: -3 }, { tension: 10 }),
    ch('Mà dura', 'Detencions dels líders independentistes.', `Detinguts els líders independentistes de ${g.def.region}`, { freedom: -4 }, { pat: 12, min: -12, jov: -6 }, { tension: 20, unrest: 8, intl: -6 }),
  ] }) },
  { id: 'estudiants', weight: (g) => (g.groups.jov.aff < 35 ? 1.5 : 0.05), make: () => ({ id: 'estudiants', title: '🎓 Protestes estudiantils', text: 'Milers d\'estudiants ocupen universitats i places contra la política del govern.', choices: [
    ch('Diàleg', 'Rebre els portaveus.', 'El govern rep els estudiants i promet canvis', {}, { jov: 8 }, { pc: -8, unrest: -4 }),
    ch('Ignorar-los', '', 'Les protestes estudiantils continuen sense resposta', {}, { jov: -4 }, { unrest: 4 }),
    ch('Desallotjar-los', 'Policia antiavalots.', 'Desallotjament violent de les universitats ocupades', { freedom: -2 }, { jov: -14, pat: 4, mil: 2 }, { unrest: 8 }),
  ] }) },
  { id: 'sequera', weight: () => 0.3, make: () => ({ id: 'sequera', title: '☀️ Sequera extrema', text: 'Els embassaments estan al 15%. Cal prendre mesures.', choices: [
    ch('Restriccions d\'aigua', 'Talls i multes.', 'Restriccions d\'aigua per la sequera', { happiness: -2 }, { rur: -6, mit: -3 }),
    ch('Dessalinitzadores', 'Inversió de 0,4% del PIB.', 'Pla de dessalinitzadores contra la sequera', { env: -1 }, { rur: 4 }, { debt: 0.4 }),
    ch('Prioritzar el camp', 'L\'aigua per a l\'agricultura.', 'L\'aigua de reserva per als pagesos', {}, { rur: 10, mit: -5, eco: -4 }),
  ] }) },
  { id: 'fuga', weight: (g) => (g.slow.edu > 60 && g.unemp > 8 ? 0.5 : 0.08), make: () => ({ id: 'fuga', title: '✈️ Fuga de cervells', text: 'Milers de joves investigadors i enginyers emigren a l\'estranger per falta d\'oportunitats.', choices: [
    ch('Programa de retorn', 'Beques i contractes (0,2% PIB).', 'Pla per retenir el talent jove', { innov: 3 }, { jov: 6 }, { debt: 0.2 }),
    ch('No intervenir', '', 'Continua l\'èxode de joves qualificats', { innov: -3 }, { jov: -5 }),
  ] }) },
  { id: 'multinacional', weight: () => 0.35, make: () => ({ id: 'multinacional', title: '🏭 Una multinacional vol invertir', text: 'Un gegant industrial vol obrir una fàbrica de 10.000 llocs de treball, però demana avantatges fiscals.', choices: [
    ch('Concedir-ho tot', 'Exempcions fiscals i laborals.', 'Acord amb una multinacional: 10.000 llocs de treball', { growth: 0.3, unemp: -0.3 }, { emp: 6, tre: -2 }),
    ch('Exigir condicions', 'Sous dignes i impostos.', 'La multinacional accepta les condicions laborals del govern', { growth: 0.15, unemp: -0.15 }, { tre: 4 }),
    ch('Rebutjar-la', '', 'El govern rebutja la inversió de la multinacional', {}, { emp: -6, eco: 3 }),
  ] }) },
  { id: 'ciberatac', weight: (g) => (Object.values(g.nations).some((n) => n.rel < -30) ? 0.3 : 0), make: (g) => { const r = rivalName(g); return { id: 'ciberatac', title: '💻 Ciberatac', text: `Un ciberatac atribuït a ${r} ha tombat els sistemes dels hospitals i dels bancs.`, choices: [
    ch('Represàlia cibernètica', '', `${g.countryName} respon amb un ciberatac contra ${r}`, {}, { pat: 6, mil: 4 }, { rel: -15 }),
    ch('Sancions diplomàtiques', 'Expulsar diplomàtics.', `Expulsats els diplomàtics de ${r}`, {}, { pat: 3 }, { rel: -10 }),
    ch('Reforçar la ciberdefensa', 'Inversió de 0,2% PIB.', 'Pla de ciberseguretat nacional', { innov: 1 }, { mit: 2 }, { debt: 0.2 }),
  ] }; } },
  { id: 'bombolla', weight: (g) => (g.policies.regulacio_financera === 0 ? 0.4 : 0.1), make: () => ({ id: 'bombolla', title: '🏠 Bombolla immobiliària', text: 'Els preus de l\'habitatge han pujat un 40% en dos anys. Els experts alerten d\'una bombolla.', choices: [
    ch('Punxar-la ara', 'Restriccions al crèdit hipotecari.', 'Mesures per refredar el mercat immobiliari', { growth: -0.4 }, { jov: 4, emp: -4 }, { shock: -0.5 }),
    ch('Deixar-la créixer', 'L\'economia va bé...', 'El mercat immobiliari continua disparat', { growth: 0.4 }, { jov: -6, emp: 4 }, {}),
  ] }) },
  { id: 'cop', weight: (g) => (g.groups.mil.aff < 30 ? 1.8 : 0), make: () => ({ id: 'cop', title: '🪖 Rumors de cop d\'estat', text: 'Els serveis d\'intel·ligència alerten que alguns generals conspiren contra el govern.', choices: [
    ch('Apujar el sou militar', 'Comprar lleialtats (0,3% PIB).', 'Augment salarial per a les forces armades', {}, { mil: 15 }, { debt: 0.3 }),
    ch('Purgar la cúpula', 'Destituir els generals sospitosos.', 'Purga a la cúpula militar', { military: -6 }, { mil: -5, pat: -3 }, { stab: -3 }),
    ch('Ignorar-ho', '', 'El govern minimitza els rumors de cop', {}, {}, {}),
  ] }) },
  { id: 'ciencia', weight: (g) => (g.budget.recerca > g.budget0.recerca * 1.3 ? 0.5 : 0.05), make: (g) => ({ id: 'ciencia', title: '🔬 Gran descobriment científic', text: `Investigadors de ${g.countryName} aconsegueixen un avenç històric en medicina.`, choices: [
    ch('Patentar i exportar', '', 'El descobriment científic s\'exportarà a tot el món', { growth: 0.3, innov: 3 }, { emp: 4, mit: 2 }, { intl: 4 }),
    ch('Alliberar-lo gratuïtament', 'Per al bé de la humanitat.', 'El país allibera el seu descobriment mèdic per a tothom', { health: 2 }, { jov: 4 }, { intl: 10 }),
  ] }) },
  { id: 'aliments', weight: () => 0.25, make: () => ({ id: 'aliments', title: '🛒 Pujada del preu dels aliments', text: 'Una mala collita mundial dispara el preu del pa i la llet.', choices: [
    ch('Rebaixar l\'IVA dels aliments', '', 'IVA zero per als aliments bàsics', { revenue: -0.3 }, { tre: 5, jub: 4 }, { infl: -0.5 }),
    ch('Xecs alimentaris', 'Ajuda directa a famílies pobres (0,2% PIB).', 'Xecs alimentaris per a les famílies vulnerables', {}, { tre: 4, min: 4 }, { debt: 0.2 }),
    ch('No fer res', '', 'Els aliments continuen pujant', {}, { tre: -5, jub: -4 }, { infl: 1.5 }),
  ] }) },
  { id: 'metges', weight: (g) => (g.budget.sanitat < g.budget0.sanitat * 0.85 ? 2 : 0), make: () => ({ id: 'metges', title: '🩺 Vaga de sanitaris', text: 'Metges i infermeres fan vaga per les retallades. Les llistes d\'espera es disparen.', choices: [
    ch('Revertir retallades', 'Tornar el pressupost al nivell inicial.', 'El govern cedeix i recupera el pressupost sanitari', {}, { jub: 6, mit: 4 }, { pc: -10 }),
    ch('Mantenir-se ferm', '', 'Continua la vaga sanitària', { health: -3 }, { jub: -8, mit: -5 }, { unrest: 6 }),
  ] }) },
  { id: 'escandol_personal', weight: () => 0.12, make: (g) => ({ id: 'escandol_personal', title: '📸 Escàndol personal', text: `Unes fotos de ${g.playerName} de vacances en un iot de luxe d'un empresari polèmic circulen per les xarxes.`, choices: [
    ch('Demanar perdó', '', `${g.playerName} demana perdó per les vacances polèmiques`, {}, { mit: -2 }, { pc: -5 }),
    ch('Contraatacar', 'Acusar els mitjans de manipulació.', `${g.playerName} acusa la premsa de campanya de desprestigi`, {}, { mit: -5, jov: -5, pat: 3 }, {}),
  ] }) },
  // ── esdeveniments a l'oposició
  { id: 'pacte_oferta', opp: true, weight: (g) => (g.parties.some((p) => p.id !== g.playerParty && !g.govParties.includes(p.id) && !g.oppAllies.includes(p.id)) ? 0.6 : 0), make: (g) => {
    const cands = g.parties.filter((p) => p.id !== g.playerParty && !g.govParties.includes(p.id) && !g.oppAllies.includes(p.id));
    const p = pick(cands);
    return { id: 'pacte_oferta:' + p.id, title: '🤝 Oferta de pacte', text: `${p.name} (${p.short}) us proposa un pacte per presentar-vos junts contra el govern.`, choices: [
      ch('Acceptar el pacte', 'Formareu bloc per a la moció de censura i les eleccions.', `${g.playerName} i ${p.name} segellen un pacte d'oposició`, {}, {}, { mom: 2 }),
      ch('Rebutjar-lo', '', `${g.playerName} rebutja pactar amb ${p.name}`, {}, {}, {}),
    ] };
  } },
  { id: 'escandol_partit', opp: true, weight: () => 0.25, make: (g) => ({ id: 'escandol_partit', title: '📰 Escàndol al teu partit', text: `Un diputat del teu partit està investigat per finançament il·legal.`, choices: [
    ch('Expulsar-lo', '', `${g.playerName} expulsa el diputat investigat`, {}, {}, { mom: 1, pc: -5 }),
    ch('Defensar-lo', '', `${g.playerName} defensa el diputat investigat`, {}, {}, { mom: -6 }),
  ] }) },
];

export function pickEvent(g: Game): GameEvent | null {
  const cands = EVENTS.filter((e) => (g.inPower ? !e.opp : e.opp) && (g.eventCooldown[e.id] ?? -999) < g.month - 30);
  const ws = cands.map((e) => Math.max(0, e.weight(g)));
  const tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (let i = 0; i < cands.length; i++) {
    r -= ws[i];
    if (r <= 0) { g.eventCooldown[cands[i].id] = g.month; return cands[i].make(g); }
  }
  return null;
}

/** Quan no governes, el govern de la IA decideix pel seu compte */
export function pickAiEvent(g: Game): { ev: GameEvent; choice: number } | null {
  const cands = EVENTS.filter((e) => !e.opp && e.id !== 'escandol_personal' && e.id !== 'filtracio' && (g.eventCooldown[e.id] ?? -999) < g.month - 30);
  const ws = cands.map((e) => Math.max(0, e.weight(g)));
  const tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (let i = 0; i < cands.length; i++) {
    r -= ws[i];
    if (r <= 0) {
      g.eventCooldown[cands[i].id] = g.month;
      const ev = cands[i].make(g);
      return { ev, choice: Math.floor(Math.random() * ev.choices.length) };
    }
  }
  return null;
}
