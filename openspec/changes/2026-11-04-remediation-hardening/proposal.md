## Why

The 2026-11-04 audit found the core healthy but identified structural risks:

- layer IDs use a global counter that can collide with restored session IDs;
- surface generator IDs use `Date.now()`;
- New Document can replace work without confirmation;
- the e2e session fixture is static and drifts with defaults;
- the offline advisor still assumes a generator on the active layer;
- README/SPEC status counts are stale.

## What Changes

- Generate layer and instance IDs against the current document.
- Reserve the layer counter from loaded document IDs.
- Normalize surface IDs deterministically in the engine.
- Ask for confirmation before a manual New Document choice replaces the current
  document.
- Generate the e2e session fixture from code before `test:e2e`.
- Make the offline advisor return safely for instance/no-generator layers.
- Correct current counts/status in README and SPEC.

## Capabilities

### New Capabilities

- `remediation-hardening`: identity, determinism, fixture and advisor safety.

### Modified Capabilities

- `start-with`: manual replacement confirmation.

## Impact

- `src/core/document.js`, `src/application/App.js`
- `src/core/engine.js`, `src/generators/parametricSurface.js`
- `src/ui/StartWithOverlay.js`
- `src/ai/offline.js`
- `package.json`, new `scripts/generate-e2e-session.mjs`
- README/SPEC
- unit/e2e tests

No geometry kinds, render passes, presets, export formats or document version
change.

## Non-goals

- No UI section split.
- No instanced rendering.
- No Phase 5 solid work.
- No rewrite of all TBD spec purposes.
- No new product features.
