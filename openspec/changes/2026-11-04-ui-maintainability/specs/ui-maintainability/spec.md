## Purpose

Reduce the cost of future UI/render work by splitting monoliths without changing
behavior.

## ADDED Requirements

### Requirement: Inspector section ownership

Inspector sections SHALL live in domain modules.

#### Scenario: Section implementation

- **WHEN** a section is added or edited
- **THEN** its implementation lives outside `Controls.js`
- **AND** `Controls.js` only coordinates modes/sections/UI state

#### Scenario: Behavior parity

- **WHEN** the refactor lands
- **THEN** accordion state, section order, labels and controls behave unchanged

### Requirement: Render overlay ownership

P5 overlay rendering SHALL live outside the frame orchestrator.

#### Scenario: Overlay extraction

- **WHEN** Quad, coordinates, reference, seams or inspection overlays are drawn
- **THEN** their math lives in dedicated modules
- **AND** P5Adapter only routes data and frame context

### Requirement: Test modularity

The Node suite SHALL be split by domain while keeping one aggregate command.

#### Scenario: `npm test`

- **WHEN** the user runs `npm test`
- **THEN** every domain module runs
- **AND** the aggregate count/failure behavior is preserved
