# Hold the Line Specs Map

`specs/` is committed project memory for current intent and implementation. Read the relevant spec before changing its owning behavior, contract, boundary, source area, or verification flow, and update it with the implementation.

Hold the Line is a build-free, one-button stochastic-game prototype using
fictional browser-local credits. It is separate from the general-purpose
`fun-proxy` model.

## Spec Map

| Spec | Owning sources | Scope | Read when |
|---|---|---|---|
| [`game.md`](game.md) | `index.html`, `styles.css`, `script.js`, `audio.js`, `engine.js`, `tests/` | Game behavior, stochastic and payout equations, warning and audio integrity, static hosting, and verification | Changing mechanics, probabilities, wallet behavior, presentation, generated audio, input, or deployment |

## Maintenance

- Keep specs compact, evidence-based, and current.
- Update this map when a spec is added, moved, split, or removed.
- Keep plans, TODOs, work logs, and merge handoffs outside `specs/`.
- Label planned behavior and open decisions; do not present them as implemented facts.
