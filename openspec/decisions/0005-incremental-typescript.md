# ADR-0005: Incremental TypeScript migration

Status: accepted
Date: 2026-11-09
Related: ADR-0004, ADR-0006

## Context

Parametrica is a Vite application with 186 JavaScript source files and about
41,500 lines of runtime code. The Node test suite imports the core directly
(`test/lab.smoke.mjs`, `test/domains/`), Playwright covers the browser, and the
existing architecture already has strong pure modules: math, sampling,
analysis, geometry contracts and fabrication contracts.

Moving to TypeScript in one change would be a flag-day rewrite across the
engine, UI, workers, tests and build. That would make behavior parity almost
impossible to prove, especially for geometry, SVG/STL/3MF bytes and the
fabrication worker.

The project also has no `tsconfig`, no typecheck gate and no typed ports. The
first goal is not “all files are `.ts`”; it is **types where they protect a
boundary, with a green build at every step**.

## Decision

Adopt an **incremental, domain-first TypeScript migration**.

### Tooling

- `typescript` and `tsx` as dev dependencies.
- `tsconfig.json` with:
  - `strict: true` for every `.ts` file;
  - `allowJs: true` during migration;
  - `checkJs: false` until the JS surface is small enough to flip;
  - `noEmit: true` (Vite handles the runtime build);
  - `moduleResolution: "Bundler"` and `target: "ES2022"`.
- Vite compiles `.ts` natively; no second bundler and no emitted `dist` change.
- Tests continue to run with `tsx test/lab.smoke.mjs` and the domain runner, so
  `.mjs` tests can import `.ts` modules during the transition.
- The current custom test runner stays; no Vitest/Jest migration is part of this
  decision.

### Migration order

1. **Phase 0 — foundation**
   - Add `tsconfig`, `typecheck` script and CI gate.
   - Add a typecheckable declaration file for `__APP_VERSION__` and Vite env.
   - No runtime behavior change.
2. **Phase 1 — domain**
   - Convert `math`, `sampling`, `analysis`, `geometry/contracts`,
     `domain/units` and the pure document primitives.
   - Define ports as TypeScript interfaces where ADR-0004 introduces them.
   - Keep tests `.mjs` importing the converted modules through `tsx`.
3. **Phase 2 — application**
   - Convert use cases, document/evaluation orchestration, notebook and
     persistence services.
   - Type DTOs at the ports; do not leak DOM, p5, Three or localStorage types
     inward.
4. **Phase 3 — adapters**
   - Convert export (SVG/STL/3MF), storage, worker, render and UI adapters.
   - UI component props and view models are typed at the boundary.
5. **Phase 4 — closure**
   - Flip `allowJs: false`.
   - Enable `checkJs` only if any `.js` remains and it earns its place.
   - Remove the `tsx` test loader only when Node can run the suite natively.

### Typing rules

- No new `any`. Use `unknown`, narrow at the boundary, then construct a domain
  type.
- `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are enabled for new TS.
- Runtime data from localStorage, files, workers and external providers is
  `unknown` until validated by a domain sanitizer.
- Geometry/mesh types are nominal enough to distinguish `Mesh`, `Solid`,
  `Surface` and `Curve` at compile time where practical.
- No TypeScript-only abstraction that duplicates a runtime contract; the
  existing JSON document remains the source of truth.
- `// @ts-expect-error` requires a comment naming the migration task and must be
  removed before Phase 4.

### Behavior parity

- Every phase is a vertical, behavior-preserving slice.
- `npm run check` and `npm run test:e2e` stay green after every phase.
- Export bytes, document round-trip, render output and fabrication reports are
  compared before/after each conversion.
- A phase may not change the document format or the public app behavior.

### Non-goals

- A big-bang rewrite.
- Replacing Vite, Playwright or the custom Node runner.
- Adding decorators, dependency-injection frameworks or a class hierarchy.
- Typing third-party internals beyond the public API we use.

## Consequences

- The repository will temporarily mix `.js` and `.ts`.
- CI gains a `tsc --noEmit` step and a slightly slower Node test startup through
  `tsx`.
- Type errors will expose boundary violations that ADR-0004 must fix; this is a
  feature, not a reason to widen types.
- The domain becomes the most strongly typed part first, which is where
  geometry and fabrication correctness matter most.
- Completion is measured by `allowJs: false` and a clean strict typecheck, not
  by renaming files.

## Alternatives considered

### Big-bang TypeScript rewrite

Rejected. The blast radius includes 41,500 lines, 125 specs, workers, WASM,
renderers and byte-level export tests. Parity would be unprovable.

### JSDoc + `checkJs` only

Rejected as the end state. It improves safety with no build change, but it does
not give the project typed ports, discriminated unions or a migration path to
strict domain types. It remains a useful interim option for files not yet
converted.

### `any`-first migration, tighten later

Rejected. It produces typed-looking code with no boundary protection and hides
the exact issues the migration is meant to expose.

### Replace the Node suite with Vitest

Rejected for this decision. The current runner is small, deterministic and
already covers the engine. A test-runner migration is a separate decision with
its own risk.
