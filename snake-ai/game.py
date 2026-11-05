"""Joc de la serp (Snake) sense gràfics, pensat per entrenar una IA.

La IA tria una acció RELATIVA a la direcció actual:
    0 = seguir recte, 1 = girar a la dreta, 2 = girar a l'esquerra
"""
import random
from dataclasses import dataclass

# Direccions en ordre horari: dreta, avall, esquerra, amunt
DIRS = [(1, 0), (0, 1), (-1, 0), (0, -1)]

REWARD_FOOD = 10.0
REWARD_DEATH = -10.0
REWARD_STEP = 0.0


@dataclass
class StepResult:
    reward: float
    done: bool
    score: int


class SnakeGame:
    def __init__(self, width: int = 20, height: int = 20, seed: int | None = None):
        self.w = width
        self.h = height
        self.rng = random.Random(seed)
        self.reset()

    def reset(self) -> None:
        cx, cy = self.w // 2, self.h // 2
        self.dir = 0  # comença anant cap a la dreta
        self.snake = [(cx, cy), (cx - 1, cy), (cx - 2, cy)]  # el cap és snake[0]
        self.score = 0
        self.frames = 0
        self.frames_since_food = 0
        self._place_food()

    def _place_food(self) -> None:
        occupied = set(self.snake)
        free = [(x, y) for x in range(self.w) for y in range(self.h) if (x, y) not in occupied]
        self.food = self.rng.choice(free) if free else None

    def is_collision(self, pt: tuple[int, int]) -> bool:
        x, y = pt
        if x < 0 or x >= self.w or y < 0 or y >= self.h:
            return True
        # La cua es mourà aquest torn, així que no compta com a obstacle
        return pt in self.snake[:-1]

    def step(self, action: int) -> StepResult:
        self.frames += 1
        self.frames_since_food += 1

        if action == 1:
            self.dir = (self.dir + 1) % 4
        elif action == 2:
            self.dir = (self.dir - 1) % 4

        dx, dy = DIRS[self.dir]
        head = (self.snake[0][0] + dx, self.snake[0][1] + dy)

        # Mor si xoca o si triga massa sense menjar (evita que doni voltes infinites)
        if self.is_collision(head) or self.frames_since_food > 100 * len(self.snake):
            return StepResult(REWARD_DEATH, True, self.score)

        self.snake.insert(0, head)
        if head == self.food:
            self.score += 1
            self.frames_since_food = 0
            self._place_food()
            if self.food is None:  # ha omplert tot el tauler
                return StepResult(REWARD_FOOD, True, self.score)
            return StepResult(REWARD_FOOD, False, self.score)

        self.snake.pop()
        return StepResult(REWARD_STEP, False, self.score)

    def render_text(self) -> str:
        grid = [["." for _ in range(self.w)] for _ in range(self.h)]
        if self.food:
            grid[self.food[1]][self.food[0]] = "*"
        for i, (x, y) in enumerate(self.snake):
            grid[y][x] = "@" if i == 0 else "o"
        border = "+" + "-" * self.w + "+"
        return "\n".join([border] + ["|" + "".join(r) + "|" for r in grid] + [border])
