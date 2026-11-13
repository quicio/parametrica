## 1. Activation

- [x] 1.1 Align `boundsOf` output with the JS implementation.
- [x] 1.2 Replace `imageTrace.js` with a compatibility re-export.
- [x] 1.3 Run typecheck, Node, build and arch gates.

## 2. Verification

- [x] 2.1 Run the Playwright suite.
- [x] 2.2 Archive and release.

## Acceptance criteria

- Image tracing consumers run the typed module.
- All existing Node and Playwright suites pass.
- No tracing behavior changes.
