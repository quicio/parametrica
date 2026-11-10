## 1. Conversion

- [x] 1.1 Declare controller state and lifecycle fields.
- [x] 1.2 Type services, adapters and structural ports.
- [x] 1.3 Type document/evaluation shapes used by the controller.
- [x] 1.4 Type every public method and helper.
- [x] 1.5 Keep the compatibility re-export.
- [x] 1.6 Update the architecture test and dependency rule.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- `application/App` is strict TypeScript with no `any` or `ts-nocheck`.
- All existing Node and Playwright suites pass.
- No controller, session, history or UI behavior changes.
