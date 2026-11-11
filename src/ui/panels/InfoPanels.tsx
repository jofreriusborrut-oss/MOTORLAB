import { useState } from 'react';
import { MINISTRIES, TAXES } from '../../data/groups';
import { lifeExp, societyIndex, societyLabel, spendingBreakdown, sum } from '../../engine/model';
import { atWar, blocBonus, sanctionsHit, tradeBonus } from '../../engine/sim';
import type { HistoryRow } from '../../engine/types';
import { dateLabel, fmtMoney } from '../../engine/util';
import { useGame, useStore } from '../../store';
import Flag from '../Flag';
import { Bar, Delta, HistChart, Row, Section } from '../common';

const REV_LABEL: Record<string, string> = Object.fromEntries([...TAXES.map((t) => [t.id, t.name]), ['empreses', 'Empreses públiques i altres'], ['recursos', 'Recursos naturals i ajuts'], ['reparacions', 'Reparacions de guerra']]);
const SP_LABEL: Record<string, string> = Object.fromEntries([...MINISTRIES.map((m) => [m.id, `${m.icon} ${m.name}`]), ['programes', '📜 Programes de lleis'], ['interessos', '💳 Interessos del deute'], ['guerra', '⚔️ Cost de la guerra'], ['reparacions', '🏳️ Reparacions de guerra']]);

function rating(debt: number, rate: number, stab: number) {
  const s = debt / 30 + rate / 2 + (100 - stab) / 25;
  return s < 3 ? 'AAA' : s < 4 ? 'AA' : s < 5 ? 'A' : s < 6.5 ? 'BBB' : s < 8 ? 'BB' : s < 10 ? 'B' : 'CCC';
}

export function AccountsPanel() {
  const g = useGame();
  const sb = spendingBreakdown(g);
  const rb = g.revBreak;
  const debt = (g.debt / g.gdp) * 100;
  const deficit = g.lastSpend - g.lastRev;
  return (
    <div className="panel">
      <div className="ph"><small>Economia</small><h2>Comptes públics</h2></div>
      <div className="budget-sum">
        <div><span>Deute públic</span><b>{debt.toFixed(0)}%</b><small>{fmtMoney(g.debt)}</small></div>
        <div><span>Tipus d'interès</span><b>{g.rate.toFixed(1)}%</b><small>mercat {g.marketRate.toFixed(1)}%</small></div>
        <div><span>Qualificació</span><b>{rating(debt, g.marketRate, g.slow.stability)}</b><small>{deficit >= 0 ? 'dèficit' : 'superàvit'} {Math.abs(deficit).toFixed(1)}%</small></div>
      </div>
      <Section title={`Ingressos · ${g.lastRev.toFixed(1)}% del PIB`}>
        {Object.entries(rb).filter(([, v]) => Math.abs(v) > 0.005).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <div key={k} className="brow"><span>{REV_LABEL[k] ?? k}</span><Bar v={v} max={Math.max(...Object.values(rb))} color="var(--ok)" /><b>{v.toFixed(1)}%</b><small>{fmtMoney((v / 100) * g.gdp)}</small></div>
        ))}
      </Section>
      <Section title={`Despeses · ${g.lastSpend.toFixed(1)}% del PIB`}>
        {Object.entries(sb).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <div key={k} className="brow"><span>{SP_LABEL[k] ?? k}</span><Bar v={v} max={Math.max(...Object.values(sb))} color="var(--blue-hi)" /><b>{v.toFixed(1)}%</b><small>{fmtMoney((v / 100) * g.gdp)}</small></div>
        ))}
      </Section>
      <Section title="Deute i dèficit (% PIB)"><HistChart data={g.history} keys={['debt', 'deficit']} labels={['Deute', 'Dèficit']} unit="%" zero /></Section>
      <Section title="Ingressos i despesa (% PIB)"><HistChart data={g.history} keys={['rev', 'spend']} labels={['Ingressos', 'Despesa']} unit="%" /></Section>
    </div>
  );
}

