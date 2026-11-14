## 1. Module graph

- [x] 1.1 Rewrite internal `.js` specifiers to `.ts`.
- [x] 1.2 Delete same-name migration shims.
- [x] 1.3 Convert the seven cross-layer re-export shims to `.ts`.
- [x] 1.4 Point the fabrication worker URL at `.ts`.

## 2. Gates and tests

- [x] 2.1 Set `allowJs: false` and remove `checkJs`.
- [x] 2.2 Add a no-`.js` gate under `src/`.
- [x] 2.3 Update Node tests and architecture checks to `.ts`.

## 3. Verification and release

- [x] 3.1 Run typecheck, Node, build, arch and e2e gates.
- [x] 3.2 Update ADR-0005, roadmap and docs.
- [x] 3.3 Archive and release.

## Acceptance criteria

- `src/` contains zero `.js` files.
- `allowJs` is false and `tsc --noEmit` is clean.
- The dependency baseline stays empty.
- Node and Playwright suites pass, including the fabrication worker.
- No product behavior change.
