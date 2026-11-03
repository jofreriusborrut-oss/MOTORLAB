import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  accent?: 'orange' | 'blue' | 'none';
  estimate?: boolean;
}

export function Stat({ label, value, unit, sub, accent = 'none', estimate }: Props) {
  return (
    <div className={`stat accent-${accent}`}>
      <span className="stat-label">
        {label}
        {estimate && <span className="est" title="Valor estimat pel model, no és una mesura real">EST.</span>}
      </span>
      <span className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
