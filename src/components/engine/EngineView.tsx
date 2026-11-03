import { useState } from 'react';
import { useStore } from '../../state/store';
import { useI18n } from '../../i18n/useI18n';
import { Panel } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';
import { Stat } from '../ui/Stat';
import { IssueList, issueFor } from '../ui/IssueList';
import { CurveEditor } from './CurveEditor';
import { ENERGY, isElectric } from '../../physics/constants';
import { bmepBar, kwToCv, scaleCurve, setPeakPowerCv, setPeakTorque } from '../../physics/engine';
import type { EngineType } from '../../physics/types';
import { PRESETS } from '../../data/presets';
import { fmt } from '../../utils/format';
import type { TKey } from '../../i18n/lang';

const TYPES: EngineType[] = ['gasolina-atm', 'gasolina-turbo', 'diesel', 'electric'];
const ENGINE_FIELDS = ['displacementCc', 'cylinders', 'maxRpm', 'idleRpm', 'declaredConsumption', 'torqueCurve'];

export function EngineView() {
  const { active, analysis, dispatch } = useStore();
  const { t } = useI18n();
  const e = active.engine;
  const m = analysis.engine;
  const electric = isElectric(e.type);
  const engineIssues = analysis.issues.filter((i) => ENGINE_FIELDS.includes(i.field));
  const [keepBmep, setKeepBmep] = useState(true);
  const set = (patch: Partial<typeof e>) => dispatch({ type: 'engine', patch });
  const unit = ENERGY[e.type].unit === 'L' ? 'L/100 km' : 'kWh/100 km';
  const cv = t('u.cv');

  const bmep = m && !electric ? bmepBar(m.peakTorque.torque, e.displacementCc) : null;

  return (
    <div className="view">
      <div className="stat-strip">
        <Stat label={t('eng.peakPower')} value={fmt(m?.peakPower.cv, 0)} unit={cv} accent="orange"
          sub={m ? t('eng.peakPowerSub', { kw: fmt(m.peakPower.kw, 1), rpm: fmt(m.peakPower.rpm) }) : t('eng.invalidCurve')} />
        <Stat label={t('eng.peakTorque')} value={fmt(m?.peakTorque.torque, 0)} unit="Nm" accent="blue" sub={m ? t('eng.atRpm', { rpm: fmt(m.peakTorque.rpm) }) : '—'} />
        {!electric ? (
          <>
            <Stat label={t('eng.bmep')} value={fmt(bmep, 1)} unit="bar" sub={t('eng.bmepSub')} />
            <Stat label={t('eng.specific')} value={fmt(m ? m.peakPower.cv / (e.displacementCc / 1000) : null, 0)} unit={t('u.cvPerL')}
              sub={t('eng.ccPerCyl', { cc: fmt(e.displacementCc / Math.max(1, e.cylinders), 0) })} />
          </>
        ) : (
          <>
            <Stat label={t('eng.powerAtMax')} value={fmt(m ? kwToCv(m.powerKwAt(e.maxRpm)) : null, 0)} unit={cv} sub={t('eng.atRpm', { rpm: fmt(e.maxRpm) })} />
            <Stat label={t('eng.torqueAt0')} value={fmt(m?.torqueAt(0), 0)} unit="Nm" sub={t('eng.torqueAt0Sub')} />
          </>
        )}
      </div>

      <div className="grid-2">
        <Panel title={t('eng.params')} code="M-01" subtitle={t('eng.paramsSub')}>
          <div className="form-grid">
            <label className="field wide">
              <span>{t('eng.name')}</span>
              <input className="text-input" value={e.name} maxLength={80} onChange={(ev) => set({ name: ev.target.value })} />
            </label>
            <label className="field wide">
              <span>{t('eng.type')}</span>
              <select value={e.type} onChange={(ev) => set({ type: ev.target.value as EngineType })}>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{t(`type.${ty}`)}</option>
                ))}
              </select>
            </label>
            <NumberField label={t('eng.displacement')} unit="cc" value={e.displacementCc} min={electric ? 0 : 50} max={10000} step={50} disabled={electric}
              issue={issueFor(analysis.issues, 'displacementCc')}
              hint={electric ? t('eng.notApplicableEv') : keepBmep ? t('eng.scalesWithDisp') : undefined}
              onChange={(cc) => {
                if (keepBmep && e.displacementCc > 0 && cc > 0) dispatch({ type: 'engine', patch: { ...scaleCurve(e, cc / e.displacementCc), displacementCc: cc } });
                else set({ displacementCc: cc });
              }} />
            <NumberField label={t('eng.cylinders')} value={e.cylinders} min={electric ? 0 : 1} max={16} integer disabled={electric}
              issue={issueFor(analysis.issues, 'cylinders')} onChange={(cylinders) => set({ cylinders })} />
            <NumberField label={t('eng.peakPower')} unit={cv} value={Math.round(m?.peakPower.cv ?? 0)} min={1} max={2000} step={5} disabled={!m}
              hint={t('eng.powerHint')} onChange={(p) => dispatch({ type: 'engine', patch: setPeakPowerCv(e, p) })} />
            <NumberField label={t('eng.peakTorque')} unit="Nm" value={Math.round(m?.peakTorque.torque ?? 0)} min={1} max={3000} step={5} disabled={!m}
              hint={t('eng.torqueHint')} onChange={(nm) => dispatch({ type: 'engine', patch: setPeakTorque(e, nm) })} />
            <NumberField label={t('eng.maxRpm')} unit="rpm" value={e.maxRpm} min={1000} max={30000} step={100}
              issue={issueFor(analysis.issues, 'maxRpm')} onChange={(maxRpm) => set({ maxRpm })} />
            <NumberField label={t('eng.idle')} unit="rpm" value={e.idleRpm} min={electric ? 0 : 300} max={3000} step={50} disabled={electric}
              issue={issueFor(analysis.issues, 'idleRpm')} hint={electric ? t('eng.noIdleEv') : undefined} onChange={(idleRpm) => set({ idleRpm })} />
            <NumberField label={t('eng.declared')} unit={unit} value={e.declaredConsumption} min={0.1} max={60} step={0.1} decimals={1}
              issue={issueFor(analysis.issues, 'declaredConsumption')} hint={t('eng.declaredHint')} onChange={(declaredConsumption) => set({ declaredConsumption })} />
            {!electric && (
              <label className="check wide">
                <input type="checkbox" checked={keepBmep} onChange={(ev) => setKeepBmep(ev.target.checked)} />
                <span>{t('eng.keepBmep')}</span>
              </label>
            )}
          </div>
        </Panel>

        <Panel title={t('eng.diag')} code="M-02" subtitle={t('eng.diagSub')}>
          <IssueList issues={engineIssues} />
          <div className="presets">
            <h3>{t('eng.loadPreset')}</h3>
            <div className="preset-list">
              {PRESETS.map((p) => {
                const name = t(`preset.${p.id}` as TKey);
                return (
                  <button key={p.id} className="preset" onClick={() => dispatch({ type: 'newFromPreset', presetId: p.id, name: `${name} ${t('cfg.newSuffix')}` })}>
                    <span className={`type-dot t-${p.engine.type}`} />
                    <span>
                      <strong>{name}</strong>
                      <small>{t(`type.${p.engine.type}`)} · {p.engine.displacementCc ? `${fmt(p.engine.displacementCc)} cc · ` : ''}{fmt(p.engine.maxRpm)} rpm</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={t('eng.curve')} code="M-03" subtitle={t('eng.curveSub')}>
        <CurveEditor points={e.torqueCurve} maxRpm={e.maxRpm} idleRpm={e.idleRpm} onChange={(torqueCurve) => set({ torqueCurve })} />
      </Panel>
    </div>
  );
}