export function EconomyPanel() {
  const g = useGame();
  const gdppc = (g.gdp / g.pop) * 1000;
  return (
    <div className="panel">
      <div className="ph"><small>Economia</small><h2>Indicadors econòmics</h2></div>
      <Section title="Situació actual">
        <Row label="PIB" value={fmtMoney(g.gdp)} sub={<Delta v={(g.gdp / g.def.gdp - 1) * 100} unit="% des de l'inici" />} />
        <Row label="PIB per càpita" value={`${Math.round(gdppc).toLocaleString('ca')} $`} sub={<Delta v={(gdppc / g.base.gdppc - 1) * 100} unit="%" />} />
        <Row label="Població" value={`${g.pop.toFixed(2)} M`} />
        <Row label="Creixement anual" value={`${g.growth.toFixed(2)}%`} sub={`tendència ${g.baseGrowth.toFixed(1)}%`} />
        <Row label="Atur" value={`${g.unemp.toFixed(1)}%`} sub={<Delta v={g.unemp - g.base.unemp} invert unit=" pp" />} />
        <Row label="Inflació" value={`${g.infl.toFixed(1)}%`} />
        <Row label="Acords comercials" value={`+${tradeBonus(g).toFixed(2)} pp`} />
        <Row label="Blocs econòmics" value={`${blocBonus(g) >= 0 ? '+' : ''}${blocBonus(g).toFixed(2)} pp`} />
        {sanctionsHit(g) > 0 && <Row label="Sancions internacionals" value={`−${sanctionsHit(g).toFixed(2)} pp`} tone="bad" />}
        {atWar(g) && <Row label="Economia de guerra" value="Creixement penalitzat" tone="bad" />}
      </Section>
      <Section title="Creixement i atur (%)"><HistChart data={g.history} keys={['growth', 'unemp']} labels={['Creixement', 'Atur']} unit="%" zero /></Section>
      <Section title="Inflació (%)"><HistChart data={g.history} keys={['infl']} labels={['Inflació']} unit="%" zero /></Section>
      <Section title="PIB per càpita ($)"><HistChart data={g.history} keys={['gdppc']} labels={['PIB per càpita']} /></Section>
    </div>
  );
}

const METRICS: { k: keyof HistoryRow; l: string; u?: string }[] = [
  { k: 'approval', l: 'Aprovació', u: '%' }, { k: 'society', l: 'Índex de societat' }, { k: 'happiness', l: 'Felicitat' }, { k: 'stability', l: 'Estabilitat' },
  { k: 'unrest', l: 'Malestar' }, { k: 'freedom', l: 'Llibertat' }, { k: 'corruption', l: 'Corrupció' }, { k: 'crime', l: 'Delinqüència' },
  { k: 'env', l: 'Medi ambient' }, { k: 'edu', l: 'Educació' }, { k: 'health', l: 'Salut' }, { k: 'life', l: 'Esperança de vida', u: ' anys' },
  { k: 'gini', l: 'Desigualtat (Gini)' }, { k: 'poverty', l: 'Pobresa', u: '%' }, { k: 'growth', l: 'Creixement', u: '%' }, { k: 'unemp', l: 'Atur', u: '%' },
  { k: 'infl', l: 'Inflació', u: '%' }, { k: 'debt', l: 'Deute', u: '%' }, { k: 'deficit', l: 'Dèficit', u: '%' }, { k: 'gdppc', l: 'PIB per càpita', u: ' $' },
];

export function StatsPanel() {
  const g = useGame();
  const [sel, setSel] = useState<(keyof HistoryRow)[]>(['approval', 'society']);
  const toggle = (k: keyof HistoryRow) => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel.slice(-2), k]);
  const first = g.history[0], last = g.history[g.history.length - 1];
  return (
    <div className="panel">
      <div className="ph"><small>Dades</small><h2>Estadístiques</h2><p className="dim">Tria fins a 3 sèries per comparar-les.</p></div>
      <div className="chips sel">
        {METRICS.map((m) => <button key={m.k} className={`chip ${sel.includes(m.k) ? 'on' : ''}`} onClick={() => toggle(m.k)}>{m.l}</button>)}
      </div>
      <HistChart data={g.history} keys={sel} labels={sel.map((k) => METRICS.find((m) => m.k === k)!.l)} height={220} />
      {first && last && (
        <Section title={`Evolució des de ${dateLabel(first.t)}`}>
          {METRICS.map((m) => (
            <Row key={m.k} label={m.l} value={`${(last[m.k] as number).toFixed(m.k === 'gdppc' ? 0 : 1)}${m.u ?? ''}`}
              sub={<Delta v={(last[m.k] as number) - (first[m.k] as number)} invert={['unrest', 'corruption', 'crime', 'gini', 'poverty', 'unemp', 'infl', 'debt', 'deficit'].includes(m.k)} d={m.k === 'gdppc' ? 0 : 1} />} />
          ))}
        </Section>
      )}
    </div>
  );
}

