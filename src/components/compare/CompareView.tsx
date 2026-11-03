import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { ConfigSelect } from '../ui/ConfigSelect';
import { CompareChart } from '../../charts/CompareChart';
import { SERIES } from '../../charts/theme';
import { ENERGY, ENGINE_TYPE_LABEL } from '../../physics/constants';
import { consumptionFor, priceFor } from '../fuel/FuelView';
import { fmt } from '../../utils/format';
import { sampleAt } from '../../simulation/acceleration';

interface Metric {
  label: string;
  a: number | null;
  b: number | null;
  unit: string;
  decimals?: number;
  better: 'high' | 'low' | 'none';
  textA?: string;
  textB?: string;
  bars?: boolean;
}

export function CompareView() {
  const { state, dispatch, analyzeById } = useStore();
  const A = analyzeById(state.compare[0]);
  const B = analyzeById(state.compare[1]);

  const curves = useMemo(() => {
    const ea = A?.analysis.engine;
    const eb = B?.analysis.engine;
    if (!ea || !eb) return [];
    const maxR = Math.max(ea.config.maxRpm, eb.config.maxRpm);
    const step = Math.max(50, Math.round(maxR / 200 / 50) * 50);
    const rows = [];
    for (let r = 0; r <= maxR; r += step) {
      const ta = r <= ea.config.maxRpm && r >= ea.minRpm ? ea.torqueAt(r) : null;
      const tb = r <= eb.config.maxRpm && r >= eb.minRpm ? eb.torqueAt(r) : null;
      rows.push({
        rpm: r,
        ta: ta !== null ? Math.round(ta) : null,
        tb: tb !== null ? Math.round(tb) : null,
        pa: ta !== null ? Math.round(((ta * r * 2 * Math.PI) / 60000) * 1.35962) : null,
        pb: tb !== null ? Math.round(((tb * r * 2 * Math.PI) / 60000) * 1.35962) : null,
      });
    }
    return rows;
  }, [A, B]);

  const speedRows = useMemo(() => {
    const sa = A?.analysis.sim?.samples;
    const sb = B?.analysis.sim?.samples;
    if (!sa || !sb) return [];
    const end = Math.min(30, Math.max(sa[sa.length - 1].t, sb[sb.length - 1].t));
    const rows = [];
    const at = (arr: typeof sa, t: number) => (t > arr[arr.length - 1].t ? null : Math.round(sampleAt(arr, t).kmh * 10) / 10);
    for (let t = 0; t <= end + 1e-9; t += 0.2) rows.push({ t: Math.round(t * 10) / 10, a: at(sa, t), b: at(sb, t) });
    return rows;
  }, [A, B]);

  if (!A || !B) return null;
  const ea = A.analysis.engine;
  const eb = B.analysis.engine;
  const ca = consumptionFor(A.config, A.analysis, state.fuel);
  const cb = consumptionFor(B.config, B.analysis, state.fuel);
  const ua = ENERGY[A.config.engine.type].unit;
  const ub = ENERGY[B.config.engine.type].unit;

  const metrics: Metric[] = [
    { label: 'Potència màxima', a: ea?.peakPower.cv ?? null, b: eb?.peakPower.cv ?? null, unit: 'CV', better: 'high' },
    { label: 'Parell màxim', a: ea?.peakTorque.torque ?? null, b: eb?.peakTorque.torque ?? null, unit: 'Nm', better: 'high' },
    { label: 'Cilindrada', a: A.config.engine.displacementCc || null, b: B.config.engine.displacementCc || null, unit: 'cc', better: 'none',
      textA: A.config.engine.type === 'electric' ? 'n/a (elèctric)' : undefined, textB: B.config.engine.type === 'electric' ? 'n/a (elèctric)' : undefined },
    { label: 'Pes del vehicle', a: A.config.vehicle.massKg, b: B.config.vehicle.massKg, unit: 'kg', better: 'low' },
    { label: 'Relació potència/pes', a: A.analysis.powerToWeight || null, b: B.analysis.powerToWeight || null, unit: 'CV/t', better: 'high' },
    { label: '0 – 100 km/h', a: A.analysis.sim?.t0to100 ?? null, b: B.analysis.sim?.t0to100 ?? null, unit: 's', decimals: 1, better: 'low' },
    { label: 'Velocitat màxima', a: A.analysis.top?.kmh ?? null, b: B.analysis.top?.kmh ?? null, unit: 'km/h', better: 'high' },
    { label: 'Consum', a: ca, b: cb, unit: '', decimals: 1, better: ua === ub ? 'low' : 'none', bars: ua === ub,
      textA: ca !== null ? `${fmt(ca, 1)} ${ua}/100 km` : undefined, textB: cb !== null ? `${fmt(cb, 1)} ${ub}/100 km` : undefined },
    { label: 'Cost cada 100 km', a: ca !== null ? ca * priceFor(A.config, state.fuel) : null, b: cb !== null ? cb * priceFor(B.config, state.fuel) : null, unit: '€', decimals: 2, better: 'low' },
  ];

  return (
    <div className="view">
      <Panel title="Comparador de motors" code="X-01" subtitle={`Consum: ${state.fuel.source === 'estimat' ? 'estimat pel model (cicle mixt)' : 'valor declarat'} · es pot canviar a la secció Consum`}>
        <div className="compare-pickers">
          <ConfigSelect label="Motor A" swatch={SERIES.orange} value={state.compare[0]} onChange={(id) => dispatch({ type: 'compare', slot: 0, id })} />
          <span className="vs">VS</span>
          <ConfigSelect label="Motor B" swatch={SERIES.blue} value={state.compare[1]} onChange={(id) => dispatch({ type: 'compare', slot: 1, id })} />
        </div>
        <div className="compare-head">
          <div><span className="swatch" style={{ background: SERIES.orange }} /> <strong>{A.config.name}</strong><small>{ENGINE_TYPE_LABEL[A.config.engine.type]}</small></div>
          <div className="right"><strong>{B.config.name}</strong><small>{ENGINE_TYPE_LABEL[B.config.engine.type]}</small> <span className="swatch" style={{ background: SERIES.blue }} /></div>
        </div>
        <div className="metrics">
          {metrics.map((m) => <MetricRow key={m.label} m={m} />)}
        </div>
      </Panel>

      {curves.length > 0 && (
        <div className="grid-2">
          <Panel title="Parell motor" code="X-02">
            <CompareChart data={curves} xKey="rpm" xUnit="rpm" unit="Nm" yLabel="Nm" a={{ key: 'ta', name: A.config.name, color: SERIES.orange }} b={{ key: 'tb', name: B.config.name, color: SERIES.blue }} />
          </Panel>
          <Panel title="Potència" code="X-03">
            <CompareChart data={curves} xKey="rpm" xUnit="rpm" unit="CV" yLabel="CV" a={{ key: 'pa', name: A.config.name, color: SERIES.orange }} b={{ key: 'pb', name: B.config.name, color: SERIES.blue }} />
          </Panel>
        </div>
      )}
      {speedRows.length > 0 && (
        <Panel title="Acceleració: velocitat en funció del temps" code="X-04">
          <CompareChart data={speedRows} xKey="t" xUnit="s" unit="km/h" yLabel="km/h" decimals={1} a={{ key: 'a', name: A.config.name, color: SERIES.orange }} b={{ key: 'b', name: B.config.name, color: SERIES.blue }} />
        </Panel>
      )}
    </div>
  );
}

