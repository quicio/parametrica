## ADDED Requirements

### Requirement: Exploration context preservation

Randomize and adopt SHALL preserve the inspector scroll position, the
focused exploration control and the generated candidate strip.

#### Scenario: Randomize keeps the panel position

- **WHEN** the user scrolls to the Explore section and clicks Randomize
- **THEN** `#ui.scrollTop` changes by less than 8 px
- **AND** focus remains on the Randomize button

#### Scenario: Adopt a parameter-only candidate

- **WHEN** the user adopts a candidate whose generator and operators match
  the current structure
- **THEN** the inspector is not rebuilt
- **AND** the candidate strip remains visible
- **AND** the document is updated and undoable

#### Scenario: Structural rebuild keeps the context

- **WHEN** a full panel rebuild is unavoidable (preset, generator or
  checkpoint restore)
- **THEN** the inspector restores its previous scroll position
- **AND** a tagged control receives focus without scrolling the panel

#### Scenario: Regenerate a strip

- **WHEN** the user regenerates candidates after scrolling the strip
  horizontally
- **THEN** the strip preserves its horizontal position
