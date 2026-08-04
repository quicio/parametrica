import '../src/generators/index.js';
import { Generators } from '../src/core/registry.js';
import { createDocument } from '../src/core/document.js';
import { evaluateDocument } from '../src/core/engine.js';

const d = createDocument('parametric');
console.log('default t0:', d.generator.params.t0, 't1:', d.generator.params.t1);

// Cambiar t0 a -4.16, t1 a 6.28, samples a 3689
d.generator.params.t0 = -4.16;
d.generator.params.t1 = 6.28318;
d.generator.params.samples = 3689;

const e = evaluateDocument(d, { time: 0 });
const pts = e.curves[0]?.points ?? [];
console.log('pts:', pts.length);
console.log('first:', JSON.stringify(pts[0]));
console.log('mid:',  JSON.stringify(pts[Math.floor(pts.length / 2)]));
console.log('last:', JSON.stringify(pts.at(-1)));
console.log('bbox:', e.bbox);
