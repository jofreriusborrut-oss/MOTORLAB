import { evaluate } from '../src/poker/engine/evaluate';
import { act, addPlayer, buildPots, createGame, GameState, getPlayer, legalActions, Player, startHand, removePlayer } from '../src/poker/engine/game';

const settings = { smallBlind: 5, bigBlind: 10, startingStack: 1000, actionTime: 30, allowRebuy: true };

function table(n: number, stacks?: number[]): GameState {
  const s = createGame(settings);
  for (let i = 0; i < n; i++) {
    const p = addPlayer(s, { id: 'p' + i, name: 'P' + i, avatar: 0 }) as Player;
    if (stacks) { p.stack = stacks[i]; p.buyIn = stacks[i]; }
  }
  return s;
}
const chips = (s: GameState) => s.players.reduce((a, p) => a + p.stack + p.committed, 0);
const stacksTotal = (s: GameState) => s.players.reduce((a, p) => a + p.stack, 0);

describe('avaluador de mans', () => {
  const v = (c: string) => evaluate(c.split(' '));
  it('ordena les categories', () => {
    const hands = [
      'As Ks Qs Js Ts 2d 3c', // escala reial
      '9h 8h 7h 6h 5h Ad Kd', // escala de color
      'Ac Ad Ah As Kd 2c 3c', // pòquer
      'Kc Kd Kh 2s 2d 7c 9c', // full
      'Ah 9h 7h 4h 2h Kd Qc', // color
      '5c 4d 3h 2s Ad Kc 9c', // escala baixa
      'Qc Qd Qh 7s 2d 9c 3c', // trio
      'Jc Jd 4h 4s 9d 2c 3c', // doble parella
      'Tc Td 4h 6s 9d 2c 3c', // parella
      'Ac Qd 4h 6s 9d 2c 3c', // carta alta
    ];
    const scores = hands.map((h) => v(h).score);
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThan(scores[i]);
    expect(v(hands[0]).name).toBe('Escala reial');
    expect(v(hands[5]).name).toBe('Escala');
  });
  it('desempata pels kickers', () => {
    expect(v('Ac Ad Kh 7s 3d 2c 4h').score).toBeGreaterThan(v('Ac Ad Qh 7s 3d 2c 4h').score);
    expect(v('6c 5d 4h 3s 2d Ac Kc').score).toBeGreaterThan(v('5c 4d 3h 2s Ad Kc 9c').score);
  });
});

describe('pots laterals', () => {
  it('reparteix correctament', () => {
    const mk = (id: string, committed: number, folded = false) => ({ id, committed, folded, inHand: true }) as Player;
    const pots = buildPots([mk('a', 100), mk('b', 300), mk('c', 300), mk('d', 50, true)]);
    expect(pots).toEqual([
      { amount: 350, eligible: ['a', 'b', 'c'] },
      { amount: 400, eligible: ['b', 'c'] },
    ]);
  });
});

describe('flux de la mà', () => {
  it('cegues, retirada i el pot va al darrer jugador', () => {
    const s = table(3);
    startHand(s);
    expect(s.dealerSeat).toBe(0);
    expect(getPlayer(s, 'p1')!.bet).toBe(5);
    expect(getPlayer(s, 'p2')!.bet).toBe(10);
    expect(s.toAct).toBe('p0');
    expect(act(s, 'p0', { type: 'fold' })).toBeNull();
    expect(act(s, 'p1', { type: 'fold' })).toBeNull();
    expect(s.phase).toBe('showdown');
    expect(getPlayer(s, 'p2')!.stack).toBe(1005);
    expect(stacksTotal(s)).toBe(3000);
  });

  it('la cega gran té opció i es juga fins al river', () => {
    const s = table(3);
    startHand(s);
    act(s, 'p0', { type: 'call' });
    act(s, 'p1', { type: 'call' });
    expect(s.toAct).toBe('p2');
    expect(legalActions(s, 'p2').canCheck).toBe(true);
    act(s, 'p2', { type: 'check' });
    expect(s.phase).toBe('flop');
    expect(s.board.length).toBe(3);
    expect(s.toAct).toBe('p1');
    for (const street of ['turn', 'river', 'showdown']) {
      act(s, 'p1', { type: 'check' });
      act(s, 'p2', { type: 'check' });
      act(s, 'p0', { type: 'check' });
      expect(s.phase).toBe(street);
    }
    expect(stacksTotal(s)).toBe(3000);
    expect(s.winners.length).toBeGreaterThan(0);
  });

  it('heads-up: el botó és cega petita i parla primer', () => {
    const s = table(2);
    startHand(s);
    expect(s.sbSeat).toBe(s.dealerSeat);
    expect(s.toAct).toBe('p' + s.dealerSeat);
  });

  it('pujada mínima i all-in amb run-out', () => {
    const s = table(3, [1000, 200, 1000]);
    startHand(s);
    expect(act(s, 'p0', { type: 'raise', amount: 15 })).not.toBeNull();
    expect(act(s, 'p0', { type: 'raise', amount: 30 })).toBeNull();
    expect(legalActions(s, 'p1').minRaiseTo).toBe(50);
    act(s, 'p1', { type: 'allin' });
    act(s, 'p2', { type: 'fold' });
    expect(s.toAct).toBe('p0');
    act(s, 'p0', { type: 'call' });
    expect(s.phase).toBe('showdown');
    expect(s.board.length).toBe(5);
    expect(stacksTotal(s)).toBe(2200);
  });

  it('un all-in curt no reobre la pujada', () => {
    const s = table(3, [1000, 1000, 125]);
    startHand(s); // p0 botó, p1 CP, p2 CG(125)
    act(s, 'p0', { type: 'raise', amount: 100 });
    act(s, 'p1', { type: 'call' });
    act(s, 'p2', { type: 'allin' }); // 125: pujada de 25 < 90
    expect(s.toAct).toBe('p0');
    expect(legalActions(s, 'p0').canRaise).toBe(false);
    expect(legalActions(s, 'p0').toCall).toBe(25);
    act(s, 'p0', { type: 'call' });
    act(s, 'p1', { type: 'call' });
    expect(s.phase).toBe('flop');
    expect(chips(s)).toBe(2125);
  });

  it('un jugador que marxa a mitja mà es retira', () => {
    const s = table(3);
    startHand(s);
    removePlayer(s, 'p1');
    expect(getPlayer(s, 'p1')!.folded).toBe(true);
    act(s, 'p0', { type: 'fold' });
    expect(s.phase).toBe('showdown');
    startHand(s);
    expect(getPlayer(s, 'p1')).toBeUndefined();
    expect(s.departed[0].name).toBe('P1');
  });

  it('les fitxes es conserven en moltes mans aleatòries', () => {
    const s = table(6, [500, 800, 1000, 300, 1200, 50]);
    const total = stacksTotal(s);
    for (let h = 0; h < 300 && startHand(s); h++) {
      let guard = 0;
      while (s.toAct && guard++ < 200) {
        const L = legalActions(s, s.toAct);
        const r = Math.random();
        if (r < 0.15) act(s, s.toAct, { type: 'fold' });
        else if (r < 0.3 && L.canRaise) act(s, s.toAct, { type: 'raise', amount: L.minRaiseTo + Math.floor(Math.random() * 100) });
        else if (r < 0.35) act(s, s.toAct, { type: 'allin' });
        else act(s, s.toAct, { type: 'call' });
      }
      expect(s.phase).toBe('showdown');
      expect(stacksTotal(s)).toBe(total);
    }
  });
});
