# ADR-0006: Architecture and type gates in CI

Status: accepted
Date: 2026-11-09
Related: ADR-0004, ADR-0005, `openspec/specs/quality-gates/spec.md`

## Context

The dependency rule and the TypeScript migration only hold if they are checked
mechanically. A folder called `domain/` proves nothing; an `import` from
`domain` to `render` is the actual violation.

The project already runs `npm run check` on every push. It combines lint, Node
suites, build, lazy-chunk guard, spec-purpose checks and version/changelog. The
natural place for architecture and type gates is that same command.

## Decision

Add two mechanical gates to the existing quality gate:

1. **Type gate** — `tsc --noEmit` with the ADR-0005 config.
2. **Dependency gate** — `dependency-cruiser` with explicit layer rules.

Both run inside `npm run check`, so CI and local verification use the same
definition of green.

### Dependency rules

The initial dependency-cruiser configuration should encode:

| From | Forbidden to | Reason |
|---|---|---|
| `domain` | `application`, `adapters`, `composition`, `render`, `export`, `ui`, `workers`, `presets`, `lab`, `app` | Domain is the innermost layer. |
| `application` | `ui`, `composition`, concrete `render`, concrete `export`, concrete `storage`, `workers` | Application depends on ports, not adapters. |
| `adapters` / `render` / `export` / `ui` / `lab` / `presets` / `workers` | `composition`, `App.js`, DI container | Only the composition root chooses concrete implementations. |
| any | a known cycle | Cycles break independent reasoning and testing. |
| `domain` | DOM/Node globals at import time | Domain must load headlessly. |

Allowed exceptions are explicit and timeboxed in the dependency-cruiser
`allowed` list with the ADR/phase that removes them.

### Baseline strategy

The current code has known outward edges (ADR-0004). A gate that fails
immediately on 20 existing violations will be disabled or ignored. Therefore:

- Start with a **baseline file** listing the current violations as
  `known: true`, each with the phase that removes it.
- New violations fail immediately.
- The baseline only shrinks; adding an entry requires an ADR exception.
- Phase completion requires the relevant baseline entries to be deleted.
- The final state has an empty baseline.

### Type gate rules

- `tsc --noEmit` runs over all `.ts` files and any `.d.ts` declarations.
- New TS must be `strict`.
- `allowJs: true` keeps the unconverted JS in the build; it does not let new
  untyped files bypass the gate.
- Conversion PRs/slices must delete their `@ts-expect-error` entries.
- The final gate runs with `allowJs: false`.

### CI integration

`package.json` gains:

```json
{
  "typecheck": "tsc --noEmit",
  "arch:check": "depcruise --config dependency-cruiser.cjs src",
  "check": "npm run lint && npm test && npm run build && npm run check:bundle && npm run check:specs && npm run check:version && npm run typecheck && npm run arch:check"
}
```

`npm run check` remains the single local/CI gate. The GitHub workflow does not
need a second architecture matrix.

### Review expectations

An architecture-sensitive change reports:

- the layer(s) touched;
- new/changed ports;
- dependency-cruiser result;
- typecheck result;
- why any new exception exists and when it is removed.

## Consequences

- `npm run check` becomes slower by a few seconds but catches boundary drift
  before review.
- The baseline makes the first adoption non-blocking without hiding debt.
- Contributors must edit the baseline deliberately when adding an exception;
  silent new violations fail.
- The migration has a visible completion metric: empty dependency baseline and
  `allowJs: false`.
- The gate is tool-agnostic in spirit; dependency-cruiser is the chosen
  implementation, not a product dependency.

## Alternatives considered

### Rely on ESLint `no-restricted-imports`

Rejected as the primary gate. It can catch specific paths but does not model
layers, allowed exceptions, cycles or a shrinking baseline as clearly.

### Rely on `tsc` alone

Rejected. TypeScript checks types, not dependency direction. A typed import from
domain to render is still a violation.

### Add the gate only after the migration

Rejected. The migration is exactly when new violations are most likely. The
baseline approach allows adoption now and improvement over time.

### No baseline, fail immediately

Rejected. The repository would be red on day one, which trains people to ignore
the gate. A timeboxed baseline is honest debt, not permission.
