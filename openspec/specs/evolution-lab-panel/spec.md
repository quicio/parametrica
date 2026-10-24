# evolution-lab-panel Specification

## Purpose
Let the user breed forms: select parents, generate numeric and structural
variations, and keep discoveries with explicit generation lineage.
## Requirements
### Requirement: Parent selection

The user SHALL select two to four notebook checkpoints as parents.

#### Scenario: Two parents

- **WHEN** two checkpoints are selected
- **THEN** the generation action is enabled

### Requirement: Numeric crossover

Children SHALL inherit values from parent numeric parameters, clamped to the
schema.

#### Scenario: Bounded child

- **WHEN** parents have values 2 and 8
- **THEN** the child value lies within `[2,8]` (or the schema range)

### Requirement: Structural mutation

The system SHALL occasionally add, remove or reorder operators in children.

#### Scenario: Valid structural child

- **WHEN** an operator is added
- **THEN** the child is sanitized and evaluated before being offered

### Requirement: Validation

Invalid children SHALL be discarded or regenerated; they SHALL never be kept.

#### Scenario: Broken child

- **WHEN** a child evaluates with errors
- **THEN** it is removed from the generation results

### Requirement: Generation lineage

Kept children SHALL record their generation and parent ids in the notebook.

#### Scenario: Keep a child

- **WHEN** the user keeps a child
- **THEN** its checkpoint shows the generation and parent names

### Requirement: Bounded generations

The UI SHALL enforce parent/child/structural-change budgets.

#### Scenario: Too many children

- **WHEN** more than the allowed children are requested
- **THEN** the request is capped or rejected with a notice
