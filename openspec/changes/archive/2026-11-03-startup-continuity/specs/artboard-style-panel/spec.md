## ADDED Requirements

### Requirement: Default stroke width

New documents SHALL use a stroke width of 1.

#### Scenario: New document

- **WHEN** a document is created without an explicit stroke width
- **THEN** `view.style.stroke.width` and the legacy `view.strokeWeight` are 1

#### Scenario: Stored width

- **WHEN** an existing document stores a different stroke width
- **THEN** that width is preserved

#### Scenario: Export fallback

- **WHEN** an export receives no explicit stroke width
- **THEN** it uses 1
