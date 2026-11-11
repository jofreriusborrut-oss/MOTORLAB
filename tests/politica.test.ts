import { COUNTRIES } from '../src/data/countries';
import { newGame } from '../src/engine/init';
import { tick } from '../src/engine/sim';
import { chooseEvent, dismissModal } from '../src/engine/actions';
import type { Game } from '../src/engine/types';

function run(g: Game, months: number) {
  for (let i = 0; i < months; i++) {
    while (g.modalQueue.length) g = g.modalQueue[0].event ? chooseEvent(g, Math.floor(Math.random() * g.modalQueue[0].event!.choices.length)).g : dismissModal(g);
    g = tick(g);
  }
  return g;
}

const finite = (g: Game) => {
  const nums = [g.gdp, g.pop, g.growth, g.unemp, g.infl, g.debt, g.rate, g.approval, g.unrest, g.pc, ...Object.values(g.slow), ...Object.values(g.groups).map((x) => x.aff)];
  return nums.every((v) => Number.isFinite(v));
};

describe('simulador polític', () => {
  for (const c of COUNTRIES) {
    it(`${c.name}: 20 anys sense NaN i valors raonables`, () => {
      let g = newGame({ countryId: c.id, playerName: 'Test', partyId: c.parties[0].id, mode: 'govern' });
      expect(finite(g)).toBe(true);
      const rev0 = g.lastRev, sp0 = g.lastSpend;
      g = run(g, 240);
      expect(finite(g)).toBe(true);
      expect(g.unemp).toBeGreaterThan(0);
      expect(g.unemp).toBeLessThan(51);
      const h = g.history;
      if ((globalThis as any).process?.env?.VERBOSE) console.log(`${c.name.padEnd(16)} rev0 ${rev0.toFixed(1)}/${c.rev} sp0 ${sp0.toFixed(1)}/${c.spend} | 20a: gdp x${(g.gdp / c.gdp).toFixed(2)} u ${g.unemp.toFixed(1)} inf ${g.infl.toFixed(1)} deute ${h[h.length - 1].debt.toFixed(0)} apr ${g.approval.toFixed(0)} unrest ${g.unrest.toFixed(0)} soc ${h[0].society.toFixed(0)}→${h[h.length - 1].society.toFixed(0)} inPower ${g.inPower} el ${g.stats.elections}`);
    });
  }
  it('els escons inicials sumen el total', () => {
    for (const c of COUNTRIES) {
      const g = newGame({ countryId: c.id, playerName: 'T', partyId: c.parties[1].id, mode: 'oposicio' });
      expect(g.parties.reduce((a, p) => a + p.seats, 0)).toBe(c.seats);
      expect(g.inPower).toBe(false);
    }
  });
});

import { approveBudget, callReferendum, diplo, oppAction, proposeLaw } from '../src/engine/actions';
import { regimeLabel } from '../src/engine/model';

describe('accions del jugador', () => {
  it('aprovar una llei, uns pressupostos i un referèndum de bandera', () => {
    let g = newGame({ countryId: '724', playerName: 'T', partyId: 'PSP', mode: 'govern' });
    g.pc = 200;
    const r = proposeLaw(g, 'jornada', 2, true);
    expect(r.ok).toBe(true);
    g = r.g;
    expect(g.policies.jornada).toBe(2);
    const b = { ...g.budget, educacio: g.budget.educacio + 1 };
    g = approveBudget(g, b, g.taxes, true).g;
    expect(g.budget.educacio).toBeCloseTo(b.educacio);
    g = callReferendum(g, 'bandera', { shape: 'v', colors: ['#000', '#fff', '#f00'] }).g;
    expect(g.referendum).not.toBeNull();
    g = run(g, 4);
    expect(g.referendum).toBeNull();
    expect(g.stats.refs).toBe(1);
  });

  it('una dictadura provoca malestar i sancions', () => {
    let g = newGame({ countryId: '250', playerName: 'T', partyId: 'RC', mode: 'govern' });
    g.pc = 500;
    for (const [pid, idx] of [['eleccions', 2], ['premsa', 2], ['oposicio', 2], ['reunio', 2]] as const) g = proposeLaw(g, pid, idx, true).g;
    expect(regimeLabel(g).level).toBeLessThanOrEqual(1);
    g = run(g, 36);
    expect(g.slow.freedom).toBeLessThan(40);
    expect(Object.values(g.nations).some((n) => n.sanctionsOnUs) || !g.inPower).toBe(true);
  });

  it('declarar una guerra la registra i acaba sense errors', () => {
    let g = newGame({ countryId: '840', playerName: 'T', partyId: 'PLL', mode: 'govern' });
    g.pc = 100;
    g = diplo(g, '862', 'guerra').g;
    expect(g.wars.some((w) => w.a === '840' && w.b === '862')).toBe(true);
    g = run(g, 60);
    expect(Number.isFinite(g.gdp)).toBe(true);
  });

  it('des de l\'oposició es pot fer campanya i moció de censura', () => {
    let g = newGame({ countryId: '724', playerName: 'T', partyId: 'PPC', mode: 'oposicio' });
    g.pc = 200;
    expect(g.inPower).toBe(false);
    g = oppAction(g, 'campanya').g;
    g = oppAction(g, 'pacte', 'VN').g;
    const r = oppAction(g, 'censura');
    expect(typeof r.ok).toBe('boolean');
    g = run(r.g, 60);
    expect(g.stats.elections).toBeGreaterThan(0);
  });
});
