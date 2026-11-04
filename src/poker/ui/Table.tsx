import { useEffect, useMemo, useRef, useState } from 'react';
import { describeHand } from '../engine/evaluate';
import { MAX_SEATS } from '../engine/game';
import type { PlayerView, TableView } from '../net/protocol';
import type { Session, SessionState } from '../net/session';
import { ActionBar } from './ActionBar';
import { AVATARS, beep, CardView, makeFmt, shareInvite } from './common';
import { ChatPanel, MenuPanel } from './Panels';

// Posició de cada jugador repartida uniformement sobre l'oval, començant per tu (a baix) en sentit horari.
function seatPos(i: number, n: number): [number, number] {
  const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
  const x = 50 + 41 * Math.cos(a);
  const y = 51 + 37 * Math.sin(a);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const PHASE_TXT: Record<string, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Fi de la mà' };

export function Table({ session, st }: { session: Session; st: SessionState }) {
  const v = st.view!;
  const [bbMode, setBbMode] = useState(false);
  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fmt = makeFmt(bbMode, v.handBB);
  const me = v.players.find((p) => p.id === v.you) ?? null;
  const mySeat = me?.seat ?? 0;
  const isHost = v.you === v.hostId;

  // avisos
  useEffect(() => {
    if (!st.notice) return;
    setToast(st.notice.msg);
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [st.notice]);

  // so i vibració quan et toca
  const myTurn = v.toAct !== null && v.toAct === v.you;
  useEffect(() => {
    if (myTurn) {
      beep(880, 140);
      navigator.vibrate?.(150);
    }
  }, [myTurn, v.handNo]);

  // mantenir la pantalla encesa
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch {
        /* no suportat */
      }
    };
    req();
    const onVis = () => document.visibilityState === 'visible' && req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  // bombolles de xat recents
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const bubbles = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of v.chat) if (now - c.at < 5000 && c.at > st.receivedAt - 60000) m.set(c.id, c.text);
    return m;
  }, [v.chat, now, st.receivedAt]);
  const [lastChatSeen, setLastChatSeen] = useState(0);
  const unread = !chat && v.chat.some((c) => c.at > lastChatSeen && c.id !== v.you);

  const winnerIds = new Set(v.winners.map((w) => w.playerId));
  const winningCards = new Set(v.showdown ? v.winners.flatMap((w) => w.best) : []);
  const running = ['preflop', 'flop', 'turn', 'river'].includes(v.phase);

  const share = async () => {
    const r = await shareInvite(v.code);
    if (r) setToast(r);
  };

  const myHand = me?.cards && running ? describeHand([...me.cards, ...v.board]) : null;

  return (
    <div className="pk-app">
      <header className="pk-top">
        <button className="pk-icon" onClick={() => setMenu(true)} aria-label="Menú">
          ☰
        </button>
        <button className="pk-room" onClick={share}>
          <span className={`pk-dot pk-dot-${st.status}`} />
          Sala <b>{v.code}</b>
          <span className="pk-share">Convidar ↗</span>
        </button>
        <button className={`pk-icon pk-bb${bbMode ? ' on' : ''}`} onClick={() => setBbMode(!bbMode)}>
          BB
        </button>
        <button
          className={`pk-icon${unread ? ' pk-unread' : ''}`}
          onClick={() => {
            setChat(true);
            setLastChatSeen(Date.now());
          }}
          aria-label="Xat"
        >
          💬
        </button>
      </header>

      {st.status !== 'online' && st.error && <div className="pk-banner">{st.error}</div>}

      <main className="pk-table-wrap">
        <div className="pk-felt">
          <div className="pk-felt-inner" />
        </div>

        <div className="pk-center">
          {running || v.phase === 'showdown' ? (
            <>
              <div className="pk-pot">
                {v.phase === 'showdown' && v.pots.length > 1
                  ? v.pots.map((p, i) => <span key={i}>{i === 0 ? 'Pot' : `Lateral ${i}`}: {fmt(p)}</span>)
                  : <span>Pot: {fmt(v.phase === 'showdown' ? v.pots.reduce((a, b) => a + b, 0) : v.totalPot)}</span>}
              </div>
              <div className="pk-board">
                {Array.from({ length: 5 }, (_, i) =>
                  v.board[i] ? (
                    <CardView key={i + v.board[i]} card={v.board[i]} dim={v.showdown && winningCards.size > 0 && !winningCards.has(v.board[i])} glow={winningCards.has(v.board[i])} />
                  ) : (
                    <div key={i} className="pk-card pk-card-md pk-slot" />
                  ),
                )}
              </div>
              <div className="pk-phase">{v.paused ? '⏸ Pausa (després d\'aquesta mà)' : PHASE_TXT[v.phase]}</div>
              {v.phase === 'showdown' && v.winners.length > 0 && <WinnerBanner v={v} fmt={fmt} />}
            </>
          ) : (
            <div className="pk-waiting">
              {v.paused ? (
                <p>⏸ Partida en pausa</p>
              ) : v.players.length < 2 ? (
                <>
                  <p>Esperant jugadors…</p>
                  <p className="pk-big-code">{v.code}</p>
                  <button className="pk-btn pk-btn-red" onClick={share}>
                    Convidar amics
                  </button>
                </>
              ) : v.started ? (
                <p>Preparant la mà següent…</p>
              ) : (
                <p>{isHost ? 'Quan hi siguin tots, comença la partida' : "Esperant que l'amfitrió comenci…"}</p>
              )}
            </div>
          )}
        </div>

        {orderFrom(v.players, mySeat).map((p, i, arr) => {
          return (
            <Seat
              key={p.id}
              p={p}
              v={v}
              pos={seatPos(i, arr.length)}
              me={p.id === v.you}
              winner={winnerIds.has(p.id)}
              fmt={fmt}
              bubble={bubbles.get(p.id)}
              receivedAt={st.receivedAt}
              highlight={winningCards}
            />
          );
        })}
      </main>

      <footer className="pk-bottom">
        {me && me.cards && (running || v.phase === 'showdown') && (
          <div className="pk-hero">
            <div className={`pk-hero-cards${me.folded ? ' pk-folded' : ''}`}>
              {me.cards.map((c) => (
                <CardView key={c} card={c} size="lg" glow={winningCards.has(c) && winnerIds.has(me.id)} />
              ))}
            </div>
            {myHand && !me.folded && <div className="pk-hand-name">{myHand}</div>}
          </div>
        )}
        <ActionBar v={v} me={me} send={(m) => session.send(m)} fmt={fmt} isHost={isHost} />
      </footer>

      {toast && <div className="pk-toast">{toast}</div>}
      {menu && <MenuPanel v={v} session={session} isHost={isHost} fmt={fmt} onClose={() => setMenu(false)} onShare={share} />}
      {chat && (
        <ChatPanel
          v={v}
          send={(t) => session.send({ t: 'chat', text: t })}
          onClose={() => {
            setChat(false);
            setLastChatSeen(Date.now());
          }}
        />
      )}
    </div>
  );
}

