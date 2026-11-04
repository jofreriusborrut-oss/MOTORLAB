// Motor de Texas Hold'em No Limit. Funcions pures sobre un estat serialitzable (JSON)
// perquè l'amfitrió el pugui desar i recuperar si recarrega la pàgina.
import { Card, newDeck, shuffle } from './cards';
import { evaluate } from './evaluate';

export const MAX_SEATS = 9;

export interface Settings {
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** Segons per decidir. */
  actionTime: number;
  allowRebuy: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: number;
  seat: number;
  stack: number;
  /** Total de fitxes comprades (entrada + recompres), per al compte final. */
  buyIn: number;
  hole: Card[];
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  /** Aposta al carrer actual. */
  bet: number;
  /** Total aportat al pot en aquesta mà. */
  committed: number;
  acted: boolean;
  sittingOut: boolean;
  connected: boolean;
  leaving: boolean;
  lastAction: string | null;
  /** Ha ensenyat les cartes al final de la mà. */
  shown: boolean;
}

export type Phase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Winner {
  playerId: string;
  amount: number;
  hand: string | null;
  best: Card[];
  potIndex: number;
}

export interface LedgerEntry {
  name: string;
  buyIn: number;
  cashOut: number;
}

export interface GameState {
  settings: Settings;
  players: Player[];
  phase: Phase;
  started: boolean;
  paused: boolean;
  handNo: number;
  dealerSeat: number;
  sbSeat: number;
  bbSeat: number;
  /** Cega gran de la mà en curs (els canvis de configuració s'apliquen a la mà següent). */
  handBB: number;
  deck: Card[];
  board: Card[];
  currentBet: number;
  minRaise: number;
  toAct: string | null;
  winners: Winner[];
  /** S'han girat les cartes a l'enfrontament final. */
  showdown: boolean;
  /** Pots finals de la mà (per mostrar-los). */
  pots: number[];
  log: string[];
  departed: LedgerEntry[];
  /** Fitxes aportades per jugadors que han marxat a mitja mà (continuen dins el pot). */
  departedPot: number;
  /** Comptador d'esdeveniments (canvia a cada acció). */
  seq: number;
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
  | { type: 'allin' };

export interface Legal {
  canAct: boolean;
  canCheck: boolean;
  toCall: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
}

export function createGame(settings: Settings): GameState {
  return {
    settings,
    players: [],
    phase: 'waiting',
    started: false,
    paused: false,
    handNo: 0,
    dealerSeat: -1,
    sbSeat: -1,
    bbSeat: -1,
    handBB: settings.bigBlind,
    deck: [],
    board: [],
    currentBet: 0,
    minRaise: settings.bigBlind,
    toAct: null,
    winners: [],
    showdown: false,
    pots: [],
    log: [],
    departed: [],
    departedPot: 0,
    seq: 0,
  };
}

const log = (s: GameState, msg: string) => {
  s.seq = (s.seq ?? 0) + 1;
  s.log.push(msg);
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
};

export const getPlayer = (s: GameState, id: string) => s.players.find((p) => p.id === id);
const bySeat = (s: GameState, seat: number) => s.players.find((p) => p.seat === seat);
const live = (s: GameState) => s.players.filter((p) => p.inHand && !p.folded);
const needsToAct = (s: GameState, p: Player) =>
  p.inHand && !p.folded && !p.allIn && (!p.acted || p.bet < s.currentBet);
const eligible = (p: Player) => p.stack > 0 && !p.sittingOut && !p.leaving;

/** Primer jugador (en ordre de seient, després de `fromSeat`) que compleix la condició. */
function nextFrom(s: GameState, fromSeat: number, pred: (p: Player) => boolean): Player | undefined {
  for (let i = 1; i <= MAX_SEATS; i++) {
    const p = bySeat(s, (fromSeat + i + MAX_SEATS) % MAX_SEATS);
    if (p && pred(p)) return p;
  }
  return undefined;
}

export function potTotal(s: GameState): number {
  return s.players.reduce((a, p) => a + p.committed, 0) + s.departedPot;
}

export function addPlayer(
  s: GameState,
  info: { id: string; name: string; avatar: number },
): Player | string {
  if (s.players.length >= MAX_SEATS) return 'La mesa és plena';
  const taken = new Set(s.players.map((p) => p.seat));
  let seat = 0;
  while (taken.has(seat)) seat++;
  const p: Player = {
    ...info,
    seat,
    stack: s.settings.startingStack,
    buyIn: s.settings.startingStack,
    hole: [],
    inHand: false,
    folded: false,
    allIn: false,
    bet: 0,
    committed: 0,
    acted: false,
    sittingOut: false,
    connected: true,
    leaving: false,
    lastAction: null,
    shown: false,
  };
  s.players.push(p);
  log(s, `${p.name} s'asseu a la mesa`);
  return p;
}

/** El jugador marxa: si és dins una mà, es retira i s'elimina en acabar-la. */
export function removePlayer(s: GameState, id: string) {
  const p = getPlayer(s, id);
  if (!p) return;
  p.leaving = true;
  if (isHandRunning(s) && p.inHand && !p.folded) {
    if (s.toAct === p.id) {
      act(s, p.id, { type: 'fold' });
    } else {
      p.folded = true;
      p.lastAction = 'Fold';
      afterChange(s, p.seat, false);
    }
  }
  if (!isHandRunning(s) || !p.inHand) purge(s);
}

function purge(s: GameState) {
  for (const p of s.players.filter((x) => x.leaving)) {
    if (isHandRunning(s) && p.inHand) continue;
    s.departed.push({ name: p.name, buyIn: p.buyIn, cashOut: p.stack });
    s.departedPot += p.committed;
    s.players = s.players.filter((x) => x !== p);
    log(s, `${p.name} se'n va`);
  }
}

export const isHandRunning = (s: GameState) =>
  s.phase === 'preflop' || s.phase === 'flop' || s.phase === 'turn' || s.phase === 'river';

export function canStartHand(s: GameState) {
  return s.players.filter(eligible).length >= 2;
}

export function rebuy(s: GameState, id: string): string | null {
  const p = getPlayer(s, id);
  if (!p) return 'Jugador desconegut';
  if (!s.settings.allowRebuy) return "L'amfitrió no permet recomprar";
  if (p.stack > 0) return 'Només pots recomprar quan et quedes sense fitxes';
  if (isHandRunning(s) && p.inHand && !p.folded) return 'Espera que acabi la mà';
  p.stack += s.settings.startingStack;
  p.buyIn += s.settings.startingStack;
  log(s, `${p.name} recompra ${s.settings.startingStack}`);
  return null;
}

export function startHand(s: GameState): boolean {
  purge(s);
  if (!canStartHand(s)) {
    s.phase = 'waiting';
    s.toAct = null;
    return false;
  }
  s.departedPot = 0;
  s.handNo++;
  s.phase = 'preflop';
  s.board = [];
  s.winners = [];
  s.pots = [];
  s.showdown = false;
  s.deck = shuffle(newDeck());
  s.handBB = s.settings.bigBlind;
  s.minRaise = s.handBB;
  s.currentBet = 0;

  for (const p of s.players) {
    p.hole = [];
    p.bet = 0;
    p.committed = 0;
    p.acted = false;
    p.folded = false;
    p.allIn = false;
    p.shown = false;
    p.lastAction = null;
    p.inHand = eligible(p);
  }

  const inHand = (p: Player) => p.inHand;
  const dealer = nextFrom(s, s.dealerSeat < 0 ? MAX_SEATS - 1 : s.dealerSeat, inHand)!;
  s.dealerSeat = dealer.seat;
  const headsUp = s.players.filter(inHand).length === 2;
  const sb = headsUp ? dealer : nextFrom(s, dealer.seat, inHand)!;
  const bb = nextFrom(s, sb.seat, inHand)!;
  s.sbSeat = sb.seat;
  s.bbSeat = bb.seat;

  // reparteix dues cartes a cadascú, començant per la cega petita
  for (let r = 0; r < 2; r++) {
    let p: Player = sb;
    do {
      p.hole.push(s.deck.pop()!);
      p = nextFrom(s, p.seat, inHand)!;
    } while (p !== sb);
  }

  post(s, sb, Math.min(s.settings.smallBlind, s.handBB), 'CP');
  post(s, bb, s.handBB, 'CG');
  s.currentBet = s.handBB;

  log(s, `— Mà #${s.handNo} · cegues ${s.settings.smallBlind}/${s.handBB} —`);
  const first = nextFrom(s, bb.seat, (p) => needsToAct(s, p));
  if (first) s.toAct = first.id;
  else endStreet(s);
  return true;
}

function post(s: GameState, p: Player, amount: number, label: string) {
  const a = Math.min(amount, p.stack);
  p.stack -= a;
  p.bet += a;
  p.committed += a;
  if (p.stack === 0) p.allIn = true;
  p.lastAction = label;
  void s;
}

export function legalActions(s: GameState, id: string): Legal {
  const p = getPlayer(s, id);
  const none: Legal = { canAct: false, canCheck: false, toCall: 0, canRaise: false, minRaiseTo: 0, maxRaiseTo: 0 };
  if (!p || s.toAct !== id || !isHandRunning(s)) return none;
  const toCall = Math.min(Math.max(0, s.currentBet - p.bet), p.stack);
  const maxRaiseTo = p.bet + p.stack;
  // Si ja ha actuat i li arriba una pujada incompleta (all-in curt), només pot pagar o retirar-se.
  const othersCanAct = live(s).some((o) => o !== p && !o.allIn);
  const canRaise = !p.acted && maxRaiseTo > s.currentBet && othersCanAct;
  const minRaiseTo = Math.min(maxRaiseTo, s.currentBet + s.minRaise);
  return { canAct: true, canCheck: s.currentBet <= p.bet, toCall, canRaise, minRaiseTo, maxRaiseTo };
}

/** Aplica una acció. Retorna un missatge d'error o null si és vàlida. */
export function act(s: GameState, id: string, a: Action): string | null {
  const p = getPlayer(s, id);
  if (!p) return 'Jugador desconegut';
  if (!isHandRunning(s)) return 'No hi ha cap mà en joc';
  if (s.toAct !== id) return 'No és el teu torn';
  const L = legalActions(s, id);

  const putIn = (to: number) => {
    const amt = to - p.bet;
    p.stack -= amt;
    p.bet = to;
    p.committed += amt;
    if (p.stack === 0) p.allIn = true;
  };

  const raiseTo = (to: number) => {
    const wasBet = s.currentBet === 0;
    const size = to - s.currentBet;
    putIn(to);
    if (size >= s.minRaise) {
      s.minRaise = size;
      for (const o of s.players) if (o !== p) o.acted = false;
    }
    s.currentBet = to;
    p.lastAction = p.allIn ? 'All-in' : wasBet ? 'Aposta' : 'Puja';
    log(s, `${p.name} ${p.allIn ? 'va all-in amb' : wasBet ? 'aposta' : 'puja a'} ${to}`);
  };

  const call = () => {
    if (L.toCall === 0) {
      p.lastAction = 'Passa';
      log(s, `${p.name} passa`);
      return;
    }
    putIn(p.bet + L.toCall);
    p.lastAction = p.allIn ? 'All-in' : 'Iguala';
    log(s, `${p.name} ${p.allIn ? 'va all-in i iguala' : 'iguala'} ${p.bet}`);
  };

  switch (a.type) {
    case 'fold':
      p.folded = true;
      p.lastAction = 'Fold';
      log(s, `${p.name} es retira`);
      break;
    case 'check':
      if (!L.canCheck) return 'No pots passar: has d\'igualar o retirar-te';
      p.lastAction = 'Passa';
      log(s, `${p.name} passa`);
      break;
    case 'call':
      call();
      break;
    case 'raise': {
      if (!L.canRaise) return 'Ara no pots pujar';
      let to = Math.floor(a.amount);
      if (to >= L.maxRaiseTo) to = L.maxRaiseTo;
      else if (to < L.minRaiseTo) return `La pujada mínima és a ${L.minRaiseTo}`;
      raiseTo(to);
      break;
    }
    case 'allin':
      if (L.canRaise) raiseTo(L.maxRaiseTo);
      else call();
      break;
    default:
      return 'Acció desconeguda';
  }
  p.acted = true;
  afterChange(s, p.seat, true);
  return null;
}

/** Acció automàtica quan s'acaba el temps: passa si pot, si no es retira. */
export function timeoutAct(s: GameState) {
  if (!s.toAct) return;
  const L = legalActions(s, s.toAct);
  act(s, s.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' });
}

function afterChange(s: GameState, fromSeat: number, actorMoved: boolean) {
  if (live(s).length === 1) return winUncontested(s);
  if (!actorMoved && s.toAct) {
    // algú s'ha retirat fora de torn: el torn no canvia, però potser ja no cal que ningú actuï
    const cur = getPlayer(s, s.toAct);
    if (cur && needsToAct(s, cur)) return;
  }
  const next = nextFrom(s, fromSeat, (p) => needsToAct(s, p));
  if (next) s.toAct = next.id;
  else endStreet(s);
}

function endStreet(s: GameState) {
  s.toAct = null;
  for (const p of s.players) {
    p.bet = 0;
    p.acted = false;
    if (p.inHand && !p.folded && !p.allIn && p.lastAction !== 'All-in') p.lastAction = null;
  }
  s.currentBet = 0;
  s.minRaise = s.handBB;
  const canAct = live(s).filter((p) => !p.allIn).length;

  if (s.phase === 'river') return showdown(s);
  if (canAct <= 1) {
    while (s.board.length < 5) dealStreet(s);
    s.phase = 'river';
    return showdown(s);
  }
  dealStreet(s);
  const first = nextFrom(s, s.dealerSeat, (p) => needsToAct(s, p));
  if (first) s.toAct = first.id;
  else endStreet(s);
}

function dealStreet(s: GameState) {
  s.deck.pop(); // carta cremada
  if (s.board.length === 0) {
    s.board.push(s.deck.pop()!, s.deck.pop()!, s.deck.pop()!);
    s.phase = 'flop';
  } else {
    s.board.push(s.deck.pop()!);
    s.phase = s.board.length === 4 ? 'turn' : 'river';
  }
  log(s, `${s.phase === 'flop' ? 'Flop' : s.phase === 'turn' ? 'Turn' : 'River'}: ${s.board.join(' ')}`);
}

function winUncontested(s: GameState) {
  const w = live(s)[0];
  const total = potTotal(s);
  w.stack += total;
  s.winners = [{ playerId: w.id, amount: total, hand: null, best: [], potIndex: 0 }];
  s.pots = [total];
  log(s, `${w.name} guanya ${total}`);
  finish(s);
}

/** Divideix les aportacions en pot principal i pots laterals. */
export function buildPots(players: Player[], extra = 0): { amount: number; eligible: string[] }[] {
  const contenders = players.filter((p) => p.inHand && !p.folded);
  const levels = [...new Set(contenders.map((p) => p.committed))].filter((x) => x > 0).sort((a, b) => a - b);
  const pots: { amount: number; eligible: string[] }[] = [];
  let prev = 0;
  for (const lvl of levels) {
    let amount = 0;
    for (const p of players) amount += Math.max(0, Math.min(p.committed, lvl) - prev);
    pots.push({ amount, eligible: contenders.filter((p) => p.committed >= lvl).map((p) => p.id) });
    prev = lvl;
  }
  // fitxes de jugadors retirats per sobre del nivell màxim (no hauria de passar) i fitxes de qui ha marxat
  let rest = extra;
  for (const p of players) rest += Math.max(0, p.committed - prev);
  if (pots.length && rest) pots[0].amount += rest;
  return pots;
}

function showdown(s: GameState) {
  s.phase = 'showdown';
  s.showdown = true;
  s.toAct = null;
  const pots = buildPots(s.players, s.departedPot);
  s.pots = pots.map((p) => p.amount);
  const values = new Map(live(s).map((p) => [p.id, evaluate([...p.hole, ...s.board])]));
  for (const p of live(s)) p.shown = true;
  s.winners = [];

  pots.forEach((pot, i) => {
    if (pot.eligible.length === 1) {
      const p = getPlayer(s, pot.eligible[0])!;
      p.stack += pot.amount;
      s.winners.push({ playerId: p.id, amount: pot.amount, hand: values.get(p.id)!.name, best: values.get(p.id)!.best, potIndex: i });
      return;
    }
    const top = Math.max(...pot.eligible.map((id) => values.get(id)!.score));
    // ordre des del seient després del botó (per repartir la fitxa sobrant)
    const ws = pot.eligible
      .filter((id) => values.get(id)!.score === top)
      .map((id) => getPlayer(s, id)!)
      .sort((a, b) => ((a.seat - s.dealerSeat + MAX_SEATS - 1) % MAX_SEATS) - ((b.seat - s.dealerSeat + MAX_SEATS - 1) % MAX_SEATS));
    const share = Math.floor(pot.amount / ws.length);
    let odd = pot.amount - share * ws.length;
    for (const w of ws) {
      const amt = share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
      w.stack += amt;
      const v = values.get(w.id)!;
      s.winners.push({ playerId: w.id, amount: amt, hand: v.name, best: v.best, potIndex: i });
    }
  });
  for (const w of s.winners) log(s, `${getPlayer(s, w.playerId)!.name} guanya ${w.amount}${w.hand ? ` amb ${w.hand}` : ''}`);
  finish(s);
}

function finish(s: GameState) {
  s.phase = 'showdown';
  s.toAct = null;
  for (const p of s.players) p.bet = 0;
}

/** Ensenyar les cartes voluntàriament després de guanyar sense enfrontament. */
export function showCards(s: GameState, id: string) {
  const p = getPlayer(s, id);
  if (p && s.phase === 'showdown' && p.inHand && p.hole.length) p.shown = true;
}
