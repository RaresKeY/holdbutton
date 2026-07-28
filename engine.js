/**
 * Fixed-timestep game engine for Hold the Line.
 *
 * A round samples a hidden exponential hazard budget once. Every fixed tick
 * adds hazard according to a rising, noisy heat process. Crossing the budget
 * causes a bust. This is mathematically equivalent to making the corresponding
 * conditional random roll each tick, while remaining deterministic for a
 * given seed and independent of rendering frame rate.
 */

export const DEFAULT_CONFIG = Object.freeze({
  tickMs: 80,
  startingCredits: 1000,
  minStake: 10,
  maxStake: 250,
  maxMultiplier: 8,
  baseHazardProbability: 0.0035,
  heatHazardProbability: 0.05,
  maxTickHazardProbability: 0.055,
  heatRampTicks: 70,
  warningNoise: 0.16,
});

const UINT32_RANGE = 4_294_967_296;
const MIN_UNIFORM = Number.EPSILON;
const MAX_UNIFORM = 1 - Number.EPSILON;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundCredits(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function requireFinite(name, value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite`);
  }
}

function validateConfig(config) {
  for (const [name, value] of Object.entries(config)) {
    requireFinite(name, value);
  }
  if (config.tickMs <= 0) {
    throw new RangeError("tickMs must be positive");
  }
  if (config.minStake <= 0 || config.maxStake < config.minStake) {
    throw new RangeError("stake bounds are invalid");
  }
  if (config.maxMultiplier <= 1) {
    throw new RangeError("maxMultiplier must exceed 1");
  }
  if (
    config.baseHazardProbability < 0 ||
    config.heatHazardProbability < 0 ||
    config.maxTickHazardProbability <= 0 ||
    config.maxTickHazardProbability >= 1
  ) {
    throw new RangeError("hazard probabilities are invalid");
  }
  if (config.heatRampTicks <= 0) {
    throw new RangeError("heatRampTicks must be positive");
  }
  if (config.warningNoise < 0) {
    throw new RangeError("warningNoise must be non-negative");
  }
}

export function mergeConfig(overrides = {}) {
  const unknown = Object.keys(overrides).filter(
    (name) => !(name in DEFAULT_CONFIG),
  );
  if (unknown.length > 0) {
    throw new TypeError(`unknown configuration: ${unknown.join(", ")}`);
  }
  const config = Object.freeze({ ...DEFAULT_CONFIG, ...overrides });
  validateConfig(config);
  return config;
}

export function createSeededRandom(seed) {
  requireFinite("seed", seed);
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function sampleBustBudget(uniform) {
  requireFinite("bust uniform", uniform);
  if (uniform < 0 || uniform >= 1) {
    throw new RangeError("bust uniform must be in [0, 1)");
  }
  return -Math.log1p(-clamp(uniform, MIN_UNIFORM, MAX_UNIFORM));
}

export class HoldRound {
  #random;
  #bustBudget;
  #config;

  constructor({ stake, seed, bustUniform, config = {} }) {
    requireFinite("stake", stake);
    if (stake <= 0) {
      throw new RangeError("stake must be positive");
    }

    this.#config = mergeConfig(config);
    if (stake < this.#config.minStake || stake > this.#config.maxStake) {
      throw new RangeError(
        `stake must be between ${this.#config.minStake} and ${this.#config.maxStake}`,
      );
    }

    this.#random = createSeededRandom(seed);
    this.#bustBudget = sampleBustBudget(bustUniform);

    this.stake = roundCredits(stake);
    this.tick = 0;
    this.status = "active";
    this.heat = 0.06;
    this.warningSignal = 0.06;
    this.tickHazardProbability = 0;
    this.cumulativeHazard = 0;
    this.survivalProbability = 1;
    this.multiplier = 1;
    this.payout = 0;
  }

  step() {
    if (this.status !== "active") {
      return this.snapshot();
    }

    this.tick += 1;
    const progress = clamp(this.tick / this.#config.heatRampTicks, 0, 1);
    const gust = (this.#random() - 0.5) * 0.34;
    const targetHeat = clamp(0.08 + 0.92 * progress ** 1.2 + gust, 0, 1);
    this.heat = clamp(this.heat * 0.72 + targetHeat * 0.28, 0, 1);

    const warningError = (this.#random() - 0.5) *
      this.#config.warningNoise;
    this.warningSignal = clamp(this.heat + warningError, 0, 1);

    this.tickHazardProbability = clamp(
      this.#config.baseHazardProbability +
        this.#config.heatHazardProbability * this.heat ** 2,
      0,
      this.#config.maxTickHazardProbability,
    );
    this.cumulativeHazard += -Math.log1p(-this.tickHazardProbability);
    this.survivalProbability = Math.exp(-this.cumulativeHazard);
    this.multiplier = Math.min(
      this.#config.maxMultiplier,
      Math.exp(this.cumulativeHazard),
    );

    if (this.cumulativeHazard >= this.#bustBudget) {
      this.status = "busted";
      this.payout = 0;
    } else if (this.multiplier >= this.#config.maxMultiplier) {
      this.status = "maxed";
      this.payout = roundCredits(this.stake * this.multiplier);
    }

    return this.snapshot();
  }

  cashOut() {
    if (this.status !== "active") {
      return this.snapshot();
    }
    this.status = "cashed";
    this.payout = roundCredits(this.stake * this.multiplier);
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      tick: this.tick,
      elapsedMs: this.tick * this.#config.tickMs,
      stake: this.stake,
      status: this.status,
      heat: this.heat,
      warningSignal: this.warningSignal,
      tickHazardProbability: this.tickHazardProbability,
      cumulativeHazard: this.cumulativeHazard,
      survivalProbability: this.survivalProbability,
      multiplier: this.multiplier,
      payout: this.payout,
    });
  }
}
