## Contract

`view.fabrication.groups` is an ordered array:

```js
[
  { op: 'difference', name: 'Outer shade', layers: ['layer-1', 'layer-2'] },
  { op: 'difference', name: 'Inner shade', layers: ['layer-3', 'layer-4'] },
]
```

- Layer ids must resolve to validated exportable candidates.
- A group with one layer is a body without a boolean.
- A group with two or more layers runs the selected boolean with the current
  CSG strategy and tolerance.
- A layer cannot belong to two groups.
- Group results merge into one multi-body mesh and export as separate 3MF
  objects.
- If any group fails, the whole preset is not exportable and the reason names
  the failing group.
- When groups are present they take precedence over `scope` and `boolean`.

## UI

- Fabricate shows "N grouped bodies".
- The single boolean selector is disabled with the title "Grouped preset
  recipe".

## Acceptance

- Three independent hollow lampshades export as three bodies.
- A failed group blocks export with a group-specific reason.
- Existing boolean and multi-body presets are unchanged.
