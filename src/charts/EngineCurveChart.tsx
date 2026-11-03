import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisProps, CHART, gridProps } from './theme';
import { ChartTooltip } from './ChartTooltip';
import { fmt } from '../utils/format';

export interface Series {
  key: string;
  name: string;
  color: string;
  unit: string;
  decimals?: number;
  dashed?: boolean;
}

interface Props {
  data: Record<string, number>[];
  series: Series[];
  yLabel: string;
  height?: number;
  peak?: { rpm: number; value: number; label: string };
  markers?: { rpm: number; value: number }[];
  refRpm?: { rpm: number; label: string }[];
  xKey?: string;
  xUnit?: string;
  yDomain?: [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax'];
}

/** Gràfica lineal genèrica en funció del règim (una sola escala Y). */
export function EngineCurveChart({ data, series, yLabel, height = 320, peak, markers, refRpm, xKey = 'rpm', xUnit = 'rpm', yDomain = [0, 'auto'] }: Props) {
  const xMin = data.length ? Number(data[0][xKey]) : 0;
  const xMax = data.length ? Number(data[data.length - 1][xKey]) : 0;
  const step = xMax > 10000 ? 2000 : 1000;
  const ticks: number[] = [];
  for (let t = Math.ceil(xMin / step) * step; t <= xMax; t += step) ticks.push(t);
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 22, bottom: 8, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} type="number" domain={['dataMin', 'dataMax']} ticks={ticks} {...axisProps} tickFormatter={(v) => fmt(v)} />
          <YAxis {...axisProps} width={56} domain={yDomain} tickFormatter={(v) => fmt(v)} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: CHART.text, fontSize: 11, dx: 6, dy: 40 }} />
          <Tooltip
            content={<ChartTooltip xLabel={(x) => `${fmt(x)} ${xUnit}`} units={Object.fromEntries(series.map((s) => [s.key, s.unit]))} decimals={Object.fromEntries(series.map((s) => [s.key, s.decimals ?? 1]))} />}
            cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
          />
          {refRpm?.map((r) => (
            <ReferenceLine key={r.label} x={r.rpm} stroke="#3a4552" strokeDasharray="4 4" label={{ value: r.label, fill: CHART.text, fontSize: 10, position: 'insideTopRight' }} />
          ))}
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive
              animationDuration={450}
              connectNulls={false}
            />
          ))}
          {markers?.map((m, i) => (
            <ReferenceDot key={i} x={m.rpm} y={m.value} r={3.5} fill={CHART.surface} stroke={series[0]?.color} strokeWidth={1.5} />
          ))}
          {peak && (
            <ReferenceDot x={peak.rpm} y={peak.value} r={5} fill={series[0]?.color} stroke={CHART.surface} strokeWidth={2}
              label={{ value: peak.label, position: 'top', fill: '#e8edf3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
