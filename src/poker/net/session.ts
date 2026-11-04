// Connexió entre mòbils amb WebRTC (PeerJS). El mòbil de l'amfitrió fa de servidor:
// guarda l'estat de la partida, valida les accions i envia a cada jugador només el que pot veure.
import Peer, { DataConnection } from 'peerjs';
import { randomId } from '../engine/cards';
import {
  act,
  addPlayer,
  canStartHand,
  createGame,
  GameState,
  getPlayer,
  isHandRunning,
  rebuy,
  removePlayer,
  Settings,
  showCards,
  startHand,
  timeoutAct,
} from '../engine/game';
import { buildView, ChatLine, ClientMsg, HostMsg, PEER_PREFIX, TableView } from './protocol';

export type ConnStatus = 'connecting' | 'online' | 'reconnecting' | 'closed' | 'error';

export interface SessionState {
  status: ConnStatus;
  error: string | null;
  notice: { msg: string; at: number } | null;
  view: TableView | null;
  receivedAt: number;
  isHost: boolean;
  code: string;
}

export interface Session {
  get(): SessionState;
  subscribe(cb: (s: SessionState) => void): () => void;
  send(msg: ClientMsg): void;
  close(): void;
}

abstract class Base implements Session {
  protected st: SessionState;
  private subs = new Set<(s: SessionState) => void>();
  constructor(code: string, isHost: boolean) {
    this.st = { status: 'connecting', error: null, notice: null, view: null, receivedAt: 0, isHost, code };
  }
  get() {
    return this.st;
  }
  subscribe(cb: (s: SessionState) => void) {
    this.subs.add(cb);
    cb(this.st);
    return () => void this.subs.delete(cb);
  }
  protected set(patch: Partial<SessionState>) {
    this.st = { ...this.st, ...patch };
    for (const cb of this.subs) cb(this.st);
  }
  abstract send(msg: ClientMsg): void;
  abstract close(): void;
}

// Per defecte s'usa el servidor de senyalització gratuït de PeerJS (0.peerjs.com).
// Es pot fer servir un servidor propi amb ?servidor=host:port a l'URL.
function peerOpts() {
  const q = new URLSearchParams(location.search).get('servidor');
  if (!q) return { debug: 0 };
  const [host, port] = q.split(':');
  const local = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  return { debug: 0, host, port: Number(port) || 443, path: '/', secure: !local };
}
const PEER_OPTS = peerOpts();

// ───────────────────────────── Amfitrió ─────────────────────────────

export const HOST_KEY = 'nitpoker-host';

interface HostSave {
  code: string;
  state: GameState;
  tokens: Record<string, string>;
  hostId: string;
  chat: ChatLine[];
}

export function loadHostSave(): HostSave | null {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    return raw ? (JSON.parse(raw) as HostSave) : null;
  } catch {
    return null;
  }
}

export class HostSession extends Base {
  private peer: Peer | null = null;
  private state: GameState;
  private tokens: Record<string, string>;
  private hostId: string;
  private chat: ChatLine[];
  private conns = new Map<string, DataConnection>();
  private deadline = 0;
  private turnKey = '';
  private actTimer: ReturnType<typeof setTimeout> | null = null;
  private nextTimer: ReturnType<typeof setTimeout> | null = null;
  private nextKey = '';
  private closed = false;
  private idRetries = 0;

  constructor(
    code: string,
    opts: { settings?: Settings; name?: string; avatar?: number; restore?: HostSave },
  ) {
    super(code, true);
    if (opts.restore) {
      this.state = opts.restore.state;
      this.tokens = opts.restore.tokens;
      this.hostId = opts.restore.hostId;
      this.chat = opts.restore.chat ?? [];
    } else {
      this.state = createGame(opts.settings!);
      this.hostId = randomId();
      this.tokens = {};
      this.chat = [];
      addPlayer(this.state, { id: this.hostId, name: opts.name!, avatar: opts.avatar! });
    }
    this.openPeer();
    this.update();
  }

