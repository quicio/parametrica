## Decisions

### D1: Offline advisor

`adviseOffline(input)` where input contains current/previous descriptor,
parameter diff, descriptor diff and sensitivity. Output follows the
`ai-advisor` `AdvisorResponse` schema.

### D2: Rule families

- **Change narration**: path + from/to + descriptor deltas.
- **Symmetry**: suggest fold/rotation changes when symmetry is low/high.
- **Density/complexity**: suggest ring/repeat/subdivision changes.
- **Closure/topology**: suggest `closed` or operator toggles when crossings
  or holes indicate a mismatch.
- **Curation**: short names derived from top descriptors (e.g. “6-fold
  rosette”).

Rules reference existing ParameterRefs and schema ranges only.

### D3: Suggestion validation

Before display, every suggestion passes the same validator as the future LLM:
path resolves, numeric values clamp, select options exist, non-finite values
reject. Suggestions are labelled “hypothesis”.

### D4: UI

Advisor panel with:
- current/previous checkpoint selectors
- deterministic summary
- change list
- up to five suggestions with before/after preview
- Apply (history) and Dismiss.

### D5: No network

The offline advisor has no fetch. The future `fake` provider can wrap it for
tests.
