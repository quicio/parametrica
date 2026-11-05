# pass-appearance Specification

## Purpose
Let stroke-bearing render passes carry their own color and width while keeping
existing defaults unchanged.
## Requirements
### Requirement: Per-pass overrides

The document SHALL support optional per-pass color and width.

#### Scenario: Inherit

- **WHEN** no pass override exists
- **THEN** the pass uses the layer stroke color and width

#### Scenario: Override

- **WHEN** a pass declares a color or width
- **THEN** only that pass uses the override
- **AND** other passes and layer style remain unchanged

### Requirement: Validation

Overrides SHALL be sanitized.

#### Scenario: Invalid value

- **WHEN** a color is invalid or width is non-finite/out of range
- **THEN** the override falls back to inherit
- **AND** the document remains valid

### Requirement: Exports

Exports SHALL respect resolved pass appearance.

#### Scenario: SVG

- **WHEN** a stroke-bearing pass has an override
- **THEN** its SVG elements use the resolved color/width

#### Scenario: STL

- **WHEN** STL is exported
- **THEN** pass appearance has no effect

