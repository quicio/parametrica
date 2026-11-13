## ADDED Requirements

### Requirement: Typed expression field

The CodeMirror expression field SHALL be strict TypeScript.

#### Scenario: Edit

- **WHEN** a formula is edited, committed or disabled
- **THEN** options, extensions, timers and states are typed
- **AND** tokens, highlighting, debounce and markup are unchanged

### Requirement: Expression field compatibility

The old `ui/widgets/ExpressionField.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls, OperatorStack or StageEditor import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
