import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  accent?: 'orange' | 'blue' | 'none';
  estimate?: boolean;
}

export function Stat({ label, value, unit, sub, accent = 'none', estimate }: Props) {
  const { t } = useI18n();
  return (
    <div className={`stat accent-${accent}`}>
      <span className="stat-label">
        {label}
        {estimate && <span className="est" title={t('stat.estTitle')}>{t('stat.est')}</span>}
      </span>
      <span className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