function WinnerBanner({ v, fmt }: { v: TableView; fmt: (n: number) => string }) {
  const agg = new Map<string, { amount: number; hand: string | null }>();
  for (const w of v.winners) {
    const a = agg.get(w.playerId) ?? { amount: 0, hand: w.hand };
    a.amount += w.amount;
    agg.set(w.playerId, a);
  }
  return (
    <div className="pk-winner">
      {[...agg.entries()].map(([id, a]) => {
        const p = v.players.find((x) => x.id === id);
        return (
          <div key={id}>
            🏆 <b>{p?.name ?? '—'}</b> guanya {fmt(a.amount)}
            {a.hand && v.showdown ? <span> · {a.hand}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function Seat({
  p,
  v,
  pos,
  me,
  winner,
  fmt,
  bubble,
  receivedAt,
  highlight,
}: {
  p: PlayerView;
  v: TableView;
  pos: [number, number];
  me: boolean;
  winner: boolean;
  fmt: (n: number) => string;
  bubble?: string;
  receivedAt: number;
  highlight: Set<string>;
}) {
  const acting = v.toAct === p.id;
  const [x, y] = pos;
  // la fitxa d'aposta es col·loca entre el seient i el centre
  const bx = x + (50 - x) * 0.38;
  const by = y + (48 - y) * 0.36;
  const total = Math.max(v.settings.actionTime * 1000, v.timeLeftMs);
  const elapsed = total - v.timeLeftMs + (Date.now() - receivedAt);
  const status = !p.connected ? 'Desconnectat' : p.sittingOut && !p.inHand ? 'Assegut fora' : null;
  const showCards = p.hasCards && !me;
  const top = y < 40;

  return (
    <>
      <div
        className={`pk-seat${acting ? ' pk-acting' : ''}${p.folded && p.inHand ? ' pk-seat-folded' : ''}${winner ? ' pk-seat-win' : ''}${!p.connected ? ' pk-off' : ''}`}
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        {showCards && (
          <div className={`pk-seat-cards${p.cards ? ' pk-shown' : ''}`}>
            {(p.cards ?? [null, null]).map((c, i) => (
              <CardView key={i} card={c} size="sm" glow={!!c && winner && highlight.has(c)} />
            ))}
          </div>
        )}
        <div className="pk-avatar">
          <span>{AVATARS[p.avatar] ?? '🙂'}</span>
          {acting && (
            <svg className="pk-timer" viewBox="0 0 44 44">
              <circle
                key={v.turnId}
                cx="22"
                cy="22"
                r="20"
                style={{ animationDuration: `${total}ms`, animationDelay: `-${Math.max(0, elapsed)}ms` }}
              />
            </svg>
          )}
          {v.dealerSeat === p.seat && (v.phase !== 'waiting') && <span className="pk-dealer">D</span>}
        </div>
        <div className="pk-plate">
          {status || p.lastAction ? (
            <div className={`pk-name pk-act pk-tag-${(p.lastAction ?? 'off').toLowerCase().replace(/[^a-z]/g, '')}`}>{status ?? p.lastAction}</div>
          ) : (
            <div className="pk-name">
              {p.isHost && <span title="Amfitrió">★</span>}
              {p.name}
            </div>
          )}
          <div className="pk-stack">{p.allIn && p.stack === 0 && p.inHand ? 'ALL-IN' : fmt(p.stack)}</div>
        </div>
        {bubble && <div className={`pk-bubble${top ? ' pk-bubble-down' : ''}`}>{bubble}</div>}
      </div>
      {p.bet > 0 && (
        <div className="pk-bet" style={{ left: `${bx}%`, top: `${by}%` }}>
          <span className="pk-chip" />
          {fmt(p.bet)}
        </div>
      )}
    </>
  );
}

function orderFrom(players: PlayerView[], seat: number) {
  return [...players].sort((a, b) => ((a.seat - seat + MAX_SEATS) % MAX_SEATS) - ((b.seat - seat + MAX_SEATS) % MAX_SEATS));
}

export function useSession(session: Session | null) {
  const [st, setSt] = useState<SessionState | null>(session?.get() ?? null);
  const ref = useRef(session);
  ref.current = session;
  useEffect(() => {
    if (!session) {
      setSt(null);
      return;
    }
    return session.subscribe(setSt);
  }, [session]);
  return st;
}
