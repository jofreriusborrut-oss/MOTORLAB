import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { Segmented } from '../ui/Segmented';
import { EngineCurveChart } from '../../charts/EngineCurveChart';
import { SERIES } from '../../charts/theme';
import { isElectric } from '../../physics/constants';
import { sortCurve } from '../../physics/interpolation';
import { fmt } from '../../utils/format';
import { IssueList } from '../ui/IssueList';

export function ChartsView() {
  const { active, analysis } = useStore();
  const m = analysis.engine;
  const [pUnit, setPUnit] = useState<'cv' | 'kw'>('cv');
  const electric = isElectric(active.engine.type);

  const data = useMemo(() => {
    if (!m) return [];
    const step = Math.max(1, Math.round(m.samples.length / 220));
    return m.samples.filter((_, i) => i % step === 0 || i === m.samples.length - 1).map((s) => ({
      rpm: s.rpm,
      torque: round(s.torque, 1),
      cv: round(s.cv, 1),
      kw: round(s.kw, 1),
      flow: round(s.fullLoadFlow, 2),
      specific: s.specific > 0 && s.rpm > 0 ? round(s.specific, 1) : (null as unknown as number),
    }));
  }, [m]);

  if (!m) {
    return (
      <div className="view">
        <Panel title="Gràfiques del motor" code="G-00"><IssueList issues={analysis.issues} /></Panel>
      </div>
    );
  }

  const points = sortCurve(active.engine.torqueCurve).filter((p) => p.rpm <= active.engine.maxRpm);
  const peakP = pUnit === 'cv' ? m.peakPower.cv : m.peakPower.kw;
  const flowUnit = electric ? 'kW' : 'L/h';

  return (
    <div className="view">
      <Panel title="Parell motor" code="G-01" subtitle="Plena càrrega · els cercles són els punts definits a la corba">
        <EngineCurveChart data={data} height={340} yLabel="Parell (Nm)"
          series={[{ key: 'torque', name: 'Parell', color: SERIES.blue, unit: 'Nm', decimals: 1 }]}
          markers={points.map((p) => ({ rpm: p.rpm, value: p.torque }))}
          peak={{ rpm: m.peakTorque.rpm, value: m.peakTorque.torque, label: `${fmt(m.peakTorque.torque)} Nm` }} />
      </Panel>

      <Panel title="Potència" code="G-02" subtitle="Calculada: P(kW) = T(Nm) · n(rpm) · 2π / 60000  ·  CV = kW · 1,35962"
        actions={<Segmented ariaLabel="Unitat de potència" value={pUnit} onChange={setPUnit} options={[{ value: 'cv', label: 'CV' }, { value: 'kw', label: 'kW' }]} />}>
        <EngineCurveChart data={data} height={340} yLabel={`Potència (${pUnit === 'cv' ? 'CV' : 'kW'})`}
          series={[{ key: pUnit, name: 'Potència', color: SERIES.orange, unit: pUnit === 'cv' ? 'CV' : 'kW', decimals: 1 }]}
          peak={{ rpm: m.peakPower.rpm, value: peakP, label: `${fmt(peakP)} ${pUnit === 'cv' ? 'CV' : 'kW'}` }} />
      </Panel>

      <div className="grid-2">
        <Panel title={electric ? 'Potència elèctrica absorbida' : 'Consum a plena càrrega'} code="G-03"
          subtitle={electric ? 'kW de bateria (pèrdues de motor i inversor incloses)' : 'Model de Willans: (P útil + P fricció) / η indicat'}>
          <EngineCurveChart data={data} height={290} yLabel={flowUnit}
            series={[{ key: 'flow', name: electric ? 'Potència absorbida' : 'Consum', color: SERIES.green, unit: flowUnit, decimals: electric ? 1 : 2 }]} />
        </Panel>
        <Panel title={electric ? 'Rendiment del motor' : 'Consum específic (BSFC)'} code="G-04"
          subtitle={electric ? 'Potència mecànica / potència elèctrica' : 'g de combustible per kWh útil · com més baix, més eficient'}>
          <EngineCurveChart data={data} height={290} yLabel={electric ? '%' : 'g/kWh'} yDomain={electric ? [60, 100] : ['auto', 'auto']}
            series={[{ key: 'specific', name: electric ? 'Rendiment' : 'BSFC', color: SERIES.purple, unit: electric ? '%' : 'g/kWh', decimals: 0 }]} />
        </Panel>
      </div>
      <p className="disclaimer">Corbes estimades a partir dels punts introduïts. El consum és un model físic simplificat (fricció segons correlació empírica, rendiment indicat constant), no una mesura de banc.</p>
    </div>
  );
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
