import { useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type { Game } from '../engine/types';
import { useSize } from '../../utils/useSize';
import { useStore, useGame } from '../store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FEATURES: any[] = (feature(world as any, (world as any).objects.countries) as any).features.filter((f: any) => f.id !== '010');

function relColor(r: number) {
  if (r >= 0) {
    const t = Math.min(1, r / 100);
    return `rgb(${Math.round(70 - 30 * t)},${Math.round(80 + 80 * t)},${Math.round(95 - 10 * t)})`;
  }
  const t = Math.min(1, -r / 100);
  return `rgb(${Math.round(80 + 130 * t)},${Math.round(80 - 20 * t)},${Math.round(95 - 30 * t)})`;
}

export function nationColor(g: Game, id: string) {
  if (id === g.countryId) return '#d6b05c';
  const n = g.nations[id];
  if (!n) return '#232a36';
  if (n.wars.includes(g.countryId)) return '#e5484d';
  if (n.alliance) return '#3f7fe0';
  return relColor(n.rel);
}

export default function WorldMap() {
  const g = useGame();
  const { selNation, setSelNation, setPanel } = useStore();
  const [ref, size] = useSize<HTMLDivElement>();
  const [tf, setTf] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const { paths, path } = useMemo(() => {
    const W = Math.max(100, size.width), H = Math.max(100, size.height);
    const proj = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'FeatureCollection', features: FEATURES } as any);
    const path = geoPath(proj);
    return { paths: FEATURES.map((f) => ({ id: String(f.id ?? ''), name: f.properties?.name as string, d: path(f) ?? '' })), path };
  }, [size.width, size.height]);
  void path;

  const warIds = new Set(g.wars.flatMap((w) => [w.a, w.b]));

  const onWheel = (e: React.WheelEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const k2 = Math.min(8, Math.max(1, tf.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
    const f = k2 / tf.k;
    setTf({ k: k2, x: mx - (mx - tf.x) * f, y: my - (my - tf.y) * f });
  };
  const zoom = (f: number) => {
    const cx = size.width / 2, cy = size.height / 2;
    const k2 = Math.min(8, Math.max(1, tf.k * f));
    const r = k2 / tf.k;
    setTf(k2 === 1 ? { k: 1, x: 0, y: 0 } : { k: k2, x: cx - (cx - tf.x) * r, y: cy - (cy - tf.y) * r });
  };

  return (
    <div className="wmap" ref={ref} onWheel={onWheel}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, tx: tf.x, ty: tf.y, moved: false }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || e.buttons === 0) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
        if (d.moved) setTf((t) => ({ ...t, x: d.tx + dx, y: d.ty + dy }));
      }}
      onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}>
      {size.width > 0 && (
        <svg width={size.width} height={size.height}>
          <rect width={size.width} height={size.height} fill="transparent" />
          <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
            {paths.map((p, i) => {
              const has = p.id === g.countryId || !!g.nations[p.id];
              const sel = p.id === selNation;
              return (
                <path key={i} d={p.d} fill={nationColor(g, p.id)} stroke={sel ? '#fff' : warIds.has(p.id) ? '#ff7b7b' : '#0b0f16'}
                  strokeWidth={(sel ? 2 : warIds.has(p.id) ? 1.4 : 0.5) / tf.k} className={has ? 'land has' : 'land'}
                  onMouseMove={(e) => setHover({ id: p.id, name: g.nations[p.id]?.name ?? (p.id === g.countryId ? g.countryName : p.name), x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    if (g.nations[p.id]) { setSelNation(p.id); setPanel('diplomacia'); }
                    else if (p.id === g.countryId) setPanel('resum');
                  }} />
              );
            })}
          </g>
        </svg>
      )}
      {hover && (
        <div className="maptip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <b>{hover.name}</b>
          {g.nations[hover.id] && <span>Relació {g.nations[hover.id].rel.toFixed(0)}{g.nations[hover.id].wars.length ? ' · ⚔️ en guerra' : ''}{g.nations[hover.id].trade ? ' · 🤝 comerç' : ''}{g.nations[hover.id].alliance ? ' · 🛡️ aliat' : ''}</span>}
          {!g.nations[hover.id] && hover.id !== g.countryId && <span className="dim">Sense dades</span>}
        </div>
      )}
      <div className="zoom">
        <button onClick={() => zoom(1.4)}>＋</button>
        <button onClick={() => zoom(1 / 1.4)}>－</button>
        <button onClick={() => setTf({ k: 1, x: 0, y: 0 })}>⟲</button>
      </div>
      <div className="legend">
        <span><i style={{ background: '#d6b05c' }} />Tu</span>
        <span><i style={{ background: '#3f7fe0' }} />Aliat</span>
        <span><i style={{ background: relColor(80) }} />Amic</span>
        <span><i style={{ background: relColor(0) }} />Neutral</span>
        <span><i style={{ background: relColor(-80) }} />Hostil</span>
        <span><i style={{ background: '#e5484d' }} />En guerra</span>
      </div>
    </div>
  );
}
