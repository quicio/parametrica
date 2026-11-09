## Rounded shell

The outer and inner shells use a superellipse:

`x = a·sign(cos u)·|cos u|^(2/n)`, `y = b·sign(sin u)·|sin u|^(2/n)`

`n = 3..5` gives a rounded rectangle; `z = height·v`. The inner shell is
offset by the wall thickness and starts at the floor height, so the Manifold
difference produces a hollow open-top body with a flat floor.

## Cutter layers

A cutter is a normal closed Parametric Surface layer with
`fabricationRole: "cutter"`.

- Cutters are visible to the fabrication resolver.
- Cutters are filtered out of `buildRenderScene`, so the canvas and SVG never
  show construction geometry.
- A difference operation receives the shell plus every cutter; Manifold
  subtracts all of them in one step.
- Cutter names start with `Cutter ·` for layer-list clarity.

## Solids of revolution

- Open annular shell: outer and inner profiles, both ends extended past the
  body, with caps. Used by the lampshade.
- Stepped solid: a capped solid of revolution with a non-monotonic radius
  profile and blind-hole cutters. Used by the candle holder and wall hook.
- Screw holes are cylinder cutters along the print axis.

## Acceptance

- A rounded shell is exportable with a flat floor and open top.
- Cutters affect the fabricated body but not the rendered scene.
- Multiple cutters are removed in one difference.
- The lampshade has a through centre and annular bed contact.
- The candle holder and wall hook have positive volume and no overhang warning.
