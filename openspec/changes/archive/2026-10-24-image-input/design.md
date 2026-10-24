## Decisions

### D1: Underlay first

Upload → object URL → draw with opacity/scale/position/rotation behind the
canvas. Underlay is UI state only, never part of the document.

### D2: Trace pipeline

1. Draw image to a bounded canvas (max 1024 px).
2. Grayscale + threshold (Otsu or user slider).
3. Marching squares / edge following for the largest closed contour.
4. Simplify with Ramer–Douglas–Peucker.
5. Resample by arc length.
6. Compute complex DFT and keep the top N harmonics.
7. Create a Fourier document with `harmonicsX`/`harmonicsY`.

### D3: Reconstruction

The created document uses the existing `fourier` generator, so users can edit
harmonics and see the math. The preview shows contour vs reconstruction error.

### D4: Limits

Single largest closed contour, high contrast. If no contour is found, show an
error and leave the document untouched.

### D5: Privacy

Images stay in the browser; no network. The source image is not stored in the
document; only the resulting harmonics are.