  private openPeer() {
    if (this.closed) return;
    const peer = new Peer(PEER_PREFIX + this.st.code, PEER_OPTS);
    this.peer = peer;
    peer.on('open', () => {
      this.idRetries = 0;
      this.set({ status: 'online', error: null });
    });
    peer.on('connection', (conn) => this.onConn(conn));
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      if (this.closed) return;
      const type = (err as { type?: string }).type;
      if (type === 'unavailable-id') {
        // La sala encara consta com a ocupada (p. ex. després de recarregar): reintentem.
        peer.destroy();
        if (this.idRetries++ < 30) {
          this.set({ status: 'reconnecting', error: 'Recuperant la sala…' });
          setTimeout(() => this.openPeer(), 3000);
        } else this.set({ status: 'error', error: 'El codi de sala està ocupat. Crea una mesa nova.' });
      } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
        this.set({ status: 'reconnecting', error: 'Sense connexió amb el servidor. Reintentant…' });
        peer.destroy();
        setTimeout(() => this.openPeer(), 3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'Aquest navegador no suporta WebRTC.' });
      }
    });
  }

  private onConn(conn: DataConnection) {
    let playerId: string | null = null;
    conn.on('data', (raw) => {
      const msg = raw as ClientMsg;
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') {
        const name = String(msg.name || 'Jugador').slice(0, 16);
        const known = this.tokens[msg.token];
        if (known && getPlayer(this.state, known)) {
          playerId = known;
          getPlayer(this.state, known)!.name = name;
        } else {
          const p = addPlayer(this.state, { id: randomId(), name, avatar: Number(msg.avatar) || 0 });
          if (typeof p === 'string') {
            conn.send({ t: 'error', msg: p } satisfies HostMsg);
            setTimeout(() => conn.close(), 500);
            return;
          }
          playerId = p.id;
          this.tokens[msg.token] = p.id;
        }
        const old = this.conns.get(playerId);
        if (old && old !== conn) old.close();
        this.conns.set(playerId, conn);
        this.update();
        return;
      }
      if (playerId) this.handle(playerId, msg, conn);
    });
    conn.on('close', () => {
      if (playerId && this.conns.get(playerId) === conn) {
        this.conns.delete(playerId);
        this.update();
      }
    });
    conn.on('error', () => conn.close());
  }

  private notify(id: string, msg: string, conn?: DataConnection) {
    if (id === this.hostId) this.set({ notice: { msg, at: Date.now() } });
    else (conn ?? this.conns.get(id))?.send({ t: 'error', msg } satisfies HostMsg);
  }

  /** Processa un missatge d'un jugador (també els de l'amfitrió, que arriben en local). */
  private handle(id: string, msg: ClientMsg, conn?: DataConnection) {
    const s = this.state;
    const isHost = id === this.hostId;
    const p = getPlayer(s, id);
    if (!p) return;
    let err: string | null = null;
    switch (msg.t) {
      case 'action':
        if (msg.handNo !== s.handNo) return;
        err = act(s, id, msg.action);
        break;
      case 'rebuy':
        err = rebuy(s, id);
        break;
      case 'sitout':
        p.sittingOut = !!msg.value;
        break;
      case 'show':
        showCards(s, id);
        break;
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 120);
        if (text) this.chat.push({ id: p.id, from: p.name, text, at: Date.now() });
        if (this.chat.length > 50) this.chat.splice(0, this.chat.length - 50);
        break;
      }
      case 'leave':
        if (isHost) return;
        removePlayer(s, id);
        this.dropToken(id);
        this.conns.get(id)?.close();
        this.conns.delete(id);
        break;
      case 'host:start':
        if (!isHost) return;
        if (!canStartHand(s)) err = 'Calen almenys 2 jugadors amb fitxes';
        else {
          s.started = true;
          s.paused = false;
          if (!isHandRunning(s)) startHand(s);
        }
        break;
      case 'host:pause':
        if (!isHost) return;
        s.paused = !!msg.value;
        break;
      case 'host:settings': {
        if (!isHost) return;
        const n = msg.settings;
        const num = (v: unknown, min: number, max: number) =>
          typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;
        const bb = num(n.bigBlind, 2, 1e7);
        const sb = num(n.smallBlind, 1, 1e7);
        if (bb !== undefined) s.settings.bigBlind = bb;
        if (sb !== undefined) s.settings.smallBlind = Math.min(sb, s.settings.bigBlind);
        const st = num(n.startingStack, 1, 1e9);
        if (st !== undefined) s.settings.startingStack = st;
        const t = num(n.actionTime, 5, 300);
        if (t !== undefined) s.settings.actionTime = t;
        if (typeof n.allowRebuy === 'boolean') s.settings.allowRebuy = n.allowRebuy;
        break;
      }
      case 'host:kick': {
        if (!isHost || msg.playerId === this.hostId) return;
        const c = this.conns.get(msg.playerId);
        c?.send({ t: 'kicked' } satisfies HostMsg);
        removePlayer(s, msg.playerId);
        this.dropToken(msg.playerId);
        setTimeout(() => c?.close(), 400);
        this.conns.delete(msg.playerId);
        break;
      }
      case 'host:chips': {
        if (!isHost) return;
        const t = getPlayer(s, msg.playerId);
        const amt = Math.round(Number(msg.amount));
        if (!t || !isFinite(amt) || amt === 0) return;
        if (isHandRunning(s) && t.inHand && !t.folded) err = 'Espera que acabi la mà';
        else {
          const delta = Math.max(-t.stack, amt);
          t.stack += delta;
          t.buyIn += delta;
        }
        break;
      }
    }
    if (err) this.notify(id, err, conn);
    this.update();
  }

  private dropToken(id: string) {
    for (const [k, v] of Object.entries(this.tokens)) if (v === id) delete this.tokens[k];
  }

  /** Temporitzadors, desat i difusió de l'estat. */
  private update() {
    if (this.closed) return;
    const s = this.state;
    const connected = new Set([this.hostId, ...this.conns.keys()]);
    for (const p of s.players) p.connected = connected.has(p.id);

    // temps per actuar
    const key = s.toAct ? `${s.handNo}|${s.phase}|${s.toAct}|${s.seq}` : '';
    if (key !== this.turnKey) {
      this.turnKey = key;
      if (this.actTimer) clearTimeout(this.actTimer);
      this.actTimer = null;
      if (s.toAct) {
        const p = getPlayer(s, s.toAct)!;
        const secs = p.sittingOut ? 2 : p.connected ? s.settings.actionTime : Math.min(10, s.settings.actionTime);
        this.deadline = Date.now() + secs * 1000;
        this.actTimer = setTimeout(() => {
          const cur = getPlayer(s, s.toAct ?? '');
          if (!cur) return;
          if (!cur.sittingOut) cur.sittingOut = true; // qui deixa passar el temps queda "assegut fora"
          timeoutAct(s);
          this.update();
        }, secs * 1000);
      }
    }

    // mà següent
    const wantNext = s.started && !s.paused && !isHandRunning(s) && (s.phase === 'showdown' || canStartHand(s));
    const nk = wantNext ? `${s.handNo}|${s.phase}` : '';
    if (nk !== this.nextKey) {
      this.nextKey = nk;
      if (this.nextTimer) clearTimeout(this.nextTimer);
      this.nextTimer = null;
      if (wantNext) {
        const delay = s.phase === 'showdown' ? (s.showdown ? 6500 : 3500) : 1500;
        this.nextTimer = setTimeout(() => {
          this.nextKey = '';
          if (s.started && !s.paused) startHand(s);
          this.update();
        }, delay);
      }
    }

    try {
      const save: HostSave = { code: this.st.code, state: s, tokens: this.tokens, hostId: this.hostId, chat: this.chat };
      localStorage.setItem(HOST_KEY, JSON.stringify(save));
    } catch {
      /* sense espai: no és crític */
    }

    const extra = { code: this.st.code, hostId: this.hostId, deadline: this.deadline, connected, chat: this.chat };
    for (const [id, c] of this.conns) {
      if (c.open) c.send({ t: 'state', view: buildView(s, id, extra) } satisfies HostMsg);
    }
    this.set({ view: buildView(s, this.hostId, extra), receivedAt: Date.now() });
  }

  send(msg: ClientMsg) {
    this.handle(this.hostId, msg);
  }

  close() {
    this.closed = true;
    if (this.actTimer) clearTimeout(this.actTimer);
    if (this.nextTimer) clearTimeout(this.nextTimer);
    for (const c of this.conns.values()) c.send({ t: 'kicked' } satisfies HostMsg);
    setTimeout(() => this.peer?.destroy(), 300);
    try {
      localStorage.removeItem(HOST_KEY);
    } catch {
      /* res */
    }
    this.set({ status: 'closed' });
  }
}

