## Model

`recipe` is an ordered array of sanitized steps. Each step has a boolean
operation and a layer list. Layers cannot repeat across steps. The recipe is
part of the existing fabrication settings, so it uses the same document,
worker and preset transport.

## Pipeline

The first step unions its members (a single member passes through). Each later
step combines the accumulated geometry with the union of its members using
`difference` or `intersection`. Every result is validated before it becomes the
next operand. The final result is one closed body.

## Precedence

`recipe` wins over `groups` and the global `boolean`. A document with no recipe
takes the existing paths unchanged.

## UI

The plan line reports `recipe ×N`; the composition note reports the number of
steps. The Combine section does not expose an editor yet; the demo preset makes
the capability inspectable and exportable.

## Compatibility

The document version does not change. `recipe` is optional and sanitized like
the existing groups; unknown operations and empty layer lists are dropped.
