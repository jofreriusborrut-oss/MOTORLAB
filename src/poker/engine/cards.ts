// Cartes: 'As' = as de piques. Rangs 2-9,T,J,Q,K,A · pals s(piques) h(cors) d(diamants) c(trèvols)
export type Card = string;

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';

export const rankOf = (c: Card): number => RANKS.indexOf(c[0]) + 2;
export const suitOf = (c: Card): string => c[1];

export function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  return deck;
}

/** Enter aleatori uniforme a [0, n) amb el generador criptogràfic (sense biaix de mòdul). */
function randomInt(n: number): number {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) return Math.floor(Math.random() * n);
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  let x: number;
  do {
    c.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

/** Barreja Fisher–Yates. */
export function shuffle<T>(arr: T[], rand: (n: number) => number = randomInt): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomId(len = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[randomInt(chars.length)];
  return s;
}

/** Codi de sala llegible (sense caràcters confusos). */
export function roomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[randomInt(chars.length)];
  return s;
}
