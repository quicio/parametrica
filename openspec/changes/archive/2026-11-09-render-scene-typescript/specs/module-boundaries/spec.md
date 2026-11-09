## ADDED Requirements

### Requirement: Typed scene builder

The application render scene builder SHALL be strict TypeScript.

#### Scenario: Scene build

- **WHEN** evaluation, document and view state are converted into a RenderScene
- **THEN** inputs and group results are typed
- **AND** unknown adapter fields are narrowed before use

#### Scenario: Preview

- **WHEN** a prepared fabrication preview replaces the authored scene
- **THEN** the preview path is typed
- **AND** its output matches the existing scene contract

### Requirement: Scene compatibility

The old `application/renderSceneBuilder.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, Exporter, renderers or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
