import type { CountryDef, Effects, GroupFx, PolicyDef, PolicyOption } from '../engine/types';

const o = (label: string, desc: string, e: number, s: number, fx: Effects = {}, g: GroupFx = {}): PolicyOption =>
  ({ label, desc, ideo: { e, s }, fx, g });

export const POLICY_CATS: Record<string, string> = {
  economia: 'Economia', treball: 'Treball', educacio: 'Educació i ciència', sanitat: 'Sanitat i societat',
  drets: 'Drets i llibertats', seguretat: 'Seguretat i justícia', exercit: 'Exèrcit', medi: 'Medi ambient i energia', politica: 'Institucions',
};

export const POLICIES: PolicyDef[] = [
  // ───────────── ECONOMIA
  { id: 'regulacio_mercat', cat: 'economia', name: 'Regulació dels mercats', desc: 'Quant intervé l\'estat en preus, competència i activitat empresarial.', options: [
    o('Desregulació total', 'Mercat sense gairebé normes. Creixement i desigualtat.', 90, 0, { growth: 0.8, gini: 4, env: -8, corruption: 3, unemp: -1, innov: 4, poverty: 3 }, { emp: 15, mit: 2, tre: -10, eco: -8, jov: -3 }),
    o('Regulació lleugera', 'Normes bàsiques i molta llibertat empresarial.', 50, 0, { growth: 0.4, gini: 2, env: -3, unemp: -0.5, innov: 2, poverty: 1 }, { emp: 8, tre: -4, eco: -3 }),
    o('Regulació moderada', 'Model europeu estàndard.', 0, 0),
    o('Regulació estricta', 'Control de preus, competència i condicions.', -50, 0, { growth: -0.4, gini: -2, env: 4, unemp: 0.6, innov: -2, corruption: 2 }, { emp: -10, tre: 5, eco: 4 }),
    o('Economia planificada', 'L\'estat decideix què es produeix i a quin preu.', -100, 40, { growth: -1.5, gini: -6, unemp: -2, innov: -10, corruption: 12, infl: 2, freedom: -10, poverty: 2 }, { emp: -30, tre: 6, mit: -10, jov: -5 }),
  ] },
  { id: 'empreses_publiques', cat: 'economia', name: 'Empreses públiques', desc: 'Propietat estatal d\'energia, banca, transport i grans indústries.', options: [
    o('Privatitzar-ho tot', 'Vendre totes les empreses públiques.', 80, 0, { growth: 0.3, gini: 2, revenue: -0.5 }, { emp: 12, tre: -8 }),
    o('Economia mixta', 'Algunes empreses públiques en serveis bàsics.', 20, 0, { revenue: 1 }),
    o('Nacionalitzar sectors estratègics', 'Energia, banca i telecomunicacions en mans de l\'estat.', -50, 10, { growth: -0.3, gini: -1.5, corruption: 3, revenue: 4 }, { emp: -15, tre: 8, pat: 4 }),
    o('Estatalitzar l\'economia', 'Pràcticament totes les empreses són de l\'estat.', -100, 30, { growth: -1.5, innov: -8, corruption: 10, gini: -4, unemp: -2, revenue: 25 }, { emp: -35, tre: 5, mit: -10 }),
  ] },
  { id: 'banc_central', cat: 'economia', name: 'Banc central', desc: 'Qui controla la moneda i els tipus d\'interès.', options: [
    o('Independent', 'Objectiu d\'inflació del 2%. Credibilitat als mercats.', 30, 0, { intl: 3 }, { emp: 3 }),
    o('Influenciat pel govern', 'El govern pressiona per abaratir el crèdit.', 0, 20, { infl: 1.5, growth: 0.1, intl: -3 }, { emp: -3 }),
    o('Imprimir diners per pagar el dèficit', 'Financiació monetària: més inflació, menys interessos.', -40, 30, { infl: 6, growth: 0.3, intl: -10 }, { emp: -10, mit: -6, jub: -8 }),
  ] },
  { id: 'regulacio_financera', cat: 'economia', name: 'Regulació financera', desc: 'Control sobre bancs i especulació. Poca regulació augmenta el risc de crisi.', options: [
    o('Mínima', 'Crèdit fàcil i bombolles possibles.', 70, 0, { growth: 0.3 }, { emp: 8 }),
    o('Moderada', 'Supervisió bancària estàndard.', 10, 0),
    o('Estricta', 'Capital alt, límits a l\'especulació.', -40, 0, { growth: -0.2, stability: 2 }, { emp: -6, tre: 2 }),
  ] },
  { id: 'comerc', cat: 'economia', name: 'Política comercial', desc: 'Obertura al comerç internacional.', options: [
    o('Lliure comerç total', 'Sense barreres. Preus baixos, competència dura.', 70, -10, { growth: 0.4, unemp: 0.3, infl: -0.5, innov: 2 }, { emp: 8, tre: -3, rur: -4, pat: -4 }),
    o('Oberta amb salvaguardes', 'Acords comercials amb protecció puntual.', 20, 0),
    o('Proteccionisme', 'Protegir la indústria nacional.', -10, 40, { growth: -0.4, infl: 0.8, unemp: -0.2, intl: -3 }, { emp: -5, tre: 3, rur: 4, pat: 6 }),
    o('Autarquia', 'Autosuficiència. Gairebé no s\'importa res.', -60, 70, { growth: -2, infl: 3, innov: -8, intl: -10 }, { emp: -15, pat: 8, mit: -8 }),
  ] },
  { id: 'habitatge', cat: 'economia', name: 'Habitatge', desc: 'Accés a l\'habitatge i mercat del lloguer.', options: [
    o('Mercat lliure', 'Sense intervenció.', 70, 0, { gini: 1, poverty: 1, happiness: -2 }, { emp: 5, jov: -6 }),
    o('Ajuts a la compra i al lloguer', 'Subvencions a joves i famílies.', 20, 0, { spend: 0.2 }, { jov: 2 }),
    o('Control de lloguers', 'Topall als preus del lloguer.', -40, 0, { growth: -0.05, poverty: -1, gini: -0.5, happiness: 1 }, { jov: 8, emp: -6, mit: -2 }),
    o('Parc públic massiu', 'L\'estat construeix centenars de milers de pisos.', -70, 0, { spend: 1.0, poverty: -2.5, gini: -1.5, happiness: 3, unemp: -0.3 }, { jov: 12, tre: 6, emp: -5 }),
  ] },
  { id: 'salari_minim', cat: 'economia', name: 'Salari mínim', desc: 'Sou mínim legal respecte al salari mitjà.', options: [
    o('Sense salari mínim', 'El mercat (o la negociació col·lectiva) decideix.', 90, 0, { unemp: -1, gini: 3, poverty: 3 }, { emp: 10, tre: -12, jov: -4 }),
    o('Baix (30%)', 'Salari mínim simbòlic.', 40, 0, { unemp: -0.4, gini: 1, poverty: 1.5 }, { emp: 4, tre: -5 }),
    o('Mitjà (50%)', 'Nivell habitual.', 0, 0),
    o('Alt (60%)', 'Recomanació europea.', -40, 0, { unemp: 0.6, gini: -1.5, poverty: -1.5, infl: 0.3 }, { tre: 8, jov: 3, emp: -8 }),
    o('Molt alt (75%)', 'Augment dràstic dels sous més baixos.', -80, 0, { unemp: 2.5, gini: -2.5, poverty: -1, infl: 1 }, { tre: 10, emp: -18, mit: -3 }),
  ] },
  // ───────────── TREBALL
  { id: 'regulacio_laboral', cat: 'treball', name: 'Mercat laboral', desc: 'Protecció dels treballadors davant l\'acomiadament.', options: [
    o('Acomiadament lliure', 'Contractació i acomiadament sense cost.', 80, 0, { unemp: -1, gini: 2, growth: 0.2, happiness: -2 }, { emp: 12, tre: -12 }),
    o('Flexible', 'Indemnitzacions baixes.', 40, 0, { unemp: -0.4, gini: 1, growth: 0.1 }, { emp: 5, tre: -5 }),
    o('Equilibrat', 'Model mixt.', 0, 0),
    o('Molt protector', 'Acomiadar és car i difícil.', -50, 0, { unemp: 1, gini: -1.5, growth: -0.15, happiness: 1 }, { tre: 8, emp: -10 }),
  ] },
  { id: 'sindicats', cat: 'treball', name: 'Sindicats', desc: 'Drets sindicals i de vaga.', options: [
    o('Prohibits', 'Cap sindicat independent ni dret de vaga.', 60, 70, { freedom: -8, gini: 3, unrest: -5, growth: 0.1, intl: -5 }, { emp: 8, tre: -18 }),
    o('Restringits', 'Sindicat oficial o vagues molt limitades.', 40, 30, { freedom: -3, gini: 1.5 }, { emp: 4, tre: -7 }),
    o('Lliures', 'Llibertat sindical i dret de vaga.', 0, 0),
    o('Cogestió a les empreses', 'Els treballadors seuen als consells d\'administració.', -50, -10, { gini: -2, innov: 1, happiness: 1 }, { tre: 8, emp: -8 }),
  ] },
  { id: 'jornada', cat: 'treball', name: 'Jornada laboral', desc: 'Hores de treball setmanals màximes.', options: [
    o('48 hores', 'Jornades llargues.', 70, 0, { growth: 0.3, happiness: -4, health: -2 }, { emp: 8, tre: -10, jov: -6 }),
    o('40 hores', 'Estàndard.', 20, 0),
    o('37,5 hores', 'Reducció moderada.', -20, 0, { growth: -0.1, happiness: 2 }, { tre: 4, jov: 3, emp: -4 }),
    o('32 hores (4 dies)', 'Setmana de quatre dies sense reduir el sou.', -60, -20, { growth: -0.6, happiness: 6, unemp: -0.5, health: 1 }, { tre: 10, jov: 10, emp: -14 }),
  ] },
  { id: 'renda_basica', cat: 'treball', name: 'Renda mínima', desc: 'Ingressos garantits per a la població.', options: [
    o('Cap ajut', 'Sense xarxa de seguretat.', 80, 20, { poverty: 3, gini: 2, crime: 2 }, { tre: -6, min: -6, emp: 3 }),
    o('Ingrés mínim condicionat', 'Ajuda a qui no té ingressos.', 0, 0, { spend: 0.4 }),
    o('Renda bàsica universal', 'Un sou per a tothom, sense condicions. Molt cara.', -80, -30, { spend: 7.4, poverty: -10, gini: -6, unemp: 0.8, happiness: 6, infl: 0.5, crime: -3 }, { tre: 12, jov: 12, min: 10, emp: -12, mit: -6 }),
  ] },
  { id: 'edat_jubilacio', cat: 'treball', name: 'Edat de jubilació', desc: 'Afecta directament la despesa en pensions.', options: [
    o('60 anys', 'Jubilació primerenca.', -60, 0, { spend: 3, unemp: -0.3, growth: -0.3 }, { jub: 10, tre: 6, jov: -5, emp: -6 }),
    o('65 anys', 'Clàssica.', -10, 0, { spend: 1.2, growth: -0.1 }, { jub: 4, tre: 2, jov: -2 }),
    o('67 anys', 'Retard progressiu.', 30, 0),
    o('70 anys', 'Treballar més anys per sostenir el sistema.', 70, 0, { spend: -1.5, growth: 0.2, unemp: 0.2, happiness: -2 }, { jub: -10, tre: -10, emp: 5, jov: 2 }),
  ] },
  // ───────────── EDUCACIÓ
  { id: 'model_educatiu', cat: 'educacio', name: 'Model educatiu', desc: 'Qui presta l\'ensenyament obligatori.', options: [
    o('Majoritàriament privat', 'Xecs escolars i escoles privades.', 70, 10, { gini: 3, edu: -4, innov: 1 }, { emp: 5, mit: 2, tre: -6, jov: -4 }),
    o('Mixt (públic i concertat)', 'Xarxa pública i concertada.', 20, 20, {}, { rel: 2 }),
    o('Públic universal i laic', 'Escola pública per a tothom.', -50, -40, { gini: -2, edu: 3, spend: 0.4 }, { tre: 5, jov: 3, rel: -6 }),
  ] },
  { id: 'universitat', cat: 'educacio', name: 'Universitat', desc: 'Cost dels estudis superiors.', options: [
    o('Matrícules altes', 'L\'estudiant paga el cost real.', 70, 0, { gini: 2, edu: -3, innov: 1 }, { jov: -8, emp: 2 }),
    o('Taxes moderades', 'Preus públics i beques.', 0, 0),
    o('Gratuïta', 'Universitat pública sense taxes.', -60, -10, { spend: 0.5, gini: -1.5, edu: 4, innov: 2 }, { jov: 10, mit: 3 }),
  ] },
  { id: 'curriculum', cat: 'educacio', name: 'Currículum escolar', desc: 'Què s\'ensenya a les escoles.', options: [
    o('Tradicional i religiós', 'Valors religiosos i tradició.', 10, 80, { edu: -4, innov: -4 }, { rel: 10, pat: 4, jov: -6, min: -5 }),
    o('Equilibrat', 'Currículum estàndard.', 0, 0),
    o('Científic i tecnològic', 'Prioritat a ciències, enginyeria i idiomes.', 10, -20, { edu: 2, innov: 5 }, { jov: 4, emp: 3, rel: -3 }),
    o('Adoctrinament patriòtic', 'Història oficial i lleialtat al règim.', 0, 100, { edu: -6, innov: -6, freedom: -4, stability: 3 }, { pat: 8, mil: 3, jov: -10, min: -8 }),
  ] },
  // ───────────── SANITAT I SOCIETAT
  { id: 'sistema_sanitari', cat: 'sanitat', name: 'Sistema sanitari', desc: 'Com s\'organitza l\'atenció sanitària.', options: [
    o('Privat amb assegurances', 'Cadascú paga la seva assegurança.', 70, 0, { health: -4, gini: 3, poverty: 2, innov: 1 }, { emp: 6, tre: -8, jub: -6 }),
    o('Mixt', 'Cobertura pública parcial.', 20, 0),
    o('Públic universal', 'Sanitat gratuïta per a tothom.', -40, 0, { health: 3, gini: -2, poverty: -1.5, spend: 0.8 }, { tre: 6, jub: 5, min: 4, emp: -4 }),
  ] },
  { id: 'avortament', cat: 'sanitat', name: 'Avortament', desc: 'Interrupció voluntària de l\'embaràs.', options: [
    o('Prohibit', 'Il·legal en tots els casos.', 0, 90, { health: -2, happiness: -2, freedom: -3 }, { rel: 12, pat: 4, jov: -12, eco: -5, min: -4 }),
    o('Restringit', 'Només en casos excepcionals.', 0, 40, {}, { rel: 4, jov: -4 }),
    o('Lliure i garantit', 'Dret garantit a la sanitat pública.', 0, -60, { freedom: 2, health: 1 }, { jov: 6, eco: 3, rel: -10, pat: -4 }),
  ] },
  { id: 'eutanasia', cat: 'sanitat', name: 'Eutanàsia', desc: 'Mort digna assistida.', options: [
    o('Prohibida', '', 0, 50, {}, { rel: 3, jov: -2 }),
    o('Legal i regulada', 'Amb garanties mèdiques.', 0, -50, { freedom: 1 }, { rel: -6, jov: 3, eco: 2, jub: 1 }),
  ] },
  { id: 'drogues', cat: 'sanitat', name: 'Política de drogues', desc: 'Tractament legal de les drogues.', options: [
    o('Prohibició dura', 'Presó per consum i tràfic.', 0, 70, { crime: 3, freedom: -2, health: -1 }, { pat: 4, rel: 4, jov: -6, mil: 2 }),
    o('Prohibició amb tractament', 'Il·legals, però amb programes sanitaris.', 0, 20),
    o('Despenalització', 'El consum no és delicte.', 0, -40, { crime: -2, health: 1, freedom: 1 }, { jov: 4, rel: -4 }),
    o('Legalització regulada', 'Venda legal de cànnabis amb impostos.', 10, -70, { crime: -4, revenue: 0.2, freedom: 2, health: -0.5 }, { jov: 10, rel: -10, pat: -5 }),
  ] },
  { id: 'natalitat', cat: 'sanitat', name: 'Polítiques familiars', desc: 'Suport a famílies, natalitat i conciliació.', options: [
    o('Cap', 'Les famílies s\'espavilen soles.', 60, 0, { poverty: 1 }, { jov: -2, rel: -2 }),
    o('Ajuts bàsics', 'Permisos i petites prestacions.', 0, 0, { spend: 0.3 }),
    o('Gran inversió en famílies', 'Escoles bressol gratuïtes, permisos llargs i xecs per fill.', -30, 20, { spend: 1.5, poverty: -1.5, happiness: 2, unemp: -0.2 }, { rel: 6, mit: 5, jov: 6, tre: 3 }),
  ] },
  // ───────────── DRETS
  { id: 'matrimoni', cat: 'drets', name: 'Parelles del mateix sexe', desc: 'Drets de les persones LGTBI.', options: [
    o('Criminalitzades', 'L\'homosexualitat és delicte.', 0, 100, { freedom: -8, happiness: -2, intl: -8 }, { rel: 10, pat: 5, jov: -15, min: -10, eco: -6 }),
    o('No reconegudes', 'Sense cap reconeixement legal.', 0, 60, { freedom: -3 }, { rel: 5, jov: -6, min: -3 }),
    o('Unions civils', 'Reconeixement parcial.', 0, 10),
    o('Matrimoni igualitari', 'Plena igualtat de drets.', 0, -60, { freedom: 2, intl: 2 }, { jov: 6, eco: 3, min: 3, rel: -8, pat: -4 }),
  ] },
  { id: 'premsa', cat: 'drets', name: 'Llibertat de premsa', desc: 'Determina també com et tracten les notícies.', options: [
    o('Plena llibertat', 'Premsa independent i crítica.', 0, -30, { freedom: 4, corruption: -4, intl: 3 }, { jov: 2, mit: 2 }),
    o('Pressions i mitjans afins', 'Publicitat institucional i pressions als crítics.', 0, 30, { freedom: -6, corruption: 3, intl: -3 }, { jov: -4, mit: -2 }),
    o('Censura estatal', 'Els mitjans publiquen el que vol el govern.', 0, 90, { freedom: -20, corruption: 10, innov: -4, unrest: -8, stability: 5, intl: -15 }, { jov: -15, mit: -10, min: -8, pat: 4, mil: 3 }),
  ] },
  { id: 'reunio', cat: 'drets', name: 'Dret de manifestació', desc: 'Llibertat de protesta i reunió.', options: [
    o('Ple', 'Qualsevol pot manifestar-se.', 0, -30, { freedom: 3 }, { jov: 3 }),
    o('Restringit', 'Multes i autoritzacions prèvies.', 0, 40, { freedom: -6, unrest: -6 }, { jov: -6, min: -4, pat: 3, mil: 3 }),
    o('Prohibit', 'Les protestes es dissolen per la força.', 0, 90, { freedom: -15, unrest: -15, stability: -3, intl: -10 }, { jov: -15, tre: -8, min: -8, mil: 4 }),
  ] },
  { id: 'vigilancia', cat: 'drets', name: 'Vigilància estatal', desc: 'Control de comunicacions i càmeres.', options: [
    o('Mínima', 'Privacitat garantida.', 0, -50, { crime: 2, freedom: 3 }, { jov: 4 }),
    o('Moderada', 'Amb ordre judicial.', 0, 10),
    o('Vigilància massiva', 'Reconeixement facial i escoltes generalitzades.', 0, 90, { crime: -6, freedom: -14, unrest: -6, innov: -2, spend: 0.3, intl: -6 }, { jov: -12, min: -10, mit: -5, mil: 6, pat: 4 }),
  ] },
  { id: 'igualtat', cat: 'drets', name: 'Igualtat de gènere', desc: 'Polítiques d\'igualtat entre homes i dones.', options: [
    o('Sense polítiques', '', 0, 70, { gini: 1, growth: -0.2, happiness: -1 }, { rel: 4, jov: -6 }),
    o('Lleis d\'igualtat', 'Igualtat formal i contra la violència masclista.', 0, 0),
    o('Quotes i paritat obligatòria', 'Paritat a empreses i institucions.', -10, -50, { gini: -1, growth: 0.1, happiness: 1 }, { jov: 5, eco: 2, emp: -3, rel: -4, pat: -3 }),
  ] },
  { id: 'religio', cat: 'drets', name: 'Religió i estat', desc: 'Paper de la religió a les institucions.', options: [
    o('Laïcisme estricte', 'Religió fora de l\'espai públic.', 0, -60, {}, { rel: -15, jov: 4, eco: 2 }),
    o('Estat aconfessional', 'Neutralitat amb acords amb confessions.', 0, -10),
    o('Religió oficial', 'Una religió d\'estat privilegiada.', 0, 60, { freedom: -4 }, { rel: 10, min: -6, jov: -4 }),
    o('Teocràcia', 'Lleis religioses i clergues al poder.', 0, 100, { freedom: -18, innov: -6, corruption: 5, stability: 2, happiness: -3, intl: -10 }, { rel: 20, jov: -15, min: -15, mit: -6 }),
  ] },
  { id: 'immigracio', cat: 'drets', name: 'Immigració', desc: 'Entrada de persones estrangeres.', options: [
    o('Fronteres obertes', 'Tothom pot venir a treballar.', 20, -70, { growth: 0.4, migration: 1.5, unemp: 0.3, crime: 1 }, { min: 12, emp: 6, pat: -15, tre: -4, rur: -4 }),
    o('Selectiva i ordenada', 'Quotes i permisos de treball.', 0, 0),
    o('Restrictiva', 'Poques entrades i més deportacions.', 0, 60, { growth: -0.2, migration: -0.4 }, { pat: 8, min: -8, emp: -3, rur: 3 }),
    o('Fronteres tancades', 'Immigració zero i murs.', 0, 90, { growth: -0.5, migration: -0.8, innov: -2, intl: -6 }, { pat: 14, min: -15, emp: -8 }),
  ] },
  { id: 'minories', cat: 'drets', name: 'Minories ètniques', desc: 'Drets de les minories nacionals i ètniques.', options: [
    o('Persecució', 'Repressió de les minories.', 0, 100, { freedom: -12, unrest: 5, intl: -12 }, { min: -25, pat: 8 }),
    o('Assimilació forçada', 'Prohibició de llengües i cultures minoritàries.', 0, 70, { freedom: -5 }, { min: -10, pat: 5 }),
    o('Igualtat legal', 'Mateixos drets per a tothom.', 0, 0),
    o('Discriminació positiva', 'Quotes i ajuts per compensar desigualtats.', -30, -50, { gini: -1 }, { min: 10, pat: -5, mit: -2 }),
  ] },
  // ───────────── SEGURETAT
  { id: 'pena_mort', cat: 'seguretat', name: 'Pena de mort', desc: '', options: [
    o('Abolida', '', 0, -40, { intl: 2 }, { jov: 2 }),
    o('Legal per a delictes greus', '', 0, 70, { crime: -1, intl: -6, freedom: -3 }, { pat: 6, rel: 3, jov: -5, min: -3 }),
  ] },
  { id: 'armes', cat: 'seguretat', name: 'Armes de foc', desc: 'Accés de la població civil a les armes.', options: [
    o('Prohibides als civils', '', 0, -20, { crime: -3, freedom: -1 }, { rur: -6, pat: -4, mit: 1 }),
    o('Llicència estricta', '', 0, 10),
    o('Permissives', 'Dret a portar armes.', 30, 60, { crime: 6, freedom: 1 }, { rur: 6, pat: 4, jov: -2 }),
  ] },
  { id: 'justicia', cat: 'seguretat', name: 'Poder judicial', desc: 'Independència dels jutges.', options: [
    o('Independent', 'Separació de poders.', 0, -20, { corruption: -4, intl: 2, growth: 0.1 }),
    o('Influenciat pel govern', 'El govern nomena els jutges clau.', 0, 40, { corruption: 6, freedom: -5, intl: -3 }, { mit: -3 }),
    o('Controlat pel govern', 'Els tribunals obeeixen el poder.', 0, 90, { corruption: 14, freedom: -14, intl: -8, stability: 2 }, { mit: -6, emp: -5, jov: -5 }),
  ] },
  { id: 'policia', cat: 'seguretat', name: 'Model policial', desc: '', options: [
    o('Comunitària i preventiva', '', -10, -40, { crime: -1, freedom: 2 }, { min: 4, jov: 2, mil: -4 }),
    o('Estàndard', '', 0, 0),
    o('Militaritzada i de mà dura', '', 10, 70, { crime: -4, freedom: -6, unrest: -4, spend: 0.2 }, { pat: 6, mil: 6, min: -8, jov: -6 }),
  ] },
  { id: 'presons', cat: 'seguretat', name: 'Sistema penitenciari', desc: '', options: [
    o('Rehabilitació', 'Reinserció i formació.', -10, -50, { crime: -2, spend: 0.1 }, { pat: -3, mit: -1 }),
    o('Mixt', '', 0, 0),
    o('Punitiu', 'Penes llargues i presons dures.', 10, 60, { crime: -1, spend: 0.2, freedom: -2 }, { pat: 5, min: -3 }),
  ] },
  { id: 'corrupcio', cat: 'seguretat', name: 'Lluita contra la corrupció', desc: '', options: [
    o('Opacitat', 'Ningú no mira els comptes.', 0, 60, { corruption: 10, growth: -0.2, intl: -4 }, { mit: -6, jov: -4, emp: 3 }),
    o('Normal', '', 0, 0),
    o('Transparència total', 'Fiscalia anticorrupció i comptes oberts.', 0, -30, { corruption: -10, growth: 0.15, spend: 0.1, intl: 3 }, { mit: 6, jov: 4 }),
  ] },
  // ───────────── EXÈRCIT
  { id: 'servei_militar', cat: 'exercit', name: 'Servei militar', desc: '', options: [
    o('Exèrcit professional', '', 10, -10),
    o('Voluntari amb incentius', 'Servei civil o militar voluntari.', 0, 20, { military: 5, spend: 0.1 }, { jov: -1, mil: 2 }),
    o('Obligatori', 'Tots els joves fan el servei.', 0, 70, { military: 15, unemp: -0.8, growth: -0.15, freedom: -3 }, { jov: -18, pat: 8, mil: 8 }),
  ] },
  { id: 'doctrina', cat: 'exercit', name: 'Doctrina militar', desc: 'Com es relaciona el país amb la força militar.', options: [
    o('Pacifista', 'Exèrcit mínim i neutralitat.', -20, -60, { military: -20, intl: 4 }, { eco: 6, jov: 3, mil: -15, pat: -10 }),
    o('Defensiva', '', 0, 0),
    o('Intervencionista', 'Missions a l\'estranger.', 10, 50, { military: 5, intl: -2 }, { pat: 5, mil: 5, jov: -3, eco: -3 }),
    o('Expansionista', 'La força com a eina de política exterior.', 10, 90, { military: 10, intl: -12, stability: -2 }, { pat: 10, mil: 8, jov: -8, eco: -6, min: -4 }),
  ] },
  { id: 'industria_defensa', cat: 'exercit', name: 'Indústria de defensa', desc: '', options: [
    o('Importar armament', 'Comprar a l\'estranger.', 30, 0, { military: -3, growth: -0.05 }),
    o('Mixta', '', 0, 0),
    o('Pròpia i exportadora', 'Gran indústria armamentística nacional.', 0, 30, { military: 6, innov: 3, growth: 0.15, spend: 0.2, intl: -2 }, { mil: 5, eco: -4 }),
  ] },
  { id: 'nuclear', cat: 'exercit', name: 'Armes nuclears', desc: 'Un programa nuclear triga 3 anys i provoca sancions.', options: [
    o('Sense armes nuclears', 'Desarmament i no-proliferació.', 0, -30, { intl: 3 }, { eco: 4 }),
    o('Programa nuclear militar', 'Desenvolupar la bomba en secret.', 0, 70, { spend: 0.5, intl: -25 }, { pat: 6, eco: -10 }),
    o('Arsenal nuclear', 'Dissuasió nuclear operativa.', 0, 50, { military: 15, spend: 0.3, intl: -2 }, { pat: 4, eco: -5 }),
  ] },
  // ───────────── MEDI AMBIENT
  { id: 'energia', cat: 'medi', name: 'Model energètic', desc: '', options: [
    o('Combustibles fòssils', 'Carbó, petroli i gas.', 40, 30, { env: -10, growth: 0.2, infl: -0.3 }, { rur: 4, emp: 4, eco: -15, jov: -5 }),
    o('Mix tradicional', '', 10, 0),
    o('Renovables i nuclear', '', -10, 0, { env: 6, growth: -0.1, spend: 0.3, innov: 2 }, { eco: 6, rur: -2 }),
    o('100% renovables', 'Transició accelerada.', -40, -30, { env: 12, growth: -0.3, spend: 0.8, infl: 0.5, innov: 3 }, { eco: 15, jov: 5, rur: -5, emp: -5 }),
  ] },
  { id: 'regulacio_ambiental', cat: 'medi', name: 'Regulació ambiental', desc: '', options: [
    o('Mínima', 'Les empreses contaminen lliurement.', 60, 0, { env: -8, growth: 0.2, health: -2 }, { emp: 6, eco: -12, rur: 2 }),
    o('Moderada', '', 0, 0),
    o('Estricta', 'Límits d\'emissions i protecció d\'espais.', -40, -10, { env: 8, growth: -0.25, health: 1.5 }, { eco: 10, emp: -6, rur: -4 }),
  ] },
  { id: 'transport', cat: 'medi', name: 'Transport', desc: '', options: [
    o('Centrat en el cotxe', 'Autopistes i aparcaments.', 40, 10, { env: -3 }, { rur: 3, eco: -4 }),
    o('Mixt', '', 0, 0),
    o('Transport públic gratuït', '', -50, -20, { env: 5, spend: 0.4, happiness: 2, gini: -0.5 }, { jov: 5, eco: 6, tre: 4, rur: -2 }),
  ] },
  { id: 'agricultura', cat: 'medi', name: 'Sector agrari', desc: '', options: [
    o('Sense subvencions', '', 70, 0, { growth: 0.05 }, { rur: -15 }),
    o('Subvencions moderades', '', 0, 0, { spend: 0.3 }),
    o('Grans subvencions', 'Protecció del camp nacional.', -20, 30, { spend: 0.9, infl: 0.2 }, { rur: 12, eco: -2 }),
    o('Agricultura ecològica subvencionada', '', -30, -30, { spend: 0.9, env: 4, infl: 0.3 }, { eco: 8, rur: 4 }),
  ] },
  // ───────────── INSTITUCIONS
  { id: 'eleccions', cat: 'politica', name: 'Eleccions', desc: 'Sense eleccions lliures no et poden fer fora a les urnes... però sí al carrer.', options: [
    o('Lliures i justes', '', 0, -20, { freedom: 4, stability: 2, intl: 4 }),
    o('Amb irregularitats', 'Frau, control dels mitjans i candidats vetats.', 0, 50, { freedom: -8, corruption: 5, intl: -6 }, { jov: -6, mit: -4 }),
    o('Suspeses indefinidament', 'Estat d\'excepció.', 0, 85, { freedom: -20, unrest: 15, stability: -8, intl: -20 }, { jov: -15, mit: -12, tre: -8, min: -10, pat: 2, mil: 2 }),
    o('Sense eleccions (règim de partit únic)', '', 0, 100, { freedom: -25, intl: -15, stability: 4 }, { jov: -10, mit: -8 }),
  ] },
  { id: 'oposicio', cat: 'politica', name: 'Partits d\'oposició', desc: '', options: [
    o('Legals i protegits', '', 0, -20, { freedom: 3 }),
    o('Assetjats', 'Inhabilitacions i causes judicials.', 0, 60, { freedom: -8, unrest: -3, intl: -4 }, { jov: -4 }),
    o('Il·legalitzats', 'Només el partit del govern és legal.', 0, 95, { freedom: -16, unrest: -6, intl: -10 }, { jov: -8, mit: -6, min: -4 }),
  ] },
  { id: 'limit_mandats', cat: 'politica', name: 'Límit de mandats', desc: '', options: [
    o('Dos mandats màxim', 'Al tercer mandat t\'has de retirar.', 0, -20, { stability: 1, corruption: -2 }),
    o('Sense límit', '', 0, 40, { corruption: 2, freedom: -1 }),
  ] },
  { id: 'descentralitzacio', cat: 'politica', name: 'Organització territorial', desc: 'Influeix en les tensions independentistes.', options: [
    o('Centralisme', 'Tot el poder a la capital.', 0, 50, { corruption: 1 }, { pat: 6, min: -6, rur: -3 }),
    o('Autonomies', 'Regions amb competències.', 0, 0),
    o('Estat federal', 'Estats federats amb gran autogovern.', 0, -30, { stability: 2, corruption: -1, spend: 0.2 }, { min: 5, pat: -6 }),
  ] },
  { id: 'sistema_electoral', cat: 'politica', name: 'Sistema electoral', desc: 'El majoritari afavoreix els grans partits.', options: [
    o('Majoritari', 'El guanyador s\'ho emporta tot.', 0, 10, { stability: 2 }),
    o('Proporcional', 'Escons segons els vots.', 0, -10, { freedom: 1 }),
  ] },
  { id: 'propaganda', cat: 'politica', name: 'Comunicació del govern', desc: '', options: [
    o('Institucional neutral', '', 0, 0),
    o('Campanyes de propaganda', 'Publicitat massiva de l\'acció de govern.', 0, 60, { spend: 0.1, freedom: -3 }, { pat: 5, mil: 3, tre: 2, jub: 3, jov: -2 }),
    o('Culte al líder', 'Retrats per tot arreu.', 0, 100, { freedom: -10, spend: 0.2, stability: 3, intl: -8 }, { pat: 8, mil: 5, jov: -10, mit: -6 }),
  ] },
];

