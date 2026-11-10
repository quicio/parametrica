## Types

- `ParameterRef`, `NumericParameterRef`, `LabDocumentLike`.
- `NotebookWorkspaceHost`, project/series shapes and `NotebookWorkspace`.
- `SummaryParam`, `SummaryOperator`, `ParametricSummary`.
- `DiffEntry`; canonical JSON and SHA-256 signatures.
- `SensitivityEntry`, `SensitivityResult`, `SensitivityCurve`.

## Rules

- Descriptor/engine boundaries are narrowed at the call edge.
- Canonical hashing stays dependency-free and deterministic.
- Workspace target rules and diff filtering are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Sensitivity, diff, hash, summary and workspace behavior are unchanged.
