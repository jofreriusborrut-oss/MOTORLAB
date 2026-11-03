import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisProps, CHART, gridProps, SERIES } from './theme';
import { ChartTooltip } from './ChartTooltip';
import { fmt } from '../utils/format';

interface Props {
  data: { t: number; kmh: number }[];
  maxT: number;
  maxKmh: number;
  shifts: { t: number; to: number }[];
  targetKmh: number;
  height?: number;
}

export function SpeedTimeChart({ data, maxT, maxKmh, shifts, targetKmh, height = 300 }: Props) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <defs>
            <linearGradient id="spdFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.orange} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES.orange} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="t" type="number" domain={[0, Math.max(1, Math.ceil(maxT))]} {...axisProps} tickFormatter={(v) => `${fmt(v)} s`} />
          <YAxis {...axisProps} width={52} domain={[0, Math.ceil(maxKmh / 20) * 20]} tickFormatter={(v) => fmt(v)}
            label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: CHART.text, fontSize: 11, dx: 8 }} />
          <Tooltip content={<ChartTooltip xLabel={(x) => `t = ${fmt(x, 2)} s`} units={{ kmh: 'km/h' }} decimals={{ kmh: 1 }} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <ReferenceLine y={targetKmh} stroke="#3a4552" strokeDasharray="4 4" label={{ value: `${targetKmh} km/h`, fill: CHART.text, fontSize: 10, position: 'insideTopLeft' }} />
          {shifts.map((s) => (
            <ReferenceLine key={s.t} x={s.t} stroke="#2a323d" label={{ value: `${s.to}a`, fill: CHART.text, fontSize: 10, position: 'insideBottomRight' }} />
          ))}
          <Area dataKey="kmh" name="Velocitat" type="linear" stroke={SERIES.orange} strokeWidth={2} fill="url(#spdFill)" isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
