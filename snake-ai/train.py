"""Entrena la IA del Snake.

Ús:
    python train.py                 # 300 partides (uns minuts en un portàtil)
    python train.py --games 1000    # més partides
"""
import argparse
import os
import time

from agent import DQNAgent, get_state
from game import SnakeGame

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--games", type=int, default=300)
    p.add_argument("--size", type=int, default=20, help="mida del tauler")
    p.add_argument("--out", default=os.path.join(HERE, "model", "snake_dqn.pt"))
    p.add_argument("--seed", type=int, default=None)
    args = p.parse_args()

    if args.seed is not None:
        import random, torch
        random.seed(args.seed)
        torch.manual_seed(args.seed)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    game = SnakeGame(args.size, args.size, seed=args.seed)
    agent = DQNAgent()
    scores, record, t0 = [], 0, time.time()

    for n in range(1, args.games + 1):
        # L'exploració baixa de 100% a 1% durant la primera meitat
        agent.epsilon = max(0.01, 1.0 - n / (args.games * 0.5))
        game.reset()
        state = get_state(game)
        while True:
            action = agent.act(state)
            res = game.step(action)
            new_state = get_state(game)
            agent.train_short(state, action, res.reward, new_state, res.done)
            agent.remember(state, action, res.reward, new_state, res.done)
            state = new_state
            if res.done:
                break

        agent.train_long()  # repassa experiències antigues (experience replay)
        scores.append(game.score)
        if game.score > record:
            record = game.score
            agent.save(args.out)
        avg = sum(scores[-50:]) / len(scores[-50:])
        if n % 10 == 0 or n == args.games:
            print(f"Partida {n:4d} | punts {game.score:3d} | rècord {record:3d} | "
                  f"mitjana(50) {avg:5.1f} | exploració {agent.epsilon:4.2f} | {time.time() - t0:5.0f}s")

    with open(os.path.join(os.path.dirname(args.out), "scores.csv"), "w") as f:
        f.write("partida,punts\n")
        f.writelines(f"{i},{s}\n" for i, s in enumerate(scores, 1))

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        mov = [sum(scores[max(0, i - 49):i + 1]) / len(scores[max(0, i - 49):i + 1]) for i in range(len(scores))]
        plt.figure(figsize=(8, 4))
        plt.plot(scores, alpha=0.35, label="punts per partida")
        plt.plot(mov, label="mitjana de 50 partides")
        plt.xlabel("partida"); plt.ylabel("punts"); plt.title("Aprenentatge de la IA del Snake")
        plt.legend(); plt.tight_layout()
        plt.savefig(os.path.join(os.path.dirname(args.out), "training.png"), dpi=120)
    except ImportError:
        pass

    print(f"\nFet. Millor model desat a {args.out} (rècord {record}).")


if __name__ == "__main__":
    main()
