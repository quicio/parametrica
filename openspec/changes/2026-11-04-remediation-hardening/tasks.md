## 1. Identity and determinism

- [x] 1.1 Add document-scoped `nextLayerId` and use it for add/instance/duplicate.
- [x] 1.2 Reserve the layer counter from loaded/sanitized IDs.
- [x] 1.3 Normalize Surface IDs deterministically and remove `Date.now()`.
  - Verify: unit tests for restored IDs, unique creation and bypass-cache IDs.

## 2. Safety and tooling

- [x] 2.1 Confirm manual New Document replacement.
- [x] 2.2 Generate `e2e/session-state.json` via a pre-test script.
- [x] 2.3 Make offline advisor safe for instance/no-generator layers.
  - Verify: e2e confirm/cancel, fixture regeneration and advisor unit tests.

## 3. Docs and acceptance

- [x] 3.1 Update README/SPEC current counts and status.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Added layers/instances never collide with restored IDs.
- Surface IDs are identical across bypass-cache evaluations.
- Manual New Document asks before replacing; first run does not.
- `pretest:e2e` writes a stable session fixture.
- Advisor calls on an instance return safely.
- README/SPEC current counts match the gate.
