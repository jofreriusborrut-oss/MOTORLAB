import { useEffect, useState } from 'react';
import { GROUPS, MINISTRIES, TAXES } from '../../data/groups';
import { approveBudget, budgetSupport } from '../../engine/actions';
import { revenueBreakdown, spendingBreakdown, sum } from '../../engine/model';
import { parliamentMatters } from '../../engine/politics';
import type { MinistryId, TaxId } from '../../engine/types';
import { fmtMoney } from '../../engine/util';
import { useStore, useGame } from '../../store';
import { Section } from '../common';

export default function BudgetPanel() {
  const g = useGame();
  const { act } = useStore();
  const [b, setB] = useState(g.budget);
  const [t, setT] = useState(g.taxes);
  const [tab, setTab] = useState<'desp' | 'imp'>('desp');
  const dirty = MINISTRIES.some((m) => Math.abs(b[m.id] - g.budget[m.id]) > 1e-6) || TAXES.some((x) => Math.abs(t[x.id] - g.taxes[x.id]) > 1e-6);
  // si el govern (IA) canvia el pressupost i no estem editant, sincronitza
  useEffect(() => { if (!dirty) { setB(g.budget); setT(g.taxes); } }, [g.budget, g.taxes]); // eslint-disable-line react-hooks/exhaustive-deps

  const hyp = { ...g, budget: b, taxes: t };
  const rev = sum(revenueBreakdown(hyp)), sp = sum(spendingBreakdown(hyp));
  const def = sp - rev;
  const s = budgetSupport(g, b, t);
  const ro = !g.inPower;
  const matters = parliamentMatters(g);
  const fans = (m: MinistryId) => GROUPS.filter((gr) => (gr.budget[m] ?? 0) >= 1.5).map((gr) => gr.icon).join('');
  const tfans = (x: TaxId) => GROUPS.filter((gr) => (gr.tax[x] ?? 0) <= -0.4).map((gr) => gr.icon).join('');

  return (
    <div className="panel">
      <div className="ph">
        <small>Economia</small>
        <h2>Pressupostos</h2>
        <p className="dim">Tot en % del PIB ({fmtMoney(g.gdp)}). Els canvis s'han d'aprovar al parlament.</p>
      </div>
      {ro && <div className="note">Només el govern pot modificar els pressupostos. Aquests són els del govern de {g.govLeader}.</div>}
      <div className="budget-sum">
        <div><span>Ingressos</span><b>{rev.toFixed(1)}%</b><small>{fmtMoney((rev / 100) * g.gdp)}</small></div>
        <div><span>Despesa</span><b>{sp.toFixed(1)}%</b><small>{fmtMoney((sp / 100) * g.gdp)}</small></div>
        <div className={def > 3 ? 'bad' : def < 0 ? 'good' : ''}><span>{def >= 0 ? 'Dèficit' : 'Superàvit'}</span><b>{Math.abs(def).toFixed(1)}%</b><small>{fmtMoney((Math.abs(def) / 100) * g.gdp)}</small></div>
      </div>
      <div className="tabs">
        <button className={tab === 'desp' ? 'on' : ''} onClick={() => setTab('desp')}>Despeses</button>
        <button className={tab === 'imp' ? 'on' : ''} onClick={() => setTab('imp')}>Impostos</button>
      </div>
      {tab === 'desp' ? (
        <Section title="Partides de despesa">
          {MINISTRIES.map((m) => {
            const v = b[m.id], v0 = g.budget0[m.id];
            const max = Math.max(4, v0 * 2.5, v * 1.2);
            return (
              <div key={m.id} className="slider-row" title={m.desc}>
                <div className="sl-h"><span>{m.icon} {m.name} <i className="fans">{fans(m.id)}</i></span><b>{v.toFixed(2)}%</b></div>
                <input type="range" min={0} max={max} step={0.05} value={v} disabled={ro} onChange={(e) => setB({ ...b, [m.id]: +e.target.value })} />
                <div className="sl-f"><small>{fmtMoney((v / 100) * g.gdp)}</small><small className={v < v0 * 0.9 ? 'bad' : v > v0 * 1.1 ? 'good' : 'dim'}>inicial {v0.toFixed(2)}%</small></div>
              </div>
            );
          })}
          <div className="prow"><span>Programes de les lleis aprovades</span><b>{g.lastPrograms.toFixed(2)}%</b></div>
          <div className="prow"><span>Interessos del deute</span><b>{g.lastInterest.toFixed(2)}%</b></div>
        </Section>
      ) : (
        <Section title="Impostos">
          {TAXES.map((x) => {
            const v = t[x.id];
            return (
              <div key={x.id} className="slider-row" title={x.desc}>
                <div className="sl-h"><span>{x.name} <i className="fans">{tfans(x.id)}</i></span><b>{v.toFixed(x.step < 1 ? 1 : 0)}{x.unit === '%' ? '%' : ''}</b></div>
                <input type="range" min={x.min} max={x.max} step={x.step} value={v} disabled={ro} onChange={(e) => setT({ ...t, [x.id]: +e.target.value })} />
                <div className="sl-f"><small className="dim">{x.desc}</small><small className="dim">inicial {g.taxes0[x.id]}</small></div>
              </div>
            );
          })}
          <p className="dim small">Les icones indiquen qui s'enfada si puges cada impost.</p>
        </Section>
      )}
      {!ro && (
        <div className="sticky-actions">
          {dirty ? (
            <>
              {matters && <span className={`sup ${s.support >= 0.5 ? 'ok' : 'no'}`}>🏛️ {(s.support * 100).toFixed(0)}% suport</span>}
              <button className="btn primary" disabled={g.pc < s.cost || (matters && s.support < 0.5)} onClick={() => act((x) => approveBudget(x, b, t))}>Aprovar · ⚡{s.cost}</button>
              {matters && s.support < 0.5 && <button className="btn warnb" disabled={g.pc < s.cost * 2} onClick={() => act((x) => approveBudget(x, b, t, true))}>Per decret · ⚡{s.cost * 2}</button>}
              <button className="btn ghost" onClick={() => { setB(g.budget); setT(g.taxes); }}>Desfés</button>
            </>
          ) : <span className="dim small">Mou els controls per preparar uns nous pressupostos.</span>}
        </div>
      )}
    </div>
  );
}
