import { fmt } from '../../utils/format';

interface Props {
  value: number;
  max: number;
  label: string;
  unit: string;
  redFrom?: number;
  majorStep: number;
  tickDivisor?: number;
  decimals?: number;
}

const START = -225;
const SWEEP = 270;

/** Rellotge analògic SVG (velocímetre / comptarevolucions). */
export function Gauge({ value, max, label, unit, redFrom, majorStep, tickDivisor = 1, decimals = 0 }: Props) {
  const R = 100;
  const cx = 120;
  const cy = 120;
  const ang = (v: number) => START + (Math.max(0, Math.min(v, max)) / max) * SWEEP;
  const pt = (a: number, r: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const arc = (a0: number, a1: number, r: number) => {
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += majorStep) ticks.push(v);
  const minor: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += majorStep / 2) minor.push(v);
  const a = ang(value);
  const [nx, ny] = pt(a, R - 14);

  return (
    <svg viewBox="0 0 240 236" className="gauge" role="img" aria-label={`${label}: ${fmt(value, decimals)} ${unit}`}>
      <path d={arc(START, START + SWEEP, R)} className="g-track" />
      {redFrom !== undefined && redFrom < max && <path d={arc(ang(redFrom), START + SWEEP, R)} className="g-red" />}
      <path d={arc(START, a, R)} className="g-fill" />
      {minor.map((v) => {
        const [x0, y0] = pt(ang(v), R - 8);
        const [x1, y1] = pt(ang(v), R - (ticks.includes(v) ? 18 : 13));
        return <line key={`m${v}`} x1={x0} y1={y0} x2={x1} y2={y1} className={`g-tick ${redFrom !== undefined && v >= redFrom ? 'red' : ''}`} />;
      })}
      {ticks.map((v) => {
        const [x, y] = pt(ang(v), R - 30);
        return <text key={v} x={x} y={y + 4} textAnchor="middle" className="g-num">{fmt(v / tickDivisor)}</text>;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} className="g-needle" />
      <circle cx={cx} cy={cy} r={7} className="g-hub" />
      <text x={cx} y={cy + 92} textAnchor="middle" className="g-value">{fmt(value, decimals)}</text>
      <text x={cx} y={cy + 110} textAnchor="middle" className="g-unit">{unit}</text>
      <text x={cx} y={cy - 32} textAnchor="middle" className="g-label">{label}</text>
    </svg>
  );
}
