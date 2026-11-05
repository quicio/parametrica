## Why

`Controls.js` (2459 lines), `P5Adapter.js` (919), `style.css` (3812) and
`test/lab.smoke.mjs` (4857) have become hard to navigate. Each new feature adds
conditionals and coupling.

## What Changes

- Split inspector sections into domain modules.
- Extract Quad/coordinate/reference/seam/inspection overlays from P5Adapter.
- Split the Node suite by domain while keeping `npm test` as one command.
- Preserve public exports, UI behavior, rendering and document formats.

## Capabilities

### New Capabilities

- `ui-maintainability`: module boundaries for the inspector and p5 overlays.

### Modified Capabilities

- `module-boundaries`: new UI section modules.
- `quality-gates`: domain test modules and parity gates.

## Impact

- `src/ui/Controls.js`
- `src/render/p5/P5Adapter.js`
- `test/lab.smoke.mjs`
- import-boundary tests and docs
- No user-visible change.

## Non-goals

- No redesign.
- No new feature.
- No state management rewrite.
- No CSS framework or dependency.
