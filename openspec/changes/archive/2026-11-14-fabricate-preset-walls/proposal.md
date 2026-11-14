## Why

The sampled wall estimator found real sub-1.2 mm regions in three curated
Fabricate presets: Bud Vase 160 (0.30 mm p5), Cap Catenoid (0.05 mm) and
Perforated Vase 200 (0.61 mm). A curated preset should meet its own default
profile instead of shipping with a failing manufacturing check.

## What Changes

- Bud Vase: increase the radial wall from 2.5 mm to 4 mm.
- Cap Catenoid: turn the ends inward so the caps are not acute overhangs.
- Perforated Vase: use fewer, larger holes and a thicker rim (32 mm cells,
  8 mm struts, 12 mm rim).
- Assert that every Fabricate preset passes its wall check at default settings.
- Update the preset documentation and review table with the new evidence.

## Out of Scope

- Changing the wall estimator, the manufacturing minima or gating.
- Changing export bytes, units or the document format.
- Adjusting presets that already pass.
