## Preset port

`applyPreset`, `controls`, `document`, `notify`, `openImportDialog`, `presets`.

PresetPanel and the save/delete/import controls use only this surface.

## Lab port

`adoptCandidate`, `analyzeFigure`, `controls`, `document`, `exploreSeed`,
`notebook`, `saveCheckpoint`.

LabPanel, ExplorePanel and EvolutionPanel receive it as their `app`. The
`exploreSeed` property is writable; the rest are commands or live getters.

## Verification

- Every `app.*` use in the preset and lab panels is listed in its port.
- Composition injects both ports.
- Analysis, explore, evolution and preset e2e tests pass.
