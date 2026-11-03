import type { ReactNode } from 'react';

interface Props {
  title: string;
  code?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  subtitle?: string;
}

export function Panel({ title, code, actions, children, className = '', subtitle }: Props) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h2>
            {code && <span className="panel-code">{code}</span>}
            {title}
          </h2>
          {subtitle && <p className="panel-sub">{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
