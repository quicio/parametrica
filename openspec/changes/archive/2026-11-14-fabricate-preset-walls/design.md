## Bud Vase

The inner shell is offset radially, so a steep waist reduces the normal wall.
A 4 mm radial wall raises p5 from 0.30 mm to about 1.64 mm without changing the
silhouette meaningfully.

## Cap Catenoid

The classic catenoid flares at the ends, so the flat caps sit under an overhang
and the sampled normal hits the cap at a knife edge. Using
`r = cosh(v) - 0.6·v²` turns the ends slightly inward; the cap becomes the
narrowest section and the measured p5 rises to about 1.88 mm. The waist and the
cap workflow remain visible.

## Perforated Vase

The wall check was dominated by the edges of a dense hole pattern. Larger cells,
thicker struts and a taller rim reduce the edge share: 32 mm cells, 8 mm struts
and a 12 mm rim produce 74 holes of 24 mm and a p5 of about 1.24 mm. Hole count
stays well above the existing fixture.

## Acceptance

The preset loop in `fabricate-presets.test.mjs` fails if any curated preset
reports a failed wall check, so future estimator or geometry changes cannot
quietly regress the library.