export function SocietyPanel() {
  const g = useGame();
  const v = societyIndex(g);
  const l = societyLabel(v);
  const s = g.slow;
  const items: [string, number, boolean][] = [
    ['Felicitat', s.happiness, true], ['Llibertat', s.freedom, true], ['Corrupció', s.corruption, false], ['Delinqüència', s.crime, false],
    ['Medi ambient', s.env, true], ['Educació', s.edu, true], ['Salut', s.health, true], ['Pobresa', s.poverty * 1.6, false],
    ['Desigualtat', (s.gini - 20) * 2, false], ['Estabilitat', s.stability, true], ['Malestar social', g.unrest, false], ['Innovació', s.innov, true],
  ];
  const desc = v >= 85 ? 'Una societat lliure, pròspera, sana i justa. El món us envia delegacions per aprendre del vostre model.' :
    v >= 72 ? 'Un país pròsper on la majoria viu bé, tot i que queden reptes.' :
      v >= 58 ? 'Una societat funcional amb problemes importants.' :
        v >= 45 ? 'Les tensions creixen: desigualtat, malestar o mala governança passen factura.' :
          v >= 32 ? 'El país està en crisi: la gent pateix i les institucions fallen.' :
            v >= 20 ? 'L\'estat ja no garanteix el més bàsic. Caos, pobresa i por.' : 'Un infern distòpic: repressió, misèria i desesperança.';
  return (
    <div className="panel">
      <div className="ph"><small>Població</small><h2>Índex de societat</h2></div>
      <div className="soc-gauge">
        <div className="sg-bar"><i style={{ left: `${v}%` }} /></div>
        <div className="sg-labels"><span>Infern</span><span>Crisi</span><span>Estable</span><span>Utopia</span></div>
        <div className="sg-val" style={{ color: l.color }}>{v.toFixed(0)} · {l.label}</div>
        <p className="dim">{desc}</p>
      </div>
      <Section title="Components">
        {items.map(([n, x, good]) => <div key={n} className="brow"><span>{n}</span><Bar v={good ? x : 100 - x} /><b>{x.toFixed(0)}</b></div>)}
        <Row label="Esperança de vida" value={`${lifeExp(g).toFixed(1)} anys`} sub={<Delta v={lifeExp(g) - g.life0} />} />
      </Section>
      <Section title="Evolució"><HistChart data={g.history} keys={['society', 'happiness', 'freedom']} labels={['Índex', 'Felicitat', 'Llibertat']} /></Section>
    </div>
  );
}

export function RankingPanel() {
  const g = useGame();
  const { setSelNation, setPanel, setView } = useStore();
  const [by, setBy] = useState<'gdppc' | 'gdp' | 'mil' | 'growth'>('gdppc');
  const rows = [
    { id: g.countryId, name: g.countryName, flag: g.flag, gdp: g.gdp, gdppc: (g.gdp / g.pop) * 1000, mil: g.slow.military, growth: g.growth, me: true },
    ...Object.values(g.nations).map((n) => ({ id: n.id, name: n.name, flag: n.flag, gdp: n.gdp, gdppc: (n.gdp / n.pop) * 1000, mil: n.mil, growth: n.growth, me: false })),
  ].sort((a, b) => b[by] - a[by]);
  return (
    <div className="panel">
      <div className="ph"><small>Dades</small><h2>Rànquing mundial</h2></div>
      <div className="tabs">
        {([['gdppc', 'PIB/càpita'], ['gdp', 'PIB'], ['mil', 'Exèrcit'], ['growth', 'Creixement']] as const).map(([k, l]) => <button key={k} className={by === k ? 'on' : ''} onClick={() => setBy(k)}>{l}</button>)}
      </div>
      <div className="rank">
        {rows.map((r, i) => (
          <button key={r.id} className={`rank-row ${r.me ? 'me' : ''}`} onClick={() => { if (!r.me) { setSelNation(r.id); setPanel('diplomacia'); setView('mon'); } }}>
            <span className="n">{i + 1}</span><Flag flag={r.flag} w={24} /><span className="nm">{r.name}</span>
            <b>{by === 'gdp' ? fmtMoney(r.gdp) : by === 'gdppc' ? `${Math.round(r.gdppc).toLocaleString('ca')} $` : by === 'mil' ? r.mil.toFixed(0) : `${r.growth.toFixed(1)}%`}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NewsPanel() {
  const g = useGame();
  const [f, setF] = useState<'all' | 'me' | 'world'>('all');
  const list = g.news.filter((n) => f === 'all' || (f === 'me' ? n.text.includes(g.playerName) : n.tone === 'world'));
  return (
    <div className="panel">
      <div className="ph"><small>Dades</small><h2>Hemeroteca</h2></div>
      <div className="tabs">
        <button className={f === 'all' ? 'on' : ''} onClick={() => setF('all')}>Totes</button>
        <button className={f === 'me' ? 'on' : ''} onClick={() => setF('me')}>Sobre tu</button>
        <button className={f === 'world' ? 'on' : ''} onClick={() => setF('world')}>Món</button>
      </div>
      <div className="news-list">
        {list.map((n) => <div key={n.id} className={`news ${n.tone}`}><small>{dateLabel(n.date, true)} · {n.src}</small><p>{n.text}</p></div>)}
        {!list.length && <p className="dim">Cap notícia.</p>}
      </div>
    </div>
  );
}

export { sum };
