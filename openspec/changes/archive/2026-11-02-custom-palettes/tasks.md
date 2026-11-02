## 1. Store

- [x] 1.1 Add `PaletteStore` with sanitization, save/replace/delete, cap and
      injected storage.
  - Verify: unit tests for persistence, reload, replace, delete and invalid
    names.

## 2. UI

- [x] 2.1 Add name/save/delete controls and built-in/custom options in Style.
- [x] 2.2 Apply explicit values and keep ramp/metric independence.
  - Verify: e2e save, option, apply, delete and localStorage state.

## 3. Docs and acceptance

- [x] 3.1 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Custom palettes save, reload, apply and delete.
- Built-ins remain immutable.
- Same-name saves replace rather than duplicate.
- Applying writes explicit background/stroke/fill values.
- Ramp and color metric are untouched.
- No document format change.


## Verification results

- `npm run check`: lint, **1697/1697** unit checks and production build pass.
- `npm run test:e2e`: **106/106** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests cover save/reload/replace/delete, storage, built-in protection and
  invalid names.
- E2E covers name/save, custom option, application, delete and localStorage.
- Ramp/metric independence remains unchanged.
