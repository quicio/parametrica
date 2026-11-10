## ADDED Requirements

### Requirement: Typed document model

The canonical document, view, layer and style model SHALL be strict
TypeScript.

#### Scenario: Defaults and creation

- **WHEN** a document, view, style, artboard, layer or instance is created
- **THEN** defaults and returned shapes are typed
- **AND** independent objects and frozen templates are unchanged

#### Scenario: Sanitization

- **WHEN** arbitrary persisted input is sanitized
- **THEN** view, camera, artboard, style, layers, operators, animation and
  fabrication settings are typed and narrowed
- **AND** fallbacks, limits and migrations are unchanged

#### Scenario: Layer aliases

- **WHEN** active-layer generator/operators/seed aliases are attached
- **THEN** accessors are typed without changing enumerability
- **AND** canonical `layers` data remains the source of truth

### Requirement: Document compatibility

The old `core/document.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, presets, session, notebook, App, export, fabrication, UI or
  tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
