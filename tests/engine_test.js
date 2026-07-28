import {
  createSeededRandom,
  HoldRound,
  mergeConfig,
  sampleBustBudget,
} from "../engine.js";

function assert(condition, message = "assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertAlmostEquals(actual, expected, tolerance = 1e-7) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`expected ${expected}, received ${actual}`);
  }
}

function assertThrows(operation, errorType) {
  try {
    operation();
  } catch (error) {
    if (error instanceof errorType) {
      return;
    }
    throw new Error(`expected ${errorType.name}, received ${error}`);
  }
  throw new Error(`expected ${errorType.name} to be thrown`);
}

Deno.test("seeded random sequence is reproducible", () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);

  assertEquals(
    [first(), first(), first()],
    [second(), second(), second()],
  );
});

Deno.test("bust budget is an inverse exponential sample", () => {
  assertAlmostEquals(sampleBustBudget(0.5), Math.log(2));
  assertThrows(() => sampleBustBudget(1), RangeError);
});

Deno.test("identical rounds produce identical public states", () => {
  const options = { stake: 25, seed: 91, bustUniform: 0.999999 };
  const first = new HoldRound(options);
  const second = new HoldRound(options);

  for (let index = 0; index < 20; index += 1) {
    assertEquals(first.step(), second.step());
  }
});

Deno.test("fair multiplier is inverse conditional survival", () => {
  const round = new HoldRound({
    stake: 10,
    seed: 7,
    bustUniform: 0.999999,
  });
  const state = round.step();

  assertEquals(state.status, "active");
  assertAlmostEquals(
    state.multiplier,
    1 / state.survivalProbability,
    1e-12,
  );
});

Deno.test("a tiny hidden budget busts on the first fixed tick", () => {
  const round = new HoldRound({
    stake: 10,
    seed: 3,
    bustUniform: 0,
  });
  const state = round.step();

  assertEquals(state.status, "busted");
  assertEquals(state.payout, 0);
});

Deno.test("cash out pays stake times the settled multiplier", () => {
  const round = new HoldRound({
    stake: 40,
    seed: 12,
    bustUniform: 0.999999,
  });
  round.step();
  const state = round.cashOut();

  assertEquals(state.status, "cashed");
  assertEquals(
    state.payout,
    Math.round(40 * state.multiplier * 100) / 100,
  );
});

Deno.test("the maximum multiplier auto-cashes instead of forcing a bust", () => {
  const round = new HoldRound({
    stake: 10,
    seed: 5,
    bustUniform: 0.999999999,
    config: {
      maxMultiplier: 1.005,
    },
  });

  let state = round.snapshot();
  for (let index = 0; index < 100 && state.status === "active"; index += 1) {
    state = round.step();
  }

  assertEquals(state.status, "maxed");
  assertAlmostEquals(state.multiplier, 1.005);
  assert(state.payout > state.stake);
});

Deno.test("configuration rejects unknown and unsafe values", () => {
  assertThrows(() => mergeConfig({ nope: 1 }), TypeError);
  assertThrows(
    () => mergeConfig({ maxTickHazardProbability: 1 }),
    RangeError,
  );
});
