## ADDED Requirements

### Requirement: Typed evolution panel

The evolution panel SHALL be strict TypeScript.

#### Scenario: Breed

- **WHEN** parents are selected and a generation is bred or kept
- **THEN** checkpoints, children, evaluations and options are typed
- **AND** breeding, previews and keep behavior are unchanged

### Requirement: Evolution compatibility

The old `ui/widgets/EvolutionPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** lab-port checks read the typed module
