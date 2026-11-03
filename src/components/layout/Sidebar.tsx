export type ViewId = 'motor' | 'grafiques' | 'vehicle' | 'simulacio' | 'consum' | 'comparador' | 'metode';

export const NAV: { id: ViewId; label: string; code: string; icon: string }[] = [
  { id: 'motor', label: 'Motor', code: '01', icon: 'M4 14h3l2-4h6l2 4h3v4H4z M9 10V7h6v3' },
  { id: 'grafiques', label: 'Gràfiques', code: '02', icon: 'M4 19h16 M5 16l4-6 4 3 6-8' },
  { id: 'vehicle', label: 'Vehicle', code: '03', icon: 'M3 15l2-5h14l2 5v3H3z M7 18v1 M17 18v1 M6 10l2-3h8l2 3' },
  { id: 'simulacio', label: 'Simulació', code: '04', icon: 'M12 20a8 8 0 1 1 8-8 M12 12l4-4' },
  { id: 'consum', label: 'Consum', code: '05', icon: 'M7 20V5h7v15 M14 9h3l2 2v6a1.5 1.5 0 0 1-3 0v-3h-2 M5 20h11' },
  { id: 'comparador', label: 'Comparador', code: '06', icon: 'M12 4v16 M5 8h4v8H5z M15 6h4v12h-4z' },
  { id: 'metode', label: 'Mètode i fórmules', code: '07', icon: 'M5 5h14v14H5z M8 9h8 M8 13h5 M8 16h7' },
];

interface Props {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ view, onNavigate, open, onClose }: Props) {
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
            <path d="M6 22a10 10 0 1 1 20 0" fill="none" stroke="#2a323d" strokeWidth="3" strokeLinecap="round" />
            <path d="M6 22a10 10 0 0 1 14-9.2" fill="none" stroke="#e06c1f" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 22l6-7" stroke="#e8edf3" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="16" cy="22" r="2.2" fill="#e8edf3" />
          </svg>
          <div>
            <span className="brand-name">MOTOR<b>LAB</b></span>
            <span className="brand-sub">Simulador de propulsió</span>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => { onNavigate(n.id); onClose(); }} aria-current={view === n.id ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="nav-label">{n.label}</span>
              <span className="nav-code">{n.code}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="mono">v1.0 · model físic 1D</span>
          <span>Resultats estimats, no mesures reals.</span>
        </div>
      </aside>
    </>
  );
}
