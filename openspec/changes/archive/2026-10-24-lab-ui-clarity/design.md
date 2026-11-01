## Decisions

### D1: Modes hide sections, never destroy them

Each section declares a mode. Switching modes toggles `hidden` on the
existing DOM, so widget state, scroll-independent controls and embedded
panels survive. All sections keep their current builders.

- Form: Layers, Generator, Parameters, Equations, Harmonics, Operators.
- Look: View, Artboard, Image, Animation, Timeline.
- Explore: Mutation, Analysis, Advisor, Explore, Evolution.
- Keep: Notebook, Presets, Export.

### D2: Accordions are the primary disclosure

Section headers become buttons with `aria-expanded` and `aria-controls`.
Generator and Parameters open by default; other sections are collapsed.
Open state and the active mode persist under `parametrica.ui.v1`.

### D3: Essential vs advanced parameters

The generator schema stays unchanged. A small key-based classification
(`samples`, `adaptive`, `fit`, `t0/t1`, `theta0`, depth and quality keys)
moves technical controls into a persisted Advanced disclosure. If every
plain parameter is advanced, the section renders them directly instead of
showing an empty essential group.

### D4: Context status is read-only and cheap

A sticky status line summarises the active layer, visibility, generator,
enabled operators, time-modulated parameters, active timeline tracks and
projection. Hidden layers expose a Show button. It is refreshed from
`App.rebuild()` and panel refreshes; it never evaluates geometry itself.

## Risks

- E2E tests must open sections explicitly; helpers provide `openSection`.
- Persisted UI state can hide a section the user expects; the mode bar and
  accordion headers remain visible and discoverable.
