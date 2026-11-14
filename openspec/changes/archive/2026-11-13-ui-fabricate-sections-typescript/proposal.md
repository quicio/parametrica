## Why

Fabricate owns the read-only fabrication gate: scope, preparation, repair,
booleans, output format, product preview, manufacturing minima and checks.

## What Changes

- Convert `ui/sections/fabricateSections.js` to `.ts`.
- Type the fabrication port, settings/view, manufacturing profile and element map.
- Point the fabrication-port check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Controls.
