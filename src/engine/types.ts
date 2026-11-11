// Tipus del simulador polític GOVERNA

export type GroupId =
  | 'tre' | 'mit' | 'emp' | 'jub' | 'jov' | 'rur' | 'rel' | 'eco' | 'min' | 'pat' | 'mil';

export type MinistryId =
  | 'sanitat' | 'educacio' | 'pensions' | 'social' | 'habitatge' | 'infra' | 'recerca'
  | 'defensa' | 'seguretat' | 'medi' | 'cultura' | 'admin' | 'exterior';

export type TaxId = 'irpf' | 'societats' | 'iva' | 'cotitzacions' | 'aranzels' | 'patrimoni' | 'verd';

/** Indicadors lents de la societat (índexs) */
export type SlowKey =
  | 'edu' | 'health' | 'infra' | 'innov' | 'env' | 'corruption' | 'freedom' | 'crime'
  | 'gini' | 'poverty' | 'happiness' | 'stability' | 'military';

export type EffectKey =
  | SlowKey | 'growth' | 'unemp' | 'infl' | 'revenue' | 'spend' | 'unrest' | 'intl' | 'migration';

export type Effects = Partial<Record<EffectKey, number>>;
export type GroupFx = Partial<Record<GroupId, number>>;

export interface Ideo { e: number; s: number } // econòmic: -100 esquerra .. 100 dreta; social: -100 progressista .. 100 autoritari/conservador

export type Shape = 'h' | 'v' | 'nordic' | 'cross' | 'circle' | 'union' | 'usa' | 'ensign' | 'chevron' | 'diamond' | 'diag' | 'solid';
export type Emblem = 'none' | 'star' | 'stars' | 'circle' | 'crescent' | 'sun' | 'wheel' | 'leaf' | 'cross' | 'ring' | 'eagle' | 'sword';
export interface Flag { shape: Shape; colors: string[]; ratios?: number[]; emblem?: Emblem; ec?: string; ep?: 'c' | 'l' | 'tl' }

export type StateForm = 'monarquia' | 'republica' | 'monarquia_absoluta';

export interface PartyDef { id: string; name: string; short: string; color: string; e: number; s: number; vote: number }

export interface CountryDef {
  id: string; // codi ISO numèric (world-atlas)
  name: string;
  capital: string;
  pop: number; gdp: number; growth: number; unemp: number; infl: number; debt: number;
  rev: number; spend: number; def: number; edu: number; health: number; pens: number;
  taxes: [number, number, number, number]; // irpf, societats, iva, cotitzacions
  tariff: number; wealth?: number; green?: number; res?: number; rate?: number;
  life: number; gini: number; freedom: number; corruption: number; crime: number; env: number;
  eduIdx: number; innov: number; stability: number;
  mil: number; nuclear?: boolean;
  rg: 'dem' | 'def' | 'hyb' | 'aut' | 'tot';
  form: StateForm;
  blocs: string[];
  term: number; seats: number;
  parties: PartyDef[];
  gov: string[];
  leader: string; title: string;
  demo: { old: number; young: number; rural: number; relig: number; minor: number };
  names: string;
  flag: Flag;
  econ: number; // posició econòmica de l'estat (-100 planificada .. 100 liberal)
  cons: number; // conservadorisme social 0..100
  region?: string; // regió amb tensions independentistes
  pol?: Partial<Record<string, number>>;
  rivals?: string[];
  friends?: string[];
}

export interface PolicyOption {
  label: string;
  desc: string;
  ideo: Ideo;
  fx: Effects;
  g: GroupFx;
}

export interface PolicyDef {
  id: string;
  cat: string;
  name: string;
  desc: string;
  options: PolicyOption[];
}

export interface Party extends PartyDef {
  seats: number;
  calib: number; // calibratge per reproduir el resultat real inicial
  momentum: number; // modificador temporal de popularitat
  leader: string;
}

export interface Nation {
  id: string;
  name: string;
  flag: Flag;
  gdp: number; pop: number; growth: number; baseGrowth: number;
  mil: number; nuclear: boolean;
  stability: number;
  rg: CountryDef['rg'];
  blocs: string[];
  leader: string;
  ideo: Ideo;
  rel: number; // relació amb el jugador
  wars: string[]; // ids de nacions en guerra
  sanctioned: boolean; // sancions del jugador
  sanctionsOnUs: boolean; // ens sanciona
  trade: boolean; alliance: boolean;
  names: string;
}

