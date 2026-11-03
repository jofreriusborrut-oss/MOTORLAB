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
import { useI18n } from '../../i18n/useI18n';

export function ChartsView() {
  const { active, analysis } = useStore();
  const m = analysis.engine;
  const [pUnit, setPUnit] = useState<'cv' | 'kw'>('cv');
  const { t } = useI18n();
  const cv = t('u.cv');
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
        <Panel title={t('charts.title')} code="G-00"><IssueList issues={analysis.issues} /></Panel>
      </div>
    );
  }

  const points = sortCurve(active.engine.torqueCurve).filter((p) => p.rpm <= active.engine.maxRpm);
  const peakP = pUnit === 'cv' ? m.peakPower.cv : m.peakPower.kw;
  const flowUnit = electric ? 'kW' : 'L/h';

  return (
    <div className="view">
      <Panel title={t('charts.torque')} code="G-01" subtitle={t('charts.torqueSub')}>
        <EngineCurveChart data={data} height={340} yLabel={t('curve.yLabel')}
          series={[{ key: 'torque', name: t('charts.torqueSeries'), color: SERIES.blue, unit: 'Nm', decimals: 1 }]}
          markers={points.map((p) => ({ rpm: p.rpm, value: p.torque }))}
          peak={{ rpm: m.peakTorque.rpm, value: m.peakTorque.torque, label: `${fmt(m.peakTorque.torque)} Nm` }} />
      </Panel>

      <Panel title={t('charts.power')} code="G-02" subtitle={t('charts.powerSub')}
        actions={<Segmented ariaLabel={t('charts.powerUnit')} value={pUnit} onChange={setPUnit} options={[{ value: 'cv', label: cv }, { value: 'kw', label: 'kW' }]} />}>
        <EngineCurveChart data={data} height={340} yLabel={t('charts.powerY', { u: pUnit === 'cv' ? cv : 'kW' })}
          series={[{ key: pUnit, name: t('charts.power'), color: SERIES.orange, unit: pUnit === 'cv' ? cv : 'kW', decimals: 1 }]}
          peak={{ rpm: m.peakPower.rpm, value: peakP, label: `${fmt(peakP)} ${pUnit === 'cv' ? cv : 'kW'}` }} />
      </Panel>

      <div className="grid-2">
        <Panel title={electric ? t('charts.flowEv') : t('charts.flow')} code="G-03"
          subtitle={electric ? t('charts.flowEvSub') : t('charts.flowSub')}>
          <EngineCurveChart data={data} height={290} yLabel={flowUnit}
            series={[{ key: 'flow', name: electric ? t('charts.flowEvSeries') : t('charts.flowSeries'), color: SERIES.green, unit: flowUnit, decimals: electric ? 1 : 2 }]} />
        </Panel>
        <Panel title={electric ? t('charts.specEv') : t('charts.spec')} code="G-04"
          subtitle={electric ? t('charts.specEvSub') : t('charts.specSub')}>
          <EngineCurveChart data={data} height={290} yLabel={electric ? '%' : 'g/kWh'} yDomain={electric ? [60, 100] : ['auto', 'auto']}
            series={[{ key: 'specific', name: electric ? t('charts.specEvSeries') : 'BSFC', color: SERIES.purple, unit: electric ? '%' : 'g/kWh', decimals: 0 }]} />
        </Panel>
      </div>
      <p className="disclaimer">{t('charts.disclaimer')}</p>
    </div>
  );
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
