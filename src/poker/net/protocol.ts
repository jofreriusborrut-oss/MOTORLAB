import type { Card } from '../engine/cards';
import { Action, GameState, isHandRunning, legalActions, Legal, LedgerEntry, Phase, Settings, Winner } from '../engine/game';

export const PEER_PREFIX = 'nitpoker-v1-';

export type ClientMsg =
  | { t: 'hello'; token: string; name: string; avatar: number }
  | { t: 'action'; action: Action; handNo: number }
  | { t: 'rebuy' }
  | { t: 'sitout'; value: boolean }
  | { t: 'show' }
  | { t: 'chat'; text: string }
  | { t: 'leave' }
  // només l'amfitrió
  | { t: 'host:start' }
  | { t: 'host:pause'; value: boolean }
  | { t: 'host:settings'; settings: Partial<Settings> }
  | { t: 'host:kick'; playerId: string }
  | { t: 'host:chips'; playerId: string; amount: number };

export interface PlayerView {
  id: string;
  name: string;
  avatar: number;
  seat: number;
  stack: number;
  bet: number;
  buyIn: number;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  connected: boolean;
  lastAction: string | null;
  /** Cartes visibles (les pròpies o les ensenyades). */
  cards: Card[] | null;
  hasCards: boolean;
  isHost: boolean;
}

export interface ChatLine {
  id: string;
  from: string;
  text: string;
  at: number;
}

export interface TableView {
  code: string;
  you: string | null;
  hostId: string;
  phase: Phase;
  started: boolean;
  paused: boolean;
  handNo: number;
  board: Card[];
  /** Pot ja recollit (sense les apostes del carrer actual). */
  pot: number;
  /** Pot total incloent apostes actuals. */
  totalPot: number;
  pots: number[];
  currentBet: number;
  handBB: number;
  dealerSeat: number;
  sbSeat: number;
  bbSeat: number;
  toAct: string | null;
  timeLeftMs: number;
  /** Identificador del torn actual (per reiniciar el comptador visual). */
  turnId: number;
  settings: Settings;
  players: PlayerView[];
  winners: Winner[];
  showdown: boolean;
  legal: Legal;
  log: string[];
  ledger: LedgerEntry[];
  chat: ChatLine[];
}

export type HostMsg =
  | { t: 'state'; view: TableView }
  | { t: 'error'; msg: string }
  | { t: 'kicked' };

export function buildView(
  s: GameState,
  you: string | null,
  extra: { code: string; hostId: string; deadline: number; connected: Set<string>; chat: ChatLine[] },
): TableView {
  const running = isHandRunning(s);
  const totalPot = s.players.reduce((a, p) => a + p.committed, 0) + s.departedPot;
  const bets = s.players.reduce((a, p) => a + p.bet, 0);
  return {
    code: extra.code,
    you,
    hostId: extra.hostId,
    phase: s.phase,
    started: s.started,
    paused: s.paused,
    handNo: s.handNo,
    board: s.board,
    pot: running ? totalPot - bets : s.phase === 'showdown' ? 0 : 0,
    totalPot: running || s.phase === 'showdown' ? totalPot : 0,
    pots: s.pots,
    currentBet: s.currentBet,
    handBB: s.handBB,
    dealerSeat: s.dealerSeat,
    sbSeat: s.sbSeat,
    bbSeat: s.bbSeat,
    toAct: s.toAct,
    turnId: s.toAct ? extra.deadline : 0,
    timeLeftMs: s.toAct ? Math.max(0, extra.deadline - Date.now()) : 0,
    settings: s.settings,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      seat: p.seat,
      stack: p.stack,
      bet: p.bet,
      buyIn: p.buyIn,
      inHand: p.inHand && (running || s.phase === 'showdown'),
      folded: p.folded,
      allIn: p.allIn,
      sittingOut: p.sittingOut,
      connected: extra.connected.has(p.id),
      lastAction: p.lastAction,
      cards: p.hole.length && (p.id === you || (p.shown && s.phase === 'showdown')) ? p.hole : null,
      hasCards: p.hole.length > 0 && p.inHand && !p.folded && (running || s.phase === 'showdown'),
      isHost: p.id === extra.hostId,
    })),
    winners: s.phase === 'showdown' ? s.winners : [],
    showdown: s.showdown,
    legal: you ? legalActions(s, you) : legalActions(s, ''),
    log: s.log.slice(-30),
    ledger: [
      ...s.players.map((p) => ({ name: p.name, buyIn: p.buyIn, cashOut: p.stack + (running ? p.committed : 0) })),
      ...s.departed,
    ],
    chat: extra.chat.slice(-30),
  };
}
