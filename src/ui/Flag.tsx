import type { Flag as F } from '../engine/types';

function star(cx: number, cy: number, r: number, n = 5) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Union({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <rect width="300" height="200" fill="#012169" />
      <path d="M0,0 L300,200 M300,0 L0,200" stroke="#fff" strokeWidth="40" />
      <path d="M0,0 L300,200 M300,0 L0,200" stroke="#c8102e" strokeWidth="13" />
      <path d="M150,0 V200 M0,100 H300" stroke="#fff" strokeWidth="60" />
      <path d="M150,0 V200 M0,100 H300" stroke="#c8102e" strokeWidth="36" />
    </g>
  );
}

function Emblem({ f }: { f: F }) {
  const e = f.emblem;
  if (!e || e === 'none') return null;
  const c = f.ec ?? '#fff';
  const [cx, cy] = f.ep === 'l' ? [95, 100] : f.ep === 'tl' ? [60, 55] : [150, 100];
  switch (e) {
    case 'star': return <polygon points={star(cx, cy, 38)} fill={c} />;
    case 'stars':
      if (f.ep === 'tl') return (<g fill={c}><polygon points={star(cx, cy, 30)} />{[[100, 22], [118, 42], [118, 68], [100, 88]].map(([x, y], i) => <polygon key={i} points={star(x, y, 9)} />)}</g>);
      return (<g fill={c}>{Array.from({ length: 8 }, (_, i) => { const a = Math.PI * (0.15 + 0.7 * i / 7); return <polygon key={i} points={star(150 - 55 * Math.cos(a), 115 - 45 * Math.sin(a), 9)} />; })}</g>);
    case 'circle': return <circle cx={cx} cy={cy} r={30} fill={c} />;
    case 'eagle': return (<g><circle cx={cx} cy={cy} r={28} fill={c} /><path d={`M${cx - 18},${cy - 4} Q${cx},${cy - 24} ${cx + 18},${cy - 4} L${cx},${cy + 16} Z`} fill="rgba(0,0,0,0.25)" /></g>);
    case 'crescent': return (<g><circle cx={cx} cy={cy} r={50} fill={c} /><circle cx={cx + 13} cy={cy} r={40} fill={f.colors[0]} /><polygon points={star(cx + 62, cy, 18)} fill={c} transform={`rotate(-18 ${cx + 62} ${cy})`} /></g>);
    case 'sun': return (<g stroke={c} strokeWidth="4" fill={c}>{Array.from({ length: 16 }, (_, i) => { const a = (Math.PI * 2 * i) / 16; return <line key={i} x1={cx} y1={cy} x2={cx + 34 * Math.cos(a)} y2={cy + 34 * Math.sin(a)} />; })}<circle cx={cx} cy={cy} r={18} /></g>);
    case 'wheel': return (<g stroke={c} strokeWidth="3" fill="none"><circle cx={cx} cy={cy} r={28} />{Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * 2 * i) / 12; return <line key={i} x1={cx} y1={cy} x2={cx + 28 * Math.cos(a)} y2={cy + 28 * Math.sin(a)} />; })}</g>);
    case 'ring': return (<g><circle cx={cx} cy={cy} r={34} fill="none" stroke={c} strokeWidth="9" /><rect x={cx - 15} y={cy - 18} width="30" height="36" rx="6" fill="#fff" stroke="#da291c" strokeWidth="4" /></g>);
    case 'leaf': return <polygon points={star(cx, cy - 4, 46, 11)} fill={c} />;
    case 'cross': return (<g fill={c}><rect x={cx - 10} y={cy - 38} width="20" height="76" /><rect x={cx - 38} y={cy - 10} width="76" height="20" /></g>);
    case 'sword': return (<g fill={c}><rect x={70} y={128} width={150} height={8} rx="3" /><rect x={210} y={120} width={8} height={24} /><text x="150" y="95" fontSize="30" textAnchor="middle" fill={c} fontFamily="serif">﷽</text></g>);
  }
  return null;
}

