"""Mira com juga la IA entrenada.

Ús:
    python play.py              # finestra gràfica (cal pygame)
    python play.py --text       # al terminal, sense pygame
    python play.py --games 20 --fast   # avalua 20 partides sense dibuixar
"""
import argparse
import os
import time

from agent import DQNAgent, get_state
from game import SnakeGame

HERE = os.path.dirname(os.path.abspath(__file__))
CELL = 24


def play_text(game, agent, delay):
    while True:
        res = game.step(agent.act(get_state(game), explore=False))
        print("\033[H\033[J" + game.render_text() + f"\nPunts: {game.score}")
        time.sleep(delay)
        if res.done:
            return game.score


def play_pygame(game, agent, fps):
    import pygame
    pygame.init()
    screen = pygame.display.set_mode((game.w * CELL, game.h * CELL + 30))
    pygame.display.set_caption("IA del Snake")
    font = pygame.font.SysFont(None, 26)
    clock = pygame.time.Clock()
    while True:
        for e in pygame.event.get():
            if e.type == pygame.QUIT:
                pygame.quit()
                raise SystemExit
        res = game.step(agent.act(get_state(game), explore=False))
        screen.fill((20, 20, 28))
        if game.food:
            pygame.draw.rect(screen, (230, 70, 70), (game.food[0] * CELL, game.food[1] * CELL, CELL, CELL))
        for i, (x, y) in enumerate(game.snake):
            color = (120, 230, 120) if i == 0 else (60, 170, 80)
            pygame.draw.rect(screen, color, (x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2))
        screen.blit(font.render(f"Punts: {game.score}", True, (240, 240, 240)), (8, game.h * CELL + 6))
        pygame.display.flip()
        clock.tick(fps)
        if res.done:
            time.sleep(0.8)
            return game.score


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default=os.path.join(HERE, "model", "snake_dqn.pt"))
    p.add_argument("--games", type=int, default=3)
    p.add_argument("--size", type=int, default=20)
    p.add_argument("--text", action="store_true", help="dibuixa al terminal")
    p.add_argument("--fast", action="store_true", help="no dibuixa; només dona resultats")
    p.add_argument("--fps", type=int, default=15)
    args = p.parse_args()

    agent = DQNAgent()
    agent.load(args.model)
    game = SnakeGame(args.size, args.size)
    scores = []
    for n in range(1, args.games + 1):
        game.reset()
        if args.fast:
            while not game.step(agent.act(get_state(game), explore=False)).done:
                pass
            score = game.score
        elif args.text:
            score = play_text(game, agent, 1 / args.fps)
        else:
            score = play_pygame(game, agent, args.fps)
        scores.append(score)
        print(f"Partida {n}: {score} punts")
    print(f"Mitjana: {sum(scores) / len(scores):.1f} | Màxim: {max(scores)}")


if __name__ == "__main__":
    main()