export interface War {
  id: string;
  a: string; b: string; // atacant, defensor
  front: number; // -100..100 (positiu = avança A)
  months: number;
  casA: number; casB: number;
}

export interface GroupState { aff: number; mod: number; base: number }

export interface NewsItem {
  id: number;
  date: number; // mes absolut
  text: string;
  src: string;
  tone: 'good' | 'bad' | 'neutral' | 'me' | 'world';
}

export interface EventChoice { label: string; desc: string; fx: Effects; g: GroupFx; now?: Partial<Record<string, number>>; news: string; pc?: number }
export interface GameEvent { id: string; title: string; text: string; choices: EventChoice[] }

export interface Referendum {
  kind: string;
  title: string;
  payload: any;
  monthsLeft: number;
  yesBias: number;
  campaign: number;
}

export interface Modal {
  kind: 'event' | 'election' | 'referendum' | 'fall' | 'info' | 'war' | 'law';
  title: string;
  text: string;
  event?: GameEvent;
  data?: any;
}

export interface HistoryRow {
  t: number; gdp: number; gdppc: number; growth: number; unemp: number; infl: number; debt: number;
  deficit: number; approval: number; rev: number; spend: number; happiness: number; crime: number;
  gini: number; freedom: number; env: number; unrest: number; stability: number; society: number;
  edu: number; health: number; corruption: number; poverty: number; life: number;
}

export interface Game {
  version: number;
  countryId: string;
  def: CountryDef;
  month: number; // mesos des de l'inici (0 = gener 2026)
  playerName: string;
  playerParty: string;
  inPower: boolean;
  exile: boolean;
  govParties: string[];
  govLeader: string; // nom del líder del govern actual
  pc: number; // capital polític
  funds: number; // fons del partit a l'oposició

  // economia
  gdp: number; pop: number; growth: number; baseGrowth: number;
  unemp: number; infl: number; debt: number; rate: number; marketRate: number;
  budget: Record<MinistryId, number>;
  budget0: Record<MinistryId, number>;
  taxes: Record<TaxId, number>;
  taxes0: Record<TaxId, number>;
  revCalib: number;
  lastRev: number; lastSpend: number; lastInterest: number; lastPrograms: number;
  revBreak: Record<string, number>;
  shock: number; // xoc econòmic temporal (pp creixement)
  inflShock: number;
  reparations: number; // % PIB anual rebut (+) o pagat (-)
  reparationMonths: number;
  iBase: number; // inflació estructural
  defSmooth: number; // dèficit mitjà (per l'impuls fiscal)
  noise: number;
  base: { deficit: number; unrest: number; poverty: number; happiness: number; r0: number; infl: number; unemp: number; growth: number; popG: number; gdppc: number; debtRatio: number; sanctions?: number };
  nuclearProgress: number;
  pendingBloc: { id: string; months: number } | null;
  oppAllies: string[];
  regionShare: number;
  regionTension: number;
  stabMod: number;
  unrestMod: number;

  slow: Record<SlowKey, number>;
  slow0: Record<SlowKey, number>;
  life0: number;
  unrest: number;
  warWeariness: number;
  intl: number; // reputació internacional

  policies: Record<string, number>;
  policies0: Record<string, number>;
  tempFx: { fx: Effects; months: number }[];

  groups: Record<GroupId, GroupState>;
  shares: Record<GroupId, number>;
  approval: number;

  parties: Party[];
  nextElection: number;
  partnerMood: Record<string, number>;
  termsServed: number;

  form: StateForm;
  flag: Flag;
  countryName: string;
  motto: string;
  capital: string;
  blocs: string[];
  regionIndependent: boolean;

  nations: Record<string, Nation>;
  wars: War[];
  referendum: Referendum | null;
  news: NewsItem[];
  newsSeq: number;
  modalQueue: Modal[];
  history: HistoryRow[];
  eventCooldown: Record<string, number>;
  lastEventMonth: number;
  lowUnrestMonths: number;
  highUnrestMonths: number;
  stats: { lawsPassed: number; wars: number; refs: number; elections: number };
  global: number; // cicle econòmic global
  gameOver: boolean;
}
