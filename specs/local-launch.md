# Local launch entrypoint

## Status and ownership

Implemented by executable root `play.sh`.

## Behavior

Serves `./` with the shared stdlib-only Playpad preview helper, binds only to loopback on a free port, disables caching and opens the browser. The server remains supervised until stopped. `--no-open`, `--port` and `--check` support non-visible checks. Reads current files at request time.

Playpad discovers the root without starting its runtime. Execution occurs only on a launch request. Paths resolve from the script, independently of the caller’s working directory. No remote push, publication, release export or background prewarming is part of this entrypoint.

## Verification

Shell syntax and non-starting help/preflight paths are checked. Runtime availability is separate from a successful game/desktop visual run.
