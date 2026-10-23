import { describe, expect, it } from 'vitest';
import { createRequestBudget, NetError } from '../src/index.js';

function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}

describe('createRequestBudget', () => {
  it('espace les requêtes d’un même hôte d’1 s', async () => {
    const clock = fakeClock();
    const budget = createRequestBudget({ now: clock.now, sleep: clock.sleep });
    await budget.acquire('exemple.fr');
    await budget.acquire('EXEMPLE.fr');
    await budget.acquire('autre.fr');
    expect(clock.sleeps).toEqual([1000]);
    expect(budget.requests).toBe(3);
  });

  it('refuse au-delà de 50 requêtes', async () => {
    const clock = fakeClock();
    const budget = createRequestBudget({ now: clock.now, sleep: clock.sleep });
    for (let i = 0; i < 50; i++) await budget.acquire(`h${i}.fr`);
    await expect(budget.acquire('h.fr')).rejects.toMatchObject({
      code: 'BUDGET_EXCEEDED',
    });
  });

  it('plafonne le volume total à 20 Mo', () => {
    const budget = createRequestBudget();
    budget.consumeBytes(20 * 1024 * 1024);
    expect(() => budget.consumeBytes(1)).toThrow(NetError);
    expect(budget.bytes).toBe(20 * 1024 * 1024 + 1);
  });
});
