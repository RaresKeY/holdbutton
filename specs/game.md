# Hold the Line Game Contract

## Status

The initial playable static-site prototype is implemented by `index.html`,
`styles.css`, `script.js`, and `engine.js`. It uses no third-party runtime
dependencies and no server.

## Behavior

- The wallet begins at 1,000 fictional credits and persists in browser local
  storage when available.
- A player chooses a stake from 10 credits up to the smaller of 250 credits or
  the affordable five-credit increment.
- Pressing the main control deducts the stake and starts a round. Releasing it
  banks the currently settled return.
- The game advances on fixed 80 ms simulation ticks, not render frames.
- Busting pays zero. A release pays `stake × multiplier`.
- Reaching the 8× maximum banks automatically; the maximum never forces a
  final bust.
- Losing page visibility banks an active round. This avoids hidden progression
  while browser animation is throttled.
- Pointer, touch, and Space-key input are supported.
- Only wallet value persists.
- All displayed value is fictional, has no cash value, and is not redeemable.

## Presentation Contract

- The site is a single game surface sized to the current viewport. The document
  does not scroll during normal desktop or mobile play.
- Only live play controls and feedback are visible: wallet, stake, settled
  return, tick risk, cap, reactor, multiplier, warning signal, hold control, and
  result message.
- Marketing copy, explanatory sections, recent-round history, and a footer are
  intentionally absent. Mathematical and safety detail lives in this spec and
  the repository README instead of competing with the interaction.
- On narrow viewports, the reactor remains above a compact wallet/stake panel.
  Secondary readouts collapse before the primary interaction does.

## Random and Payout Contract

At round creation, the engine samples a hidden exponential hazard budget from
a uniform value `U`:

```text
B = -ln(1 - U)
```

Each tick evolves a bounded heat value `hₜ` from elapsed progress plus seeded
noise. Immediate bust probability is:

```text
qₜ = clamp(base + heat_weight × hₜ², 0, tick_cap)
```

The tick consumes cumulative hazard:

```text
ΔHₜ = -ln(1 - qₜ)
Hₜ  = Hₜ₋₁ + ΔHₜ
```

The round busts when `Hₜ ≥ B`. Conditional survival and the uncapped multiplier
are:

```text
Sₜ = exp(-Hₜ)
Mₜ = 1 / Sₜ = exp(Hₜ)
```

Consequently, the multiplier is fair with respect to the modeled conditional
survival process before the 8× cap. This is an experiment design choice, not a
monetary return claim.

Sampling `B` at the start is mathematically equivalent to independently
testing the declared conditional bust probability each tick. It also makes a
round reproducible from its seed and independent of rendering frame rate.

## Warning Signal

The displayed pressure signal is the hidden heat plus bounded observation
noise. Heat drives actual tick hazard, so the signal is imperfect but
informative. The interface must not show arbitrary danger feedback unrelated
to the engine state.

The signal is not a promise that a specific tick is safe. Even a low-pressure
tick retains the declared base hazard.

## Technical and Safety Boundaries

- The repository root is a build-free static-site source.
- No remote scripts, analytics, network calls, or runtime dependencies are
  used.
- Round entropy comes from the browser Web Crypto API. Seeded noise makes the
  heat path reproducible inside one round.
- Random state, hidden budget, wallet state, and outcomes are client-controlled
  and therefore unsuitable for real-money, redeemable-value, competitive, or
  adversarial deployment.
- This prototype explores perceived tension and learnable stochastic signals;
  it does not demonstrate that the interaction is fun without playtesting.

## Verification

Run:

```bash
deno check engine.js script.js
deno test tests/engine_test.js
python -m unittest discover -s tests -p 'test_*.py' -v
```

The Deno tests cover deterministic seeded behavior, inverse-exponential bust
sampling, survival/multiplier correspondence, busting, cash-out, the hard cap,
and configuration validation. The Python site test checks local asset
references, required interaction hooks, and the web manifest. Desktop and
mobile browser renders verify the single-viewport presentation.
