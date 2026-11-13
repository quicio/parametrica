## ADDED Requirements

### Requirement: Typed shared UI surfaces

Seam legend, parametric overlay, dialogs and harmonics editor SHALL be strict
TypeScript.

#### Scenario: Render

- **WHEN** these surfaces render or open
- **THEN** app/document inputs, statuses, dialog results and rows are typed
- **AND** DOM structure, copy and behavior are unchanged

### Requirement: Shared UI compatibility

The old `ui/SeamLegend.js`, `ui/ParametricOverlay.js`, `ui/dialogs.js`,
`ui/widgets/HarmonicsEditor.js` and `ui/widgets/modeToggles.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** panels or the canvas import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
