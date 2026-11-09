## ADDED Requirements

### Requirement: Typed domain slice

Pure domain policy SHALL be strict TypeScript.

#### Scenario: Conversion

- **WHEN** `units`, `overlays`, `fabrication`, `scene`, `passStyle` or
  `modeToggles` is used
- **THEN** the implementation is a `.ts` module
- **AND** unknown input is narrowed at the boundary

#### Scenario: Compatibility

- **WHEN** existing code imports the old `.js` path
- **THEN** a compatibility re-export resolves
- **AND** runtime behavior is unchanged

### Requirement: Typed import strategy

TypeScript domain imports SHALL resolve under Vite, `tsx` and `tsc`.

#### Scenario: Gate

- **WHEN** `npm run check` runs
- **THEN** `tsc --noEmit` passes with `allowImportingTsExtensions`
- **AND** the production build resolves the same modules
