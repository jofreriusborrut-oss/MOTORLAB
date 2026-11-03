import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { Panel } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';
import { Segmented } from '../ui/Segmented';
import { Stat } from '../ui/Stat';
import { ConfigSelect } from '../ui/ConfigSelect';
import { CompareChart } from '../../charts/CompareChart';
import { SERIES } from '../../charts/theme';
import { costs, consumptionVsSpeed } from '../../physics/fuel';
import { ENERGY } from '../../physics/constants';
import type { Configuration } from '../../physics/types';
import type { Analysis } from '../../physics/analysis';
import type { FuelSettings } from '../../state/storage';
import { fmt } from '../../utils/format';

export function priceFor(cfg: Configuration, f: FuelSettings) {
  if (cfg.engine.type === 'electric') return f.electricitat;
  if (cfg.engine.type === 'diesel') return f.gasoil;
  return f.gasolina;
}

export function consumptionFor(cfg: Configuration, a: Analysis, f: FuelSettings): number | null {
  if (f.source === 'declarat') return cfg.engine.declaredConsumption;
  return a.cycle && a.cycle.feasible && Number.isFinite(a.cycle.mixed) ? a.cycle.mixed : null;
}

export function FuelView() {
  const { state, dispatch, analyzeById } = useStore();
  const f = state.fuel;
  const setF = (patch: Partial<FuelSettings>) => dispatch({ type: 'fuel', patch });
  const A = analyzeById(state.compare[0]);
  const B = analyzeById(state.compare[1]);

  const rows = useMemo(() => {
    if (!A?.analysis.engine || !B?.analysis.engine) return [];
    const ra = consumptionVsSpeed(A.analysis.engine, A.config.vehicle, 180, 5);
    const rb = consumptionVsSpeed(B.analysis.engine, B.config.vehicle, 180, 5);
    // Comparació en cost (€/100 km): unitats comparables entre combustible i electricitat
    const pa = priceFor(A.config, f);
    const pb = priceFor(B.config, f);
    return ra.map((r, i) => ({
      kmh: r.kmh,
      a: r.per100km !== null ? round2(r.per100km * pa) : null,
      b: rb[i]?.per100km != null ? round2((rb[i].per100km as number) * pb) : null,
    }));
  }, [A, B, f]);

  const card = (slot: 0 | 1, entry: ReturnType<typeof analyzeById>, color: string) => {
    if (!entry) return null;
    const { config, analysis } = entry;
    const c = analysis.cycle;
    const unit = ENERGY[config.engine.type].unit;
    const per100 = consumptionFor(config, analysis, f);
    const price = priceFor(config, f);
    const cost = per100 !== null ? costs(per100, price, f.kmPerYear) : null;
    const deviation = c && c.feasible ? (c.mixed - config.engine.declaredConsumption) / config.engine.declaredConsumption : null;
    return (
      <Panel title={config.name} code={slot === 0 ? 'C-A' : 'C-B'} className="fuel-card"
        actions={<ConfigSelect label={slot === 0 ? 'Motor A' : 'Motor B'} swatch={color} value={state.compare[slot]} onChange={(id) => dispatch({ type: 'compare', slot, id })} />}>
        {!analysis.engine || !c ? (
          <p className="err-text">Configuració no vàlida: revisa el motor.</p>
        ) : (
          <>
            <div className="stat-strip small">
              <Stat label="Consum" estimate={f.source === 'estimat'} value={fmt(per100, 1)} unit={`${unit}/100 km`} accent={slot === 0 ? 'orange' : 'blue'}
                sub={f.source === 'estimat' ? 'Cicle mixt simulat' : 'Valor declarat'} />
              <Stat label="Cost cada 100 km" value={fmt(cost?.per100km, 2)} unit="€" sub={`${fmt(price, 3)} €/${unit}`} />
              <Stat label="Cost anual" value={fmt(cost?.annual, 0)} unit="€" sub={`${fmt(cost?.annualEnergy, 0)} ${unit} / any`} />
            </div>
            <table className="data-table compact">
              <thead><tr><th>Tram</th><th>Consum</th><th>Marxa · règim</th><th>€/100 km</th></tr></thead>
              <tbody>
                {([['Urbà (40 km/h + arrencades)', c.urban, c.points.urban], ['Carretera 90 km/h', c.road, c.points.road], ['Autopista 120 km/h', c.highway, c.points.highway]] as const).map(([label, val, pt]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{pt.feasible ? `${fmt(val, 1)} ${unit}` : 'no assolible'}</td>
                    <td className="dim">{pt.feasible ? `${pt.gear}a · ${fmt(pt.rpm, 0)} rpm` : '—'}</td>
                    <td>{pt.feasible ? fmt(val * price, 2) : '—'}</td>
                  </tr>
                ))}
                <tr className="total"><td>Mixt (35/40/25 %)</td><td>{fmt(c.mixed, 1)} {unit}</td><td /><td>{fmt(c.mixed * price, 2)}</td></tr>
              </tbody>
            </table>
            {deviation !== null && Math.abs(deviation) > 0.3 && (
              <p className="hint warn-text">L'estimació difereix un {fmt(Math.abs(deviation) * 100, 0)} % del consum declarat ({fmt(config.engine.declaredConsumption, 1)} {unit}/100 km). Revisa massa, aerodinàmica o el valor declarat.</p>
            )}
          </>
        )}
      </Panel>
    );
  };

  const ca = A && consumptionFor(A.config, A.analysis, f);
  const cb = B && consumptionFor(B.config, B.analysis, f);
  const costA = A && ca != null ? costs(ca, priceFor(A.config, f), f.kmPerYear) : null;
  const costB = B && cb != null ? costs(cb, priceFor(B.config, f), f.kmPerYear) : null;
  const diff = costA && costB ? costA.annual - costB.annual : null;

  return (
    <div className="view">
      <Panel title="Preus i ús" code="F-01" subtitle="Els valors es desen automàticament">
        <div className="form-grid four">
          <NumberField label="Preu gasolina" unit="€/L" value={f.gasolina} min={0} max={10} step={0.01} decimals={3} onChange={(gasolina) => setF({ gasolina })} />
          <NumberField label="Preu gasoil" unit="€/L" value={f.gasoil} min={0} max={10} step={0.01} decimals={3} onChange={(gasoil) => setF({ gasoil })} />
          <NumberField label="Preu electricitat" unit="€/kWh" value={f.electricitat} min={0} max={5} step={0.01} decimals={3} onChange={(electricitat) => setF({ electricitat })} />
          <NumberField label="Quilòmetres anuals" unit="km" value={f.kmPerYear} min={0} max={300000} step={1000} onChange={(kmPerYear) => setF({ kmPerYear })} />
          <div className="field wide">
            <span>Font del consum</span>
            <Segmented ariaLabel="Font del consum" value={f.source} onChange={(source) => setF({ source })}
              options={[{ value: 'estimat', label: 'Estimat pel model' }, { value: 'declarat', label: 'Declarat al motor' }]} />
          </div>
        </div>
      </Panel>

      <div className="grid-2">
        {card(0, A, SERIES.orange)}
        {card(1, B, SERIES.blue)}
      </div>

      {diff !== null && A && B && (
        <Panel title="Diferència entre motors" code="F-02">
          <div className="diff-banner">
            <div>
              <span className="diff-big mono">{fmt(Math.abs(diff), 0)} €</span>
              <span className="diff-text">
                {Math.abs(diff) < 1 ? 'Cost anual pràcticament idèntic.' : <>a l'any més econòmic <strong>{diff > 0 ? B.config.name : A.config.name}</strong> ({fmt(f.kmPerYear)} km/any)</>}
              </span>
            </div>
            <div className="diff-sub">
              <span>Cost per km: <strong className="mono">{fmt(costA!.perKm, 3)} €</strong> vs <strong className="mono">{fmt(costB!.perKm, 3)} €</strong></span>
              <span>En 5 anys: <strong className="mono">{fmt(Math.abs(diff) * 5, 0)} €</strong></span>
            </div>
          </div>
        </Panel>
      )}

      {rows.length > 0 && A && B && (
        <Panel title="Cost per cada 100 km segons la velocitat" code="F-03" subtitle="Velocitat constant en pla, a la marxa més eficient. En cost (€) per poder comparar combustible i electricitat.">
          <CompareChart data={rows} xKey="kmh" xUnit="km/h" unit="€" yLabel="€ / 100 km" decimals={2}
            a={{ key: 'a', name: A.config.name, color: SERIES.orange }} b={{ key: 'b', name: B.config.name, color: SERIES.blue }} />
        </Panel>
      )}
      <p className="disclaimer">El consum elèctric no inclou les pèrdues de càrrega de la bateria (≈ 10 %). Estimacions basades en un cicle simplificat; el consum real depèn de la conducció, el trànsit, la temperatura i l'orografia.</p>
    </div>
  );
}

const round2 = (x: number) => Math.round(x * 100) / 100;
