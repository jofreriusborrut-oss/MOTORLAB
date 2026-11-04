import { useEffect, useState } from 'react';
import type { Settings } from '../engine/game';
import { ClientSession, HostSession, loadClientSave, loadHostSave, Session } from '../net/session';
import { Home, loadProfile, Profile } from './Home';
import { Table, useSession } from './Table';

function urlCode() {
  const c = new URLSearchParams(location.search).get('sala') ?? '';
  return c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

function setUrlCode(code: string | null) {
  const u = new URL(location.href);
  if (code) u.searchParams.set('sala', code);
  else u.searchParams.delete('sala');
  history.replaceState(null, '', u.toString());
}

/** Reprèn automàticament la sessió si s'ha recarregat la pàgina. */
function autoSession(): Session | null {
  const code = urlCode();
  const host = loadHostSave();
  if (host && (!code || code === host.code)) return new HostSession(host.code, { restore: host });
  const client = loadClientSave();
  const prof = loadProfile();
  if (code && client?.code === code && prof.name) return new ClientSession(code, prof);
  return null;
}

// Una sola vegada per càrrega de pàgina (StrictMode crida els inicialitzadors dues vegades).
const initialSession = autoSession();

export function PokerApp() {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [homeError, setHomeError] = useState<string | null>(null);
  const st = useSession(session);

  useEffect(() => {
    if (!st) return;
    if (st.status === 'closed' || st.status === 'error') {
      if (st.status === 'error' || st.error) setHomeError(st.error);
      setSession(null);
      setUrlCode(null);
    } else setUrlCode(st.code);
  }, [st?.status, st?.error, st?.code]);

  const join = (code: string, p: Profile) => {
    setHomeError(null);
    setSession(new ClientSession(code, p));
  };
  const create = (code: string, settings: Settings, p: Profile) => {
    setHomeError(null);
    setSession(new HostSession(code, { settings, name: p.name, avatar: p.avatar }));
  };
  const resume = () => {
    const h = loadHostSave();
    if (h) setSession(new HostSession(h.code, { restore: h }));
  };

  if (!session || !st || st.status === 'closed' || st.status === 'error')
    return <Home initialCode={urlCode()} error={homeError} onJoin={join} onCreate={create} onResumeHost={resume} />;

  if (!st.view)
    return (
      <div className="pk-loading">
        <div className="pk-spinner" />
        <p>{st.error ?? (st.isHost ? 'Obrint la mesa…' : `Connectant a la sala ${st.code}…`)}</p>
        <button className="pk-btn pk-btn-dark" onClick={() => session.close()}>
          Cancel·lar
        </button>
      </div>
    );

  return <Table session={session} st={st} />;
}
