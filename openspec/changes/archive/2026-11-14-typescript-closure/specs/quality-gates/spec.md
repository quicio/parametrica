## ADDED Requirements

### Requirement: No JavaScript source shims

The quality gate SHALL fail when a `.js` file appears under `src/`.

#### Scenario: Shims stay removed

- **WHEN** `npm test` runs the architecture checks
- **THEN** it scans `src/` for `.js` files
- **AND** the suite fails if any is present

#### Scenario: Type gate

- **WHEN** `npm run typecheck` runs
- **THEN** `allowJs` is false and every source module is checked as TypeScript
