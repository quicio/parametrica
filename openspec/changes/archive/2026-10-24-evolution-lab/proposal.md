## Why

The lab can generate variations, but selection and recombination are manual.
A generation-based exploration mode lets the user act as the fitness function:
choose forms, breed numeric and structural children, keep the interesting
ones.

## What Changes

- Add a generation model with parent selection, numeric crossover and
  mutation.
- Add structural mutation: add/remove/reorder operators.
- Track generation lineage in the notebook.
- Add a Generation panel: select parents, generate N children, preview, keep.
- Reuse exploration, validation and notebook checkpoints.
- Add deterministic seeded tests and e2e.

## Capabilities

### New Capabilities

- `evolution-lab-panel`: selection, crossover, mutation, structural variation
  and generation lineage.

### Modified Capabilities

- None. `exploration-session` and `lab-notebook` provide the base contracts.

## Impact

- new `src/lab/evolution.js`, `src/ui/widgets/EvolutionPanel.js`
- `src/lab/exploration.js`, `notebook.js`
- tests + e2e + docs

## Non-goals

- No automatic aesthetic fitness.
- No genetic algorithm over arbitrary code.
- No cloud/parallel evaluation.
- No unbounded generations.
