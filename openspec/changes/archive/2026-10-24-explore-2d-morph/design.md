## Decisions

### D1: Grid contract

`ExplorationSession.grid2D(refX, refY, {cols, rows})` produces `cols×rows`
candidates, row-major with X fastest. Limits: `cols/rows ∈ [3,12]` and
`cols·rows ≤ 144`. The full-resolution document is evaluated only for a
clicked cell; all cells use a reduced preview evaluation.

### D2: Preview evaluation

The grid uses the same shared-bounds preview as the 1D strip. To keep cost
bounded, candidates are evaluated sequentially in chunks of four and rendered
into 96–132 px thumbnails. Invalid cells are marked empty.

### D3: Morph

A morph is legal only when generator id, operator ids/order and expression
structure match. Numeric params interpolate linearly:
`v(t) = a + (b-a)·t`, with `t = i/(steps-1)`. Selects, expressions and
operator presence stay from A. Endpoints are exact.

The UI shows a horizontal frame strip; clicking a frame adopts that document.
A future motion-timeline slice can save the sequence as animation.

### D4: Incompatibility

If the structures differ, the UI explains why and offers no parameter morph.
A crossfade between thumbnails is a visual preview only, not a document.

### D5: Budget

Grid and morph candidate counts are capped and reported. No operation may
generate an unbounded number of documents or thumbnails.
