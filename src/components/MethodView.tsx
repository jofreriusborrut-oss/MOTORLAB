import { Panel } from './ui/Panel';
import { useStore } from '../state/store';
import { useI18n } from '../i18n/useI18n';

const F = ({ children }: { children: string }) => <code className="formula">{children}</code>;

export function MethodView() {
  const { dispatch } = useStore();
  const { t } = useI18n();
  return (
    <div className="view method">
      <div className="grid-2">
        <Panel title={t('m.engine')} code="F-M">
          <ul className="formulas">
            <li><span>{t('m.f.power')}</span><F>P(kW) = T(Nm) · n(rpm) · 2π / 60000</F></li>
            <li><span>{t('m.f.cv')}</span><F>{t('m.f.cvFormula')}</F></li>
            <li><span>{t('m.f.bmep')}</span><F>BMEP = 4π · T / Vd</F></li>
            <li><span>{t('m.f.fmep')}</span><F>{t('m.f.fmepFormula')}</F></li>
            <li><span>{t('m.f.willans')}</span><F>{t('m.f.willansFormula')}</F></li>
            <li><span>{t('m.f.flow')}</span><F>{t('m.f.flowFormula')}</F></li>
          </ul>
          <p>{t('m.engineText')}</p>
        </Panel>
        <Panel title={t('m.vehicle')} code="F-V">
          <ul className="formulas">
            <li><span>{t('m.f.rpm')}</span><F>n = v / r · i_gear · i_diff · 60 / 2π</F></li>
            <li><span>{t('m.f.traction')}</span><F>F_t = min(T · i · η / r , µ · m · g · f_axle)</F></li>
            <li><span>{t('m.f.aero')}</span><F>{t('m.f.aeroFormula')}</F></li>
            <li><span>{t('m.f.rolling')}</span><F>F_r = Crr · m · g</F></li>
            <li><span>{t('m.f.meq')}</span><F>m_eq = m + J_wheels/r² + J_engine · i² · η / r²</F></li>
            <li><span>{t('m.f.accel')}</span><F>a = (F_t − F_a − F_r) / m_eq</F></li>
          </ul>
          <p>{t('m.vehicleText')}</p>
        </Panel>
      </div>
      <Panel title={t('m.limits')} code="F-L">
        <ul className="bullets">
          <li>{t('m.l1')}</li>
          <li>{t('m.l2')}</li>
          <li>{t('m.l3')}</li>
          <li>{t('m.l4')}</li>
          <li>{t('m.l5')}</li>
        </ul>
        <div className="danger-zone">
          <span>{t('m.reset')}</span>
          <button className="btn danger" onClick={() => { if (confirm(t('m.resetConfirm'))) dispatch({ type: 'resetAll' }); }}>{t('m.resetBtn')}</button>
        </div>
      </Panel>
    </div>
  );
}
