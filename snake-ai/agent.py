"""Agent DQN (Deep Q-Network) per al Snake.

La IA no veu la pantalla: rep 11 nombres (0 o 1) que descriuen la situació,
i una xarxa neuronal petita estima quina puntuació futura (valor Q) espera
obtenir amb cada una de les 3 accions.
"""
import random
from collections import deque

import numpy as np
import torch
import torch.nn as nn

from game import DIRS, SnakeGame

STATE_SIZE = 11
N_ACTIONS = 3


def get_state(game: SnakeGame) -> np.ndarray:
    hx, hy = game.snake[0]
    d = game.dir
    straight = DIRS[d]
    right = DIRS[(d + 1) % 4]
    left = DIRS[(d - 1) % 4]

    def danger(v):
        return game.is_collision((hx + v[0], hy + v[1]))

    fx, fy = game.food if game.food else (hx, hy)
    state = [
        # Perill immediat
        danger(straight),
        danger(right),
        danger(left),
        # Direcció actual
        d == 0, d == 1, d == 2, d == 3,  # dreta, avall, esquerra, amunt
        # On és el menjar respecte del cap
        fx > hx,  # a la dreta
        fy > hy,  # a sota
        fx < hx,  # a l'esquerra
        fy < hy,  # a dalt
    ]
    return np.array(state, dtype=np.float32)


class QNet(nn.Module):
    def __init__(self, hidden: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(STATE_SIZE, hidden),
            nn.ReLU(),
            nn.Linear(hidden, N_ACTIONS),
        )

    def forward(self, x):
        return self.net(x)


class DQNAgent:
    def __init__(self, lr: float = 1e-3, gamma: float = 0.9, memory: int = 100_000, batch_size: int = 1000):
        self.model = QNet()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        self.loss_fn = nn.MSELoss()
        self.gamma = gamma
        self.batch_size = batch_size
        self.memory = deque(maxlen=memory)
        self.epsilon = 1.0  # probabilitat de fer una acció a l'atzar (exploració)

    def act(self, state: np.ndarray, explore: bool = True) -> int:
        if explore and random.random() < self.epsilon:
            return random.randrange(N_ACTIONS)
        with torch.no_grad():
            q = self.model(torch.from_numpy(state).unsqueeze(0))
        return int(q.argmax().item())

    def remember(self, s, a, r, s2, done):
        self.memory.append((s, a, r, s2, done))

    def train_step(self, batch):
        s, a, r, s2, done = zip(*batch)
        s = torch.from_numpy(np.array(s))
        s2 = torch.from_numpy(np.array(s2))
        a = torch.tensor(a, dtype=torch.long)
        r = torch.tensor(r, dtype=torch.float32)
        done = torch.tensor(done, dtype=torch.float32)

        q = self.model(s).gather(1, a.unsqueeze(1)).squeeze(1)
        with torch.no_grad():
            # Equació de Bellman: recompensa ara + valor descomptat del millor futur
            target = r + self.gamma * self.model(s2).max(1).values * (1 - done)

        loss = self.loss_fn(q, target)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        return loss.item()

    def train_short(self, s, a, r, s2, done):
        return self.train_step([(s, a, r, s2, done)])

    def train_long(self):
        if not self.memory:
            return 0.0
        n = min(self.batch_size, len(self.memory))
        return self.train_step(random.sample(self.memory, n))

    def save(self, path: str):
        torch.save(self.model.state_dict(), path)

    def load(self, path: str):
        self.model.load_state_dict(torch.load(path, map_location="cpu"))
        self.model.eval()
        self.epsilon = 0.0
