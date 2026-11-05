# surface-compatibility Specification

## Purpose
Keep existing curve documents and presets valid when surfaces are added.
## Requirements
### Requirement: Curve compatibility

Adding surfaces SHALL NOT change existing curve documents or presets.

#### Scenario: Existing document

- **WHEN** a v3 curve document is loaded
- **THEN** generator, operators, layers, styles and animation are unchanged
- **AND** no surface fields are required

#### Scenario: Existing presets

- **WHEN** built-in curve presets are applied
- **THEN** their geometry and rendering remain valid

### Requirement: Mixed layers

Layers SHALL be able to contain either curve geometry or surface geometry
without changing the document format.

#### Scenario: Surface layer

- **WHEN** a layer's generator produces Surface geometry
- **THEN** the layer can render surface items
- **AND** other layers can remain curve-only

#### Scenario: Styles

- **WHEN** a surface layer has fill/stroke styles
- **THEN** the styles apply to surface fill/wireframe
- **AND** curve layer styles remain unchanged

### Requirement: Persistence

Surface geometry SHALL be derived and SHALL NOT be persisted.

#### Scenario: Preset save

- **WHEN** a surface document is saved as a preset
- **THEN** only the document intent is stored
- **AND** no tessellated mesh is serialized

#### Scenario: Notebook

- **WHEN** a surface creation is saved as a checkpoint
- **THEN** the document is stored
- **AND** the thumbnail is generated from the rendered surface
