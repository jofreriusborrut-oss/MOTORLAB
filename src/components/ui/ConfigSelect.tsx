import { useStore } from '../../state/store';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  value: string;
  onChange: (id: string) => void;
  label: string;
  swatch?: string;
}

export function ConfigSelect({ value, onChange, label, swatch }: Props) {
  const { state } = useStore();
  const { t, cfgName } = useI18n();
  return (
    <label className="config-select">
      <span className="cs-label">
        {swatch && <span className="swatch" style={{ background: swatch }} />}
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {state.configs.map((c) => (
          <option key={c.id} value={c.id}>
            {cfgName(c)} · {t(`type.${c.engine.type}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
