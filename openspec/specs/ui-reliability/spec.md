# ui-reliability Specification

## Purpose
The browser panel must never corrupt the document, must survive every
registered generator/preset, and must expose failures and recovery
actions to the user. This capability covers the two crash-class bugs,
idempotent panel rebuilds, notices, undo/redo and the seed control.
## Requirements
### Requirement: Fourier harmonic editor wiring

`Controls` SHALL construct `HarmonicsEditor` with `getRows(axis)` and
`onChange(axis, rows)`. The getter SHALL read
`document.generator.params[axis]`; the callback SHALL assign the new
rows to that parameter and rebuild the evaluation.

#### Scenario: Select the Fourier generator

- **WHEN** the user selects `Fourier Synthesis` in the Generator panel
- **THEN** the panel builds without throwing, the Harmonics section is
  present, and the document evaluates with zero errors

#### Scenario: Apply a Fourier preset

- **WHEN** the user applies `Fourier Capsule` or `Fourier Butterfly`
- **THEN** the generator id becomes `fourier`, the harmonic tables are
  populated from the preset, and the canvas updates

#### Scenario: Edit a harmonic row

- **WHEN** the user changes an amplitude and commits the field
- **THEN** `document.generator.params.harmonicsX[i].amp` reflects the
  new value and the curve re-evaluates

### Requirement: Viz Modes is an array-safe multi-select

The View panel SHALL render one checkbox per registered render pass.
Toggling a checkbox SHALL add or remove exactly one id from
`view.modes`, preserving array type and registry order.

#### Scenario: Enable a second mode

- **WHEN** `view.modes = ['stroke']` and the user checks `Points`
- **THEN** `view.modes` is `['stroke', 'points']` and the canvas draws
  both passes

#### Scenario: Disable the last mode

- **WHEN** the user unchecks every mode
- **THEN** `view.modes` is normalized back to `['stroke']` rather than
  an empty array or string

### Requirement: Preset panel rebuild is idempotent

Rebuilding the Presets GUI SHALL reuse the existing panel section.

#### Scenario: Save two presets

- **WHEN** the user saves two user presets in a row
- **THEN** the panel contains exactly one Presets section

### Requirement: Visible failure notices

Import failures, built-in name collisions, clipboard failures and
preset deletion failures SHALL display a transient notice in the UI in
addition to the console warning.

#### Scenario: Invalid JSON import

- **WHEN** the user imports a file that is not a Parametrica document
- **THEN** a notice with the parse/validation message is visible for at
  least 4 seconds

### Requirement: Undo and redo

The app SHALL keep a bounded, coalesced history of document snapshots
(50 entries) and expose undo/redo via panel buttons and keyboard
shortcuts.

#### Scenario: Undo a mutation

- **WHEN** the user mutates the document (or adds an operator) and then
  undoes the change
- **THEN** the document equals the pre-change document and redo is
  available

#### Scenario: Coalesce a slider drag

- **WHEN** the user drags one slider continuously
- **THEN** at most one history entry is created for the gesture

#### Scenario: Text editing keeps native undo

- **WHEN** focus is inside an input or textarea and the user presses
  Ctrl/Cmd+Z
- **THEN** the app does not intercept the shortcut

### Requirement: Seed control

The Mutation panel SHALL expose the document seed as an integer field
and a reroll action.

#### Scenario: Change the seed

- **WHEN** the user changes the seed from 1 to 4242
- **THEN** noise-based geometry re-evaluates immediately and telemetry
  reports `SEED 4242`
