import { useStore } from '../../state/store';
import { ENGINE_TYPE_LABEL } from '../../physics/constants';

interface Props {
  value: string;
  onChange: (id: string) => void;
  label: string;
  swatch?: string;
}

export function ConfigSelect({ value, onChange, label, swatch }: Props) {
  const { state } = useStore();
  return (
    <label className="config-select">
      <span className="cs-label">
        {swatch && <span className="swatch" style={{ background: swatch }} />}
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {state.configs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {ENGINE_TYPE_LABEL[c.engine.type]}
          </option>
        ))}
      </select>
    </label>
  );
}
