import type { TooltipProps } from 'recharts';
import { fmt } from '../utils/format';

interface Extra {
  xLabel: (x: number) => string;
  units?: Record<string, string>;
  decimals?: Record<string, number>;
}

/** Tooltip amb estil de l'aplicació. Text en tinta neutra; el color només a la marca. */
export function ChartTooltip({ active, payload, label, xLabel, units = {}, decimals = {} }: TooltipProps<number, string> & Extra) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-x">{xLabel(Number(label))}</div>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <div key={String(p.dataKey)} className="chart-tip-row">
            <span className="swatch" style={{ background: p.color }} />
            <span className="chart-tip-name">{p.name}</span>
            <span className="chart-tip-val">
              {fmt(Number(p.value), decimals[String(p.dataKey)] ?? 1)} {units[String(p.dataKey)] ?? ''}
            </span>
          </div>
        ))}
    </div>
  );
}
