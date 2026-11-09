## Domain moves

| Module | Domain path |
|---|---|
| Look presets + applyUserLookToView | `domain/lookPresets.js` |
| Render scene contracts | `domain/scene.js` |
| Ray/artboard math | `domain/interaction/ray.js` |
| Surface picker + validation | `domain/interaction/surfacePicker.js` |
| Mode helpers | `domain/modeToggles.js` |

Old paths remain compatibility re-exports.

## Panel ports

`FORM_PORT`, `LOOK_PORT`, `KEEP_PORT`, `INGEST_PORT`, `ADVISOR_PORT` and
`START_WITH_PORT` join fabrication, render, notebook, preset and lab ports.
Every panel receives only its own contract.

## Control surface

`UI_SURFACE` now contains only the members `Controls` itself uses. The proxy
still rejects unknown access.

## Dependency gate

New rules:

- application → render forbidden;
- application → interaction forbidden;
- UI → composition/App forbidden.

The baseline remains `[]`.
