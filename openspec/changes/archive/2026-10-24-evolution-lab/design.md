## Decisions

### D1: User is fitness

The user selects 2–4 parents from notebook checkpoints. There is no automatic
score. Children are candidates; keeping one creates a checkpoint with
`parentId` and `generation` metadata.

### D2: Numeric crossover

For common numeric parameter paths, each child picks a value between parents
(uniform or arithmetic mean + jitter). Parameters present in only one parent
inherit that parent or default. Values are clamped.

### D3: Structural mutation

Occasionally (probability configurable) add a random operator, remove an
operator or swap adjacent operators. Results are sanitized and validated; a
child that fails evaluation is discarded/reseeded.

### D4: Generation lineage

Checkpoint metadata gains `generation` and `parents` (array of IDs), in
addition to `parentId`. Notebook UI shows generation tags.

### D5: Budget

Max 4 parents, max 12 children per generation, max 3 structural changes per
child. Evaluation runs synchronously with the existing engine.
