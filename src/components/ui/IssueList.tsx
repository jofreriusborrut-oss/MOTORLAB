import type { Issue } from '../../physics/types';
import { useI18n } from '../../i18n/useI18n';

export function IssueList({ issues, title }: { issues: Issue[]; title?: string }) {
  const { t, issueText } = useI18n();
  if (issues.length === 0) {
    return <div className="issues ok"><span className="dot ok" /> {t('issues.none')}</div>;
  }
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'avis');
  return (
    <div className="issues">
      {title && <h3 className="issues-title">{title}</h3>}
      <ul>
        {[...errors, ...warns].map((i, k) => (
          <li key={k} className={i.level}>
            <span className="issue-tag">{i.level === 'error' ? t('issues.error') : t('issues.warn')}</span>
            <span>{issueText(i)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const issueFor = (issues: Issue[], field: string) =>
  issues.find((i) => i.field === field && i.level === 'error') ?? issues.find((i) => i.field === field);
