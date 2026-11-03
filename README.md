# MOTORLAB

Simulador interactiu de motors i vehicles · Simulador interactivo de motores y vehículos · Interactive engine and vehicle simulator.

**Web:** https://jofreriusborrut-oss.github.io/MOTORLAB/

Interfície en **català, castellano i English** (selector CA / ES / EN a la barra superior).
React + TypeScript + Vite + Recharts. Les dades es desen al navegador (LocalStorage); no cal cap servidor.

---

## Executar-la en local · Ejecutarla en local · Run it locally

1. Instal·la / instala / install **Node.js LTS**: https://nodejs.org
2. Obre un terminal / abre una terminal / open a terminal:
   - Windows: *PowerShell* · macOS: *Terminal* · Linux: *Terminal*
3. Escriu / escribe / type:

```bash
git clone https://github.com/jofreriusborrut-oss/MOTORLAB.git
cd MOTORLAB
npm install
npm run dev
```

4. Obre / abre / open http://localhost:5173

Sense git: botó verd **Code → Download ZIP** a GitHub, descomprimeix-lo i executa `npm install` i `npm run dev` dins la carpeta.

Altres ordres / otros comandos / other commands:

```bash
npm test          # tests de la física
npm run build     # build de producció a dist/
npm run preview   # serveix el build
```

## Publicació · Publicación · Deployment

Cada `push` a `main` executa els tests, compila i publica a GitHub Pages (`.github/workflows/deploy.yml`).

## Estructura

```
src/
  physics/      Lògica física pura: motor, vehicle, consum, validació
  simulation/   Simulació d'acceleració i rellotge de reproducció
  i18n/         Traduccions (ca.ts és la referència; es.ts i en.ts)
  data/         Motors i vehicles de mostra
  state/        Estat global i persistència a LocalStorage
  charts/       Gràfiques (Recharts)
  components/   Vistes de la interfície
  styles/       CSS
tests/          Tests de fórmules, simulació, consum, validació i LocalStorage
```

Els resultats són **estimacions** d'un model físic simplificat (vegeu «Mètode i fórmules» a l'aplicació).
