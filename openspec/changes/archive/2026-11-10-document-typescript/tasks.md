## 1. Conversion

- [x] 1.1 Define document/view/layer/style/animation contracts.
- [x] 1.2 Type defaults, view merge and artboard/style sanitization.
- [x] 1.3 Type layer creation, instance layers and aliases.
- [x] 1.4 Type document creation, sanitization and v1 migration.
- [x] 1.5 Type fabrication settings and groups.
- [x] 1.6 Keep compatibility re-exports and update imports/checks.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- The document model and sanitization are strict TypeScript.
- All existing Node and Playwright suites pass.
- No document shape, default, alias or migration behavior changes.
