import { useStore } from './store';
import StartScreen from './ui/StartScreen';
import TopBar from './ui/TopBar';
import DecisionMap from './ui/DecisionMap';
import WorldMap from './ui/WorldMap';
import Modal from './ui/Modal';
import PolicyPanel from './ui/panels/PolicyPanel';
import BudgetPanel from './ui/panels/BudgetPanel';
import { AccountsPanel, EconomyPanel, NewsPanel, RankingPanel, SocietyPanel, StatsPanel } from './ui/panels/InfoPanels';
import { GroupsPanel, OppositionPanel, ParliamentPanel, PollPanel, ResumPanel } from './ui/panels/PoliticsPanels';
import { BlocsPanel, DiplomacyPanel, ReferendumPanel, WarsPanel } from './ui/panels/WorldPanels';
import { dateLabel } from './engine/util';

function Panel({ id }: { id: string }) {
  if (id.startsWith('pol:')) return <PolicyPanel pid={id.slice(4)} key={id} />;
  switch (id) {
    case 'pressupostos': return <BudgetPanel />;
    case 'comptes': return <AccountsPanel />;
    case 'economia': return <EconomyPanel />;
    case 'estadistiques': return <StatsPanel />;
    case 'societat': return <SocietyPanel />;
    case 'ranking': return <RankingPanel />;
    case 'noticies': return <NewsPanel />;
    case 'grups': return <GroupsPanel />;
    case 'enquesta': return <PollPanel />;
    case 'parlament': return <ParliamentPanel />;
    case 'oposicio': return <OppositionPanel />;
    case 'diplomacia': return <DiplomacyPanel />;
    case 'guerres': return <WarsPanel />;
    case 'blocs': return <BlocsPanel />;
    case 'referendum': return <ReferendumPanel />;
    default: return <ResumPanel />;
  }
}

function NewsFeed() {
  const { game: g, setPanel } = useStore();
  if (!g) return null;
  return (
    <div className="feed">
      <div className="feed-h"><b>📰 Notícies</b><button className="link" onClick={() => setPanel('noticies')}>Hemeroteca →</button></div>
      <div className="feed-list">
        {g.news.slice(0, 30).map((n) => (
          <div key={n.id} className={`news ${n.tone} ${n.date === g.month ? 'fresh' : ''}`}>
            <small>{dateLabel(n.date, true)} · {n.src}</small>
            <p>{n.text}</p>
          </div>
        ))}
        {!g.news.length && <p className="dim small">Encara no hi ha notícies. Prem ▶ per començar.</p>}
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.ok ? 'ok' : 'err'}`}>{t.text}</div>)}</div>;
}

export default function App() {
  const { game, panel, view, setView, setPanel } = useStore();
  if (!game) return <StartScreen />;
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <section className="stage">
          <div className="stage-tabs">
            <button className={view === 'govern' ? 'on' : ''} onClick={() => setView('govern')}>🧭 Mapa de decisions</button>
            <button className={view === 'mon' ? 'on' : ''} onClick={() => setView('mon')}>🌍 Mapa del món</button>
            <button className="home" onClick={() => setPanel('resum')} title="Resum">🏠</button>
          </div>
          <div className="stage-body">{view === 'govern' ? <DecisionMap /> : <WorldMap />}</div>
        </section>
        <aside className="side">
          <div className="side-panel"><Panel id={panel} /></div>
          <NewsFeed />
        </aside>
      </div>
      <Modal />
      <Toasts />
    </div>
  );
}
