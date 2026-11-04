import { useState } from 'react';
import { randomId, roomCode } from '../engine/cards';
import type { Settings } from '../engine/game';
import { loadClientSave, loadHostSave } from '../net/session';
import { AVATARS } from './common';

export interface Profile {
  name: string;
  avatar: number;
  token: string;
}

const PROFILE_KEY = 'nitpoker-profile';

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') as Profile | null;
    if (p?.token) return p;
  } catch {
    /* res */
  }
  return { name: '', avatar: Math.floor(Math.random() * AVATARS.length), token: randomId(20) };
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* res */
  }
}

interface Props {
  initialCode: string;
  error: string | null;
  onJoin: (code: string, profile: Profile) => void;
  onCreate: (code: string, settings: Settings, profile: Profile) => void;
  onResumeHost: () => void;
}

export function Home({ initialCode, error, onJoin, onCreate, onResumeHost }: Props) {
  const [profile, setProfile] = useState(loadProfile);
  const [tab, setTab] = useState<'join' | 'create'>(initialCode ? 'join' : 'create');
  const [code, setCode] = useState(initialCode);
  const [stack, setStack] = useState(1000);
  const [sb, setSb] = useState(5);
  const [bb, setBb] = useState(10);
  const [time, setTime] = useState(25);
  const [rebuy, setRebuy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const hostSave = loadHostSave();
  const clientSave = loadClientSave();

  const valid = () => {
    if (!profile.name.trim()) {
      setMsg('Escriu el teu nom');
      return null;
    }
    const p = { ...profile, name: profile.name.trim().slice(0, 16) };
    saveProfile(p);
    return p;
  };

  return (
    <div className="pk-home">
      <div className="pk-logo">
        <div className="pk-logo-chips">♠♥♦♣</div>
        <h1>
          NIT DE <span>PÒQUER</span>
        </h1>
        <p>Texas Hold'em · mesa privada amb els amics</p>
      </div>

      {(error || msg) && <div className="pk-alert">{error || msg}</div>}

      {hostSave && (
        <div className="pk-resume">
          <div>
            Tens una mesa oberta: <b>{hostSave.code}</b>
            <small>{hostSave.state.players.length} jugadors · mà #{hostSave.state.handNo}</small>
          </div>
          <button className="pk-btn pk-btn-red" onClick={onResumeHost}>
            Reprendre
          </button>
        </div>
      )}
      {!hostSave && clientSave && clientSave.code !== code && (
        <div className="pk-resume">
          <div>
            Tornar a la mesa <b>{clientSave.code}</b>
          </div>
          <button className="pk-btn pk-btn-red" onClick={() => { const p = valid(); if (p) onJoin(clientSave.code, p); }}>
            Tornar
          </button>
        </div>
      )}

      <section className="pk-panel">
        <label className="pk-label">El teu nom</label>
        <input
          className="pk-input"
          value={profile.name}
          maxLength={16}
          placeholder="Ex: Jordi"
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <label className="pk-label">Avatar</label>
        <div className="pk-avatars">
          {AVATARS.map((a, i) => (
            <button key={a} className={i === profile.avatar ? 'on' : ''} onClick={() => setProfile({ ...profile, avatar: i })}>
              {a}
            </button>
          ))}
        </div>
      </section>

      <div className="pk-tabs">
        <button className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>
          Unir-me
        </button>
        <button className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>
          Crear mesa
        </button>
      </div>

      {tab === 'join' ? (
        <section className="pk-panel">
          <label className="pk-label">Codi de la sala</label>
          <input
            className="pk-input pk-code-input"
            value={code}
            maxLength={5}
            placeholder="ABCDE"
            autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button
            className="pk-btn pk-btn-red pk-btn-big"
            disabled={code.length !== 5}
            onClick={() => {
              const p = valid();
              if (p) onJoin(code, p);
            }}
          >
            Entrar a la mesa
          </button>
        </section>
      ) : (
        <section className="pk-panel">
          <div className="pk-grid2">
            <Field label="Fitxes inicials" value={stack} onChange={setStack} />
            <Field label="Temps per jugada (s)" value={time} onChange={setTime} />
            <Field label="Cega petita" value={sb} onChange={setSb} />
            <Field label="Cega gran" value={bb} onChange={setBb} />
          </div>
          <label className="pk-check">
            <input type="checkbox" checked={rebuy} onChange={(e) => setRebuy(e.target.checked)} /> Permetre recompres
          </label>
          <button
            className="pk-btn pk-btn-red pk-btn-big"
            onClick={() => {
              const p = valid();
              if (!p) return;
              if (!(bb > 0 && sb > 0 && sb <= bb && stack >= bb)) {
                setMsg('Revisa les cegues i les fitxes');
                return;
              }
              onCreate(roomCode(), { smallBlind: sb, bigBlind: bb, startingStack: stack, actionTime: Math.max(5, time), allowRebuy: rebuy }, p);
            }}
          >
            Crear mesa privada
          </button>
          <p className="pk-hint">
            El teu mòbil farà de servidor: mantén la pantalla encesa i aquesta pestanya oberta mentre jugueu.
          </p>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="pk-label">{label}</label>
      <input
        className="pk-input"
        type="number"
        inputMode="numeric"
        min={1}
        value={value || ''}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
      />
    </div>
  );
}
