#!/usr/bin/env sh
set -eu

# Tests deliberately use GJS, the extension's production JavaScript runtime.
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"

glib-compile-schemas --strict schemas
gjs -m tests/test-suite.js
