import { useEffect, useId, useState } from 'react';
import { decimalSeparator, fmt, parseNumber } from '../../utils/format';
import { useI18n } from '../../i18n/useI18n';
import type { Issue } from '../../physics/types';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  hint?: string;
  issue?: Issue;
  integer?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Camp numèric amb validació: accepta coma o punt decimal, rebutja valors
 * fora de rang (sense propagar-los) i mostra l'estat d'error.
 */
export function NumberField({ label, value, onChange, unit, min = -Infinity, max = Infinity, step = 1, decimals = 0, hint, issue, integer, disabled, compact }: Props) {
  const id = useId();
  const { t, issueText, lang } = useI18n();
  const [text, setText] = useState(() => fmtInput(value, decimals));
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!focused) setText(fmtInput(value, decimals));
  }, [value, decimals, focused, lang]);

  const commit = (txt: string) => {
    setText(txt);
    const n = parseNumber(txt);
    if (!Number.isFinite(n)) return setLocal(t('field.invalid'));
    if (integer && !Number.isInteger(n)) return setLocal(t('field.integer'));
    if (n < min || n > max) return setLocal(t('field.range', { min: fmt(min, decimals), max: fmt(max, decimals), unit: unit ? ' ' + unit : '' }));
    setLocal(null);
    if (n !== value) onChange(n);
  };

  const nudge = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    const n = Math.min(max, Math.max(min, Math.round((base + dir * step) / step) * step));
    const fixed = Number(n.toFixed(Math.max(decimals, 0)));
    setLocal(null);
    setText(fmtInput(fixed, decimals));
    onChange(fixed);
  };

  const state = local ? 'error' : issue?.level === 'error' ? 'error' : issue?.level === 'avis' ? 'warn' : '';
  const message = local ?? (issue ? issueText(issue) : undefined) ?? hint;

  return (
    <div className={`field ${state} ${compact ? 'compact' : ''} ${disabled ? 'disabled' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <button type="button" className="nudge" tabIndex={-1} onClick={() => nudge(-1)} disabled={disabled} aria-label={t('field.decrease', { label })}>−</button>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (!local) setText(fmtInput(value, decimals));
          }}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
          }}
          aria-invalid={state === 'error'}
        />
        {unit && <span className="unit">{unit}</span>}
        <button type="button" className="nudge" tabIndex={-1} onClick={() => nudge(1)} disabled={disabled} aria-label={t('field.increase', { label })}>+</button>
      </div>
      {message && <small className="field-msg">{message}</small>}
    </div>
  );
}

function fmtInput(v: number, decimals: number) {
  if (!Number.isFinite(v)) return '';
  return String(Number(v.toFixed(decimals))).replace('.', decimalSeparator());
}