export default function Flag({ flag, w = 30, className }: { flag: F; w?: number; className?: string }) {
  const c = flag.colors;
  let body: JSX.Element;
  switch (flag.shape) {
    case 'h': case 'v': {
      const r = flag.ratios ?? c.map(() => 1);
      const tot = r.reduce((a, b) => a + b, 0);
      let pos = 0;
      body = (<>{c.map((col, i) => {
        const size = (r[i] / tot) * (flag.shape === 'h' ? 200 : 300);
        const el = flag.shape === 'h' ? <rect key={i} x="0" y={pos} width="300" height={size + 0.5} fill={col} /> : <rect key={i} x={pos} y="0" width={size + 0.5} height="200" fill={col} />;
        pos += size;
        return el;
      })}</>);
      break;
    }
    case 'nordic':
      body = (<><rect width="300" height="200" fill={c[0]} /><rect x="85" y="0" width="50" height="200" fill={c[1]} /><rect x="0" y="75" width="300" height="50" fill={c[1]} />
        {c[2] && <><rect x="98" y="0" width="24" height="200" fill={c[2]} /><rect x="0" y="88" width="300" height="24" fill={c[2]} /></>}</>);
      break;
    case 'cross':
      body = (<><rect width="300" height="200" fill={c[0]} /><rect x="127" y="40" width="46" height="120" fill={c[1]} /><rect x="90" y="77" width="120" height="46" fill={c[1]} /></>);
      break;
    case 'circle':
      body = (<><rect width="300" height="200" fill={c[0]} /><circle cx="150" cy="100" r="58" fill={c[1]} />{c[2] && <path d="M92,100 A58,58 0 0,0 208,100 A29,29 0 0,1 150,100 A29,29 0 0,0 92,100 Z" fill={c[2]} />}</>);
      break;
    case 'union': body = <Union />; break;
    case 'usa':
      body = (<>{Array.from({ length: 13 }, (_, i) => <rect key={i} x="0" y={(i * 200) / 13} width="300" height={200 / 13 + 0.5} fill={i % 2 ? c[1] : c[0]} />)}
        <rect width="125" height={(200 / 13) * 7} fill={c[2]} />
        {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={12 + (i % 6) * 20 + (Math.floor(i / 6) % 2) * 6} cy={12 + Math.floor(i / 6) * 20} r="3.2" fill="#fff" />)}</>);
      break;
    case 'ensign':
      body = (<><rect width="300" height="200" fill={c[0]} /><g><Union s={0.5} /></g>
        <polygon points={star(75, 150, 22, 7)} fill="#fff" />{[[225, 45], [190, 95], [255, 85], [225, 165], [240, 120]].map(([x, y], i) => <polygon key={i} points={star(x, y, i === 4 ? 6 : 12, 7)} fill="#fff" />)}</>);
      break;
    case 'chevron':
      body = (<><rect width="300" height="100" fill={c[0]} /><rect y="100" width="300" height="100" fill={c[1]} />
        <polygon points="0,0 60,0 160,75 300,75 300,125 160,125 60,200 0,200" fill="#fff" />
        <polygon points="0,15 45,15 150,88 300,88 300,112 150,112 45,185 0,185" fill={c[2]} />
        <polygon points="0,40 85,100 0,160" fill="#ffb612" /><polygon points="0,55 65,100 0,145" fill={c[3] ?? '#000'} /></>);
      break;
    case 'diamond':
      body = (<><rect width="300" height="200" fill={c[0]} /><polygon points="150,22 278,100 150,178 22,100" fill={c[1]} /><circle cx="150" cy="100" r="46" fill={c[2]} /></>);
      break;
    case 'diag':
      body = (<><rect width="300" height="200" fill={c[0]} /><polygon points="300,0 300,200 0,200" fill={c[1]} />{c[2] && <path d="M0,200 L300,0" stroke={c[2]} strokeWidth="34" />}</>);
      break;
    default:
      body = <rect width="300" height="200" fill={c[0]} />;
  }
  return (
    <svg className={`flag ${className ?? ''}`} viewBox="0 0 300 200" width={w} height={(w * 2) / 3} preserveAspectRatio="none" aria-hidden>
      {body}
      <Emblem f={flag} />
    </svg>
  );
}
