## ADDED Requirements

### Requirement: Typed look and manufacturing policy

Look and manufacturing policy SHALL be strict TypeScript.

#### Scenario: Look

- **WHEN** a preset is resolved, matched or applied
- **THEN** the module is `domain/lookPresets.ts`
- **AND** view/user-look data is typed at the boundary

#### Scenario: Manufacturing

- **WHEN** a profile is sanitized or a report is built
- **THEN** the module is `domain/manufacturingProfile.ts`
- **AND** checks and report fields are typed

### Requirement: Compatibility during migration

Old JS paths SHALL remain re-exports while consumers migrate.

#### Scenario: Import

- **WHEN** code imports `render/lookPresets` or
  `geometry/manufacturingProfile`
- **THEN** the old path resolves
- **AND** the implementation is the typed domain module
