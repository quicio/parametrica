## Domain modules

| Module | Owns | Old path |
|---|---|---|
| `domain/units.js` | Physical unit metadata and conversions | `core/units.js` |
| `domain/overlays.js` | Overlay ids and labels | `viz/overlays.js` |
| `domain/passStyle.js` | Per-pass appearance policy and sanitization | `render/passStyle.js` |
| `domain/fabrication.js` | Cap strategy constants | `geometry/repair.js` |
| `domain/manufacturingProfile.js` | Manufacturing profile defaults, sanitization and report | `geometry/manufacturingProfile.js` |

The old paths remain as compatibility re-exports so tests and external imports
keep working. New inner code imports `domain/` directly.

## Dependency changes

- `core/document.js` no longer imports `render/passStyle`, `viz/overlays`,
  `geometry/repair` or `geometry/manufacturingProfile`.
- `generators/helpers.js` and `generators/surfaceLattice.js` import
  `view/camera.js`, not `render/camera3d.js`.
- `geometry/manufacturingProfile.js`, `render/passStyle.js`, `viz/overlays.js`
  and `geometry/repair.js` re-export the domain source.

## Verification

- `test/domains/architecture-boundaries.test.mjs` reads the module text and
  rejects the removed imports.
- All existing Node and Playwright suites must pass unchanged.
