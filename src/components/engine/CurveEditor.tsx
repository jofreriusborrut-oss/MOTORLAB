import { useMemo, useRef, useState } from 'react';
import type { CurvePoint } from '../../physics/types';
import { curveInterpolator, sortCurve } from '../../physics/interpolation';
import { powerKw, kwToCv } from '../../physics/engine';
import { useSize } from '../../utils/useSize';
import { decimalSeparator, fmt } from '../../utils/format';
import { SERIES } from '../../charts/theme';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  points: CurvePoint[];
  maxRpm: number;
  idleRpm: number;
  onChange: (points: CurvePoint[]) => void;
}

const PAD = { l: 52, r: 18, t: 16, b: 30 };
const H = 300;

/**
 * Editor visual de la corba de parell. Els punts es poden arrossegar
 * (horitzontal: rpm, vertical: Nm). Doble clic a l'àrea afegeix un punt;
 * seleccionar-lo i prémer Supr l'elimina. La línia és la interpolació
 * monòtona que fa servir el model.
 */
export function CurveEditor({ points, maxRpm, idleRpm, onChange }: Props) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const { t } = useI18n();
  const [drag, setDrag] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sorted = useMemo(() => sortCurve(points), [points]);

  // L'escala es congela durant l'arrossegament per evitar realimentació
  const frozen = useRef<{ xMax: number; yMax: number } | null>(null);
  const xMaxLive = Math.max(maxRpm, ...sorted.map((p) => p.rpm)) * 1.02;
  const yMaxLive = Math.ceil((Math.max(50, ...sorted.map((p) => p.torque)) * 1.25) / 50) * 50;
  const xMax = drag !== null && frozen.current ? frozen.current.xMax : xMaxLive;
  const yMax = drag !== null && frozen.current ? frozen.current.yMax : yMaxLive;
  const w = Math.max(280, width);
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const sx = (rpm: number) => PAD.l + (rpm / xMax) * iw;
  const sy = (t: number) => PAD.t + ih - (t / yMax) * ih;
  const ix = (px: number) => ((px - PAD.l) / iw) * xMax;
  const iy = (py: number) => ((PAD.t + ih - py) / ih) * yMax;

  const path = useMemo(() => {
    if (sorted.length < 2) return '';
    const f = curveInterpolator(sorted);
    const a = sorted[0].rpm;
    const b = sorted[sorted.length - 1].rpm;
    const n = 160;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const r = a + ((b - a) * i) / n;
      d += `${i ? 'L' : 'M'}${sx(r).toFixed(1)},${sy(f(r)).toFixed(1)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, w, xMax, yMax]);

  const toLocal = (e: React.PointerEvent | React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const move = (e: React.PointerEvent) => {
    if (drag === null) return;
    const { x, y } = toLocal(e);
    const prev = sorted[drag - 1]?.rpm ?? -Infinity;
    const next = sorted[drag + 1]?.rpm ?? Infinity;
    let rpm = Math.round(ix(x) / 50) * 50;
    rpm = Math.max(prev + 50, Math.min(next - 50, Math.max(0, Math.min(rpm, 30000))));
    const torque = Math.max(0, Math.min(Math.round(iy(y)), yMax));
    const nextPts = sorted.map((p, i) => (i === drag ? { rpm, torque } : p));
    onChange(nextPts);
  };

  const addAt = (rpm: number, torque?: number) => {
    const r = Math.round(rpm / 50) * 50;
    if (sorted.some((p) => Math.abs(p.rpm - r) < 50)) return;
    const f = curveInterpolator(sorted);
    const t = Math.round(torque ?? f(r));
    onChange(sortCurve([...sorted, { rpm: r, torque: Math.max(0, t) }]));
  };

  const remove = (i: number) => {
    if (sorted.length <= 2) return;
    onChange(sorted.filter((_, k) => k !== i));
    setSel(null);
  };

  const addInLargestGap = () => {
    let gi = 0;
    let gap = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const g = sorted[i + 1].rpm - sorted[i].rpm;
      if (g > gap) { gap = g; gi = i; }
    }
    if (sorted.length === 0) return onChange([{ rpm: idleRpm, torque: 100 }, { rpm: maxRpm, torque: 100 }]);
    const last = sorted[sorted.length - 1];
    if (last.rpm < maxRpm && maxRpm - last.rpm >= gap) return addAt(maxRpm, last.torque);
    addAt((sorted[gi].rpm + sorted[gi + 1].rpm) / 2);
  };

  const xTicks = niceTicks(xMax, 7);
  const yTicks = niceTicks(yMax, 5);

  return (
    <div className="curve-editor">
      <div ref={wrapRef} className="curve-canvas" tabIndex={0}
        onKeyDown={(e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel !== null) remove(sel); }}>
        <svg ref={svgRef} width={w} height={H} role="img" aria-label={t('curve.aria')}
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
          onDoubleClick={(e) => {
            const { x, y } = toLocal(e);
            if (x < PAD.l || x > w - PAD.r) return;
            addAt(ix(x), iy(y));
          }}
          style={{ touchAction: 'none' }}>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.l} x2={w - PAD.r} y1={sy(t)} y2={sy(t)} className="ce-grid" />
              <text x={PAD.l - 8} y={sy(t) + 4} className="ce-tick" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={sx(t)} y={H - 10} className="ce-tick" textAnchor="middle">{fmt(t)}</text>
          ))}
          <rect x={sx(maxRpm)} y={PAD.t} width={Math.max(0, w - PAD.r - sx(maxRpm))} height={ih} className="ce-redzone" />
          <line x1={sx(maxRpm)} x2={sx(maxRpm)} y1={PAD.t} y2={PAD.t + ih} className="ce-redline" />
          <text x={sx(maxRpm) - 4} y={PAD.t + 12} className="ce-tick" textAnchor="end">{t('curve.cut', { rpm: fmt(maxRpm) })}</text>
          {idleRpm > 0 && (
            <>
              <line x1={sx(idleRpm)} x2={sx(idleRpm)} y1={PAD.t} y2={PAD.t + ih} className="ce-idle" />
              <text x={sx(idleRpm) + 4} y={PAD.t + 12} className="ce-tick">{t('curve.idle')}</text>
            </>
          )}
          <text x={14} y={PAD.t + ih / 2} className="ce-tick" transform={`rotate(-90 14 ${PAD.t + ih / 2})`} textAnchor="middle">{t('curve.yLabel')}</text>
          <path d={path} fill="none" stroke={SERIES.blue} strokeWidth={2} />
          {sorted.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.rpm)} cy={sy(p.torque)} r={14} fill="transparent" className="ce-hit"
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  frozen.current = { xMax, yMax };
                  setDrag(i);
                  setSel(i);
                }} />
              <circle cx={sx(p.rpm)} cy={sy(p.torque)} r={sel === i ? 6.5 : 5} className={`ce-pt ${sel === i ? 'sel' : ''} ${p.rpm > maxRpm ? 'out' : ''}`} pointerEvents="none" />
              {(drag === i || sel === i) && (
                <text x={sx(p.rpm)} y={sy(p.torque) - 12} className="ce-label" textAnchor="middle">
                  {fmt(p.rpm)} rpm · {fmt(p.torque)} Nm
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <p className="hint">{t('curve.hint1')} <kbd>{t('curve.delKey')}</kbd> {t('curve.hint2')}</p>

      <div className="curve-table-wrap">
        <table className="curve-table">
          <thead>
            <tr><th>#</th><th>{t('curve.colRpm')}</th><th>{t('curve.colTorque')}</th><th>{t('curve.colPower')}</th><th /></tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={i} className={sel === i ? 'sel' : ''} onClick={() => setSel(i)}>
                <td className="mono dim">{i + 1}</td>
                <td><CellInput value={p.rpm} onCommit={(rpm) => onChange(sortCurve(sorted.map((q, k) => (k === i ? { ...q, rpm } : q))))} min={0} max={30000} /></td>
                <td><CellInput value={p.torque} onCommit={(torque) => onChange(sorted.map((q, k) => (k === i ? { ...q, torque } : q)))} min={0} max={5000} /></td>
                <td className="mono dim">{fmt(kwToCv(powerKw(p.torque, p.rpm)), 0)} {t('u.cv')}</td>
                <td><button className="icon-btn" title={t('curve.remove')} aria-label={t('curve.remove')} disabled={sorted.length <= 2} onClick={(e) => { e.stopPropagation(); remove(i); }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn ghost small" onClick={addInLargestGap}>{t('curve.add')}</button>
      </div>
    </div>
  );
}

function CellInput({ value, onCommit, min, max }: { value: number; onCommit: (v: number) => void; min: number; max: number }) {
  const [txt, setTxt] = useState<string | null>(null);
  const shown = txt ?? String(value).replace('.', decimalSeparator());
  const n = Number(shown.replace(',', '.'));
  const bad = !Number.isFinite(n) || n < min || n > max || shown.trim() === '';
  const commit = () => {
    if (!bad && n !== value) onCommit(n);
    setTxt(null);
  };
  return (
    <input className={`cell ${bad ? 'bad' : ''}`} inputMode="decimal" value={shown}
      onChange={(e) => setTxt(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setTxt(null); }} />
  );
}

function niceTicks(max: number, count: number): number[] {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v));
  return out;
}
