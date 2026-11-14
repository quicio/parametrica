## Module paths

TypeScript already uses `moduleResolution: "Bundler"` with
`allowImportingTsExtensions` and `noEmit`. Vite and `tsx` both resolve explicit
`.ts` extensions, so the source graph can name the real file.

## Cross-layer re-exports

Seven modules exist only to keep an adapter path pointing at domain policy:
`core/units`, `geometry/manufacturingProfile`, `interaction/ray`,
`interaction/surfacePicker`, `render/lookPresets`, `render/passStyle` and
`render/scene`. They become tiny `.ts` re-exports; the architecture test keeps
checking them.

## Gate

`test/domains/architecture-boundaries.test.mjs` scans `src/` and fails when any
`.js` file appears. This is stronger than `allowJs: false` alone, which would
silently ignore a reintroduced shim instead of failing.

## Risk

The only runtime-specific edge is `new Worker(new URL(...))`; Vite supports the
`.ts` form. The e2e fabrication-worker suite is the acceptance check.
