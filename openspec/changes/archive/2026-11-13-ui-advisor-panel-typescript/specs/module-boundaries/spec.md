## ADDED Requirements

### Requirement: Typed advisor panel

The advisor panel SHALL be strict TypeScript.

#### Scenario: Advise

- **WHEN** a provider analyzes the figure and suggestions are previewed/applied
- **THEN** providers, responses, suggestions, settings and ports are typed
- **AND** privacy, previews and apply behavior are unchanged

### Requirement: Advisor panel module compatibility

The old `ui/widgets/AdvisorPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** advisor-port checks read the typed module
