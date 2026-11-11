import { GROUPS, MINISTRIES } from '../../data/groups';
import { callElections, expelPartner, invitePartner, negotiatePartners, oppAction, speech } from '../../engine/actions';
import { govIdeo, govSeats, hasElections, partyById, regimeLabel, totalSeats } from '../../engine/model';
import { compatible, formGovernment, parliamentMatters, voteShares } from '../../engine/politics';
import { atWar } from '../../engine/sim';
import type { Game, Party } from '../../engine/types';
import { dateLabel, dist } from '../../engine/util';
import { useGame, useStore } from '../../store';
import { Bar, Row, Section } from '../common';
import { ideoLabel } from '../format';

export function Hemicycle({ parties, total, gov }: { parties: Party[]; total: number; gov: string[] }) {
  const per = Math.max(1, Math.ceil(total / 360));
  const nd = Math.ceil(total / per);
  const rows = Math.max(4, Math.round(Math.sqrt(nd / 3.2)));
  const R0 = 40, R1 = 96;
  const radii = Array.from({ length: rows }, (_, i) => R0 + ((R1 - R0) * i) / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const pts: { x: number; y: number; a: number }[] = [];
  let left = nd;
  radii.forEach((r, i) => {
    const n = i === rows - 1 ? left : Math.round((nd * r) / sumR);
    left -= n;
    for (let j = 0; j < n; j++) {
      const a = Math.PI - (Math.PI * (j + 0.5)) / n;
      pts.push({ x: 100 + r * Math.cos(a), y: 104 - r * Math.sin(a), a });
    }
  });
  pts.sort((p, q) => q.a - p.a);
  const ordered = [...parties].filter((p) => p.seats > 0).sort((a, b) => a.e - b.e);
  const colors: { c: string; gov: boolean }[] = [];
  for (const p of ordered) for (let i = 0; i < Math.round(p.seats / per); i++) colors.push({ c: p.color, gov: gov.includes(p.id) });
  const dotR = Math.max(1.4, Math.min(4, 150 / Math.sqrt(nd) / 2.2));
  return (
    <svg viewBox="0 0 200 110" className="hemi">
      {pts.map((p, i) => colors[i] && <circle key={i} cx={p.x} cy={p.y} r={dotR} fill={colors[i].c} opacity={colors[i].gov ? 1 : 0.55} />)}
      <text x="100" y="100" textAnchor="middle" fontSize="11" fill="#e8edf3" fontWeight="700">{total}</text>
      <text x="100" y="108" textAnchor="middle" fontSize="5.5" fill="#8994a3">escons{per > 1 ? ` (1 punt = ${per})` : ''}</text>
    </svg>
  );
}

export function ParliamentPanel() {
  const g = useGame();
  const { act } = useStore();
  const total = totalSeats(g);
  const gs = govSeats(g);
  const matters = parliamentMatters(g);
  const me = partyById(g, g.playerParty)!;
  const others = g.parties.filter((p) => !g.govParties.includes(p.id) && p.seats > 0);
  return (
    <div className="panel">
      <div className="ph"><small>Institucions</small><h2>Parlament</h2><p className="dim">{regimeLabel(g).label}{!matters ? ' · el parlament no té poder real' : ''}</p></div>
      <Hemicycle parties={g.parties} total={total} gov={g.govParties} />
      <div className="seat-summary">
        <span>Govern: <b className={gs / total > 0.5 ? 'good' : 'bad'}>{gs} escons ({((gs / total) * 100).toFixed(0)}%)</b></span>
        <span>Majoria: {Math.floor(total / 2) + 1}</span>
      </div>
      <Section title="Partits">
        {[...g.parties].sort((a, b) => b.seats - a.seats).map((p) => (
          <div key={p.id} className={`party-row ${g.govParties.includes(p.id) ? 'gov' : ''}`}>
            <span className="dot" style={{ background: p.color }} />
            <div className="pr-main">
              <b>{p.name} {p.id === g.playerParty && <span className="pill">El teu</span>} {g.govParties.includes(p.id) && <span className="pill gold">Govern</span>} {g.oppAllies.includes(p.id) && <span className="pill">Pacte</span>}</b>
              <small>{ideoLabel(p)} · líder: {p.id === g.playerParty ? g.playerName : p.leader}</small>
              {g.inPower && g.partnerMood[p.id] !== undefined && <div className="mood">Satisfacció del soci <Bar v={g.partnerMood[p.id]} h={4} /></div>}
            </div>
            <b className="seats">{p.seats}</b>
            {g.inPower && p.id !== g.playerParty && (
              g.govParties.includes(p.id)
                ? <button className="btn ghost sm" onClick={() => act((x) => expelPartner(x, p.id))} title="Fer fora del govern">✕</button>
                : p.seats > 0 && <button className="btn sm" disabled={g.pc < 20} onClick={() => act((x) => invitePartner(x, p.id))} title="Convidar a entrar al govern">+ ⚡20</button>
            )}
          </div>
        ))}
      </Section>
      {g.inPower ? (
        <Section title="Accions">
          <div className="actions">
            <button className="btn" disabled={g.pc < 15 || !Object.keys(g.partnerMood).length} onClick={() => act(negotiatePartners)}>🤝 Negociar amb els socis · ⚡15</button>
            <button className="btn" disabled={g.pc < 10} onClick={() => act(speech)}>🎤 Discurs a la nació · ⚡10</button>
            {hasElections(g) && <button className="btn" onClick={() => { if (confirm('Convocar eleccions anticipades?')) act(callElections); }}>🗳️ Eleccions anticipades</button>}
          </div>
          {hasElections(g) && g.nextElection >= 0 && <p className="dim small">Properes eleccions: {dateLabel(g.nextElection)}.</p>}
          {gs / total < 0.5 && matters && <p className="note bad">Governes en minoria: et poden fer caure amb una moció de censura si l'aprovació baixa de 38%.</p>}
        </Section>
      ) : (
        <Section title="Oposició">
          <p className="dim small">Pots pactar amb altres partits des del panell d'oposició. Partits amb qui podries pactar: {others.filter((p) => p.id !== me.id && compatible(me, p, g)).map((p) => p.short).join(', ') || 'cap'}.</p>
        </Section>
      )}
    </div>
  );
}

export function PollPanel() {
  const g = useGame();
  const v = voteShares(g);
  const parties = [...g.parties].sort((a, b) => v[b.id] - v[a.id]);
  return (
    <div className="panel">
      <div className="ph"><small>Població</small><h2>Enquesta electoral</h2><p className="dim">Intenció de vot si hi hagués eleccions avui{g.policies.eleccions === 1 ? ' (amb les irregularitats del règim)' : ''}.</p></div>
      {!hasElections(g) && <div className="note">Ara mateix no hi ha eleccions. L'enquesta és clandestina.</div>}
      {parties.map((p) => (
        <div key={p.id} className="brow">
          <span><i className="dot" style={{ background: p.color }} /> {p.short} {p.id === g.playerParty ? '⭐' : ''}</span>
          <Bar v={v[p.id] * 100} max={Math.max(...Object.values(v)) * 100} color={p.color} h={10} />
          <b>{(v[p.id] * 100).toFixed(1)}%</b>
          <small>{p.seats} esc.</small>
        </div>
      ))}
    </div>
  );
}

function wants(gid: string) {
  const gr = GROUPS.find((x) => x.id === gid)!;
  const b = Object.entries(gr.budget).sort((a, b2) => b2[1]! - a[1]!);
  const more = b.filter(([, v]) => v! > 0).slice(0, 2).map(([m]) => MINISTRIES.find((x) => x.id === m)!.name.toLowerCase());
  const less = b.filter(([, v]) => v! < 0).map(([m]) => MINISTRIES.find((x) => x.id === m)!.name.toLowerCase());
  const taxes = Object.entries(gr.tax).filter(([, v]) => v! < -0.3).map(([t]) => t === 'irpf' ? 'IRPF' : t === 'iva' ? 'IVA' : t === 'patrimoni' ? 'impost de riquesa' : t === 'verd' ? 'impostos verds' : t === 'societats' ? 'impost de societats' : t);
  return [more.length ? `Més ${more.join(' i ')}` : '', less.length ? `menys ${less.join(', ')}` : '', taxes.length ? `no pujar ${taxes.join(', ')}` : ''].filter(Boolean).join(' · ');
}

export function GroupsPanel() {
  const g = useGame();
  const totShare = Object.values(g.shares).reduce((a, b) => a + b, 0);
  const gi = govIdeo(g);
  return (
    <div className="panel">
      <div className="ph"><small>Població</small><h2>Grups socials</h2><p className="dim">Afinitat de cada grup amb el {g.inPower ? 'teu govern' : `govern de ${g.govLeader}`}. Si un grup cau per sota de 25, es mobilitza.</p></div>
      <div className="unrest-box">
        <span>Malestar social</span><Bar v={g.unrest} color={g.unrest > 60 ? 'var(--err)' : g.unrest > 35 ? 'var(--warn)' : 'var(--ok)'} h={8} /><b>{g.unrest.toFixed(0)}</b>
      </div>
      {g.unrest > 70 && <p className="note bad">⚠️ Risc de revolta! Si el malestar es manté per sobre de 80 durant mesos, el govern pot caure.</p>}
      {g.groups.mil.aff < 25 && g.inPower && <p className="note bad">⚠️ Les forces armades estan molt descontentes: risc de cop d'estat.</p>}
      {GROUPS.map((gr) => {
        const st = g.groups[gr.id];
        const d = dist({ e: gr.ideo.e, s: gr.ideo.s }, gi);
        return (
          <div key={gr.id} className="group-row" title={gr.desc}>
            <span className="gi">{gr.icon}</span>
            <div className="gm">
              <div className="gh"><b>{gr.name}</b><small>{((g.shares[gr.id] / totShare) * 100).toFixed(0)}% de pes · {d < 60 ? 'afí' : d < 120 ? 'llunyà' : 'oposat'} ideològicament</small></div>
              <Bar v={st.aff} h={7} />
              <small className="dim">{wants(gr.id)}</small>
            </div>
            <b className={`gv ${st.aff < 25 ? 'bad' : st.aff > 60 ? 'good' : ''}`}>{st.aff.toFixed(0)}</b>
          </div>
        );
      })}
    </div>
  );
}

export function OppositionPanel() {
  const g = useGame();
  const { act } = useStore();
  const me = partyById(g, g.playerParty)!;
  const v = voteShares(g);
  const authoritarian = g.policies.reunio === 2 || g.policies.oposicio === 2;
  const f = parliamentMatters(g) ? formGovernment(g, g.playerParty, g.govParties[0]) : null;
  const fs = f ? f.parties.reduce((a, id) => a + (partyById(g, id)?.seats ?? 0), 0) : 0;
  const A = (k: string, label: string, cost: number, desc: string, disabled = false, arg?: string) => (
    <div className="opp-act">
      <div><b>{label}</b><small>{desc}</small></div>
      <button className="btn sm" disabled={disabled || g.pc < cost} onClick={() => act((x) => oppAction(x, k, arg))}>⚡{cost}</button>
    </div>
  );
  return (
    <div className="panel">
      <div className="ph"><small>{g.exile ? 'Exili' : 'Oposició'}</small><h2>{g.exile ? 'Lluita des de l\'exili' : 'Accions d\'oposició'}</h2>
        <p className="dim">Governa {g.govLeader}. El teu partit té {me.seats} escons i un {(v[me.id] * 100).toFixed(1)}% d'intenció de vot (impuls {me.momentum >= 0 ? '+' : ''}{me.momentum.toFixed(0)}).</p></div>
      {hasElections(g) && g.nextElection >= 0 ? <div className="note">Properes eleccions: <b>{dateLabel(g.nextElection)}</b>. Guanya-les per tornar al govern.</div>
        : <div className="note bad">No hi ha eleccions. Només una revolució o la caiguda del règim et poden portar al poder: mantén el malestar alt i la resistència activa.</div>}
      <Section title="Fer créixer el partit">
        {A('campanya', '📺 Campanya als mitjans', 10, g.policies.premsa === 2 ? 'Amb censura, poc efectiva.' : 'Puja la intenció de vot.', g.exile && g.policies.premsa === 2)}
        {A('gira', '🚌 Gira pel país', 15, 'Mítings arreu. Erosiona el govern al món rural i obrer.', g.exile)}
        {A('denuncia', '🔎 Denunciar corrupció', 8, `Funciona si la corrupció és alta (ara ${g.slow.corruption.toFixed(0)}).`)}
        {A('protesta', '✊ Convocar manifestacions', 12, authoritarian ? 'Augmenta el malestar. Risc de detenció!' : 'Augmenta el malestar contra el govern.')}
      </Section>
      {(authoritarian || g.exile) && (
        <Section title="Resistència">
          {A('resistencia', '🕯️ Organitzar la resistència', 20, 'Vagues, sabotatges i desobediència. Molt malestar.')}
          {A('lobby', '🌐 Demanar sancions internacionals', 15, 'Convèncer democràcies perquè sancionin el règim.')}
        </Section>
      )}
      {parliamentMatters(g) && !g.exile && (
        <Section title="Parlament">
          {A('censura', '🏛️ Moció de censura', 35, f?.majority ? `Tens una majoria possible (${fs} escons amb ${f.parties.map((id) => partyById(g, id)!.short).join(', ')}). Endavant!` : `Ara només sumaries ${fs} escons de ${totalSeats(g)}. Cal pactar més.`)}
          <p className="dim small">Per proposar lleis, entra a qualsevol política del mapa de govern i prem «Proposar al parlament».</p>
          <h4>Pactes amb altres partits</h4>
          {g.parties.filter((p) => p.id !== me.id).map((p) => (
            <div key={p.id} className="opp-act">
              <div><b><i className="dot" style={{ background: p.color }} /> {p.name}</b><small>{p.seats} escons · {ideoLabel(p)} · distància {dist(me, p).toFixed(0)}{g.govParties.includes(p.id) ? ' · al govern' : ''}</small></div>
              {g.oppAllies.includes(p.id) ? <span className="pill">Pacte</span> : <button className="btn sm" disabled={g.pc < 20} onClick={() => act((x) => oppAction(x, 'pacte', p.id))}>Pactar ⚡20</button>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

export function ResumPanel() {
  const g = useGame();
  const { setPanel } = useStore();
  const alerts: [string, string, string][] = [];
  const deficit = g.lastSpend - g.lastRev;
  if (g.unrest > 60) alerts.push(['bad', `Malestar social molt alt (${g.unrest.toFixed(0)}). Risc de revolta.`, 'grups']);
  if (g.inPower && g.groups.mil.aff < 28) alerts.push(['bad', 'Les forces armades estan descontentes. Risc de cop d\'estat.', 'grups']);
  if (deficit > 5) alerts.push(['warn', `Dèficit elevat (${deficit.toFixed(1)}% del PIB): el deute creix.`, 'comptes']);
  if ((g.debt / g.gdp) * 100 > 130) alerts.push(['warn', 'Deute públic molt alt: els mercats podrien castigar-vos.', 'comptes']);
  if (g.infl > 10) alerts.push(['bad', `Inflació desbocada (${g.infl.toFixed(0)}%).`, 'economia']);
  if (g.unemp > 15) alerts.push(['bad', `Atur massiu (${g.unemp.toFixed(1)}%).`, 'economia']);
  if (atWar(g)) alerts.push(['bad', 'El país està en guerra.', 'guerres']);
  if (hasElections(g) && g.nextElection >= 0 && g.nextElection - g.month <= 6) alerts.push(['warn', `Eleccions el ${dateLabel(g.nextElection)}.`, 'enquesta']);
  if (g.inPower && govSeats(g) / totalSeats(g) < 0.5 && parliamentMatters(g)) alerts.push(['warn', 'Governes en minoria al parlament.', 'parlament']);
  if (Object.values(g.nations).some((n) => n.sanctionsOnUs)) alerts.push(['warn', 'Patiu sancions internacionals.', 'diplomacia']);
  const angry = GROUPS.map((gr) => ({ gr, a: g.groups[gr.id].aff })).sort((a, b) => a.a - b.a).slice(0, 3);
  const happy = GROUPS.map((gr) => ({ gr, a: g.groups[gr.id].aff })).sort((a, b) => b.a - a.a).slice(0, 3);
  return (
    <div className="panel">
      <div className="ph"><small>Resum</small><h2>{g.inPower ? 'Despatx del govern' : g.exile ? 'A l\'exili' : 'Seu de l\'oposició'}</h2>
        <p className="dim">{g.inPower ? 'Explora el mapa de decisions: cada branca es desplega en accions concretes.' : `Governa ${g.govLeader}. Fes oposició per guanyar suports i tornar al poder.`}</p></div>
      <Section title="Alertes">
        {alerts.length ? alerts.map(([t, s, p], i) => <button key={i} className={`alert ${t}`} onClick={() => setPanel(p)}>{t === 'bad' ? '🔴' : '🟠'} {s}</button>) : <p className="dim">Tot sota control… de moment.</p>}
      </Section>
      <Section title="Qui t'estima i qui no">
        <div className="two">
          <div>{happy.map(({ gr, a }) => <Row key={gr.id} label={`${gr.icon} ${gr.name}`} value={a.toFixed(0)} tone="good" />)}</div>
          <div>{angry.map(({ gr, a }) => <Row key={gr.id} label={`${gr.icon} ${gr.name}`} value={a.toFixed(0)} tone="bad" />)}</div>
        </div>
      </Section>
      <Section title="Com es juga">
        <ul className="howto">
          <li>⏯️ El temps avança amb els botons de dalt (o la tecla <kbd>espai</kbd>). Cada pas és un mes.</li>
          <li>🧭 Al <b>mapa de decisions</b> cada branca es desplega: economia, drets, exèrcit, institucions…</li>
          <li>⚡ Les lleis costen <b>capital polític</b>, que guanyes amb el temps si ets popular. Cal majoria al parlament o governar per decret.</li>
          <li>👥 Cada decisió agrada a uns grups i n'enfada d'altres. Els efectes econòmics i socials arriben a curt i a llarg termini.</li>
          <li>🗳️ Si perds les eleccions, una moció de censura, un cop d'estat o una revolució, passes a l'oposició i pots lluitar per tornar.</li>
          <li>🌍 Al <b>mapa del món</b> pots fer acords comercials, aliances, sancions… o guerres.</li>
        </ul>
      </Section>
    </div>
  );
}

export type { Game };
