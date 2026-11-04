import { useEffect, useRef, useState } from 'react';
import type { TableView } from '../net/protocol';
import type { Session } from '../net/session';
import { AVATARS } from './common';

const QUICK = ['👍', '😂', '😱', '🔥', '🤑', '😤', 'GG', 'Bona mà!', 'Quin farol…', 'Va, paga!'];

export function ChatPanel({ v, send, onClose }: { v: TableView; send: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView();
  }, [v.chat.length]);
  const go = (t: string) => {
    if (t.trim()) send(t.trim());
    setText('');
  };
  return (
    <div className="pk-sheet-bg" onClick={onClose}>
      <div className="pk-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pk-sheet-head">
          <h3>Xat</h3>
          <button className="pk-icon" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pk-chat-list">
          {v.chat.length === 0 && <p className="pk-hint">Encara no hi ha missatges.</p>}
          {v.chat.map((c, i) => (
            <div key={i} className={`pk-chat-line${c.id === v.you ? ' mine' : ''}`}>
              <b>{c.from}</b> {c.text}
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="pk-quick">
          {QUICK.map((q) => (
            <button key={q} onClick={() => go(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="pk-row"
          onSubmit={(e) => {
            e.preventDefault();
            go(text);
          }}
        >
          <input className="pk-input" value={text} maxLength={120} placeholder="Escriu…" onChange={(e) => setText(e.target.value)} />
          <button className="pk-btn pk-btn-red" type="submit">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

export function MenuPanel({
  v,
  session,
  isHost,
  fmt,
  onClose,
  onShare,
}: {
  v: TableView;
  session: Session;
  isHost: boolean;
  fmt: (n: number) => string;
  onClose: () => void;
  onShare: () => void;
}) {
  const [tab, setTab] = useState<'game' | 'ledger' | 'log' | 'host'>('game');
  const me = v.players.find((p) => p.id === v.you);
  const send = session.send.bind(session);

  return (
    <div className="pk-sheet-bg" onClick={onClose}>
      <div className="pk-sheet pk-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="pk-sheet-head">
          <h3>Sala {v.code}</h3>
          <button className="pk-icon" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pk-tabs pk-tabs-sm">
          <button className={tab === 'game' ? 'on' : ''} onClick={() => setTab('game')}>
            Partida
          </button>
          <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')}>
            Comptes
          </button>
          <button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
            Historial
          </button>
          {isHost && (
            <button className={tab === 'host' ? 'on' : ''} onClick={() => setTab('host')}>
              Amfitrió
            </button>
          )}
        </div>

        <div className="pk-sheet-body">
          {tab === 'game' && (
            <div className="pk-menu-list">
              <div className="pk-info-grid">
                <span>Cegues</span>
                <b>
                  {v.settings.smallBlind}/{v.settings.bigBlind}
                </b>
                <span>Fitxes inicials</span>
                <b>{v.settings.startingStack}</b>
                <span>Temps per jugada</span>
                <b>{v.settings.actionTime}s</b>
                <span>Recompres</span>
                <b>{v.settings.allowRebuy ? 'Sí' : 'No'}</b>
                <span>Mans jugades</span>
                <b>{v.handNo}</b>
              </div>
              <button className="pk-btn pk-btn-dark" onClick={onShare}>
                📲 Convidar amics (enllaç)
              </button>
              {me && (
                <button className="pk-btn pk-btn-dark" onClick={() => send({ t: 'sitout', value: !me.sittingOut })}>
                  {me.sittingOut ? '▶ Tornar a jugar' : '⏸ Seure fora (saltar mans)'}
                </button>
              )}
              {me && me.stack === 0 && v.settings.allowRebuy && (
                <button className="pk-btn pk-btn-dark" onClick={() => send({ t: 'rebuy' })}>
                  💰 Recomprar {v.settings.startingStack}
                </button>
              )}
              <button
                className="pk-btn pk-btn-fold"
                onClick={() => {
                  if (confirm(isHost ? 'Tancar la mesa per a tothom?' : 'Segur que vols sortir de la mesa?')) session.close();
                }}
              >
                {isHost ? 'Tancar la mesa' : 'Sortir de la mesa'}
              </button>
            </div>
          )}

          {tab === 'ledger' && (
            <table className="pk-ledger">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Comprat</th>
                  <th>Fitxes</th>
                  <th>+/−</th>
                </tr>
              </thead>
              <tbody>
                {v.ledger.map((l, i) => {
                  const net = l.cashOut - l.buyIn;
                  return (
                    <tr key={i}>
                      <td>{l.name}</td>
                      <td>{l.buyIn}</td>
                      <td>{l.cashOut}</td>
                      <td className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>
                        {net > 0 ? '+' : ''}
                        {net}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'log' && (
            <div className="pk-log">
              {[...v.log].reverse().map((l, i) => (
                <div key={i} className={l.startsWith('—') ? 'pk-log-hand' : ''}>
                  {l}
                </div>
              ))}
            </div>
          )}

          {tab === 'host' && isHost && <HostTab v={v} session={session} fmt={fmt} />}
        </div>
      </div>
    </div>
  );
}

function HostTab({ v, session, fmt }: { v: TableView; session: Session; fmt: (n: number) => string }) {
  const [sb, setSb] = useState(v.settings.smallBlind);
  const [bb, setBb] = useState(v.settings.bigBlind);
  const [stack, setStack] = useState(v.settings.startingStack);
  const [time, setTime] = useState(v.settings.actionTime);
  const [rebuy, setRebuy] = useState(v.settings.allowRebuy);
  const send = session.send.bind(session);
  const num = (f: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => f(Math.round(Number(e.target.value)));

  return (
    <div className="pk-menu-list">
      {v.started && (
        <button className="pk-btn pk-btn-dark" onClick={() => send({ t: 'host:pause', value: !v.paused })}>
          {v.paused ? '▶ Reprendre la partida' : '⏸ Pausar després d\'aquesta mà'}
        </button>
      )}
      <div className="pk-grid2">
        <div>
          <label className="pk-label">Cega petita</label>
          <input className="pk-input" type="number" inputMode="numeric" value={sb || ''} onChange={num(setSb)} />
        </div>
        <div>
          <label className="pk-label">Cega gran</label>
          <input className="pk-input" type="number" inputMode="numeric" value={bb || ''} onChange={num(setBb)} />
        </div>
        <div>
          <label className="pk-label">Fitxes / recompra</label>
          <input className="pk-input" type="number" inputMode="numeric" value={stack || ''} onChange={num(setStack)} />
        </div>
        <div>
          <label className="pk-label">Temps (s)</label>
          <input className="pk-input" type="number" inputMode="numeric" value={time || ''} onChange={num(setTime)} />
        </div>
      </div>
      <label className="pk-check">
        <input type="checkbox" checked={rebuy} onChange={(e) => setRebuy(e.target.checked)} /> Permetre recompres
      </label>
      <button
        className="pk-btn pk-btn-red"
        onClick={() => send({ t: 'host:settings', settings: { smallBlind: sb, bigBlind: bb, startingStack: stack, actionTime: time, allowRebuy: rebuy } })}
      >
        Desar (s'aplica a la mà següent)
      </button>

      <h4 className="pk-sub">Jugadors</h4>
      {v.players.map((p) => (
        <div key={p.id} className="pk-host-player">
          <span>
            {AVATARS[p.avatar]} {p.name} <small>{fmt(p.stack)}</small>
            {!p.connected && <small className="neg"> · desconnectat</small>}
          </span>
          <span className="pk-row">
            <button
              className="pk-mini"
              onClick={() => {
                const r = prompt(`Fitxes a afegir a ${p.name} (negatiu per treure):`, String(v.settings.startingStack));
                if (r) send({ t: 'host:chips', playerId: p.id, amount: Number(r) });
              }}
            >
              ± fitxes
            </button>
            {p.id !== v.hostId && (
              <button className="pk-mini neg" onClick={() => confirm(`Treure ${p.name} de la mesa?`) && send({ t: 'host:kick', playerId: p.id })}>
                Treure
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
