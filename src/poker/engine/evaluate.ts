import { Card, rankOf, suitOf } from './cards';

export const HAND_NAMES = [
  'Carta alta',
  'Parella',
  'Doble parella',
  'Trio',
  'Escala',
  'Color',
  'Full',
  'Pòquer',
  'Escala de color',
  'Escala reial',
];

export interface HandValue {
  /** Puntuació comparable: més alt = millor mà. */
  score: number;
  /** Categoria 0..9 (índex de HAND_NAMES). */
  cat: number;
  name: string;
  best: Card[];
}

const B = 15;

function encode(cat: number, kickers: number[]): number {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * B + (kickers[i] ?? 0);
  return s;
}

function eval5(cards: Card[]): { score: number; cat: number } {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));

  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks[0] === 14 && ranks[1] === 5) straightHigh = 5; // A-2-3-4-5
  }

  // grups per (quantitat desc, rang desc)
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map((g) => g[0]);

  if (straightHigh && flush) {
    const cat = straightHigh === 14 ? 9 : 8;
    return { cat, score: encode(8, [straightHigh]) + (cat === 9 ? 1 : 0) };
  }
  if (groups[0][1] === 4) return { cat: 7, score: encode(7, byGroup) };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { cat: 6, score: encode(6, byGroup) };
  if (flush) return { cat: 5, score: encode(5, ranks) };
  if (straightHigh) return { cat: 4, score: encode(4, [straightHigh]) };
  if (groups[0][1] === 3) return { cat: 3, score: encode(3, byGroup) };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { cat: 2, score: encode(2, byGroup) };
  if (groups[0][1] === 2) return { cat: 1, score: encode(1, byGroup) };
  return { cat: 0, score: encode(0, ranks) };
}

/** Millor mà de 5 cartes a partir de 5–7 cartes. */
export function evaluate(cards: Card[]): HandValue {
  if (cards.length < 5) throw new Error('Calen almenys 5 cartes');
  let best: { score: number; cat: number } | null = null;
  let bestCards: Card[] = [];
  const n = cards.length;
  const idx = [0, 1, 2, 3, 4];
  const combo = (start: number, depth: number) => {
    if (depth === 5) {
      const five = idx.map((i) => cards[i]);
      const v = eval5(five);
      if (!best || v.score > best.score) {
        best = v;
        bestCards = five;
      }
      return;
    }
    for (let i = start; i <= n - (5 - depth); i++) {
      idx[depth] = i;
      combo(i + 1, depth + 1);
    }
  };
  combo(0, 0);
  const b = best as unknown as { score: number; cat: number };
  return { score: b.score, cat: b.cat, name: HAND_NAMES[b.cat], best: bestCards };
}

/** Descripció de la mà actual del jugador (funciona també amb menys de 5 cartes). */
export function describeHand(cards: Card[]): string {
  if (cards.length >= 5) return evaluate(cards).name;
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(rankOf(c), (counts.get(rankOf(c)) ?? 0) + 1);
  const v = [...counts.values()].sort((a, b) => b - a);
  if (v[0] === 4) return HAND_NAMES[7];
  if (v[0] === 3) return HAND_NAMES[3];
  if (v[0] === 2 && v[1] === 2) return HAND_NAMES[2];
  if (v[0] === 2) return HAND_NAMES[1];
  return HAND_NAMES[0];
}
