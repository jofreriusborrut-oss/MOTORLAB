import { useCallback } from 'react';
import { useStore } from '../state/store';
import { translate, type Lang, type Params, type TKey } from './lang';
import type { Configuration, Issue } from '../physics/types';
import { PRESETS } from '../data/presets';

export function useI18n() {
  const { state, dispatch } = useStore();
  const lang = state.lang;
  const t = useCallback((key: TKey, params?: Params) => translate(lang, key, params), [lang]);
  const issueText = useCallback((i: Issue) => translate(lang, `issue.${i.code}` as TKey, i.params), [lang]);
  /** Nom d'una configuració: les de mostra sense reanomenar es tradueixen. */
  const cfgName = useCallback(
    (c: Configuration) => {
      const p = PRESETS.find((x) => x.id === c.id);
      return c.builtIn && p && c.name === p.name ? translate(lang, `preset.${c.id}` as TKey) : c.name;
    },
    [lang],
  );
  const setLang = (l: Lang) => dispatch({ type: 'lang', lang: l });
  return { lang, t, issueText, cfgName, setLang };
}
