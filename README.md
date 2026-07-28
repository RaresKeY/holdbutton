# Hold the Line

A complete, dependency-free, one-button stochastic game using fictional
browser-local credits.

[Play Hold the Line](https://holdbutton.web.app)

Choose a stake, press and hold while the multiplier and pressure rise, then
release to bank before the circuit busts. The visible warning is noisy but
correlated with the actual tick hazard. A generated electrical soundscape
tracks the same state without loading prerecorded audio.

The deployed experience is deliberately game-only: one responsive viewport,
compact score history inside the control panel, no landing-page copy, and no
scrolling.

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
deno check audio.js engine.js script.js
deno test tests/audio_test.js tests/engine_test.js
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Hosting

The game is deployed at [holdbutton.web.app](https://holdbutton.web.app).
Firebase Hosting serves the repository root using the committed `firebase.json`
configuration. No build command or environment variable is required.

Hold the Line is a self-contained game for fun. Credits are simply its
scorekeeping resource: they have no value outside the game, and there are no
purchases, prizes, accounts, or withdrawals.

See [`specs/game.md`](specs/game.md) for the mathematical and behavioral
contract.
