## Why

Fabricate can run independent boolean groups or one global boolean, but it
cannot express a chain such as "union A and B, then subtract C". That is the
next composition capability and the first item in the product backlog.

## What Changes

- Add a serialized `view.fabrication.recipe`: an ordered list of
  `{ op, layers }` steps.
- The first step unions its layers; every later step combines the accumulated
  body with its layers using its operation.
- Validate every intermediate result as a closed solid; a failure names the
  step.
- Recipe takes precedence over groups and the global boolean; existing presets
  keep their behavior.
- Add the `Sequential CSG` Fabricate preset: union two tori, then subtract a
  third.
- Show the recipe in the Fabricate plan and composition note.
- Cover sanitization, the pipeline, determinism and the preset.

## Out of Scope

- A recipe authoring UI in the Combine section; this slice is preset-authored.
- Branched recipes or non-linear graphs.
- Changing the CSG engine, export bytes or document version.

## Why now

The TypeScript closure and lint gate are done, and the preset library now has
verified walls. Sequential recipes are the next product capability.
