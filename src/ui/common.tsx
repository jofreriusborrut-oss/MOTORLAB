import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import type { HistoryRow } from '../engine/types';
import { dateLabel } from '../engine/util';

export function Bar({ v, max = 100, color, h = 6 }: { v: number; max?: number; color?: string; h?: number }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  const c = color ?? (pct >= 66 ? 'var(--ok)' : pct >= 40 ? 'var(--warn)' : 'var(--err)');
  return <div className="bar" style={{ height: h }}><i style={{ width: `${pct}%`, background: c }} /></div>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="psec">
      <div className="psec-h"><h3>{title}</h3>{right}</div>
      {children}
    </section>
  );
}

export function Row({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="prow">
      <span>{label}</span>
      <b className={tone}>{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function Delta({ v, d = 1, invert = false, unit = '' }: { v: number; d?: number; invert?: boolean; unit?: string }) {
  if (Math.abs(v) < Math.pow(10, -d) / 2) return <span className="delta">=</span>;
  const good = invert ? v < 0 : v > 0;
  return <span className={`delta ${good ? 'up' : 'down'}`}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(d)}{unit}</span>;
}

const COLORS = ['#d6b05c', '#5aa6f0', '#41d39a', '#e5484d', '#b07cf0', '#f08a5a'];

export function HistChart({ data, keys, labels, height = 160, unit = '', zero = false }: { data: HistoryRow[]; keys: (keyof HistoryRow)[]; labels?: string[]; height?: number; unit?: string; zero?: boolean }) {
  const step = Math.max(1, Math.floor(data.length / 240));
  const d = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  if (d.length < 2) return <div className="chart-empty">Encara no hi ha prou dades. Fes avançar el temps ▶</div>;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={d} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(t) => dateLabel(t, true).slice(4)} tick={{ fill: '#8994a3', fontSize: 10 }} minTickGap={30} stroke="rgba(255,255,255,0.15)" />
          <YAxis tick={{ fill: '#8994a3', fontSize: 10 }} stroke="rgba(255,255,255,0.15)" domain={['auto', 'auto']} width={50} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${+v.toFixed(1)}`)} />
          {zero && <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />}
          <Tooltip contentStyle={{ background: '#111722', border: '1px solid #2a3344', borderRadius: 8, fontSize: 12 }} labelFormatter={(t) => dateLabel(+t)}
            formatter={(v: number, n: string) => [`${v.toFixed(1)}${unit}`, labels?.[keys.indexOf(n as keyof HistoryRow)] ?? n]} />
          {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FxChips({ fx }: { fx: Record<string, number> }) {
  const L: Record<string, [string, boolean, number]> = {
    growth: ['Creixement', true, 0.05], unemp: ['Atur', false, 0.05], infl: ['Inflació', false, 0.05], gini: ['Desigualtat', false, 0.3], poverty: ['Pobresa', false, 0.3],
    crime: ['Delinqüència', false, 0.5], env: ['Medi ambient', true, 0.5], freedom: ['Llibertat', true, 0.5], corruption: ['Corrupció', false, 0.5], edu: ['Educació', true, 0.5],
    health: ['Salut', true, 0.5], innov: ['Innovació', true, 0.5], happiness: ['Felicitat', true, 0.5], stability: ['Estabilitat', true, 0.5], military: ['Força militar', true, 0.5],
    spend: ['Despesa', false, 0.05], revenue: ['Ingressos', true, 0.05], intl: ['Reputació', true, 0.5], unrest: ['Malestar', false, 0.5], migration: ['Immigració', true, 0.1],
  };
  const items = Object.entries(fx).filter(([k, v]) => L[k] && Math.abs(v) >= L[k][2]);
  if (!items.length) return <span className="dim small">Sense efectes directes</span>;
  return (
    <div className="chips">
      {items.map(([k, v]) => {
        const [name, goodUp] = L[k];
        const good = goodUp ? v > 0 : v < 0;
        const unit = ['growth', 'unemp', 'infl', 'spend', 'revenue'].includes(k) ? (k === 'spend' || k === 'revenue' ? '% PIB' : ' pp') : '';
        return <span key={k} className={`chip ${good ? 'good' : 'bad'}`}>{name} {v > 0 ? '+' : ''}{v.toFixed(Math.abs(v) < 1 ? 2 : 1)}{unit}</span>;
      })}
    </div>
  );
}
