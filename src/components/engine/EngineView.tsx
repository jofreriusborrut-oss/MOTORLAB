import { useState } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';
import { Stat } from '../ui/Stat';
import { IssueList, issueFor } from '../ui/IssueList';
import { CurveEditor } from './CurveEditor';
import { ENGINE_TYPE_LABEL, ENERGY, isElectric } from '../../physics/constants';
import { bmepBar, kwToCv, scaleCurve, setPeakPowerCv, setPeakTorque } from '../../physics/engine';
import type { EngineType } from '../../physics/types';
import { PRESETS } from '../../data/presets';
import { fmt } from '../../utils/format';

export function EngineView() {
  const { active, analysis, dispatch } = useStore();
  const e = active.engine;
  const m = analysis.engine;
  const electric = isElectric(e.type);
  const engineIssues = analysis.issues.filter((i) => ['displacementCc', 'cylinders', 'maxRpm', 'idleRpm', 'declaredConsumption', 'torqueCurve'].includes(i.field));
  const [keepBmep, setKeepBmep] = useState(true);
  const set = (patch: Partial<typeof e>) => dispatch({ type: 'engine', patch });
  const unit = ENERGY[e.type].unit === 'L' ? 'L/100 km' : 'kWh/100 km';

  const bmep = m && !electric ? bmepBar(m.peakTorque.torque, e.displacementCc) : null;

  return (
    <div className="view">
      <div className="stat-strip">
        <Stat label="Potència màxima" value={fmt(m?.peakPower.cv, 0)} unit="CV" accent="orange" sub={m ? `${fmt(m.peakPower.kw, 1)} kW a ${fmt(m.peakPower.rpm)} rpm` : 'Corba no vàlida'} />
        <Stat label="Parell màxim" value={fmt(m?.peakTorque.torque, 0)} unit="Nm" accent="blue" sub={m ? `a ${fmt(m.peakTorque.rpm)} rpm` : '—'} />
        {!electric ? (
          <>
            <Stat label="BMEP a parell màxim" value={fmt(bmep, 1)} unit="bar" sub="Pressió mitjana efectiva" />
            <Stat label="Potència específica" value={fmt(m ? m.peakPower.cv / (e.displacementCc / 1000) : null, 0)} unit="CV/L" sub={`${fmt(e.displacementCc / Math.max(1, e.cylinders), 0)} cc per cilindre`} />
          </>
        ) : (
          <>
            <Stat label="Potència a règim màxim" value={fmt(m ? kwToCv(m.powerKwAt(e.maxRpm)) : null, 0)} unit="CV" sub={`a ${fmt(e.maxRpm)} rpm`} />
            <Stat label="Parell a 0 rpm" value={fmt(m?.torqueAt(0), 0)} unit="Nm" sub="Disponible des de parat" />
          </>
        )}
      </div>

      <div className="grid-2">
        <Panel title="Paràmetres del motor" code="M-01" subtitle="La potència es calcula sempre a partir del parell: P = T·n·2π/60000">
          <div className="form-grid">
            <label className="field wide">
              <span>Nom del motor</span>
              <input className="text-input" value={e.name} maxLength={80} onChange={(ev) => set({ name: ev.target.value })} />
            </label>
            <label className="field wide">
              <span>Tipus de motor</span>
              <select value={e.type} onChange={(ev) => set({ type: ev.target.value as EngineType })}>
                {(Object.keys(ENGINE_TYPE_LABEL) as EngineType[]).map((t) => (
                  <option key={t} value={t}>{ENGINE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <NumberField label="Cilindrada" unit="cc" value={e.displacementCc} min={electric ? 0 : 50} max={10000} step={50} disabled={electric}
              issue={issueFor(analysis.issues, 'displacementCc')}
              hint={electric ? 'No aplicable a un motor elèctric' : keepBmep ? 'El parell s\'escala amb la cilindrada' : undefined}
              onChange={(cc) => {
                if (keepBmep && e.displacementCc > 0 && cc > 0) dispatch({ type: 'engine', patch: { ...scaleCurve(e, cc / e.displacementCc), displacementCc: cc } });
                else set({ displacementCc: cc });
              }} />
            <NumberField label="Nombre de cilindres" value={e.cylinders} min={electric ? 0 : 1} max={16} integer disabled={electric}
              issue={issueFor(analysis.issues, 'cylinders')} onChange={(cylinders) => set({ cylinders })} />
            <NumberField label="Potència màxima" unit="CV" value={Math.round(m?.peakPower.cv ?? 0)} min={1} max={2000} step={5} disabled={!m}
              hint="Modificar-la escala tota la corba de parell" onChange={(cv) => dispatch({ type: 'engine', patch: setPeakPowerCv(e, cv) })} />
            <NumberField label="Parell màxim" unit="Nm" value={Math.round(m?.peakTorque.torque ?? 0)} min={1} max={3000} step={5} disabled={!m}
              hint="Modificar-lo escala tota la corba" onChange={(nm) => dispatch({ type: 'engine', patch: setPeakTorque(e, nm) })} />
            <NumberField label="Règim màxim (tall)" unit="rpm" value={e.maxRpm} min={1000} max={30000} step={100}
              issue={issueFor(analysis.issues, 'maxRpm')} onChange={(maxRpm) => set({ maxRpm })} />
            <NumberField label="Règim de ralentí" unit="rpm" value={e.idleRpm} min={electric ? 0 : 300} max={3000} step={50} disabled={electric}
              issue={issueFor(analysis.issues, 'idleRpm')} hint={electric ? 'Un motor elèctric no té ralentí' : undefined} onChange={(idleRpm) => set({ idleRpm })} />
            <NumberField label="Consum mitjà declarat" unit={unit} value={e.declaredConsumption} min={0.1} max={60} step={0.1} decimals={1}
              issue={issueFor(analysis.issues, 'declaredConsumption')} hint="Valor de referència (homologació o real)" onChange={(declaredConsumption) => set({ declaredConsumption })} />
            {!electric && (
              <label className="check wide">
                <input type="checkbox" checked={keepBmep} onChange={(ev) => setKeepBmep(ev.target.checked)} />
                <span>Mantenir la pressió mitjana efectiva (BMEP) en canviar la cilindrada</span>
              </label>
            )}
          </div>
        </Panel>

        <Panel title="Diagnòstic" code="M-02" subtitle="Coherència física de la configuració">
          <IssueList issues={engineIssues} />
          <div className="presets">
            <h3>Carregar un motor de mostra com a configuració nova</h3>
            <div className="preset-list">
              {PRESETS.map((p) => (
                <button key={p.id} className="preset" onClick={() => dispatch({ type: 'newFromPreset', presetId: p.id })}>
                  <span className={`type-dot t-${p.engine.type}`} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{ENGINE_TYPE_LABEL[p.engine.type]} · {p.engine.displacementCc ? `${fmt(p.engine.displacementCc)} cc · ` : ''}{fmt(p.engine.maxRpm)} rpm</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Corba de parell" code="M-03" subtitle="Punts editables · interpolació cúbica monòtona (sense pics artificials entre punts)">
        <CurveEditor points={e.torqueCurve} maxRpm={e.maxRpm} idleRpm={e.idleRpm} onChange={(torqueCurve) => set({ torqueCurve })} />
      </Panel>
    </div>
  );
}
