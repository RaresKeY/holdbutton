# Hold the Line Game Contract

## Status

The complete static-site game is implemented by `index.html`,
`styles.css`, `script.js`, `audio.js`, and `engine.js`. It uses no third-party
runtime dependencies and no server.

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
- Wallet value and the generated-audio preference persist. The five most recent
  score outcomes are session-local and clearing the wallet clears this history.
- All displayed value is fictional, has no cash value, and is not redeemable.

## Presentation Contract

- The site is a single game surface sized to the current viewport. The document
  does not scroll during normal desktop or mobile play.
- Only live play controls and feedback are visible: wallet, stake, settled
  return, tick risk, cap, reactor, multiplier, warning signal, audio toggle,
  hold control, result message, and compact score history.
- Marketing copy, explanatory sections, a separate history column, and a footer
  are intentionally absent. Mathematical and safety detail lives in this spec
  and the repository README instead of competing with the interaction.
- On narrow viewports, the reactor remains above a compact wallet/stake panel.
  Secondary readouts collapse before the primary interaction does, and history
  becomes a three-result horizontal strip.
- Actual heat drives both the overall reactor and central-core scale. Their
  transitions deliberately interpolate across multiple 80 ms simulation ticks
  so the circle reads as accumulating pressure rather than stepping with each
  update. The core has the larger scale range and glow response.

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
survival process before the 8× cap. This is a game design choice, not a
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

## Audio Contract

- Audio is generated locally with oscillators, filters, gain envelopes, and a
  short synthesized noise burst. No prerecorded or remote audio is loaded.
- Sound begins only in response to a player gesture, following browser audio
  policy. The page is silent before interaction.
- During a hold, actual heat raises the drone pitch and gain while the warning
  signal raises filter brightness, pulse speed, and pulse depth. Multiplier
  contributes a smaller pitch lift.
- Cash-out, bust, and maximum-cap outcomes have distinct generated cues.
- Losing page visibility stops audio while the game banks the active round.
- A compact toggle enables or mutes all generated audio. Its preference
  persists locally and defaults to enabled.
- Audio reinforces the same imperfect pressure information as the visual
  warning. It must not imply that any individual tick is guaranteed safe.

## Technical and Safety Boundaries

- The repository root is a build-free static-site source.
- Firebase Hosting serves only the runtime assets from the repository root;
  tests, specs, repository metadata, and deployment configuration are excluded.
- No remote scripts, audio assets, analytics, network calls, or runtime
  dependencies are used.
- Round entropy comes from the browser Web Crypto API. Seeded noise makes the
  heat path reproducible inside one round.
- Random state, hidden budget, wallet state, and outcomes are client-controlled
  and therefore unsuitable for real-money, redeemable-value, competitive, or
  adversarial deployment.
- The game is designed around perceived tension and learnable stochastic
  signals.

## Verification

Run:

```bash
deno check audio.js engine.js script.js
deno test tests/audio_test.js tests/engine_test.js
python -m unittest discover -s tests -p 'test_*.py' -v
```

The Deno tests cover audio-parameter mapping, deterministic seeded behavior,
inverse-exponential bust sampling, survival/multiplier correspondence,
busting, cash-out, the hard cap, and configuration validation. The Python site
test checks local asset references, required interaction hooks, and the web
manifest. Desktop and mobile browser renders verify the single-viewport
presentation.
