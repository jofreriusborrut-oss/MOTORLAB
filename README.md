# MOTORLAB · 🏛️ GOVERNA

Simulador de política nacional: **governa un país real** i decideix sobre economia, educació, exèrcit, drets, eleccions, diplomàcia… Cada decisió té conseqüències a curt i a llarg termini.

**Web:** https://jofreriusborrut-oss.github.io/MOTORLAB/

32 països amb dades aproximades de 2024-2025. Els noms de persones i partits són ficticis però inspirats en la realitat.

## Què pots fer

- **Mapa de decisions**: un menú en forma de mapa que es desplega per branques (economia, treball, educació, sanitat, drets, seguretat, exèrcit, medi ambient, institucions, exterior, població, dades) fins a ~50 polítiques concretes.
- **Economia**: pressupost per ministeri, 7 impostos, dèficit, deute, interessos, inflació, atur, regulació i desregulació de mercats, banc central, comerç…
- **Conseqüències a curt i llarg termini**: l'educació, la salut, la corrupció o el medi ambient canvien lentament; l'economia i l'opinió pública, de pressa.
- **Societat**: 11 grups socials amb afinitat pròpia, malestar, protestes, vagues i revolucions. Índex de societat de l'«infern distòpic» a la «utopia».
- **Política**: parlament amb escons, coalicions, socis que s'enfaden, eleccions, mocions de censura, decrets, cops d'estat… i mode **oposició** (o exili) per tornar al poder.
- **Exterior**: mapa del món, acords comercials, aliances, sancions, blocs (UE, OTAN, BRICS…) i guerres.
- **Referèndums**: bandera (amb dissenyador), nom del país, monarquia o república, entrar o sortir de la UE, independència regional o qualsevol llei.
- **Notícies** de mitjans ficticis que parlen de tu (amb censura, només en diuen coses bones).
- El temps avança sol (pausa, ×1, ×2, ×3 · tecles `espai`, `1`, `2`, `3`). Desat automàtic al navegador.

## Executar-la en local

1. Instal·la **Node.js LTS**: https://nodejs.org
2. En un terminal:

```bash
git clone https://github.com/jofreriusborrut-oss/MOTORLAB.git
cd MOTORLAB
npm install
npm run dev
```

3. Obre http://localhost:5173

Altres ordres:

```bash
npm test          # simula 20 anys a cada país i prova les accions
npm run build     # build de producció a dist/
npm run preview   # serveix el build
```

## Publicació

Cada `push` a `main` executa els tests, compila i publica a GitHub Pages (`.github/workflows/deploy.yml`).

## Estructura

```
src/
  data/       Països, partits, polítiques, grups socials, noms
  engine/     Simulació pura (tic mensual, política, diplomàcia, referèndums, accions)
  ui/         Mapa de decisions, mapa del món, panells i modals
  store.tsx   Estat de la partida, pas del temps i desat
tests/        Tests de la simulació
```

React + TypeScript + Vite + Recharts + d3-geo. El model és una simplificació: els resultats són orientatius, no prediccions.
