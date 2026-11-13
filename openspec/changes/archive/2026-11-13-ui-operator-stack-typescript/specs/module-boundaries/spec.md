## ADDED Requirements

### Requirement: Typed operator stack

The operator stack editor SHALL be strict TypeScript.

#### Scenario: Edit

- **WHEN** operators are added, removed, reordered, toggled or edited
- **THEN** app/form port methods, stages, expressions and errors are typed
- **AND** behavior, labels and order are unchanged

### Requirement: Operator stack compatibility

The old `ui/widgets/OperatorStack.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** architecture port checks read the typed module
