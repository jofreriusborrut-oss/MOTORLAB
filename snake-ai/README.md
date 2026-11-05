# IA que aprèn a jugar al Snake

Una xarxa neuronal que aprèn a jugar a la serp **des de zero**, sense que ningú li expliqui les regles:
només rep una recompensa quan menja (+10) i un càstig quan mor (−10). Fa servir
**aprenentatge per reforç** amb l'algorisme **DQN (Deep Q-Network)**.

![Corba d'aprenentatge](model/training.png)

En unes 300 partides (≈1 minut en un portàtil) passa de 0 punts a una mitjana de ~30 punts en un tauler de 20×20.

## Com funciona

| Peça | Fitxer | Què fa |
|---|---|---|
| Joc | `game.py` | El Snake, sense gràfics, perquè vagi molt ràpid. Accions: recte, dreta, esquerra. |
| Estat | `agent.py` → `get_state` | Resumeix la situació en 11 valors: perill recte/dreta/esquerra, direcció actual i cap a on és el menjar. |
| Cervell | `agent.py` → `QNet` | Xarxa neuronal 11 → 256 → 3 que estima el **valor Q** (punts futurs esperats) de cada acció. |
| Aprenentatge | `agent.py` → `train_step` | Equació de Bellman: `Q(s,a) ≈ recompensa + 0.9 · max Q(s', ·)`. |
| Exploració | `train.py` | Al principi juga a l'atzar (ε = 100 %) i va confiant cada cop més en la xarxa (ε → 1 %). |
| Memòria | `agent.py` → `memory` | Guarda experiències i en repassa lots a l'atzar (*experience replay*). |

## Executar-ho

```bash
cd snake-ai
pip install -r requirements.txt

python train.py                  # entrena (300 partides); desa model/snake_dqn.pt i model/training.png
python play.py                   # mira-la jugar en una finestra (pygame)
python play.py --text            # o al terminal
python play.py --games 50 --fast # avalua: mitjana i màxim de 50 partides
python test_game.py              # proves del joc
```

Ja hi ha un model entrenat a `model/snake_dqn.pt`, així que pots executar `play.py` directament.

## Límits i idees per millorar

La IA només veu les caselles del costat del cap, així que sovint **s'enrotlla i es tanca ella sola**
quan és llarga. Possibles millores, de més fàcil a més difícil:

1. Afegir a l'estat la distància a les parets/cos en cada direcció, o la longitud de la serp.
2. Afegir a l'estat quanta zona lliure queda accessible en cada direcció (flood fill).
3. *Target network* i *Double DQN* per a un aprenentatge més estable.
4. Que vegi **tot el tauler** com una imatge i fer servir una xarxa convolucional (CNN).
5. Provar altres algorismes: PPO, A2C (per exemple amb `stable-baselines3`).
