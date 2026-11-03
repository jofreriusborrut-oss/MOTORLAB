import { useState } from 'react';
import { useStore } from '../../state/store';
import { ENGINE_TYPE_LABEL } from '../../physics/constants';
import { NAV, type ViewId } from './Sidebar';

export function TopBar({ view, onMenu }: { view: ViewId; onMenu: () => void }) {
  const { state, active, dispatch, saved, analysis } = useStore();
  const [renaming, setRenaming] = useState(false);
  const errors = analysis.issues.filter((i) => i.level === 'error').length;
  const warns = analysis.issues.filter((i) => i.level === 'avis').length;
  const nav = NAV.find((n) => n.id === view)!;

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Obrir menú">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <div className="crumb">
        <span className="crumb-code mono">{nav.code}</span>
        <h1>{nav.label}</h1>
      </div>

      <div className="cfg-bar">
        <span className={`type-dot t-${active.engine.type}`} title={ENGINE_TYPE_LABEL[active.engine.type]} />
        {renaming ? (
          <input className="text-input rename" autoFocus defaultValue={active.name} maxLength={80}
            onBlur={(e) => { dispatch({ type: 'rename', name: e.target.value.trim() || active.name }); setRenaming(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(false); }} />
        ) : (
          <select className="cfg-select" value={active.id} onChange={(e) => dispatch({ type: 'select', id: e.target.value })} aria-label="Configuració activa">
            {state.configs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <div className="cfg-actions">
          <button className="icon-btn" title="Canviar el nom" onClick={() => setRenaming(true)}>✎</button>
          <button className="icon-btn" title="Duplicar configuració" onClick={() => dispatch({ type: 'duplicate' })}>⧉</button>
          {active.builtIn && <button className="icon-btn" title="Restaurar valors de mostra" onClick={() => dispatch({ type: 'resetActive' })}>↺</button>}
          <button className="icon-btn danger" title="Eliminar configuració" disabled={state.configs.length <= 1}
            onClick={() => { if (confirm(`Vols eliminar «${active.name}»?`)) dispatch({ type: 'delete', id: active.id }); }}>🗑</button>
        </div>
      </div>

      <div className="status">
        <span className={`pill ${errors ? 'err' : warns ? 'warn' : 'ok'}`}>
          {errors ? `${errors} error${errors > 1 ? 's' : ''}` : warns ? `${warns} avís${warns > 1 ? 'os' : ''}` : 'Coherent'}
        </span>
        <span className={`save s-${saved}`} title="Les configuracions es desen al navegador (LocalStorage)">
          {saved === 'desat' ? '● Desat' : saved === 'desant' ? '○ Desant…' : '✕ No s\'ha pogut desar'}
        </span>
      </div>
    </header>
  );
}
