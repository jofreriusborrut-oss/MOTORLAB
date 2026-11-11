import { POLICIES, POLICY_CATS } from '../data/policies';
import { govSeats, totalSeats } from '../engine/model';
import { atWar } from '../engine/sim';
import type { Game } from '../engine/types';
import { useSize } from '../utils/useSize';
import { useStore, useGame } from '../store';
import Flag from './Flag';

export interface MapNode {
  id: string;
  label: string;
  icon: string;
  panel?: string;
  children?: MapNode[];
  badge?: string;
  tone?: 'good' | 'bad' | 'warn';
}

const CAT_ICON: Record<string, string> = { economia: '💰', treball: '🛠️', educacio: '📚', sanitat: '🏥', drets: '⚖️', seguretat: '🚔', exercit: '🎖️', medi: '🌿', politica: '🏛️' };

function polLeaves(g: Game, cat: string): MapNode[] {
  return POLICIES.filter((p) => p.cat === cat).map((p) => {
    const changed = g.policies[p.id] !== g.policies0[p.id];
    return { id: 'pol:' + p.id, label: p.name, icon: changed ? '✎' : '◦', panel: 'pol:' + p.id, badge: p.options[g.policies[p.id]].label, tone: changed ? 'warn' : undefined };
  });
}

export function buildTree(g: Game): MapNode {
  const deficit = g.lastSpend - g.lastRev;
  const war = atWar(g);
  const seatsPct = (govSeats(g) / totalSeats(g)) * 100;
  const kids: MapNode[] = [];
  if (!g.inPower) kids.push({ id: 'oposicio', label: g.exile ? 'Resistència' : 'Oposició', icon: '📣', panel: 'oposicio', tone: 'warn', children: [
    { id: 'oposicio-a', label: 'Accions d\'oposició', icon: '📣', panel: 'oposicio' },
    { id: 'parlament', label: 'Parlament', icon: '🏛️', panel: 'parlament', badge: `Govern ${seatsPct.toFixed(0)}%` },
    { id: 'enquesta', label: 'Enquestes', icon: '📊', panel: 'enquesta' },
  ] });
  kids.push(
    { id: 'economia', label: 'Economia', icon: '💰', badge: `${g.growth.toFixed(1)}%`, tone: g.growth < 0 ? 'bad' : undefined, children: [
      { id: 'pressupostos', label: 'Pressupostos', icon: '🧾', panel: 'pressupostos', badge: `${g.lastSpend.toFixed(0)}% PIB` },
      { id: 'comptes', label: 'Comptes públics', icon: '🏦', panel: 'comptes', badge: `Dèficit ${deficit.toFixed(1)}%`, tone: deficit > 5 ? 'bad' : undefined },
      { id: 'economia-i', label: 'Indicadors', icon: '📈', panel: 'economia' },
      ...polLeaves(g, 'economia'),
    ] },
    { id: 'treball', label: POLICY_CATS.treball, icon: CAT_ICON.treball, badge: `Atur ${g.unemp.toFixed(1)}%`, tone: g.unemp > 15 ? 'bad' : undefined, children: polLeaves(g, 'treball') },
    { id: 'educacio', label: POLICY_CATS.educacio, icon: CAT_ICON.educacio, children: [{ id: 'pressupostos', label: 'Inversió (pressupost)', icon: '🧾', panel: 'pressupostos' }, ...polLeaves(g, 'educacio')] },
    { id: 'sanitat', label: POLICY_CATS.sanitat, icon: CAT_ICON.sanitat, children: polLeaves(g, 'sanitat') },
    { id: 'drets', label: POLICY_CATS.drets, icon: CAT_ICON.drets, badge: `Llibertat ${g.slow.freedom.toFixed(0)}`, tone: g.slow.freedom < 35 ? 'bad' : undefined, children: polLeaves(g, 'drets') },
    { id: 'seguretat', label: POLICY_CATS.seguretat, icon: CAT_ICON.seguretat, badge: `Delictes ${g.slow.crime.toFixed(0)}`, children: polLeaves(g, 'seguretat') },
    { id: 'exercit', label: POLICY_CATS.exercit, icon: CAT_ICON.exercit, badge: war ? 'EN GUERRA' : `Força ${g.slow.military.toFixed(0)}`, tone: war ? 'bad' : undefined, children: [
      { id: 'guerres', label: 'Guerres', icon: '⚔️', panel: 'guerres', badge: war ? 'En guerra' : 'En pau', tone: war ? 'bad' : undefined }, ...polLeaves(g, 'exercit')] },
    { id: 'medi', label: POLICY_CATS.medi, icon: CAT_ICON.medi, badge: `Medi ${g.slow.env.toFixed(0)}`, children: polLeaves(g, 'medi') },
    { id: 'institucions', label: 'Institucions', icon: '🏛️', children: [
      { id: 'parlament', label: 'Parlament', icon: '🏛️', panel: 'parlament', badge: `Govern ${seatsPct.toFixed(0)}%`, tone: seatsPct < 50 ? 'warn' : undefined },
      { id: 'referendum', label: 'Referèndums', icon: '🗳️', panel: 'referendum', badge: g.referendum ? 'En curs' : undefined },
      ...polLeaves(g, 'politica')] },
    { id: 'exterior', label: 'Exterior', icon: '🌐', children: [
      { id: 'diplomacia', label: 'Diplomàcia', icon: '🤝', panel: 'diplomacia' },
      { id: 'blocs', label: 'Blocs i aliances', icon: '🧩', panel: 'blocs', badge: g.blocs.join(', ') || 'Cap' },
      { id: 'guerres', label: 'Guerres', icon: '⚔️', panel: 'guerres', tone: war ? 'bad' : undefined }] },
    { id: 'poble', label: 'Població', icon: '👥', badge: `Aprovació ${g.approval.toFixed(0)}%`, tone: g.approval < 30 ? 'bad' : undefined, children: [
      { id: 'grups', label: 'Grups socials', icon: '👥', panel: 'grups' },
      { id: 'enquesta', label: 'Enquestes', icon: '📊', panel: 'enquesta' },
      { id: 'societat', label: 'Índex de societat', icon: '🌡️', panel: 'societat' }] },
    { id: 'dades', label: 'Dades', icon: '📊', children: [
      { id: 'estadistiques', label: 'Estadístiques', icon: '📉', panel: 'estadistiques' },
      { id: 'ranking', label: 'Rànquing mundial', icon: '🏆', panel: 'ranking' },
      { id: 'noticies', label: 'Hemeroteca', icon: '📰', panel: 'noticies' }] },
  );
  return { id: 'root', label: g.countryName, icon: '', children: kids };
}

