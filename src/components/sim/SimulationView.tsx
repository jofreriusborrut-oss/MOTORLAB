import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { Segmented } from '../ui/Segmented';
import { Stat } from '../ui/Stat';
import { IssueList } from '../ui/IssueList';
import { Gauge } from './Gauge';
import { SpeedTimeChart } from '../../charts/SpeedTimeChart';
import { sampleAt } from '../../simulation/acceleration';
import { usePlayback } from '../../simulation/usePlayback';
import { fmt } from '../../utils/format';
import { isElectric } from '../../physics/constants';

const STATE_LABEL = { aturat: 'A punt', 'en-marxa': 'En marxa', pausa: 'En pausa', finalitzat: 'Finalitzada' } as const;

export function SimulationView() {
  const { active, analysis, state, dispatch } = useStore();
  const sim = analysis.sim;
  const [rate, setRate] = useState(1);
  const target = state.simTargetKmh;

  // Durada de la reproducció: fins a assolir l'objectiu (o fi de la simulació)
  const endT = useMemo(() => {
    if (!sim) return 0;
    const hit = sim.samples.find((s) => s.kmh >= target);
    return hit ? hit.t + 0.6 : sim.samples[sim.samples.length - 1].t;
  }, [sim, target]);

  const pb = usePlayback(endT, rate);
  // Dades del gràfic, actualitzades cada 0,1 s per mantenir la fluïdesa
  const tBucket = Math.floor(pb.t * 10) / 10;
  const chartData = useChartData(sim?.samples ?? EMPTY, tBucket, endT);

  if (!sim || !analysis.engine) {
    return (
      <div className="view">
        <Panel title="Simulació d'acceleració" code="S-00"><IssueList issues={analysis.issues} title="No es pot simular aquesta configuració" /></Panel>
      </div>
    );
  }

  const raw = sampleAt(sim.samples, pb.t);
  // Abans d'iniciar: vehicle aturat amb el motor al ralentí
  const cur = pb.state === 'aturat' && pb.t === 0
    ? { ...raw, rpm: active.engine.idleRpm, accel: 0, accelG: 0, traction: 0, powerKw: 0, gripLimited: false }
    : raw;
  const reachTime = sim.samples.find((s) => s.kmh >= target)?.t ?? null;
  const reachable = reachTime !== null;
  const progress = Math.min(1, cur.kmh / target);
  const maxRpm = active.engine.maxRpm;
  const electric = isElectric(active.engine.type);
  const gaugeMaxKmh = Math.max(target, Math.ceil((analysis.top?.kmh ?? 200) / 20) * 20);
  const tachMax = Math.ceil(maxRpm / 1000) * 1000;

  const shiftsShown = sim.shifts.filter((s) => s.t <= pb.t && s.t <= endT);

  return (
    <div className="view">
      <Panel title="Simulació d'acceleració a plena càrrega" code="S-01"
        subtitle="Sortida des de parat en pla, canvis automàtics al punt de màxima força a la roda"
        actions={
          <div className="sim-controls">
            <Segmented ariaLabel="Objectiu de velocitat" value={target} onChange={(kmh) => { dispatch({ type: 'simTarget', kmh }); pb.reset(); }}
              options={[{ value: 100, label: '0–100' }, { value: 150, label: '0–150' }, { value: 200, label: '0–200' }]} />
            <Segmented ariaLabel="Velocitat de reproducció" value={rate} onChange={setRate}
              options={[{ value: 0.25, label: '¼×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }]} />
          </div>
        }>
        <div className="sim-buttons">
          <button className="btn primary" onClick={pb.start} disabled={pb.state === 'en-marxa'}>
            <span className="ico">▶</span> {pb.state === 'pausa' ? 'Continuar' : pb.state === 'finalitzat' ? 'Tornar a iniciar' : 'Iniciar'}
          </button>
          <button className="btn" onClick={pb.pause} disabled={pb.state !== 'en-marxa'}><span className="ico">❚❚</span> Pausa</button>
          <button className="btn" onClick={pb.reset} disabled={pb.state === 'aturat' && pb.t === 0}><span className="ico">↺</span> Reiniciar</button>
          <span className={`sim-state s-${pb.state}`}><span className="dot" />{STATE_LABEL[pb.state]}</span>
          <span className="mono sim-clock">t = {fmt(pb.t, 2)} s</span>
        </div>

        <div className="cockpit">
          <div className="gauge-wrap">
            <Gauge value={cur.kmh} max={gaugeMaxKmh} label="VELOCITAT" unit="km/h" majorStep={gaugeMaxKmh > 200 ? 40 : 20} />
          </div>
          <div className="cockpit-center">
            <div className={`gear-display ${cur.shifting ? 'shifting' : ''}`}>
              <span className="gear-label">MARXA</span>
              <span className="gear-num">{cur.shifting ? '–' : cur.gear}</span>
              <span className="gear-of">de {active.vehicle.gearRatios.length}</span>
            </div>
            <div className="flags">
              <span className={`flag ${cur.gripLimited ? 'on warn' : ''}`}>PATINATGE</span>
              <span className={`flag ${cur.limiter ? 'on err' : ''}`}>TALL</span>
              <span className={`flag ${cur.shifting ? 'on info' : ''}`}>CANVI</span>
            </div>
            <div className="g-meter">
              <span className="gm-label">Acceleració</span>
              <div className="gm-bar"><div className="gm-fill" style={{ width: `${Math.min(100, Math.max(0, (cur.accelG / 1.2) * 100))}%` }} /></div>
              <span className="mono gm-val">{fmt(cur.accel, 2)} m/s² · {fmt(cur.accelG, 2)} g</span>
            </div>
          </div>
          <div className="gauge-wrap">
            <Gauge value={cur.rpm} max={tachMax} label="RPM" unit="rpm" redFrom={electric ? undefined : maxRpm * 0.92} majorStep={tachMax > 10000 ? 2000 : 1000} tickDivisor={1000} />
          </div>
        </div>

        <div className="progress-block">
          <div className="progress-head">
            <span>Progrés 0 → {target} km/h</span>
            <span className="mono">{fmt(progress * 100, 0)} %</span>
          </div>
          <div className="progress"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
          {!reachable && <p className="hint warn-text">Aquest vehicle no arriba a {target} km/h (velocitat màxima estimada {fmt(analysis.top?.kmh, 0)} km/h).</p>}
        </div>

        <div className="stat-strip small">
          <Stat label="Velocitat" value={fmt(cur.kmh, 1)} unit="km/h" accent="orange" />
          <Stat label="Règim" value={fmt(cur.rpm, 0)} unit="rpm" accent="blue" />
          <Stat label="Potència entregada" value={fmt(cur.powerKw * 1.35962, 0)} unit="CV" />
          <Stat label="Força de tracció" value={fmt(cur.traction, 0)} unit="N" />
          <Stat label="Resistència aero" value={fmt(cur.aero, 0)} unit="N" />
          <Stat label="Distància" value={fmt(cur.distance, 0)} unit="m" />
        </div>
      </Panel>

      <div className="grid-2 wide-left">
        <Panel title="Velocitat en funció del temps" code="S-02">
          <SpeedTimeChart data={chartData} maxT={endT} maxKmh={Math.max(target, ...sim.samples.filter((s) => s.t <= endT).map((s) => s.kmh))} shifts={shiftsShown} targetKmh={target} />
        </Panel>
        <Panel title="Resultats" code="S-03" subtitle="Estimacions del model">
          <dl className="results">
            <div><dt>0 – 60 km/h</dt><dd>{sim.t0to60 !== null ? `${fmt(sim.t0to60, 1)} s` : '—'}</dd></div>
            <div><dt>0 – 100 km/h</dt><dd className="hl">{sim.t0to100 !== null ? `${fmt(sim.t0to100, 1)} s` : 'no l\'assoleix'}</dd></div>
            <div><dt>80 – 120 km/h</dt><dd>{sim.t80to120 !== null ? `${fmt(sim.t80to120, 1)} s` : '—'}</dd></div>
            <div><dt>400 m des de parat</dt><dd>{sim.t400m !== null ? `${fmt(sim.t400m, 1)} s · ${fmt(sim.v400mKmh, 0)} km/h` : '—'}</dd></div>
            <div><dt>Velocitat màxima</dt><dd>{fmt(analysis.top?.kmh, 0)} km/h</dd></div>
            <div><dt>Canvis de marxa</dt><dd>{sim.shifts.length}</dd></div>
          </dl>
          {sim.shifts.length > 0 && (
            <div className="shift-log">
              <h3>Registre de canvis</h3>
              <ul>
                {sim.shifts.map((s) => (
                  <li key={s.t} className={s.t <= pb.t ? 'done' : ''}>
                    <span className="mono">{fmt(s.t, 2)} s</span>
                    <span>{s.from}a → {s.to}a</span>
                    <span className="mono dim">{fmt(s.kmh, 0)} km/h</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
      <p className="disclaimer">Simulació numèrica (Euler, pas de 5 ms) amb lliscament d'embragatge a la sortida, límit d'adherència, inèrcies giratòries i temps de canvi. Resultats orientatius: no substitueixen una mesura real.</p>
    </div>
  );
}

const EMPTY: { t: number; kmh: number }[] = [];

function useChartData(samples: { t: number; kmh: number }[], tBucket: number, endT: number) {
  return useMemo(() => {
    const out: { t: number; kmh: number }[] = [];
    const limit = Math.min(tBucket, endT);
    for (const s of samples) {
      if (s.t > limit + 1e-9) break;
      out.push({ t: s.t, kmh: Math.round(s.kmh * 10) / 10 });
    }
    return out;
  }, [samples, tBucket, endT]);
}
