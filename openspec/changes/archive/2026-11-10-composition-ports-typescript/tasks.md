## 1. Conversion

- [x] 1.1 Add typed port binding helpers.
- [x] 1.2 Convert advisor/fabrication/form/ingest ports.
- [x] 1.3 Convert keep/lab/look/notebook/preset ports.
- [x] 1.4 Convert render/start-with/UI ports.
- [x] 1.5 Add the typed exploreSeed field and renderer capture methods.
- [x] 1.6 Keep compatibility re-exports and update checks.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- Composition ports are strict TypeScript.
- All existing Node and Playwright suites pass.
- No port allow-list, binding or UI access behavior changes.
