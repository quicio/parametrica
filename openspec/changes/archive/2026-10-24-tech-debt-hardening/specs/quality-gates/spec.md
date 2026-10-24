## ADDED Requirements

### Requirement: Lint gate

The repository SHALL expose `npm run lint` using ESLint's flat configuration,
and CI SHALL run it before the unit suite.

#### Scenario: Clean lint

- **WHEN** `npm run lint` runs on the repository
- **THEN** it exits 0 with no errors

#### Scenario: CI

- **WHEN** a push or pull request runs the CI workflow
- **THEN** lint, unit tests, build and e2e run in that order

### Requirement: Documentation truth

README, SPEC and architecture inventories SHALL match the registered
generators, presets, render passes and test groups.

#### Scenario: Inventory drift

- **WHEN** a generator, preset or pass is added
- **THEN** the documented counts and lists are updated in the same change
