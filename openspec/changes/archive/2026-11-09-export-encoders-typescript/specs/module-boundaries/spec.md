## ADDED Requirements

### Requirement: Typed export encoders

The ZIP, GIF, STL and 3MF encoders SHALL be strict TypeScript.

#### Scenario: Frame archive

- **WHEN** PNG frames and a manifest are packed into a ZIP
- **THEN** entries and byte buffers are typed
- **AND** the archive layout is unchanged

#### Scenario: Animated export

- **WHEN** timeline frames are encoded as GIF
- **THEN** frame dimensions, RGBA data, palette and delay are typed
- **AND** the frame cap and palette sampling are unchanged

#### Scenario: Fabrication export

- **WHEN** a validated Mesh/Solid is exported as binary STL or 3MF
- **THEN** geometry, validation, scale and output bytes are typed
- **AND** facet order, XML ordering and triangulation are unchanged

### Requirement: Typed export contract

The shared fabrication export validation contract SHALL be strict TypeScript.

#### Scenario: Validation

- **WHEN** an exporter validates geometry
- **THEN** errors, warnings and metadata are typed
- **AND** unsupported inputs keep the same rejection message

### Requirement: Export compatibility

The old `export/zip.js`, `export/gif.js`, `export/stl.js`, `export/3mf.js` and
`export/geometryExport.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** Exporter, timeline, tests or presets import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
