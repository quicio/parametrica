/** Fourier epicycle chain visualization. */

import { RenderPasses } from '../../core/registry.ts';
import { bboxAll } from '../../sampling/sampling.js';
import type { PassContext, PassData } from './types.ts';

interface Harmonic {
  amp: number;
  freq: number;
  phase: number;
  rot: number;
  [key: string]: unknown;
}

RenderPasses.register({
  id: 'epicycles',
  name: 'Epicycles (Fourier)',
  group: 'diagnostic',
  description: 'Fourier rotating-vector chain.',
  appliesTo({ document: doc }: PassData) {
    if (doc?.generator?.id !== 'fourier') return false;
    const hx = (doc.generator.params?.harmonicsX ?? []) as unknown[];
    const hy = (doc.generator.params?.harmonicsY ?? []) as unknown[];
    return hx.length + hy.length > 0;
  },
  draw(p: PassContext, { document: doc, time }: PassData) {
    if (!doc?.generator || doc.generator.id !== 'fourier') return;
    const params = doc.generator.params ?? {};
    const hx = (params.harmonicsX ?? []) as Harmonic[];
    const hy = (params.harmonicsY ?? []) as Harmonic[];
    const terms = [...hx, ...hy];
    if (!terms.length) return;

    // approximate display scale from amplitude budget vs rendered size
    const budget = terms.reduce((s, h) => s + Math.abs(h.amp), 0) || 1;
    const size = Number(params.size ?? 340);
    const scale = (size / 2) / budget;

    const t = (time ?? 0) % (Math.PI * 2);
    let x = 0;
    let y = 0;

    const sorted = [...terms].sort((a, b) => Math.abs(b.amp) - Math.abs(a.amp));
    for (const h of sorted) {
      const w = h.freq * t + h.phase;
      const dx = h.amp * Math.cos(w) * Math.cos(h.rot) * scale;
      const dy = h.amp * Math.sin(w) * Math.sin(h.rot) * scale;
      const r = Math.hypot(dx, dy);
      p.noFill();
      p.stroke(255, 60);
      p.strokeWeight(0.75);
      p.circle(x, y, r * 2);
      p.stroke(227, 6, 19, 200);
      p.line(x, y, x + dx, y + dy);
      x += dx;
      y += dy;
    }
    p.noStroke();
    p.fill(227, 6, 19);
    p.circle(x, y, 5);
  },
});

// bboxAll kept imported for future adaptive scaling
void bboxAll;
