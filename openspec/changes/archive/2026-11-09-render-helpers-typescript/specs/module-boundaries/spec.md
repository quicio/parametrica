## ADDED Requirements

### Requirement: Typed render helpers

The shared render helpers SHALL be strict TypeScript.

#### Scenario: Projection and fill

- **WHEN** curves are projected for orthographic views or filled
- **THEN** points, projections, fills, gradients and contexts are typed
- **AND** projected coordinates and paint output are unchanged

#### Scenario: Reference and thumbnails

- **WHEN** spatial reference geometry or exploration thumbnails are drawn
- **THEN** their contexts, options and bounds are typed
- **AND** output is unchanged

#### Scenario: Trace fill

- **WHEN** image-derived layers share a trace group
- **THEN** grouped layers, fills, curves and bounds are typed
- **AND** even-odd fill behavior is unchanged

### Requirement: Typed render stores

The palette and look stores SHALL be strict TypeScript.

#### Scenario: Palettes

- **WHEN** built-in or custom palettes are listed, saved or deleted
- **THEN** palette records and storage errors are typed
- **AND** the stored format is unchanged

#### Scenario: Looks

- **WHEN** user looks are sanitized, listed, saved or removed
- **THEN** look records and save results are typed
- **AND** the stored format is unchanged

### Requirement: Renderer contract

The renderer backend contract SHALL be strict TypeScript.

#### Scenario: Backend

- **WHEN** a renderer mounts, resizes, renders, captures or is destroyed
- **THEN** the contract methods are typed
- **AND** concrete adapters keep their behavior

### Requirement: Render compatibility

The old `render/*.js` paths for the converted helpers SHALL keep resolving.

#### Scenario: Import

- **WHEN** adapters, passes, presets or UI import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
