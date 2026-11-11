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

---

## 🏛️ GOVERNA · Simulador polític

Segona aplicació del repositori: **governa un país real** (32 països amb dades aproximades de 2024-2025; noms de persones i partits ficticis però inspirats en la realitat).

**Web:** https://jofreriusborrut-oss.github.io/MOTORLAB/politica/ · **Local:** `npm run dev` i obre http://localhost:5173/politica/

- **Mapa de decisions**: un menú en forma de mapa que es desplega per branques (economia, treball, educació, sanitat, drets, seguretat, exèrcit, medi ambient, institucions, exterior, població, dades) fins a ~50 polítiques concretes.
- **Economia**: pressupost per ministeri, 7 impostos, dèficit, deute, interessos, inflació, atur, regulació/desregulació de mercats, banc central, comerç…
- **Conseqüències a curt i llarg termini**: l'educació, la salut, la corrupció o el medi ambient canvien lentament; l'economia i l'opinió pública, de pressa.
- **Societat**: 11 grups socials amb afinitat pròpia, malestar, protestes, vagues i revolucions. Índex de societat de l'«infern distòpic» a la «utopia».
- **Política**: parlament amb escons, coalicions, socis que s'enfaden, eleccions, mocions de censura, decrets, cops d'estat… i mode **oposició** (o exili) per tornar al poder.
- **Exterior**: mapa del món, acords comercials, aliances, sancions, blocs (UE, OTAN, BRICS…) i guerres.
- **Referèndums**: bandera (amb dissenyador), nom del país, monarquia/república, sortir o entrar a la UE, independència regional o qualsevol llei.
- **Notícies** amb mitjans ficticis que parlen de tu (i amb censura només en diuen coses bones).
- El temps avança sol (pausa, ×1, ×2, ×3 · tecles `espai`, `1`, `2`, `3`). Desat automàtic al navegador.

```
politica/index.html     Pàgina d'entrada
src/politica/
  data/                 Països, partits, polítiques, grups socials, noms
  engine/               Simulació pura (tick mensual, política, diplomàcia, referèndums, accions)
  ui/                   Mapa de decisions, mapa del món, panells i modals
tests/politica.test.ts  20 anys simulats per a cada país i proves de les accions
```
