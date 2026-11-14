/**
 * Generate the Playwright session fixture from current defaults.
 * Running `npm run test:e2e` invokes this before Playwright starts.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import '../src/generators/index.ts';
import '../src/operators/index.ts';
import '../src/render/passes/index.ts';
import { createDocument, sanitizeDocument } from '../src/core/document.ts';
import { SESSION_STORAGE_KEY } from '../src/core/session.ts';

const document = sanitizeDocument(createDocument('parametric'));
const value = JSON.stringify({
  version: 1,
  savedAt: 1,
  document,
});
const state = {
  cookies: [],
  origins: [{
    origin: 'http://127.0.0.1:5173',
    localStorage: [{ name: SESSION_STORAGE_KEY, value }],
  }],
};
const out = resolve('e2e/session-state.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(state, null, 2)}\n`);
