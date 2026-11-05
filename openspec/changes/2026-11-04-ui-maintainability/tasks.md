## 1. Inspector

- [ ] 1.1 Define section module contract and shared helpers.
- [ ] 1.2 Migrate form/look/fabricate/keep sections.
- [ ] 1.3 Keep Controls orchestration and UI state behavior.

## 2. P5 overlays and tests

- [ ] 2.1 Extract Quad and overlay renderers.
- [ ] 2.2 Split Node suite by domain; keep `npm test`.
- [ ] 2.3 Add import-boundary tests.
  - Verify: full unit/e2e parity and unchanged public exports.

## 3. Acceptance

- [ ] 3.1 Document module ownership.
- [ ] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- No user-visible behavior change.
- `npm test` and `npm run test:e2e` remain the public gates.
- `Controls` no longer contains section implementations.
- P5Adapter no longer owns overlay math.
- No new dependency or document change.
