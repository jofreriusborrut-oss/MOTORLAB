import { Panel } from './ui/Panel';
import { useStore } from '../state/store';

const F = ({ children }: { children: string }) => <code className="formula">{children}</code>;

export function MethodView() {
  const { dispatch } = useStore();
  return (
    <div className="view method">
      <div className="grid-2">
        <Panel title="Motor" code="F-M">
          <ul className="formulas">
            <li><span>Potència a partir del parell</span><F>P(kW) = T(Nm) · n(rpm) · 2π / 60000</F></li>
            <li><span>Conversió a cavalls</span><F>CV = kW · 1,35962</F></li>
            <li><span>Pressió mitjana efectiva (4 temps)</span><F>BMEP = 4π · T / Vd</F></li>
            <li><span>Fricció (correlació empírica)</span><F>FMEP = 0,97 + 0,15·(n/1000) + 0,05·(n/1000)² bar</F></li>
            <li><span>Consum (línia de Willans)</span><F>P_comb = (P_útil + P_fricció + P_aux) / η_ind</F></li>
            <li><span>Cabal de combustible</span><F>Q(L/h) = P_comb · 3600 / (PCI · ρ_comb)</F></li>
          </ul>
          <p>La corba de parell s'interpola amb un spline cúbic <b>monòton</b> (Fritsch–Carlson): passa exactament pels punts i no genera màxims inexistents. Fora del rang definit es manté el valor de l'extrem; per sobre del règim de tall el parell és zero.</p>
        </Panel>
        <Panel title="Vehicle" code="F-V">
          <ul className="formulas">
            <li><span>Règim del motor</span><F>n = v / r · i_marxa · i_dif · 60 / 2π</F></li>
            <li><span>Força de tracció</span><F>F_t = min(T · i · η / r , µ · m · g · f_eix)</F></li>
            <li><span>Resistència aerodinàmica</span><F>F_a = ½ · ρ · Cx · A · v²   (ρ = 1,225 kg/m³)</F></li>
            <li><span>Resistència al rodament</span><F>F_r = Crr · m · g</F></li>
            <li><span>Massa equivalent</span><F>m_eq = m + J_rodes/r² + J_motor · i² · η / r²</F></li>
            <li><span>Acceleració</span><F>a = (F_t − F_a − F_r) / m_eq</F></li>
          </ul>
          <p>La velocitat màxima és la primera velocitat on cap marxa pot superar la resistència, o on totes superen el règim de tall. La simulació integra amb un pas de 5 ms i canvia de marxa quan la següent dona més força a la roda.</p>
        </Panel>
      </div>
      <Panel title="Hipòtesis i limitacions" code="F-L">
        <ul className="bullets">
          <li>Carretera plana, sense vent, aire a 15 °C i nivell del mar.</li>
          <li>Plena càrrega instantània: no es modela el retard del turbo ni la gestió electrònica.</li>
          <li>El rendiment de la transmissió és constant; el límit d'adherència no té en compte la transferència de pesos.</li>
          <li>El consum en cicle mixt és un cicle simplificat propi (urbà 35 %, carretera 40 %, autopista 25 %), no el cicle WLTP.</li>
          <li>Els valors s'han de llegir com a <b>estimacions d'enginyeria</b>. Els valors no plausibles generen avisos i els impossibles bloquegen el càlcul.</li>
        </ul>
        <div className="danger-zone">
          <span>Esborrar totes les configuracions desades i tornar als motors de mostra.</span>
          <button className="btn danger" onClick={() => { if (confirm('Segur que vols restaurar tota l\'aplicació? Es perdran les configuracions pròpies.')) dispatch({ type: 'resetAll' }); }}>Restaurar tot</button>
        </div>
      </Panel>
    </div>
  );
}
