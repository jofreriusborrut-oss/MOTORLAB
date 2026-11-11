import { useState } from 'react';
import { formLabel, regimeLabel, societyIndex, societyLabel } from '../engine/model';
import { partyById } from '../engine/model';
import { dateLabel, fmtMoney } from '../engine/util';
import { useStore, useGame } from '../store';
import Flag from './Flag';

export default function TopBar() {
  const g = useGame();
  const { speed, setSpeed, save, setGame, toast, setPanel } = useStore();
  const [menu, setMenu] = useState(false);
  const reg = regimeLabel(g);
  const soc = societyIndex(g);
  const sl = societyLabel(soc);
  const pp = partyById(g, g.playerParty)!;
  const role = g.inPower ? g.def.title : g.exile ? 'Líder a l\'exili' : 'Líder de l\'oposició';
  const deficit = g.lastSpend - g.lastRev;
  const debt = (g.debt / g.gdp) * 100;
  const kpi = (label: string, value: string, cls = '', onClick?: () => void, title?: string) => (
    <button className={`kpi ${cls}`} onClick={onClick} title={title}><span>{label}</span><b>{value}</b></button>
  );
  return (
    <header className="topbar">
      <div className="tb-row">
        <div className="tb-country">
          <Flag flag={g.flag} w={42} />
          <div>
            <b>{g.countryName}</b>
            <small>{reg.label} · {formLabel(g)}</small>
          </div>
        </div>
        <div className="tb-leader">
          <span className="dot" style={{ background: pp.color }} />
          <div><b>{g.playerName}</b><small>{role} · {pp.short}</small></div>
        </div>
        <div className="tb-time">
          <div className="date">{dateLabel(g.month)}</div>
          <div className="speed">
            {['⏸', '▶', '▶▶', '▶▶▶'].map((s, i) => (
              <button key={i} className={speed === i ? 'on' : ''} onClick={() => setSpeed(i)} title={['Pausa (espai)', 'Normal (1)', 'Ràpid (2)', 'Molt ràpid (3)'][i]}>{s}</button>
            ))}
          </div>
        </div>
        <div className="tb-right">
          <div className="pc" title={g.inPower ? 'Capital polític: el gastes per aprovar lleis i fer accions' : 'Influència: la gastes en accions d\'oposició'}>
            <span>{g.inPower ? 'Capital polític' : 'Influència'}</span><b>⚡ {Math.floor(g.pc)}</b>
          </div>
          <button className="soc" style={{ borderColor: sl.color }} onClick={() => setPanel('societat')} title="Índex de societat: d'infern (0) a utopia (100)">
            <span>{sl.label}</span><b style={{ color: sl.color }}>{soc.toFixed(0)}</b>
          </button>
          <div className="menu-wrap">
            <button className="btn ghost" onClick={() => setMenu(!menu)}>☰</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { save(); toast('Partida desada'); setMenu(false); }}>💾 Desar partida</button>
                <button onClick={() => { if (confirm('Vols abandonar la partida actual?')) { setGame(null); setSpeed(0); } setMenu(false); }}>🏁 Nova partida</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="kpis">
        {kpi('PIB', fmtMoney(g.gdp), '', () => setPanel('economia'))}
        {kpi('Creixement', `${g.growth.toFixed(1)}%`, g.growth < 0 ? 'bad' : g.growth > 2 ? 'good' : '', () => setPanel('economia'))}
        {kpi('Atur', `${g.unemp.toFixed(1)}%`, g.unemp > 15 ? 'bad' : g.unemp < 5 ? 'good' : '', () => setPanel('economia'))}
        {kpi('Inflació', `${g.infl.toFixed(1)}%`, g.infl > 8 ? 'bad' : g.infl < 4 && g.infl > 0 ? 'good' : '', () => setPanel('economia'))}
        {kpi('Deute', `${debt.toFixed(0)}%`, debt > 120 ? 'bad' : debt < 60 ? 'good' : '', () => setPanel('comptes'))}
        {kpi('Dèficit', `${deficit.toFixed(1)}%`, deficit > 5 ? 'bad' : deficit < 1 ? 'good' : '', () => setPanel('comptes'))}
        {kpi('Aprovació', `${g.approval.toFixed(0)}%`, g.approval < 30 ? 'bad' : g.approval > 55 ? 'good' : '', () => setPanel('grups'), g.inPower ? 'Aprovació del teu govern' : `Aprovació del govern de ${g.govLeader}`)}
        {kpi('Estabilitat', g.slow.stability.toFixed(0), g.slow.stability < 35 ? 'bad' : g.slow.stability > 70 ? 'good' : '', () => setPanel('societat'))}
        {kpi('Malestar', g.unrest.toFixed(0), g.unrest > 60 ? 'bad' : g.unrest < 20 ? 'good' : '', () => setPanel('grups'))}
        {g.nextElection >= 0 && kpi('Eleccions', dateLabel(g.nextElection, true), g.nextElection - g.month <= 6 ? 'warn' : '', () => setPanel('parlament'))}
        {g.referendum && kpi('Referèndum', `${g.referendum.monthsLeft} mesos`, 'warn', () => setPanel('referendum'))}
      </div>
    </header>
  );
}