export default function DecisionMap() {
  const g = useGame();
  const { path, setPath, setPanel, panel, setView } = useStore();
  const [ref, size] = useSize<HTMLDivElement>();
  const root = buildTree(g);
  let cur = root;
  const trail: MapNode[] = [root];
  for (const id of path) {
    const n = cur.children?.find((c) => c.id === id);
    if (!n) break;
    cur = n;
    trail.push(n);
  }
  const kids = cur.children ?? [];
  const W = size.width, H = size.height;
  const n = kids.length;
  const narrow = W < 600;
  const cx = W / 2, cy = H / 2 + (narrow ? 16 : 6);
  const half = narrow ? 46 : 64;
  const R = Math.max(90, Math.min(W / 2 - half - 4, H / 2 - 40 + (narrow ? 200 : 0)));
  const ry = Math.max(80, H / 2 - (narrow ? 52 : 50));
  const pos = kids.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const k = !narrow && n > 9 && i % 2 ? 0.72 : 1;
    return { x: cx + Math.cos(a) * R * k, y: cy + Math.sin(a) * ry * k };
  });

  const click = (node: MapNode) => {
    if (node.children?.length) setPath([...path.slice(0, trail.length - 1), node.id]);
    if (node.panel) {
      setPanel(node.panel);
      if (node.panel === 'diplomacia') setView('mon');
      if (!node.children && window.innerWidth < 980) setTimeout(() => document.querySelector('.side')?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="dmap" ref={ref}>
      <div className="crumbs">
        {trail.map((t, i) => (
          <button key={i} onClick={() => setPath(path.slice(0, i))} className={i === trail.length - 1 ? 'on' : ''}>
            {i === 0 ? '🧭 ' + g.countryName : `${t.icon} ${t.label}`}
          </button>
        ))}
      </div>
      {W > 0 && (
        <>
          <svg className="dmap-lines" width={W} height={H}>
            <defs>
              <radialGradient id="glow"><stop offset="0%" stopColor="rgba(214,176,92,0.20)" /><stop offset="100%" stopColor="rgba(214,176,92,0)" /></radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={Math.min(R, ry) * 0.9} fill="url(#glow)" />
            <ellipse cx={cx} cy={cy} rx={R} ry={ry} fill="none" stroke="rgba(214,176,92,0.10)" strokeDasharray="3 6" />
            {pos.map((p, i) => <line key={path.join('/') + i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="dline" style={{ animationDelay: `${i * 18}ms` }} />)}
          </svg>
          <button className={`dnode center ${trail.length > 1 ? 'sub' : ''}`} style={{ left: cx, top: cy }} onClick={() => trail.length > 1 && setPath(path.slice(0, -1))} title={trail.length > 1 ? 'Torna enrere' : ''}>
            {trail.length === 1 ? <Flag flag={g.flag} w={46} /> : <span className="ico big">{cur.icon}</span>}
            <b>{trail.length === 1 ? g.countryName : cur.label}</b>
            {trail.length > 1 && <small>← torna</small>}
          </button>
          {kids.map((k, i) => (
            <button key={path.join('/') + k.id} className={`dnode ${k.children ? 'branch' : 'leaf'} ${k.tone ?? ''} ${panel === k.panel ? 'active' : ''}`}
              style={{ left: pos[i].x, top: pos[i].y, animationDelay: `${i * 22}ms` }} onClick={() => click(k)}>
              <span className="ico">{k.icon}</span>
              <b>{k.label}</b>
              {k.badge && <small>{k.badge}</small>}
              {k.children && <i className="more">+{k.children.length}</i>}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
