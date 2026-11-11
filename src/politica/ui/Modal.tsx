import { chooseEvent, dismissModal, warOffer } from '../engine/actions';
import { partyById } from '../engine/model';
import { useGame, useStore } from '../store';
import { FxChips } from './common';
import { GROUPS } from '../data/groups';
import { Hemicycle } from './panels/PoliticsPanels';

export default function Modal() {
  const g = useGame();
  const { act } = useStore();
  const m = g.modalQueue[0];
  if (!m) return null;
  const close = () => act((x) => dismissModal(x));
  return (
    <div className="modal-bg">
      <div className={`modal ${m.kind}`} role="dialog" aria-modal>
        <h2>{m.title}</h2>
        <p className="mtext">{m.text}</p>
        {m.kind === 'event' && m.event && (
          <div className="choices">
            {m.event.choices.map((c, i) => {
              const reacts = GROUPS.filter((gr) => Math.abs(c.g[gr.id] ?? 0) >= 3);
              return (
                <button key={i} className="choice" onClick={() => act((x) => chooseEvent(x, i))}>
                  <b>{c.label}</b>
                  {c.desc && <small>{c.desc}</small>}
                  <FxChips fx={c.fx as Record<string, number>} />
                  {reacts.length > 0 && <div className="reacts">{reacts.map((gr) => <span key={gr.id} className={(c.g[gr.id] ?? 0) > 0 ? 'good' : 'bad'}>{gr.icon} {(c.g[gr.id] ?? 0) > 0 ? '+' : ''}{c.g[gr.id]}</span>)}</div>}
                </button>
              );
            })}
          </div>
        )}
        {m.kind === 'election' && m.data && (
          <div className="elec">
            <Hemicycle parties={g.parties} total={g.def.seats} gov={m.data.gov} />
            {[...g.parties].sort((a, b) => (m.data.seats[b.id] ?? 0) - (m.data.seats[a.id] ?? 0)).map((p) => {
              const d = (m.data.seats[p.id] ?? 0) - (m.data.before[p.id] ?? 0);
              return (
                <div key={p.id} className="brow">
                  <span><i className="dot" style={{ background: p.color }} /> {p.short}{p.id === g.playerParty ? ' ⭐' : ''}{m.data.gov.includes(p.id) ? ' 🏛️' : ''}</span>
                  <div className="bar" style={{ height: 8 }}><i style={{ width: `${m.data.votes[p.id] * 100 * 2}%`, background: p.color }} /></div>
                  <b>{(m.data.votes[p.id] * 100).toFixed(1)}%</b>
                  <small>{m.data.seats[p.id]} esc. <span className={d > 0 ? 'good' : d < 0 ? 'bad' : 'dim'}>({d >= 0 ? '+' : ''}{d})</span></small>
                </div>
              );
            })}
            <p className="small">Govern: {m.data.gov.map((id: string) => partyById(g, id)?.name).join(' + ')}</p>
          </div>
        )}
        {m.kind === 'referendum' && m.data && (
          <div className="elec">
            <div className="poll-big"><div className="yes" style={{ width: `${m.data.yes}%` }}>SÍ {m.data.yes.toFixed(1)}%</div><div className="no">NO {(100 - m.data.yes).toFixed(1)}%</div></div>
          </div>
        )}
        {m.kind === 'war' && m.data?.offer ? (
          <div className="mbtns">
            <button className="btn primary" onClick={() => act((x) => warOffer(x, true))}>{m.data.offer === 'peace' ? 'Acceptar la pau' : 'Rendir-se'}</button>
            <button className="btn" onClick={() => act((x) => warOffer(x, false))}>{m.data.offer === 'peace' ? 'Continuar la guerra' : 'Resistir'}</button>
          </div>
        ) : m.kind !== 'event' && (
          <div className="mbtns"><button className="btn primary" onClick={close} autoFocus>D'acord</button></div>
        )}
      </div>
    </div>
  );
}
