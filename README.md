# Hold the Line

A dependency-free, one-button stochastic-game prototype using fictional
browser-local credits.

Choose a stake, press and hold while the multiplier and pressure rise, then
release to bank before the circuit busts. The visible warning is noisy but
correlated with the actual tick hazard.

## Run locally

The browser source is already the deployable artifact. Serve the repository
root so ES modules load normally:

```bash
cd ~/workspace/hold-the-line
python -m http.server 8000
```

Open `http://localhost:8000`.

## Verify

No JavaScript packages or remote modules are used.

```bash
deno check engine.js script.js
deno test tests/engine_test.js
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Hosting

Deploy the repository root as a static site. The required entry point,
stylesheet, ES modules, manifest, and icon are all committed at the root; no
build command or environment variable is required.

This prototype is explicitly limited to virtual credits with no cash value.
Its client-side random process is designed for a local game experiment, not
real-money or adversarial use.

See [`specs/game.md`](specs/game.md) for the mathematical and behavioral
contract.
