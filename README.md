# MOTORLAB

Simulador interactiu de motors i vehicles · Simulador interactivo de motores y vehículos · Interactive engine and vehicle simulator.

**Web:** https://jofreriusborrut-oss.github.io/MOTORLAB/

Interfície en **català, castellano i English** (selector CA / ES / EN a la barra superior).
React + TypeScript + Vite + Recharts. Les dades es desen al navegador (LocalStorage); no cal cap servidor.

---

## 🃏 Nit de Pòquer (partides privades amb amics)

**Web:** https://jofreriusborrut-oss.github.io/MOTORLAB/poker/

Texas Hold'em No Limit per jugar amb els amics, cadascú des del seu mòbil (fins a 9 jugadors).

1. Un jugador (l'**amfitrió**) obre la web, posa el nom i toca **Crear mesa privada** (tria fitxes, cegues i temps per jugada).
2. Toca **Convidar** i envia l'enllaç per WhatsApp (o digues el codi de 5 lletres).
3. Els amics obren l'enllaç, posen el nom i toquen **Entrar a la mesa**.
4. Quan hi siguin tots, l'amfitrió toca **Començar partida**.

Funcions: cegues, botó i pots laterals automàtics, temporitzador per jugada, pre-accions (Passar/Retirar-se, Igualar el que sigui), pujades ràpides (⅓, ½, ¾, pot, all-in), vista en BB, xat amb emojis, recompres, comptes finals (qui guanya/perd), historial de mans, reconnexió automàtica si algú perd la cobertura o recarrega la pàgina. L'amfitrió pot canviar cegues, afegir/treure fitxes, pausar i expulsar jugadors.

**Com funciona:** no hi ha servidor propi. Els mòbils es connecten directament entre ells (WebRTC amb [PeerJS](https://peerjs.com/)) i el mòbil de l'amfitrió fa de "crupier": barreja amb el generador criptogràfic del navegador i envia a cada jugador només les seves cartes. Per això **l'amfitrió ha de mantenir la web oberta i la pantalla encesa** (l'app ho demana automàticament). Si l'amfitrió recarrega, la partida es recupera on era.

> Opcional: amb `?servidor=host:port` a l'URL es pot fer servir un servidor PeerJS propi en lloc del gratuït.

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
