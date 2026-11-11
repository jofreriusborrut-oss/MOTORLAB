import { useMemo, useState } from 'react';
import { COUNTRIES } from '../data/countries';
import { randomName } from '../data/names';
import { newGame } from '../engine/init';
import { fmtMoney } from '../engine/util';
import { useStore } from '../store';
import Flag from './Flag';
import { RG_LABEL, difficulty, ideoLabel } from './format';

export default function StartScreen() {
  const { setGame, hasSave, load, setPanel, setPath, setSpeed } = useStore();
  const [cid, setCid] = useState('724');
  const [q, setQ] = useState('');
  const c = COUNTRIES.find((x) => x.id === cid)!;
  const [name, setName] = useState(() => randomName('es'));
  const [party, setParty] = useState(c.gov[0]);
  const list = useMemo(() => COUNTRIES.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, 'ca')), [q]);

  const pick = (id: string) => {
    const nc = COUNTRIES.find((x) => x.id === id)!;
    setCid(id);
    setParty(nc.gov[0]);
    setName(randomName(nc.names));
  };
  const start = (mode: 'govern' | 'oposicio') => {
    const g = newGame({ countryId: cid, playerName: name.trim() || 'Líder', partyId: party, mode });
    setGame(g);
    setPanel('resum');
    setPath([]);
    setSpeed(0);
  };
  const p = c.parties.find((x) => x.id === party)!;
  const inGov = c.gov.includes(party);

  return (
    <div className="start">
      <header className="start-head">
        <div className="logo">🏛️ <b>GOVERNA</b> <span>simulador polític</span></div>
        {hasSave && <button className="btn" onClick={load}>▶ Continuar la partida desada</button>}
      </header>
      <div className="start-body">
        <section className="card start-list">
          <h2>1 · Tria un país</h2>
          <input className="input" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="country-grid">
            {list.map((x) => {
              const d = difficulty(x);
              return (
                <button key={x.id} className={`country-card ${x.id === cid ? 'sel' : ''}`} onClick={() => pick(x.id)}>
                  <Flag flag={x.flag} w={36} />
                  <div>
                    <b>{x.name}</b>
                    <small>{RG_LABEL[x.rg]} · <span className={`tag-${d.cls}`}>{d.label}</span></small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <section className="card start-detail">
          <div className="sd-head">
            <Flag flag={c.flag} w={72} />
            <div>
              <h2>{c.name}</h2>
              <p className="dim">Capital: {c.capital} · {RG_LABEL[c.rg]} · {c.form === 'monarquia' ? 'Monarquia' : c.form === 'republica' ? 'República' : 'Monarquia absoluta'}</p>
            </div>
          </div>
          <div className="kv-grid">
            <div><span>Població</span><b>{c.pop.toFixed(1)} M</b></div>
            <div><span>PIB</span><b>{fmtMoney(c.gdp)}</b></div>
            <div><span>PIB per càpita</span><b>{Math.round((c.gdp / c.pop) * 1000).toLocaleString('ca')} $</b></div>
            <div><span>Creixement</span><b>{c.growth.toFixed(1)}%</b></div>
            <div><span>Atur</span><b>{c.unemp.toFixed(1)}%</b></div>
            <div><span>Inflació</span><b>{c.infl.toFixed(1)}%</b></div>
            <div><span>Deute públic</span><b>{c.debt}% PIB</b></div>
            <div><span>Dèficit</span><b>{(c.spend - c.rev).toFixed(1)}% PIB</b></div>
            <div><span>Llibertat</span><b>{c.freedom}/100</b></div>
            <div><span>Esperança de vida</span><b>{c.life} anys</b></div>
          </div>
          <h3>2 · El teu nom</h3>
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button className="btn ghost" onClick={() => setName(randomName(c.names))} title="Nom aleatori">🎲</button>
          </div>
          <h3>3 · El teu partit</h3>
          <div className="party-list">
            {c.parties.map((x) => (
              <label key={x.id} className={`party-opt ${party === x.id ? 'sel' : ''}`}>
                <input type="radio" name="party" checked={party === x.id} onChange={() => setParty(x.id)} />
                <span className="dot" style={{ background: x.color }} />
                <span className="pname"><b>{x.name}</b><small>{ideoLabel(x)} · {x.vote.toFixed(1)}%{c.gov.includes(x.id) ? ' · al govern' : ''}</small></span>
              </label>
            ))}
          </div>
          <h3>4 · Com comences?</h3>
          <div className="start-btns">
            <button className="btn primary big" onClick={() => start('govern')}>
              🏛️ Governar
              <small>{inGov && c.gov[0] === party ? `Substitueixes ${c.leader} al capdavant del govern` : `${p.short} forma govern ${inGov ? '' : '(hipotètic)'}`}</small>
            </button>
            <button className="btn big" onClick={() => start('oposicio')}>
              📣 Començar a l'oposició
              <small>{inGov ? 'El teu partit surt del govern' : `Lluita per arribar al poder`}</small>
            </button>
          </div>
          <p className="dim small">Les dades són aproximades (2024-2025). Els noms de persones i partits són ficticis però inspirats en la realitat.</p>
        </section>
      </div>
    </div>
  );
}
