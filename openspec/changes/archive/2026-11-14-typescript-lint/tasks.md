## 1. Config

- [x] 1.1 Add oxlint and lint `src/**/*.ts`.
- [x] 1.2 Mirror the unused/empty policy in `.oxlintrc.json`.
- [x] 1.3 Remove the dead `src/**/*.js` ESLint block.

## 2. Findings

- [x] 2.1 Run oxlint over the TypeScript source.
- [x] 2.2 Fix or explicitly document each remaining finding.

## 3. Verification

- [x] 3.1 Run lint, Node, build, typecheck and arch gates.
- [x] 3.2 Archive and release.

## Acceptance criteria

- `npm run lint` inspects every `.ts` file under `src/`.
- No source behavior, type or bundle change.
- `npm run check` stays green.
