## ADDED Requirements

### Requirement: Typed UV domain inset

The UV domain inset SHALL be strict TypeScript.

#### Scenario: Render

- **WHEN** the active surface domain is displayed
- **THEN** summaries, axes, app ports and SVG nodes are typed
- **AND** chart geometry, labels and dataset are unchanged

### Requirement: UV inset compatibility

The old `ui/UVDomainInset.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the canvas imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
