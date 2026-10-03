#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd -- "$project_root"
if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then printf 'Usage: ./play.sh [--no-open] [--port PORT]
Starts a local preview and opens its page.
'; exit 0; fi
preview="$(dirname -- "$project_root")/playpad/bin/playpad-preview"
[[ -x "$preview" ]] || { echo 'Shared Playpad preview helper is unavailable.' >&2; exit 2; }
served_root="$project_root/."
[[ -f "$served_root/index.html" ]] || { echo "Prepared preview is missing: $served_root/index.html" >&2; exit 2; }
if [[ "${1:-}" == --check ]]; then exit 0; fi
exec "$preview" --root "$served_root" "$@"
