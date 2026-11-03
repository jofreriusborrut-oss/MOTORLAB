import { useState } from 'react';
import { useStore } from '../../state/store';
import { useI18n } from '../../i18n/useI18n';
import { LANGS, type Lang } from '../../i18n/lang';
import { NAV, navLabel, type ViewId } from './Sidebar';
import { Segmented } from '../ui/Segmented';

export function TopBar({ view, onMenu }: { view: ViewId; onMenu: () => void }) {
  const { state, active, dispatch, saved, analysis } = useStore();
  const { t, cfgName, lang, setLang } = useI18n();
  const [renaming, setRenaming] = useState(false);
  const errors = analysis.issues.filter((i) => i.level === 'error').length;
  const warns = analysis.issues.filter((i) => i.level === 'avis').length;
  const nav = NAV.find((n) => n.id === view)!;
  const activeName = cfgName(active);

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label={t('top.openMenu')}>
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <div className="crumb">
        <span className="crumb-code mono">{nav.code}</span>
        <h1>{t(navLabel(nav.id))}</h1>
      </div>

      <div className="cfg-bar">
        <span className={`type-dot t-${active.engine.type}`} title={t(`type.${active.engine.type}`)} />
        {renaming ? (
          <input className="text-input rename" autoFocus defaultValue={activeName} maxLength={80}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== activeName) dispatch({ type: 'rename', name: v }); setRenaming(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(false); }} />
        ) : (
          <select className="cfg-select" value={active.id} onChange={(e) => dispatch({ type: 'select', id: e.target.value })} aria-label={t('top.activeCfg')}>
            {state.configs.map((c) => <option key={c.id} value={c.id}>{cfgName(c)}</option>)}
          </select>
        )}
        <div className="cfg-actions">
          <button className="icon-btn" title={t('top.rename')} aria-label={t('top.rename')} onClick={() => setRenaming(true)}>✎</button>
          <button className="icon-btn" title={t('top.duplicate')} aria-label={t('top.duplicate')} onClick={() => dispatch({ type: 'duplicate', name: `${activeName} ${t('cfg.copySuffix')}` })}>⧉</button>
          {active.builtIn && <button className="icon-btn" title={t('top.reset')} aria-label={t('top.reset')} onClick={() => dispatch({ type: 'resetActive' })}>↺</button>}
          <button className="icon-btn danger" title={t('top.delete')} aria-label={t('top.delete')} disabled={state.configs.length <= 1}
            onClick={() => { if (confirm(t('top.confirmDelete', { name: activeName }))) dispatch({ type: 'delete', id: active.id }); }}>🗑</button>
        </div>
      </div>

      <div className="status">
        <span className={`pill ${errors ? 'err' : warns ? 'warn' : 'ok'}`}>
          {errors
            ? t(errors > 1 ? 'top.errors.many' : 'top.errors.one', { n: errors })
            : warns
              ? t(warns > 1 ? 'top.warns.many' : 'top.warns.one', { n: warns })
              : t('top.coherent')}
        </span>
        <span className={`save s-${saved}`} title={t('top.saveTitle')}>
          {saved === 'desat' ? t('top.saved') : saved === 'desant' ? t('top.saving') : t('top.saveError')}
        </span>
        <Segmented<Lang> ariaLabel={t('lang.label')} value={lang} onChange={setLang}
          options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
      </div>
    </header>
  );
}
