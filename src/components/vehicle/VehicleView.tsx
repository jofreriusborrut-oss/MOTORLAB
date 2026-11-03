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

const VEHICLE_FIELDS = ['massKg', 'gearRatios', 'finalDrive', 'wheelRadiusM', 'cx', 'frontalAreaM2', 'rollingCoef', 'drivetrainEfficiency', 'drivenAxleLoad', 'tyreGrip', 'shiftTimeS'];

export function VehicleView() {
  const { active, analysis, dispatch } = useStore();
  const v = active.vehicle;
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
        <Stat label="Velocitat màxima teòrica" estimate value={fmt(analysis.top?.kmh, 0)} unit="km/h" accent="orange"
          sub={analysis.top ? (analysis.top.limitedBy === 'regim' ? `Limitada pel règim de tall en ${analysis.top.gear}a` : `Equilibri força/resistència en ${analysis.top.gear}a`) : '—'} />
        <Stat label="0 – 100 km/h" estimate value={fmt(analysis.sim?.t0to100, 1)} unit="s" accent="blue"
          sub={analysis.sim && analysis.sim.t0to100 === null ? 'No arriba a 100 km/h' : 'Simulació a plena càrrega'} />
        <Stat label="Força de tracció màx." value={fmt(firstGear ? Math.min(firstGear.maxForce, analysis.gripLimitN) : null, 0)} unit="N"
          sub={firstGear && firstGear.maxForce > analysis.gripLimitN ? `Limitada per adherència (motor: ${fmt(firstGear.maxForce, 0)} N)` : 'En 1a marxa, a parell màxim'} />
        <Stat label="Relació pes/potència" value={fmt(m ? v.massKg / m.peakPower.cv : null, 2)} unit="kg/CV" sub={`${fmt(analysis.powerToWeight, 0)} CV/tona`} />
      </div>

      <div className="grid-2">
        <Panel title="Paràmetres del vehicle" code="V-01">
          <div className="form-grid">
            <NumberField label="Massa del vehicle" unit="kg" value={v.massKg} min={50} max={10000} step={10} issue={issueFor(analysis.issues, 'massKg')} hint="Amb conductor" onChange={(massKg) => set({ massKg })} />
            <NumberField label="Relació del diferencial" value={v.finalDrive} min={0.5} max={20} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'finalDrive')} onChange={(finalDrive) => set({ finalDrive })} />
            <NumberField label="Radi de les rodes" unit="m" value={v.wheelRadiusM} min={0.1} max={1} step={0.001} decimals={3} issue={issueFor(analysis.issues, 'wheelRadiusM')} hint="Radi dinàmic sota càrrega" onChange={(wheelRadiusM) => set({ wheelRadiusM })} />
            <NumberField label="Coeficient aerodinàmic (Cx)" value={v.cx} min={0.05} max={2} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'cx')} onChange={(cx) => set({ cx })} />
            <NumberField label="Superfície frontal" unit="m²" value={v.frontalAreaM2} min={0.3} max={10} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'frontalAreaM2')} onChange={(frontalAreaM2) => set({ frontalAreaM2 })} />
            <NumberField label="Resistència al rodament (Crr)" value={v.rollingCoef} min={0.001} max={0.1} step={0.001} decimals={3} issue={issueFor(analysis.issues, 'rollingCoef')} onChange={(rollingCoef) => set({ rollingCoef })} />
            <NumberField label="Rendiment transmissió" value={v.drivetrainEfficiency} min={0.5} max={1} step={0.01} decimals={2} issue={issueFor(analysis.issues, 'drivetrainEfficiency')} onChange={(drivetrainEfficiency) => set({ drivetrainEfficiency })} />
            <NumberField label="Pes sobre l'eix motriu" value={v.drivenAxleLoad} min={0.05} max={1} step={0.01} decimals={2} hint="0,6 davanter · 1,0 integral" issue={issueFor(analysis.issues, 'drivenAxleLoad')} onChange={(drivenAxleLoad) => set({ drivenAxleLoad })} />
            <NumberField label="Adherència pneumàtic (µ)" value={v.tyreGrip} min={0.1} max={2} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'tyreGrip')} hint="Asfalt sec ≈ 1,0" onChange={(tyreGrip) => set({ tyreGrip })} />
            <NumberField label="Temps de canvi" unit="s" value={v.shiftTimeS} min={0} max={3} step={0.05} decimals={2} issue={issueFor(analysis.issues, 'shiftTimeS')} hint="Sense tracció durant el canvi" onChange={(shiftTimeS) => set({ shiftTimeS })} />
          </div>
        </Panel>

        <Panel title="Caixa de canvis" code="V-02" subtitle="Relació de cada marxa i velocitat assolida al règim de tall">
          <GearEditor ratios={v.gearRatios} gears={analysis.gears} onChange={(gearRatios) => set({ gearRatios })} errorMsg={gearIssue?.level === 'error' ? gearIssue.message : undefined} />
          {analysis.gears.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Marxa</th><th>Relació</th><th>Total</th><th>km/h a 1000 rpm</th><th>V màx.</th><th>Força màx.</th></tr>
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
              {analysis.gears.some((g) => g.maxForce > analysis.gripLimitN) && <p className="hint">* Limitada per l'adherència dels pneumàtics ({fmt(analysis.gripLimitN, 0)} N).</p>}
            </div>
          )}
        </Panel>
      </div>

      {vehicleIssues.length > 0 && <Panel title="Diagnòstic del vehicle" code="V-03"><IssueList issues={vehicleIssues} /></Panel>}
      {!ok && !vehicleIssues.length && <Panel title="Diagnòstic" code="V-03"><IssueList issues={analysis.issues} /></Panel>}

      {ok && (
        <>
          <Panel title="Diagrama de tracció" code="V-04" subtitle="Força a la roda a plena càrrega per marxa (F = T·i·η/r) i resistència a l'avanç (½ρ·Cx·A·v² + Crr·m·g)">
            <TractionChart data={diagram} gears={v.gearRatios.length} gripLimit={analysis.gripLimitN} topKmh={analysis.top?.kmh} />
          </Panel>

          <Panel title="Anàlisi a velocitat constant" code="V-05"
            actions={<span className="mono probe-val">{fmt(probeKmh)} km/h</span>}>
            <input type="range" className="range" min={10} max={Math.max(20, Math.floor(analysis.top?.kmh ?? 200))} value={Math.min(probeKmh, Math.floor(analysis.top?.kmh ?? 200))}
              onChange={(e) => setProbeKmh(Number(e.target.value))} aria-label="Velocitat d'anàlisi" />
            {probe && (
              <div className="stat-strip small">
                <Stat label="Resistència aerodinàmica" value={fmt(probe.aero, 0)} unit="N" sub={`${fmt((probe.aero * probeKmh) / 3.6 / 1000, 1)} kW`} />
                <Stat label="Resistència al rodament" value={fmt(probe.roll, 0)} unit="N" sub={`${fmt((probe.roll / (v.massKg * G)) * 1000, 1)} ‰ del pes`} />
                <Stat label="Potència necessària" value={fmt(probe.powerNeeded, 1)} unit="kW" sub={`${fmt(probe.powerNeeded * 1.35962, 0)} CV al motor`} />
                <Stat label="Força de tracció màx." value={fmt(probe.best?.force, 0)} unit="N" sub={probe.best ? `${probe.best.gear + 1}a marxa a ${fmt(probe.best.rpm)} rpm` : 'Cap marxa disponible'} />
                <Stat label="Acceleració disponible" estimate value={fmt(probe.accel, 2)} unit="m/s²" sub={probe.accel !== null ? `${fmt(probe.accel / G, 2)} g` : '—'} />
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
