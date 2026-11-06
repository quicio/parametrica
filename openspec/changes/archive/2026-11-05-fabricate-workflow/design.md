## Context

The Fabricate panel is a single flat list. The worker added WORKING/CANCEL and
the report shows counts, but there is no plan, no quality preset and no clear
next action.

## Decisions

### D1: Groups

Keep one Fabricate section, but add group headings:

1. **Source** — scope, body count, objects.
2. **Repair** — weld/cap/repair, topology, self-intersections, resolution.
3. **Combine** — boolean and CSG strategy.
4. **Output** — format, world scale, export.
5. **Checks** — source, triangles/vertices/volume, warnings, preparation/repair
   report.

Existing controls keep their classes/selectors.

### D2: Plan summary

`fabricate-plan` shows a compact sentence:

```text
Plan · composition · repair SDF @64 · union · 3MF · mm
```

It reflects current preparation and report state. It is not a second source of
truth.

### D3: Quality presets

`fabricate-quality`:

- Draft → resolution 32;
- Standard → 64;
- High → 128;
- Custom → manual resolution.

Changing the preset sets `view.fabrication.remeshResolution`. Changing the
resolution manually marks the preset Custom.

### D4: Suggested resolution

`fabricate-suggestion` derives a recommendation from the source or evaluation
bbox diagonal:

- < 10 units → 32;
- < 30 → 64;
- otherwise 128.

It is advisory only and never changes settings automatically.

### D5: Next action

`fabricate-next-action` explains the first blocker:

- missing world scale;
- no closed source;
- repair/SDF needed;
- not enough bodies for boolean;
- ready to export.

It does not replace the detailed checks/errors.

### D6: No behavior change

All geometry, worker, validation and export paths remain unchanged.
