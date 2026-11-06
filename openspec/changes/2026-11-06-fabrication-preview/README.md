# fabrication-preview

Optional product-quality preview for the prepared fabrication body. It adds a
WebGL/PBR backend behind the existing `RenderScene` contract, with materials,
directional lighting, shadows and approximate ambient occlusion.

The p5 renderer remains the technical default and the canonical path for
overlays, inspection, SVG/plotter and existing exports. The PBR backend is
lazy-loaded and isolated; it is a presentation mode, not a new geometry
pipeline.

This is the high-cost option chosen for the product goal: the user must be able
to judge the organically fabricated piece with finish and shadows without
leaving Parametrica.
