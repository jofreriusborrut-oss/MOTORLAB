import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import type { TractionDiagramRow } from '../physics/vehicle';
import { axisProps, CHART, gearColor, gridProps, SERIES } from './theme';
import { ChartTooltip } from './ChartTooltip';
import { fmt } from '../utils/format';

interface Props {
  data: TractionDiagramRow[];
  gears: number;
  gripLimit: number;
  topKmh?: number;
  height?: number;
}

/** Diagrama de tracció: força a la roda de cada marxa vs. resistència a l'avanç. */
export function TractionChart({ data, gears, gripLimit, topKmh, height = 360 }: Props) {
  const keys = Array.from({ length: gears }, (_, i) => `g${i + 1}`);
  const units: Record<string, string> = { resistance: 'N' };
  keys.forEach((k) => (units[k] = 'N'));
  const maxK = data.length ? data[data.length - 1].kmh : 0;
  const tickStep = maxK > 250 ? 50 : maxK > 120 ? 25 : 10;
  const xTicks = Array.from({ length: Math.floor(maxK / tickStep) + 1 }, (_, i) => i * tickStep);
  const maxForce = Math.max(...data.map((r) => Math.max(...keys.map((k) => (r[k as `g${number}`] as number) ?? 0))));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 22, bottom: 8, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="kmh" type="number" domain={[0, 'dataMax']} ticks={xTicks} {...axisProps} tickFormatter={(v) => fmt(v)} />
          <YAxis {...axisProps} width={60} domain={[0, Math.ceil((Math.max(maxForce, gripLimit * 0.5) * 1.08) / 500) * 500]} tickFormatter={(v) => fmt(v)}
            label={{ value: 'Força (N)', angle: -90, position: 'insideLeft', fill: CHART.text, fontSize: 11, dx: 4, dy: 30 }} />
          <Tooltip content={<ChartTooltip xLabel={(x) => `${fmt(x)} km/h`} units={units} decimals={{ resistance: 0, ...Object.fromEntries(keys.map((k) => [k, 0])) }} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART.text }} iconType="plainline" />
          {gripLimit < maxForce * 1.5 && (
            <ReferenceLine y={gripLimit} stroke="#8b97a6" strokeDasharray="2 3" label={{ value: `Límit d'adherència ${fmt(gripLimit)} N`, fill: CHART.text, fontSize: 10, position: 'insideTopRight' }} />
          )}
          {topKmh && <ReferenceLine x={topKmh} stroke="#3a4552" strokeDasharray="4 4" label={{ value: `Vmàx ${fmt(topKmh)} km/h`, fill: CHART.text, fontSize: 10, position: 'insideTopLeft' }} />}
          {keys.map((k, i) => (
            <Line key={k} dataKey={k} name={`${i + 1}a`} stroke={gearColor(i, gears)} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive animationDuration={400} />
          ))}
          <Line dataKey="resistance" name="Resistència total" stroke={SERIES.orange} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive animationDuration={400} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
