import { GROUPS } from '../../data/groups';
import { POLICY_BY_ID, POLICY_CATS } from '../../data/policies';
import { canChooseOption, oppAction, proposeLaw, callReferendum } from '../../engine/actions';
import { lawCost, lawSupport, parliamentMatters } from '../../engine/politics';
import { refCost } from '../../engine/referendum';
import { useStore, useGame } from '../../store';
import { FxChips, Section } from '../common';

export default function PolicyPanel({ pid }: { pid: string }) {
  const g = useGame();
  const { act } = useStore();
  const pol = POLICY_BY_ID[pid];
  if (!pol) return null;
  const cur = g.policies[pid];
  const curOpt = pol.options[cur];
  const matters = parliamentMatters(g);

  return (
    <div className="panel">
      <div className="ph">
        <small>{POLICY_CATS[pol.cat]}</small>
        <h2>{pol.name}</h2>
        {pol.desc && <p className="dim">{pol.desc}</p>}
        {g.policies0[pid] !== cur && <p className="small">Al començar: <i>{pol.options[g.policies0[pid]].label}</i></p>}
      </div>
      {!g.inPower && <div className="note">{g.exile ? 'Ets a l\'exili: no pots proposar lleis.' : 'Ets a l\'oposició. Pots proposar lleis al parlament: si aconsegueixes majoria, s\'aproven igualment.'}</div>}
      <Section title="Opcions">
        <div className="opts">
          {pol.options.map((o, i) => {
            const isCur = i === cur;
            const fx: Record<string, number> = {};
            for (const k of new Set([...Object.keys(o.fx), ...Object.keys(curOpt.fx)])) fx[k] = ((o.fx as any)[k] ?? 0) - ((curOpt.fx as any)[k] ?? 0);
            const reacts = GROUPS.map((gr) => ({ gr, d: (o.g[gr.id] ?? 0) - (curOpt.g[gr.id] ?? 0) })).filter((x) => Math.abs(x.d) >= 2).sort((a, b) => b.d - a.d);
            const sup = isCur ? null : lawSupport(g, pid, i);
            const cost = lawCost(g, pid, i);
            const lock = canChooseOption(g, pid, i);
            return (
              <div key={i} className={`opt ${isCur ? 'cur' : ''}`}>
                <div className="opt-h">
                  <b>{o.label}</b>
                  {isCur && <span className="pill">Actual</span>}
                </div>
                {o.desc && <p className="dim small">{o.desc}</p>}
                {!isCur && (
                  <>
                    <FxChips fx={fx} />
                    {reacts.length > 0 && (
                      <div className="reacts">
                        {reacts.map(({ gr, d }) => <span key={gr.id} className={d > 0 ? 'good' : 'bad'} title={gr.name}>{gr.icon} {d > 0 ? '+' : ''}{d.toFixed(0)}</span>)}
                      </div>
                    )}
                    <div className="opt-f">
                      {matters && sup && <span className={`sup ${sup.support >= 0.5 ? 'ok' : 'no'}`}>🏛️ {(sup.support * 100).toFixed(0)}% suport</span>}
                      {lock ? <span className="dim small">🔒 {lock}</span> : g.inPower ? (
                        <>
                          <button className="btn primary sm" disabled={g.pc < cost || (matters && sup!.support < 0.5)} onClick={() => act((x) => proposeLaw(x, pid, i))}>Aprovar · ⚡{cost}</button>
                          {matters && sup!.support < 0.5 && <button className="btn warnb sm" disabled={g.pc < cost * 2} onClick={() => act((x) => proposeLaw(x, pid, i, true))} title="Saltar-se el parlament: costa el doble i erosiona la democràcia">Per decret · ⚡{cost * 2}</button>}
                          <button className="btn ghost sm" disabled={!!g.referendum || g.pc < refCost('llei')} onClick={() => act((x) => callReferendum(x, 'llei', { pid, idx: i }))} title="Que decideixi el poble">🗳️ ⚡{refCost('llei')}</button>
                        </>
                      ) : !g.exile && (
                        <button className="btn sm" disabled={g.pc < 12 || !matters} onClick={() => act((x) => oppAction(x, 'llei', `${pid}:${i}`))}>Proposar al parlament · ⚡12</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      <p className="dim small">Els efectes són respecte a l'opció actual. Molts triguen mesos o anys a notar-se del tot (educació, salut, corrupció…).</p>
    </div>
  );
}