export const POLICY_BY_ID: Record<string, PolicyDef> = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

/** Política inicial per defecte d'un país (es pot sobreescriure amb c.pol) */
export function defaultPolicies(c: CountryDef): Record<string, number> {
  const r: Record<string, number> = {};
  const auth = c.rg === 'aut' || c.rg === 'tot';
  for (const p of POLICIES) {
    let v = 1;
    switch (p.id) {
      case 'regulacio_mercat': v = c.econ < -80 ? 4 : c.econ < -30 ? 3 : c.econ > 40 ? 1 : 2; break;
      case 'empreses_publiques': v = c.econ < -80 ? 3 : c.econ < -30 ? 2 : 1; break;
      case 'banc_central': v = c.rg === 'dem' || c.rg === 'def' ? 0 : 1; break;
      case 'regulacio_financera': v = c.econ > 50 ? 0 : 1; break;
      case 'comerc': v = c.tariff >= 12 ? 2 : 1; break;
      case 'habitatge': v = c.econ > 40 ? 0 : 1; break;
      case 'salari_minim': v = 2; break;
      case 'regulacio_laboral': v = c.econ > 50 ? 1 : c.econ < -30 ? 3 : 2; break;
      case 'sindicats': v = c.rg === 'tot' ? 0 : auth || c.rg === 'hyb' ? 1 : 2; break;
      case 'renda_basica': v = 1; break;
      case 'edat_jubilacio': v = 2; break;
      case 'universitat': v = 1; break;
      case 'curriculum': v = c.rg === 'tot' ? 3 : 1; break;
      case 'sistema_sanitari': v = c.rg === 'dem' ? 2 : 1; break;
      case 'avortament': v = c.cons >= 80 ? 0 : c.cons >= 60 ? 1 : 2; break;
      case 'eutanasia': v = 0; break;
      case 'drogues': v = c.cons >= 70 ? 0 : 1; break;
      case 'matrimoni': v = c.cons >= 85 ? 0 : c.cons >= 60 ? 1 : c.cons >= 40 ? 2 : 3; break;
      case 'premsa': v = c.freedom >= 75 ? 0 : c.freedom >= 40 ? 1 : 2; break;
      case 'reunio': v = c.freedom >= 75 ? 0 : c.freedom >= 30 ? 1 : 2; break;
      case 'vigilancia': v = c.freedom <= 20 ? 2 : 1; break;
      case 'igualtat': v = c.cons > 70 ? 0 : 1; break;
      case 'religio': v = c.demo.relig >= 80 && auth ? 2 : 1; break;
      case 'immigracio': v = 1; break;
      case 'minories': v = 2; break;
      case 'pena_mort': v = 0; break;
      case 'armes': v = 1; break;
      case 'justicia': v = c.freedom >= 75 ? 0 : c.freedom >= 35 ? 1 : 2; break;
      case 'policia': v = auth ? 2 : 1; break;
      case 'presons': v = auth ? 2 : 1; break;
      case 'corrupcio': v = c.corruption <= 20 ? 2 : c.corruption >= 65 ? 0 : 1; break;
      case 'servei_militar': v = 0; break;
      case 'doctrina': v = 1; break;
      case 'industria_defensa': v = c.mil >= 45 ? 2 : c.mil >= 20 ? 1 : 0; break;
      case 'nuclear': v = c.nuclear ? 2 : 0; break;
      case 'energia': v = 1; break;
      case 'regulacio_ambiental': v = 1; break;
      case 'transport': v = 1; break;
      case 'agricultura': v = 1; break;
      case 'eleccions': v = c.rg === 'tot' ? 3 : c.rg === 'aut' || c.rg === 'hyb' ? 1 : 0; break;
      case 'oposicio': v = c.rg === 'tot' ? 2 : c.rg === 'aut' || c.rg === 'hyb' ? 1 : 0; break;
      case 'limit_mandats': v = 1; break;
      case 'descentralitzacio': v = auth ? 0 : 1; break;
      case 'sistema_electoral': v = 1; break;
      case 'propaganda': v = c.rg === 'tot' ? 2 : auth || c.rg === 'hyb' ? 1 : 0; break;
      case 'model_educatiu': v = 1; break;
      case 'natalitat': v = 1; break;
      case 'jornada': v = 1; break;
    }
    r[p.id] = Math.min(v, p.options.length - 1);
  }
  for (const [k, v] of Object.entries(c.pol ?? {})) if (k in r && v !== undefined) r[k] = v;
  return r;
}
