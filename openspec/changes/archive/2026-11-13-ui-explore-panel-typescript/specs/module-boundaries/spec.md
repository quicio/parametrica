## ADDED Requirements

### Requirement: Typed explore panel

The Explore panel SHALL be strict TypeScript.

#### Scenario: Explore

- **WHEN** strips, grids, morphs or scope locks are used
- **THEN** refs, candidates, controls, ports and DOM state are typed
- **AND** candidate generation and adoption are unchanged

### Requirement: Explore compatibility

The old `ui/widgets/ExplorePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** lab-port checks read the typed module
