## ADDED Requirements

### Requirement: TypeScript lint coverage

`npm run lint` SHALL check every TypeScript module under `src/`.

#### Scenario: Source lint

- **WHEN** `npm run lint` runs
- **THEN** it parses `src/**/*.ts` with a TypeScript-capable linter
- **AND** a new TypeScript file is linted without extra configuration

#### Scenario: Unused symbols

- **WHEN** a TypeScript module declares an unused variable or import
- **THEN** lint fails
- **AND** underscore-prefixed names remain allowed

#### Scenario: Type gate boundary

- **WHEN** lint passes
- **THEN** `tsc --noEmit` still runs as the separate type gate
- **AND** lint does not require the TypeScript compiler API