function MetricRow({ m }: { m: Metric }) {
  const max = Math.max(m.a ?? 0, m.b ?? 0) || 1;
  const win = m.better === 'none' || m.a === null || m.b === null || Math.abs(m.a - m.b) < 1e-9 ? null : (m.better === 'high') === m.a > m.b ? 'a' : 'b';
  const d = m.decimals ?? 0;
  const pct = m.a !== null && m.b !== null && m.b !== 0 ? ((m.a - m.b) / m.b) * 100 : null;
  return (
    <div className="metric">
      <div className={`m-val a ${win === 'a' ? 'win' : ''}`}>{m.textA ?? (m.a !== null ? `${fmt(m.a, d)} ${m.unit}` : '—')}</div>
      <div className="m-bar a"><div style={{ width: `${m.bars === false ? 0 : ((m.a ?? 0) / max) * 100}%` }} /></div>
      <div className="m-label">
        {m.label}
        {pct !== null && m.better !== 'none' && <small className="mono">{pct > 0 ? '+' : ''}{fmt(pct, 0)} % A/B</small>}
      </div>
      <div className="m-bar b"><div style={{ width: `${m.bars === false ? 0 : ((m.b ?? 0) / max) * 100}%` }} /></div>
      <div className={`m-val b ${win === 'b' ? 'win' : ''}`}>{m.textB ?? (m.b !== null ? `${fmt(m.b, d)} ${m.unit}` : '—')}</div>
    </div>
  );
}
