import { useEffect, useState } from 'react';
import { Sidebar, NAV, type ViewId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { EngineView } from './components/engine/EngineView';
import { ChartsView } from './components/engine/ChartsView';
import { VehicleView } from './components/vehicle/VehicleView';
import { SimulationView } from './components/sim/SimulationView';
import { FuelView } from './components/fuel/FuelView';
import { CompareView } from './components/compare/CompareView';
import { MethodView } from './components/MethodView';
import { useStore } from './state/store';
import { useI18n } from './i18n/useI18n';

const fromHash = (): ViewId => {
  const h = window.location.hash.replace('#', '') as ViewId;
  return NAV.some((n) => n.id === h) ? h : 'motor';
};

export default function App() {
  const [view, setView] = useState<ViewId>(fromHash);
  const [menu, setMenu] = useState(false);
  const { active } = useStore();
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  useEffect(() => {
    const on = () => setView(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const navigate = (v: ViewId) => {
    window.location.hash = v;
    setView(v);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} open={menu} onClose={() => setMenu(false)} />
      <div className="main">
        <TopBar view={view} onMenu={() => setMenu(true)} />
        <main className="content" key={`${view}-${active.id}`}>
          {view === 'motor' && <EngineView />}
          {view === 'grafiques' && <ChartsView />}
          {view === 'vehicle' && <VehicleView />}
          {view === 'simulacio' && <SimulationView />}
          {view === 'consum' && <FuelView />}
          {view === 'comparador' && <CompareView />}
          {view === 'metode' && <MethodView />}
        </main>
      </div>
    </div>
  );
}
