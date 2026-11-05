"""Proves del joc i de l'estat. Executa: python -m pytest  (o python test_game.py)"""
from agent import get_state
from game import REWARD_DEATH, REWARD_FOOD, SnakeGame


def test_reset():
    g = SnakeGame(10, 10, seed=0)
    assert len(g.snake) == 3 and g.score == 0 and g.food not in g.snake


def test_eat_food():
    g = SnakeGame(10, 10, seed=0)
    hx, hy = g.snake[0]
    g.food = (hx + 1, hy)
    r = g.step(0)
    assert r.reward == REWARD_FOOD and g.score == 1 and len(g.snake) == 4


def test_wall_death():
    g = SnakeGame(10, 10, seed=0)
    g.food = (0, 0)
    for _ in range(10):
        r = g.step(0)
        if r.done:
            break
    assert r.done and r.reward == REWARD_DEATH


def test_turns():
    g = SnakeGame(10, 10, seed=0)
    g.step(1)
    assert g.dir == 1  # dreta -> avall
    g.step(2)
    assert g.dir == 0  # avall -> dreta


def test_state():
    g = SnakeGame(10, 10, seed=0)
    hx, hy = g.snake[0]
    g.food = (hx + 2, hy)
    s = get_state(g)
    assert s.shape == (11,)
    assert list(s[3:7]) == [1, 0, 0, 0]  # va cap a la dreta
    assert s[7] == 1 and s[9] == 0  # menjar a la dreta


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("OK", name)
