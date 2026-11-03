import { NumberField } from '../ui/NumberField';
import { fmt } from '../../utils/format';
import type { GearInfo } from '../../physics/vehicle';

interface Props {
  ratios: number[];
  onChange: (r: number[]) => void;
  gears: GearInfo[];
  errorMsg?: string;
}

export function GearEditor({ ratios, onChange, gears, errorMsg }: Props) {
  const setCount = (n: number) => {
    if (n === ratios.length) return;
    if (n < ratios.length) return onChange(ratios.slice(0, n));
    const out = [...ratios];
    while (out.length < n) {
      const last = out[out.length - 1] ?? 3.5;
      const prev = out[out.length - 2] ?? last * 1.4;
      const step = Math.min(0.9, Math.max(0.6, last / prev));
      out.push(Math.round(last * step * 100) / 100);
    }
    onChange(out);
  };
  return (
    <div className="gear-editor">
      <NumberField label="Nombre de marxes" value={ratios.length} min={1} max={10} integer onChange={setCount} />
      <div className="gear-grid">
        {ratios.map((r, i) => (
          <div key={i} className="gear-cell">
            <NumberField compact label={`${i + 1}a`} value={r} min={0.1} max={20} step={0.01} decimals={2}
              onChange={(v) => onChange(ratios.map((x, k) => (k === i ? v : x)))} />
            <span className="gear-meta mono">{gears[i] ? `${fmt(gears[i].maxSpeedKmh, 0)} km/h` : ''}</span>
          </div>
        ))}
      </div>
      {errorMsg && <small className="field-msg err-text">{errorMsg}</small>}
    </div>
  );
}
