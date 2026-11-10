## Types

- `NotebookProject`, `NotebookSeries`, `Checkpoint`, `NotebookOptions`,
  `CheckpointInput`, `NotebookComparison`.
- `ExplorationCandidate`, sweep/random/grid/morph options and results.
- `EvolutionChild`, `GenerationResult`, `GenerationOptions`,
  `StructuralChange`, `CrossoverEntry`.

## Rules

- Storage goes through `NotebookRepository`/`StorageLike`.
- Candidate math, locks, limits and sanitization are unchanged.
- Evolution validation still fully evaluates each child.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Notebook persistence, exploration candidates and evolution output unchanged.
