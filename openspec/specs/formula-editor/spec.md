# formula-editor Specification

## Purpose
TBD - created by archiving change tech-debt-hardening. Update Purpose after archive.
## Requirements
### Requirement: CodeMirror editor

Expression and source parameters SHALL use CodeMirror 6 while preserving the
existing `ExpressionField` public API.

#### Scenario: Highlighting

- **WHEN** an expression field is rendered
- **THEN** numbers, identifiers/functions, operators and punctuation receive
  distinct token styles

#### Scenario: Single-line input

- **WHEN** Enter is pressed in a single-line expression field
- **THEN** the value commits, focus leaves the editor and no newline is inserted

#### Scenario: Multiline source

- **WHEN** the parameter is a source program
- **THEN** Enter inserts a newline and Mod-Enter commits

### Requirement: External refresh

The editor SHALL synchronize when the document value changes externally
without scheduling another commit.

#### Scenario: Preset load

- **WHEN** a preset replaces the active document
- **THEN** the editor displays the new expression and the debounce is not fired

### Requirement: Inline errors

Compile errors SHALL remain visible below the editor and mark the field as
invalid.

#### Scenario: Invalid syntax

- **WHEN** the expression engine reports an error for that parameter
- **THEN** the field shows `has-error` and an `aria-invalid` editor
