## Why

After the TypeScript closure, every runtime module under `src/` is `.ts`, but
the ESLint flat config only targets `src/**/*.js`. That glob now matches
nothing, so `npm run lint` covers tests, scripts, e2e and config files but not
the 219 modules that ship.

`typescript-eslint` cannot be used: TypeScript 7 is the native compiler and
does not expose the JavaScript compiler API (`createSourceFile` is absent), so
the parser has nothing to bind to. Oxlint parses TypeScript independently.

## What Changes

- Add `oxlint` and lint `src/**/*.ts` in the existing `npm run lint` step.
- Mirror the current unused/empty/constant policy in `.oxlintrc.json`.
- Fix any findings the new coverage exposes.
- Keep type checking in `tsc --noEmit`; oxlint is not type-aware.
- Remove the dead `src/**/*.js` ESLint block.

## Out of Scope

- Replacing ESLint for tests, scripts, e2e and config files.
- Type-aware lint rules.
- Reformatting the source or changing behavior.
