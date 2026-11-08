# product-render-export Specification

## Purpose
Export the active WebGL/PBR product preview as a PNG presentation artifact
without changing geometry, fabrication validity or the existing technical
export paths.
## Requirements
### Requirement: Product PNG export

The exporter SHALL provide a Product preview PNG action.

#### Scenario: Active preview

- **WHEN** Product preview is active and has rendered a body
- **THEN** the action captures the WebGL canvas
- **AND** returns a PNG data URL
- **AND** downloads it with a deterministic filename prefix

#### Scenario: Inactive preview

- **WHEN** Technical preview is active or no Product preview exists
- **THEN** the action returns null
- **AND** reports a clear message
- **AND** no empty file is downloaded

#### Scenario: Presentation only

- **WHEN** the PNG is produced
- **THEN** it is labelled as presentation
- **AND** it is not presented as a printability or slicer guarantee

### Requirement: Export isolation

Product PNG export SHALL NOT change other export paths.

#### Scenario: Existing exports

- **WHEN** the user exports STL, 3MF, SVG, plotter or technical PNG
- **THEN** the existing path and bytes are unchanged
- **AND** geometry, units and the fabrication report are untouched

#### Scenario: State

- **WHEN** Product PNG is captured
- **THEN** the document, mesh and report are not mutated

