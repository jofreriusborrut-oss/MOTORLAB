import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';
import { Stat } from '../ui/Stat';
import { IssueList, issueFor } from '../ui/IssueList';
import { GearEditor } from './GearEditor';
import { TractionChart } from '../../charts/TractionChart';
import { aeroForce, effectiveMass, overallRatio, rollingForce, tractionAt, tractionDiagram } from '../../physics/vehicle';
import { fmt } from '../../utils/format';
import { G } from '../../physics/constants';
import { useI18n } from '../../i18n/useI18n';

const VEHICLE_FIELDS = ['massKg', 'gearRatios', 'finalDrive', 'wheelRadiusM', 'cx', 'frontalAreaM2', 'rollingCoef', 'drivetrainEfficiency', 'drivenAxleLoad', 'tyreGrip', 'shiftTimeS'];

export function VehicleView() {
  const { active, analysis, dispatch } = useStore();
  const v = active.vehicle;
  const { t, issueText } = useI18n();
  const ord = (g: number) => t('gear.ord', { g });
  const set = (patch: Partial<typeof v>) => dispatch({ type: 'vehicle', patch });
  const m = analysis.engine;
  const [probeKmh, setProbeKmh] = useState(100);
  const ok = analysis.ok && m;

  const diagram = useMemo(() => {
    if (!ok || !analysis.top) return [];
    const maxK = Math.min(400, Math.max(...analysis.gears.map((g) => g.maxSpeedKmh), analysis.top.kmh) * 1.08);
    return tractionDiagram(m!, v, Math.ceil(maxK / 10) * 10, 2);
  }, [ok, m, v, analysis.top, analysis.gears]);

  // Anàlisi puntual a una velocitat
  const probe = useMemo(() => {
    if (!ok) return null;
    const s = probeKmh / 3.6;
    let best: { gear: number; force: number; rpm: number } | null = null;
    v.gearRatios.forEach((_, g) => {
      const t = tractionAt(m!, v, g, s);
      if (t && (!best || t.force > best.force)) best = { gear: g, force: t.force, rpm: t.rpm };
    });
    const aero = aeroForce(v, s);
    const roll = rollingForce(v);
    const b = best as { gear: number; force: number; rpm: number } | null;
    const accel = b ? (b.force - aero - roll) / effectiveMass(v, overallRatio(v, b.gear), active.engine.type) : null;
    return { best: b, aero, roll, accel, powerNeeded: ((aero + roll) * s) / 1000 / v.drivetrainEfficiency };
  }, [ok, m, v, probeKmh, active.engine.type]);

  const vehicleIssues = analysis.issues.filter((i) => VEHICLE_FIELDS.includes(i.field));
  const firstGear = analysis.gears[0];
  const gearIssue = issueFor(analysis.issues, 'gearRatios');

  return (
    <div className="view">
      <div className="stat-strip">
        <Stat label={t('veh.top')} estimate value={fmt(analysis.top?.kmh, 0)} unit="km/h" accent="orange"
          sub={analysis.top ? (analysis.top.limitedBy === 'regim' ? t('veh.topRpm', { gear: ord(analysis.top.gear) }) : t('veh.topRes', { gear: ord(analysis.top.gear) })) : '—'} />
        <Stat label={t('veh.t100')} estimate value={fmt(analysis.sim?.t0to100, 1)} unit="s" accent="blue"
          sub={analysis.sim && analysis.sim.t0to100 === null ? t('veh.no100') : t('veh.fullLoad')} />
        <Stat label={t('veh.maxTraction')} value={fmt(firstGear ? Math.min(firstGear.maxForce, analysis.gripLimitN) : null, 0)} unit="N"
          sub={firstGear && firstGear.maxForce > analysis.gripLimitN ? t('veh.gripLimited', { n: fmt(firstGear.maxForce, 0) }) : t('veh.firstGear')} />
        <Stat label={t('veh.pw')} value={fmt(m ? v.massKg / m.peakPower.cv : null, 2)} unit={t('u.kgPerCv')} sub={t('veh.pwSub', { n: fmt(analysis.powerToWeight, 0) })} />
      </div>

      <div className="grid-2">
        <Panel title={t('veh.params')} code="V-01">
          <div className="form-grid">
            <NumberField label={t('veh.mass')} unit="kg" value={v.massKg} min={50} max={10000} step={10} issue={issueFor(analysis.issues, 'massKg')} hint={t('veh.massHint')} onChange={(massKg) => set({ massKg })} />
            <NumberField label={t('veh.final')} value={v.finalDrive} min={0.5} max={20} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'finalDrive')} onChange={(finalDrive) => set({ finalDrive })} />
            <NumberField label={t('veh.wheel')} unit="m" value={v.wheelRadiusM} min={0.1} max={1} step={0.001} decimals={3} issue={issueFor(analysis.issues, 'wheelRadiusM')} hint={t('veh.wheelHint')} onChange={(wheelRadiusM) => set({ wheelRadiusM })} />
            <NumberField label={t('veh.cx')} value={v.cx} min={0.05} max={2} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'cx')} onChange={(cx) => set({ cx })} />
            <NumberField label={t('veh.area')} unit="m²" value={v.frontalAreaM2} min={0.3} max={10} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'frontalAreaM2')} onChange={(frontalAreaM2) => set({ frontalAreaM2 })} />
            <NumberField label={t('veh.crr')} value={v.rollingCoef} min={0.001} max={0.1} step={0.001} decimals={3} issue={issueFor(analysis.issues, 'rollingCoef')} onChange={(rollingCoef) => set({ rollingCoef })} />
            <NumberField label={t('veh.eta')} value={v.drivetrainEfficiency} min={0.5} max={1} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'drivetrainEfficiency')} onChange={(drivetrainEfficiency) => set({ drivetrainEfficiency })} />
            <NumberField label={t('veh.axle')} value={v.drivenAxleLoad} min={0.05} max={1} step={0.01} decimals={2} hint={t('veh.axleHint')} issue={issueFor(analysis.issues, 'drivenAxleLoad')} onChange={(drivenAxleLoad) => set({ drivenAxleLoad })} />
            <NumberField label={t('veh.grip')} value={v.tyreGrip} min={0.1} max={2} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'tyreGrip')} hint={t('veh.gripHint')} onChange={(tyreGrip) => set({ tyreGrip })} />
            <NumberField label={t('veh.shift')} unit="s" value={v.shiftTimeS} min={0} max={3} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'shiftTimeS')} hint={t('veh.shiftHint')} onChange={(shiftTimeS) => set({ shiftTimeS })} />
          </div>
        </Panel>

        <Panel title={t('veh.gearbox')} code="V-02" subtitle={t('veh.gearboxSub')}>
          <GearEditor ratios={v.gearRatios} gears={analysis.gears} onChange={(gearRatios) => set({ gearRatios })} errorMsg={gearIssue?.level === 'error' ? issueText(gearIssue) : undefined} />
          {analysis.gears.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>{t('veh.colGear')}</th><th>{t('veh.colRatio')}</th><th>{t('veh.colTotal')}</th><th>{t('veh.colPer1000')}</th><th>{t('veh.colVmax')}</th><th>{t('veh.colForce')}</th></tr>
                </thead>
                <tbody>
                  {analysis.gears.map((g) => (
                    <tr key={g.gear}>
                      <td><span className="gear-badge">{g.gear}</span></td>
                      <td>{fmt(g.ratio, 2)}</td>
                      <td>{fmt(g.overall, 2)}</td>
                      <td>{fmt(g.kmhPer1000, 1)}</td>
                      <td>{fmt(g.maxSpeedKmh, 0)} km/h</td>
                      <td>{fmt(Math.min(g.maxForce, analysis.gripLimitN), 0)} N{g.maxForce > analysis.gripLimitN ? ' *' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analysis.gears.some((g) => g.maxForce > analysis.gripLimitN) && <p className="hint">{t('veh.gripNote', { n: fmt(analysis.gripLimitN, 0) })}</p>}
            </div>
          )}
        </Panel>
      </div>

      {vehicleIssues.length > 0 && <Panel title={t('veh.diag')} code="V-03"><IssueList issues={vehicleIssues} /></Panel>}
      {!ok && !vehicleIssues.length && <Panel title={t('veh.diagShort')} code="V-03"><IssueList issues={analysis.issues} /></Panel>}

      {ok && (
        <>
          <Panel title={t('veh.traction')} code="V-04" subtitle={t('veh.tractionSub')}>
            <TractionChart data={diagram} gears={v.gearRatios.length} gripLimit={analysis.gripLimitN} topKmh={analysis.top?.kmh} />
          </Panel>

          <Panel title={t('veh.probe')} code="V-05"
            actions={<span className="mono probe-val">{fmt(probeKmh)} km/h</span>}>
            <input type="range" className="range" min={10} max={Math.max(20, Math.floor(analysis.top?.kmh ?? 200))} value={Math.min(probeKmh, Math.floor(analysis.top?.kmh ?? 200))}
              onChange={(e) => setProbeKmh(Number(e.target.value))} aria-label={t('veh.probeAria')} />
            {probe && (
              <div className="stat-strip small">
                <Stat label={t('veh.aero')} value={fmt(probe.aero, 0)} unit="N" sub={`${fmt((probe.aero * probeKmh) / 3.6 / 1000, 1)} kW`} />
                <Stat label={t('veh.rolling')} value={fmt(probe.roll, 0)} unit="N" sub={t('veh.permille', { n: fmt((probe.roll / (v.massKg * G)) * 1000, 1) })} />
                <Stat label={t('veh.powerNeeded')} value={fmt(probe.powerNeeded, 1)} unit="kW" sub={t('veh.cvAtEngine', { n: fmt(probe.powerNeeded * 1.35962, 0) })} />
                <Stat label={t('veh.maxTraction')} value={fmt(probe.best?.force, 0)} unit="N" sub={probe.best ? t('veh.gearAtRpm', { gear: ord(probe.best.gear + 1), rpm: fmt(probe.best.rpm) }) : t('veh.noGear')} />
                <Stat label={t('veh.accelAvail')} estimate value={fmt(probe.accel, 2)} unit="m/s²" sub={probe.accel !== null ? `${fmt(probe.accel / G, 2)} g` : '—'} />
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
