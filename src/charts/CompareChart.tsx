import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisProps, CHART, gridProps } from './theme';
import { ChartTooltip } from './ChartTooltip';
import { fmt } from '../utils/format';

interface Props {
  data: Record<string, number | null>[];
  xKey: string;
  xUnit: string;
  a: { key: string; name: string; color: string };
  b: { key: string; name: string; color: string };
  unit: string;
  yLabel: string;
  height?: number;
  decimals?: number;
}

/** Dues sèries superposades sobre la mateixa magnitud (una sola escala Y). */
export function CompareChart({ data, xKey, xUnit, a, b, unit, yLabel, height = 300, decimals = 0 }: Props) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} type="number" domain={[0, 'dataMax']} {...axisProps} tickFormatter={(v) => fmt(v)} />
          <YAxis {...axisProps} width={56} tickFormatter={(v) => fmt(v)} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: CHART.text, fontSize: 11, dx: 6, dy: 30 }} />
          <Tooltip content={<ChartTooltip xLabel={(x) => `${fmt(x, xUnit === 's' ? 1 : 0)} ${xUnit}`} units={{ [a.key]: unit, [b.key]: unit }} decimals={{ [a.key]: decimals, [b.key]: decimals }} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART.text }} iconType="plainline" />
          <Line dataKey={a.key} name={a.name} stroke={a.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive animationDuration={450} />
          <Line dataKey={b.key} name={b.name} stroke={b.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive animationDuration={450} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
