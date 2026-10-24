## Purpose

The reliability fixes need a regression gate that covers both the Node
core and the browser UI. The project documentation must describe the
code that actually ships.

## ADDED Requirements

### Requirement: Playwright self-starting server

`playwright.config.js` SHALL define a `webServer` that starts Vite on a
fixed port and SHALL use that origin as `baseURL`.

#### Scenario: e2e runs from a clean checkout

- **WHEN** the developer runs `npm run test:e2e` without starting Vite
- **THEN** Playwright starts the dev server, waits for the URL and runs
  the suite

### Requirement: e2e coverage for the fixed UI surfaces

The e2e suite SHALL exercise:

- applying a Fourier preset and editing a harmonic row;
- toggling a render mode and asserting `view.modes` stays an array;
- entering a syntax-invalid equation and observing the inline error;
- undo after a structural edit (and mutation through the same history path);
- changing the seed and observing a geometry change.

#### Scenario: Fourier preset smoke test

- **WHEN** `applyPreset('Fourier Capsule')` runs
- **THEN** the harmonic editor exists, the document id is `fourier`,
  and `evaluation.errors` is empty

#### Scenario: Viz Modes remains an array

- **WHEN** the user checks a render pass
- **THEN** `Array.isArray(view.modes)` is true
- **AND** the selected id is present

### Requirement: Regression tests in the Node suite

`test/lab.smoke.mjs` SHALL add assertions for:

- document/template isolation;
- seed-aware cache invalidation;
- schema clamping of modulated values;
- keyed generator errors;
- per-stage budget/`peakPoints`;
- lazy analysis timing fields;
- adaptive cap/endpoint and exact uniform counts;
- closure derivation;
- built-in preset name collision.

#### Scenario: Full suite green

- **WHEN** `npm test` runs
- **THEN** every assertion passes

### Requirement: CI pipeline

A GitHub Actions workflow SHALL run on push and pull request:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`

#### Scenario: Broken UI is caught

- **WHEN** a commit reintroduces the HarmonicsEditor API mismatch
- **THEN** the e2e step fails

### Requirement: Documentation matches code

`README.md` and `SPEC.md` SHALL report the actual number of registered
generators, operators and render passes, and the actual checks reported
by `npm test`. The SPEC milestone table SHALL mark shipped items as
done. `docs/architecture.md` SHALL mention lazy analysis and
per-stage budgets.

#### Scenario: Counts are generated from the registries

- **WHEN** docs are updated
- **THEN** the stated generator/operator/pass counts equal
  `Generators.list().length`, `Operators.list().length` and
  `RenderPasses.list().length`
