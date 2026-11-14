## Tool

Oxlint is a Rust linter with its own TypeScript parser. It does not import the
TypeScript compiler, so the native TS 7 package is irrelevant. It is fast enough
to run on every `npm run lint`.

## Rules

`.oxlintrc.json` mirrors the existing policy: unused arguments and variables
ignored when prefixed with `_`, empty catch blocks allowed, constant conditions
and useless escapes off. Correctness rules stay on by default.

## Boundary

ESLint keeps covering `.mjs`, `.js` and config files. Oxlint covers only
`src/**/*.ts`. `tsc --noEmit` remains the separate type gate; oxlint does not
duplicate it.

## Failure policy

A finding in any TypeScript module fails `npm run lint`, the same step CI
already runs.