// ───────────────────────────── Jugador ─────────────────────────────

export const CLIENT_KEY = 'nitpoker-client';

export interface ClientSave {
  code: string;
  token: string;
}

export function loadClientSave(): ClientSave | null {
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    return raw ? (JSON.parse(raw) as ClientSave) : null;
  } catch {
    return null;
  }
}

export class ClientSession extends Base {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private closed = false;
  private everConnected = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private onVis = () => {
    if (document.visibilityState === 'visible' && !this.closed && !this.conn?.open) this.reconnectSoon(0);
  };

  constructor(
    code: string,
    private profile: { token: string; name: string; avatar: number },
  ) {
    super(code, false);
    try {
      localStorage.setItem(CLIENT_KEY, JSON.stringify({ code, token: profile.token } satisfies ClientSave));
    } catch {
      /* res */
    }
    document.addEventListener('visibilitychange', this.onVis);
    this.openPeer();
  }

  private openPeer() {
    if (this.closed) return;
    this.peer?.destroy();
    const peer = new Peer(PEER_OPTS);
    this.peer = peer;
    peer.on('open', () => this.connect());
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      if (this.closed) return;
      const type = (err as { type?: string }).type;
      if (type === 'peer-unavailable') {
        if (!this.everConnected) {
          this.set({ status: 'error', error: 'No hi ha cap mesa oberta amb aquest codi.' });
          this.closed = true;
          peer.destroy();
          return;
        }
        this.set({ status: 'reconnecting', error: "Esperant l'amfitrió…" });
        this.reconnectSoon(3000);
      } else if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'Aquest navegador no suporta WebRTC.' });
      } else {
        this.set({ status: 'reconnecting', error: 'Problema de connexió. Reintentant…' });
        this.retryTimer = setTimeout(() => this.openPeer(), 3000);
      }
    });
  }

  private connect() {
    if (this.closed || !this.peer || this.peer.destroyed) return;
    if (this.peer.disconnected) {
      this.openPeer();
      return;
    }
    this.conn?.close();
    const conn = this.peer.connect(PEER_PREFIX + this.st.code, { reliable: true, serialization: 'json' });
    this.conn = conn;
    const openTimeout = setTimeout(() => {
      if (!conn.open && this.conn === conn) {
        conn.close();
        this.reconnectSoon(1000);
      }
    }, 12000);
    conn.on('open', () => {
      clearTimeout(openTimeout);
      this.everConnected = true;
      conn.send({ t: 'hello', ...this.profile } satisfies ClientMsg);
      this.set({ status: 'online', error: null });
    });
    conn.on('data', (raw) => {
      const msg = raw as HostMsg;
      if (msg.t === 'state') this.set({ view: msg.view, receivedAt: Date.now() });
      else if (msg.t === 'error') this.set({ notice: { msg: msg.msg, at: Date.now() } });
      else if (msg.t === 'kicked') {
        this.closed = true;
        this.forget();
        this.set({ status: 'closed', error: "La mesa s'ha tancat o l'amfitrió t'ha tret." });
        this.peer?.destroy();
      }
    });
    conn.on('close', () => {
      clearTimeout(openTimeout);
      if (this.conn !== conn || this.closed) return;
      this.set({ status: 'reconnecting', error: 'Connexió perduda. Reconnectant…' });
      this.reconnectSoon(2000);
    });
  }

  private reconnectSoon(ms: number) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), ms);
  }

  private forget() {
    try {
      localStorage.removeItem(CLIENT_KEY);
    } catch {
      /* res */
    }
  }

  send(msg: ClientMsg) {
    if (this.conn?.open) this.conn.send(msg);
    else this.set({ notice: { msg: 'Sense connexió, torna-ho a provar', at: Date.now() } });
  }

  close() {
    if (this.conn?.open) this.conn.send({ t: 'leave' } satisfies ClientMsg);
    this.closed = true;
    this.forget();
    document.removeEventListener('visibilitychange', this.onVis);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    setTimeout(() => this.peer?.destroy(), 300);
    this.set({ status: 'closed' });
  }
}
