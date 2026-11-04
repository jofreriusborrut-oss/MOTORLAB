import { useEffect, useState } from 'react';
import type { ClientMsg, PlayerView, TableView } from '../net/protocol';

type Pre = null | 'checkfold' | 'callany';

interface Props {
  v: TableView;
  me: PlayerView | null;
  send: (m: ClientMsg) => void;
  fmt: (n: number) => string;
  isHost: boolean;
}

export function ActionBar({ v, me, send, fmt, isHost }: Props) {
  const L = v.legal;
  const [raising, setRaising] = useState(false);
  const [amount, setAmount] = useState(0);
  const [pre, setPre] = useState<Pre>(null);
  const running = ['preflop', 'flop', 'turn', 'river'].includes(v.phase);

  const act = (action: Extract<ClientMsg, { t: 'action' }>['action']) => {
    send({ t: 'action', action, handNo: v.handNo });
    setRaising(false);
    setPre(null);
  };

  // les pre-accions caduquen en canviar de carrer o de mà
  useEffect(() => {
    setPre(null);
  }, [v.handNo, v.phase]);
  useEffect(() => {
    if (!L.canAct) setRaising(false);
    else setAmount(L.minRaiseTo);
  }, [L.canAct, L.minRaiseTo]);

  // executa la pre-acció quan arriba el torn
  useEffect(() => {
    if (!L.canAct || !pre) return;
    if (pre === 'checkfold') act(L.canCheck ? { type: 'check' } : { type: 'fold' });
    else act(L.canCheck ? { type: 'check' } : { type: 'call' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L.canAct, v.turnId]);

  if (!me) return <div className="pk-actions pk-actions-info">Mira la partida: la mesa és plena.</div>;

  // ── no és el teu torn ──
  if (!L.canAct) {
    const inPlay = running && me.inHand && !me.folded && !me.allIn;
    const buttons: JSX.Element[] = [];
    if (inPlay) {
      buttons.push(
        <button key="cf" className={`pk-pre${pre === 'checkfold' ? ' on' : ''}`} onClick={() => setPre(pre === 'checkfold' ? null : 'checkfold')}>
          <span className="pk-box" />
          Passar / Retirar-se
        </button>,
        <button key="ca" className={`pk-pre${pre === 'callany' ? ' on' : ''}`} onClick={() => setPre(pre === 'callany' ? null : 'callany')}>
          <span className="pk-box" />
          Igualar el que sigui
        </button>,
      );
    }
    if (v.phase === 'showdown' && me.inHand && !v.showdown && v.winners.some((w) => w.playerId === me.id) && !!me.cards?.length) {
      buttons.push(
        <button key="show" className="pk-btn pk-btn-dark" onClick={() => send({ t: 'show' })}>
          Ensenyar cartes
        </button>,
      );
    }
    if (me.stack === 0 && !(running && me.inHand && !me.folded)) {
      buttons.push(
        v.settings.allowRebuy ? (
          <button key="rb" className="pk-btn pk-btn-red" onClick={() => send({ t: 'rebuy' })}>
            Recomprar {fmt(v.settings.startingStack)}
          </button>
        ) : (
          <div key="rb" className="pk-actions-info">Sense fitxes</div>
        ),
      );
    }
    if (me.sittingOut) {
      buttons.push(
        <button key="back" className="pk-btn pk-btn-green" onClick={() => send({ t: 'sitout', value: false })}>
          Tornar a jugar
        </button>,
      );
    }
    if (isHost && !v.started && !running) {
      buttons.push(
        <button key="start" className="pk-btn pk-btn-red pk-btn-big" disabled={v.players.length < 2} onClick={() => send({ t: 'host:start' })}>
          {v.players.length < 2 ? 'Calen 2 jugadors' : `Començar partida (${v.players.length})`}
        </button>,
      );
    }
    if (isHost && v.started && v.paused) {
      buttons.push(
        <button key="resume" className="pk-btn pk-btn-red pk-btn-big" onClick={() => send({ t: 'host:pause', value: false })}>
          Reprendre la partida
        </button>,
      );
    }
    if (!buttons.length) {
      const who = v.players.find((p) => p.id === v.toAct);
      return <div className="pk-actions pk-actions-info">{who ? `Torn de ${who.name}…` : ' '}</div>;
    }
    return <div className="pk-actions pk-actions-wrap">{buttons}</div>;
  }

  // ── et toca ──
  const callIsAllIn = L.toCall > 0 && L.toCall >= me.stack;
  const pot = v.totalPot;
  const clamp = (n: number) => Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, Math.round(n)));
  const potTo = (f: number) => clamp(v.currentBet + f * (pot + L.toCall));
  const isBet = v.currentBet === 0;
  const presets: [string, number][] =
    v.phase === 'preflop'
      ? v.currentBet <= v.handBB
        ? [['2,5 BB', 2.5 * v.handBB], ['3 BB', 3 * v.handBB], ['4 BB', 4 * v.handBB], ['Pot', potTo(1)]]
        : [['2,5x', 2.5 * v.currentBet], ['3x', 3 * v.currentBet], ['Pot', potTo(1)]]
      : [['⅓', potTo(1 / 3)], ['½', potTo(1 / 2)], ['¾', potTo(3 / 4)], ['Pot', potTo(1)]];
  const step = Math.max(1, v.handBB);

  if (raising && L.canRaise) {
    const isAll = amount >= L.maxRaiseTo;
    return (
      <div className="pk-actions pk-raise">
        <div className="pk-presets">
          {presets.map(([l, n]) => (
            <button key={l} className={clamp(n) === amount ? 'on' : ''} onClick={() => setAmount(clamp(n))}>
              {l}
            </button>
          ))}
          <button className={isAll ? 'on' : ''} onClick={() => setAmount(L.maxRaiseTo)}>
            All-in
          </button>
        </div>
        <div className="pk-slider-row">
          <button className="pk-step" onClick={() => setAmount(clamp(amount - step))}>
            −
          </button>
          <input
            type="range"
            min={L.minRaiseTo}
            max={L.maxRaiseTo}
            step={1}
            value={amount}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
          />
          <button className="pk-step" onClick={() => setAmount(clamp(amount + step))}>
            +
          </button>
        </div>
        <div className="pk-row">
          <button className="pk-btn pk-btn-dark" onClick={() => setRaising(false)}>
            Enrere
          </button>
          <button className="pk-btn pk-btn-red pk-btn-grow" onClick={() => act(isAll ? { type: 'allin' } : { type: 'raise', amount })}>
            {isAll ? `All-in ${fmt(L.maxRaiseTo)}` : `${isBet ? 'Apostar' : 'Pujar a'} ${fmt(amount)}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pk-actions pk-row pk-main-actions">
      <button className="pk-btn pk-btn-fold" onClick={() => act({ type: 'fold' })}>
        Retirar-se
      </button>
      {L.canCheck ? (
        <button className="pk-btn pk-btn-green" onClick={() => act({ type: 'check' })}>
          Passar
        </button>
      ) : (
        <button className="pk-btn pk-btn-green" onClick={() => act({ type: 'call' })}>
          {callIsAllIn ? 'All-in' : 'Igualar'} {fmt(L.toCall)}
        </button>
      )}
      {L.canRaise && (
        <button className="pk-btn pk-btn-red" onClick={() => setRaising(true)}>
          {isBet ? 'Apostar' : 'Pujar'}
        </button>
      )}
    </div>
  );
}
