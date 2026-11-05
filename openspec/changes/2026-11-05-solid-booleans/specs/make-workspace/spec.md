## ADDED Requirements

### Requirement: Boolean recipe controls

Fabricate SHALL expose explicit boolean operations over selected validated
bodies.

#### Scenario: Controls

- **WHEN** the user selects a multi-body scope
- **THEN** the panel offers None, Union, Difference and Intersection
- **AND** None remains the default

#### Scenario: Operand count

- **WHEN** fewer than two valid bodies are selected
- **THEN** Difference and Intersection are disabled with a reason

#### Scenario: Result

- **WHEN** a boolean succeeds
- **THEN** the panel reports the operation, operand count and result counts
- **AND** the result is treated as one derived body

#### Scenario: Empty or failed result

- **WHEN** the boolean is empty or fails
- **THEN** export remains disabled
- **AND** the reason states empty, invalid result or complexity

## MODIFIED Requirements

### Requirement: No CAD

The mode SHALL NOT provide direct geometry editing, implicit repair or boolean
operations outside explicit recipes.

#### Scenario: Unsupported action

- **WHEN** the user needs direct vertex editing or implicit repair
- **THEN** the mode reports that these are not available
- **AND** does not silently modify the source

#### Scenario: Explicit preparation

- **WHEN** the user enables weld or cap
- **THEN** only the derived fabrication copy is prepared
- **AND** the render/document geometry remains unchanged

#### Scenario: Explicit multi-body

- **WHEN** the user selects a multi-body scope without a boolean recipe
- **THEN** only validated closed shells are merged
- **AND** overlapping shells are rejected rather than unioned

#### Scenario: Explicit boolean

- **WHEN** the user selects union, difference or intersection
- **THEN** only validated closed bodies are combined
- **AND** the result is validated before export
- **AND** the render/document geometry remains unchanged
