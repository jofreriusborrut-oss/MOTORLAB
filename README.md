# MOTORLAB

Simulador interactiu de motors i vehicles (React + TypeScript + Vite + Recharts).
Totes les dades es desen al navegador (LocalStorage); no cal cap servidor.

## Execució

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la física (Vitest)
npm run build      # comprovació de tipus + build de producció a dist/
npm run preview    # serveix el build
```

## Estructura

```
src/
  physics/        Lògica física pura (sense React)
    types.ts          Tipus de motor, vehicle i configuració
    constants.ts      Constants físiques, combustibles, rangs de BMEP
    interpolation.ts  Spline cúbic monòton (Fritsch–Carlson)
    engine.ts         Parell → potència, model de consum de Willans, escalat de corbes
    vehicle.ts        Cinemàtica de la transmissió, forces, velocitat màxima, diagrama de tracció
    fuel.ts           Consum a velocitat constant, cicle mixt, costos
    validation.ts     Errors (bloquegen el càlcul) i avisos (valors poc plausibles)
    analysis.ts       Orquestra tots els càlculs d'una configuració
  simulation/
    acceleration.ts   Integració temporal de l'acceleració i canvis automàtics
    usePlayback.ts    Rellotge de reproducció (iniciar / pausa / reiniciar)
  data/presets.ts   Motors i vehicles de mostra
  state/            Estat global (reducer + context) i persistència a LocalStorage
  charts/           Components de gràfiques (Recharts) i paleta
  components/       Vistes: motor, gràfiques, vehicle, simulació, consum, comparador, mètode
  styles/           CSS (base, layout, components, vistes)
tests/              Tests de fórmules, interpolació, simulació, consum, validació i LocalStorage
```

Els resultats són **estimacions** d'un model físic simplificat. A la secció «Mètode i fórmules» de l'aplicació hi ha les hipòtesis.
