import { useState } from 'react';
import { BLOCS, COUNTRY_BY_ID } from '../../data/countries';
import { callReferendum, diplo, joinBloc, leaveBloc, refCampaign } from '../../engine/actions';
import { blocEligible, groupYes, refCost, referendumPoll } from '../../engine/referendum';
import { enemyOf, playerFront } from '../../engine/sim';
import type { Emblem, Flag as FlagT, Shape, StateForm } from '../../engine/types';
import { GROUPS } from '../../data/groups';
import { fmtMoney } from '../../engine/util';
import { useGame, useStore } from '../../store';
import Flag from '../Flag';
import { Bar, Row, Section } from '../common';
import { RG_LABEL, ideoLabel } from '../format';

export function DiplomacyPanel() {
  const g = useGame();
  const { selNation, setSelNation, act, setView } = useStore();
  const n = selNation ? g.nations[selNation] : null;
  const list = Object.values(g.nations).sort((a, b) => b.rel - a.rel);
  const ro = !g.inPower;
  if (!n) {
    return (
      <div className="panel">
        <div className="ph"><small>Exterior</small><h2>Diplomàcia</h2><p className="dim">Tria un país al mapa del món o a la llista.</p></div>
        <button className="btn ghost sm" onClick={() => setView('mon')}>🌍 Obrir el mapa del món</button>
        <div className="rank">
          {list.map((x) => (
            <button key={x.id} className="rank-row" onClick={() => setSelNation(x.id)}>
              <Flag flag={x.flag} w={24} /><span className="nm">{x.name}</span>
              <span className="icons">{x.wars.includes(g.countryId) ? '⚔️' : ''}{x.alliance ? '🛡️' : ''}{x.trade ? '🤝' : ''}{x.sanctioned || x.sanctionsOnUs ? '🚫' : ''}</span>
              <b className={x.rel > 30 ? 'good' : x.rel < -30 ? 'bad' : ''}>{x.rel.toFixed(0)}</b>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const war = g.wars.find((w) => (w.a === n.id && w.b === g.countryId) || (w.b === n.id && w.a === g.countryId));
  const B = (k: string, label: string, cost: number, disabled = false, title?: string) => (
    <button className="btn sm" disabled={ro || disabled || g.pc < cost} title={title} onClick={() => act((x) => diplo(x, n.id, k))}>{label}{cost ? ` · ⚡${cost}` : ''}</button>
  );
  const others = n.wars.filter((x) => x !== g.countryId).map((x) => g.nations[x]?.name ?? '?');
  return (
    <div className="panel">
      <button className="btn ghost sm back" onClick={() => setSelNation(null)}>← Tots els països</button>
      <div className="nation-head">
        <Flag flag={n.flag} w={64} />
        <div>
          <h2>{n.name}</h2>
          <p className="dim">{RG_LABEL[n.rg]} · {n.leader} · {ideoLabel(n.ideo)}</p>
          <p className="small">{n.blocs.map((b) => BLOCS[b]?.name).join(' · ') || 'Sense blocs'}</p>
        </div>
      </div>
      <div className="rel-box">
        <span>Relació</span>
        <div className="relbar"><i style={{ left: `${(n.rel + 100) / 2}%` }} /></div>
        <b className={n.rel > 30 ? 'good' : n.rel < -30 ? 'bad' : ''}>{n.rel.toFixed(0)}</b>
      </div>
      <Section title="Dades">
        <Row label="PIB" value={fmtMoney(n.gdp)} sub={`${n.growth.toFixed(1)}% anual`} />
        <Row label="PIB per càpita" value={`${Math.round((n.gdp / n.pop) * 1000).toLocaleString('ca')} $`} />
        <Row label="Població" value={`${n.pop.toFixed(1)} M`} />
        <Row label="Força militar" value={n.mil.toFixed(0)} sub={`la teva: ${g.slow.military.toFixed(0)}${n.nuclear ? ' · ☢️ nuclear' : ''}`} />
        <Row label="Estabilitat" value={n.stability.toFixed(0)} />
        {others.length > 0 && <Row label="En guerra amb" value={others.join(', ')} tone="bad" />}
        <Row label="Estat" value={[war && '⚔️ Guerra', n.alliance && '🛡️ Aliança', n.trade && '🤝 Acord comercial', n.sanctioned && '🚫 Els sancionem', n.sanctionsOnUs && '🚫 Ens sancionen'].filter(Boolean).join(' · ') || 'Relacions normals'} />
      </Section>
      {ro && <div className="note">Només el govern pot fer política exterior.</div>}
      <Section title="Accions">
        {war ? (
          <div className="actions">
            <div className="front"><span>Front</span><div className="frontbar"><i style={{ width: `${(playerFront(g, war) + 100) / 2}%` }} /></div><b>{playerFront(g, war) > 0 ? 'Guanyant' : 'Perdent'}</b></div>
            {B('pau', '🕊️ Proposar la pau', 10)}
          </div>
        ) : (
          <div className="actions grid">
            {B('visita', '✈️ Visita oficial', 5)}
            {n.trade ? B('trencar_comerc', '✂️ Trencar acord comercial', 0) : B('comerc', '🤝 Acord comercial', 12, n.rel < 10 || n.sanctioned, 'Cal relació ≥ 10')}
            {n.alliance ? B('trencar_alianca', '✂️ Trencar aliança', 0) : B('alianca', '🛡️ Aliança militar', 20, n.rel < 50, 'Cal relació ≥ 50')}
            {B('ajuda', '🎁 Ajuda humanitària', 3)}
            {n.sanctioned ? B('aixecar_sancions', '✅ Aixecar sancions', 0) : B('sancions', '🚫 Imposar sancions', 8)}
            <button className="btn sm danger" disabled={ro || g.pc < 30} onClick={() => { if (confirm(`Declarar la guerra a ${n.name}? Hi haurà morts, cost econòmic i condemna internacional.`)) act((x) => diplo(x, n.id, 'guerra')); }}>⚔️ Declarar la guerra · ⚡30</button>
          </div>
        )}
      </Section>
    </div>
  );
}

export function WarsPanel() {
  const g = useGame();
  const { setSelNation, setPanel } = useStore();
  const name = (id: string) => (id === g.countryId ? g.countryName : g.nations[id]?.name ?? '?');
  const flag = (id: string) => (id === g.countryId ? g.flag : g.nations[id]?.flag ?? COUNTRY_BY_ID[id]?.flag);
  return (
    <div className="panel">
      <div className="ph"><small>Exterior</small><h2>Guerres</h2><p className="dim">La teva força militar: <b>{g.slow.military.toFixed(0)}</b>. Cansament de guerra: {g.warWeariness.toFixed(0)}/100.</p></div>
      {g.wars.length === 0 && <p className="dim">El món està en pau. De moment.</p>}
      {g.wars.map((w) => {
        const mine = w.a === g.countryId || w.b === g.countryId;
        const pf = mine ? playerFront(g, w) : w.front;
        return (
          <div key={w.id} className={`war ${mine ? 'mine' : ''}`}>
            <div className="war-h">
              <span>{flag(w.a) && <Flag flag={flag(w.a)!} w={22} />} {name(w.a)}</span><b>⚔️</b><span>{name(w.b)} {flag(w.b) && <Flag flag={flag(w.b)!} w={22} />}</span>
            </div>
            <div className="frontbar"><i style={{ width: `${((mine ? (w.a === g.countryId ? w.front : -w.front) : w.front) + 100) / 2}%` }} /></div>
            <small className="dim">{w.months} mesos · baixes: {Math.round(w.casA / 1000)}k / {Math.round(w.casB / 1000)}k {mine ? `· ${pf > 20 ? 'avancem' : pf < -20 ? 'retrocedim' : 'front estancat'}` : ''}</small>
            {mine && <button className="btn sm" onClick={() => { setSelNation(enemyOf(g, w)); setPanel('diplomacia'); }}>Negociar →</button>}
          </div>
        );
      })}
    </div>
  );
}

export function BlocsPanel() {
  const g = useGame();
  const { act } = useStore();
  return (
    <div className="panel">
      <div className="ph"><small>Exterior</small><h2>Blocs i aliances</h2><p className="dim">Els blocs econòmics donen creixement; els defensius, aliats si us ataquen.</p></div>
      {g.pendingBloc && <div className="note">Negociant l'adhesió a {BLOCS[g.pendingBloc.id].name}: {g.pendingBloc.months} mesos.</div>}
      {Object.values(BLOCS).map((b) => {
        const member = g.blocs.includes(b.id);
        const why = member ? null : blocEligible(g, b.id);
        return (
          <div key={b.id} className={`bloc ${member ? 'member' : ''}`}>
            <div><b>{b.name}</b> {member && <span className="pill gold">Membre</span>}<small>{b.desc}{b.economic ? ` · +${b.economic} pp creixement` : ''}{b.defensive ? ' · defensa mútua' : ''}</small>{!member && why && <small className="bad">🔒 {why}</small>}</div>
            {g.inPower && (member
              ? <button className="btn sm" onClick={() => { if (confirm(`Sortir de ${b.name}?`)) act((x) => leaveBloc(x, b.id)); }}>{b.id === 'UE' ? `Referèndum de sortida · ⚡${refCost('bloc_sortir')}` : 'Sortir · ⚡15'}</button>
              : <button className="btn sm" disabled={!!why || !!g.pendingBloc} onClick={() => act((x) => joinBloc(x, b.id))}>{b.id === 'UE' ? `Referèndum d'adhesió · ⚡${refCost('bloc_entrar')}` : 'Sol·licitar ingrés · ⚡20'}</button>)}
          </div>
        );
      })}
    </div>
  );
}

const PALETTE = ['#c60b1e', '#ffc400', '#002395', '#ffffff', '#000000', '#009246', '#0057b7', '#ffd700', '#e30a17', '#74acdf', '#006c35', '#ff9933', '#5b2c83', '#00a3a3', '#8b4513', '#ec008c'];
const SHAPES: [Shape, string][] = [['h', 'Franges horitzontals'], ['v', 'Franges verticals'], ['nordic', 'Creu nòrdica'], ['cross', 'Creu central'], ['circle', 'Disc central'], ['diag', 'Diagonal'], ['diamond', 'Rombe'], ['chevron', 'Triangle'], ['solid', 'Llis']];
const EMBLEMS: [Emblem, string][] = [['none', 'Cap'], ['star', 'Estrella'], ['stars', 'Estrelles'], ['circle', 'Cercle'], ['sun', 'Sol'], ['crescent', 'Mitja lluna'], ['cross', 'Creu'], ['wheel', 'Roda'], ['leaf', 'Fulla'], ['eagle', 'Escut']];

function FlagDesigner({ onSubmit, disabled }: { onSubmit: (f: FlagT) => void; disabled: boolean }) {
  const g = useGame();
  const [f, setF] = useState<FlagT>(() => ({ shape: 'h', colors: ['#5b2c83', '#ffffff', '#00a3a3'], emblem: 'star', ec: '#ffd700', ep: 'c' }));
  const n = f.shape === 'solid' ? 1 : f.shape === 'circle' || f.shape === 'cross' || f.shape === 'diag' ? 2 : f.shape === 'chevron' ? 4 : 3;
  const colors = Array.from({ length: n }, (_, i) => f.colors[i] ?? PALETTE[i]);
  const flag = { ...f, colors, ratios: undefined };
  return (
    <div className="designer">
      <div className="flag-compare">
        <div><Flag flag={g.flag} w={90} /><small>Actual</small></div><span>→</span><div><Flag flag={flag} w={90} /><small>Proposta</small></div>
      </div>
      <label>Disseny<select className="input" value={f.shape} onChange={(e) => setF({ ...f, shape: e.target.value as Shape })}>{SHAPES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select></label>
      {colors.map((c, i) => (
        <div key={i} className="swatches"><small>Color {i + 1}</small>{PALETTE.map((p) => <button key={p} className={c === p ? 'on' : ''} style={{ background: p }} onClick={() => { const cs = [...colors]; cs[i] = p; setF({ ...f, colors: cs }); }} />)}</div>
      ))}
      <label>Emblema<select className="input" value={f.emblem} onChange={(e) => setF({ ...f, emblem: e.target.value as Emblem })}>{EMBLEMS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select></label>
      {f.emblem !== 'none' && (
        <>
          <div className="swatches"><small>Color emblema</small>{PALETTE.map((p) => <button key={p} className={f.ec === p ? 'on' : ''} style={{ background: p }} onClick={() => setF({ ...f, ec: p })} />)}</div>
          <label>Posició<select className="input" value={f.ep} onChange={(e) => setF({ ...f, ep: e.target.value as FlagT['ep'] })}><option value="c">Centre</option><option value="l">Esquerra</option><option value="tl">Cantó superior</option></select></label>
        </>
      )}
      <button className="btn primary" disabled={disabled} onClick={() => onSubmit(flag)}>🗳️ Convocar referèndum · ⚡{refCost('bandera')}</button>
    </div>
  );
}

export function ReferendumPanel() {
  const g = useGame();
  const { act } = useStore();
  const [mode, setMode] = useState<string | null>(null);
  const [newName, setNewName] = useState(g.countryName);
  const r = g.referendum;
  const busy = !!r || !g.inPower;
  if (r) {
    const poll = referendumPoll(g);
    return (
      <div className="panel">
        <div className="ph"><small>Institucions</small><h2>Referèndum en curs</h2><p>«{r.title}»</p><p className="dim">Es vota d'aquí a {r.monthsLeft} {r.monthsLeft === 1 ? 'mes' : 'mesos'}.</p></div>
        <div className="poll-big"><div className="yes" style={{ width: `${poll}%` }}>SÍ {poll.toFixed(0)}%</div><div className="no">NO {(100 - poll).toFixed(0)}%</div></div>
        {r.kind === 'independencia' ? <p className="dim small">Vota només la població de {g.def.region}. La tensió territorial i les polítiques de descentralització i minories hi influeixen.</p> : (
          <Section title="Per grups">
            {GROUPS.map((gr) => <div key={gr.id} className="brow"><span>{gr.icon} {gr.name}</span><Bar v={groupYes(g, gr.id)} /><b>{groupYes(g, gr.id).toFixed(0)}%</b></div>)}
          </Section>
        )}
        {g.inPower && <div className="actions">
          <button className="btn" disabled={g.pc < 8} onClick={() => act((x) => refCampaign(x, 1))}>📣 Fer campanya pel SÍ · ⚡8</button>
          {r.kind === 'independencia' && <button className="btn" disabled={g.pc < 8} onClick={() => act((x) => refCampaign(x, -1))}>📣 Campanya pel NO · ⚡8</button>}
        </div>}
      </div>
    );
  }
  const opts: { k: string; label: string; desc: string; show: boolean }[] = [
    { k: 'bandera', label: '🏳️ Canviar la bandera', desc: 'Dissenya una nova bandera nacional.', show: true },
    { k: 'nom', label: '✏️ Canviar el nom del país', desc: 'Un nou nom per a una nova era.', show: true },
    { k: 'forma', label: g.form === 'republica' ? '👑 Restaurar la monarquia' : '🏛️ Proclamar la República', desc: 'Canviar la forma d\'estat.', show: g.form !== 'monarquia_absoluta' || true },
    { k: 'independencia', label: `🏴 Independència de ${g.def.region}`, desc: 'Deixar votar la regió sobre la seva independència.', show: !!g.def.region && !g.regionIndependent },
  ];
  return (
    <div className="panel">
      <div className="ph"><small>Institucions</small><h2>Referèndums</h2><p className="dim">Que decideixi el poble. Si perds un referèndum que has convocat, perds capital polític i suport. Pots convocar-ne sobre qualsevol llei des del seu panell (botó 🗳️), i sobre blocs com la UE.</p></div>
      {!g.inPower && <div className="note">Només el govern pot convocar referèndums.</div>}
      {opts.filter((o) => o.show).map((o) => (
        <div key={o.k} className="ref-opt">
          <button className={`ref-h ${mode === o.k ? 'on' : ''}`} onClick={() => setMode(mode === o.k ? null : o.k)}><b>{o.label}</b><small>{o.desc}</small></button>
          {mode === o.k && o.k === 'bandera' && <FlagDesigner disabled={busy || g.pc < refCost('bandera')} onSubmit={(f) => act((x) => callReferendum(x, 'bandera', f))} />}
          {mode === o.k && o.k === 'nom' && (
            <div className="designer">
              <input className="input" value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} />
              <button className="btn primary" disabled={busy || !newName.trim() || newName === g.countryName || g.pc < refCost('nom')} onClick={() => act((x) => callReferendum(x, 'nom', newName.trim()))}>🗳️ Convocar · ⚡{refCost('nom')}</button>
            </div>
          )}
          {mode === o.k && o.k === 'forma' && (
            <div className="designer">
              <button className="btn primary" disabled={busy || g.pc < refCost('forma')} onClick={() => act((x) => callReferendum(x, 'forma', (g.form === 'republica' ? 'monarquia' : 'republica') as StateForm))}>🗳️ Convocar · ⚡{refCost('forma')}</button>
            </div>
          )}
          {mode === o.k && o.k === 'independencia' && (
            <div className="designer">
              <p className="small">Tensió territorial actual: <b>{g.regionTension.toFixed(0)}</b>/100. Si guanya el SÍ, el país perdrà territori, població i economia ({(g.regionShare * 100).toFixed(0)}% aprox.).</p>
              <button className="btn primary" disabled={busy || g.pc < refCost('independencia')} onClick={() => act((x) => callReferendum(x, 'independencia', g.def.region))}>🗳️ Autoritzar · ⚡{refCost('independencia')}</button>
            </div>
          )}
        </div>
      ))}
      {g.motto && <p className="dim">Lema: {g.motto}</p>}
    </div>
  );
}
