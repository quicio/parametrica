/**
 * persistence.test.mjs — shared store boundaries, migration and recovery.
 *
 * Session, notebook and presets must restore independently, migration must be
 * idempotent, and storage failures must never destroy the in-memory document.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import { createDocument } from '../../src/core/document.js';
import { SessionStore, SESSION_STORAGE_KEY } from '../../src/core/session.js';
import { Notebook } from '../../src/lab/notebook.js';
import { PresetManager } from '../../src/presets/PresetManager.js';
import {
  PersistenceRepository,
  STORAGE_BACKUP_SUFFIX,
  STORAGE_KEYS,
  STORAGE_MIGRATION_KEY,
  migrateLocalStorage,
} from '../../src/core/persistence.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
    this.fail = false;
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    if (this.fail) {
      const error = new Error('QuotaExceededError: quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

function checkpoint(name = 'Checkpoint') {
  return {
    name,
    document: createDocument('helix'),
    descriptor: { version: 1, metrics: {} },
  };
}

export async function run(assert) {
  // Repository primitives.
  {
    const storage = new MemoryStorage();
    const repository = new PersistenceRepository(storage);
    assert(repository.write('test.key', { a: 1 }) === true, 'repository writes JSON');
    assert(repository.read('test.key')?.a === 1, 'repository reads JSON');
    assert(repository.read('missing.key', { fallback: true }).fallback === true, 'repository returns the fallback');
    storage.setItem('test.broken', '{broken');
    assert(repository.read('test.broken') === null, 'repository rejects corrupt JSON');
    assert(/JSON/.test(repository.lastError), 'repository reports corrupt JSON');

    const full = new MemoryStorage();
    full.fail = true;
    const quotaRepository = new PersistenceRepository(full);
    assert(quotaRepository.write('test.key', {}) === false, 'repository does not throw on quota');
    assert(/quota/i.test(quotaRepository.lastQuotaError), 'repository flags quota failures');
  }

  // Migration is idempotent and adopts the legacy preset key once.
  {
    const storage = new MemoryStorage();
    const legacy = { Legacy: createDocument('helix') };
    storage.setItem('glyph-lab.presets.v2', JSON.stringify(legacy));

    const first = migrateLocalStorage(storage);
    assert(first.migrated === true, 'migration runs once');
    assert(first.migratedKeys.length === 1, 'legacy presets are adopted');
    assert(storage.getItem(STORAGE_KEYS.presets) === JSON.stringify(legacy), 'legacy presets reach the current key');
    assert(
      storage.getItem(`${STORAGE_KEYS.presets}${STORAGE_BACKUP_SUFFIX}`) === JSON.stringify(legacy),
      'migrated presets keep a backup',
    );
    assert(storage.getItem(STORAGE_MIGRATION_KEY) !== null, 'migration marker is written');
    assert(storage.getItem('glyph-lab.presets.v2') !== null, 'legacy data is never deleted');

    const second = migrateLocalStorage(storage);
    assert(second.migrated === false, 'migration is idempotent');
    assert(storage.getItem(STORAGE_MIGRATION_KEY) !== null, 'marker survives a second run');
  }

  // Corrupt data is backed up, reported and preserved.
  {
    const storage = new MemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{broken');
    const result = migrateLocalStorage(storage);
    assert(result.errors.some((error) => /invalid JSON/.test(error)), 'corrupt keys are reported');
    assert(storage.getItem(SESSION_STORAGE_KEY) === '{broken', 'corrupt data is preserved');
    assert(
      storage.getItem(`${SESSION_STORAGE_KEY}${STORAGE_BACKUP_SUFFIX}`) === '{broken',
      'corrupt data is backed up',
    );
  }

  // Session, notebook and presets restore independently.
  {
    const storage = new MemoryStorage();
    const session = new SessionStore({ storage, now: () => 1000 });
    const notebook = new Notebook({ storage, now: () => 1000 });
    const presets = new PresetManager(storage);

    const doc = createDocument('superformula');
    doc.generator.params.radius = 180;
    assert(session.save(doc) === true, 'session saves');
    notebook.add(checkpoint('Shared checkpoint'));
    presets.save('Session lookalike', doc);

    const reloadedSession = new SessionStore({ storage });
    const reloadedNotebook = new Notebook({ storage });
    const reloadedPresets = new PresetManager(storage);

    assert(reloadedSession.load()?.document.generator.params.radius === 180, 'session restores independently');
    assert(reloadedNotebook.items.length === 1, 'notebook restores independently');
    assert(reloadedPresets.get('Session lookalike')?.generator.params.radius === 180, 'presets restore independently');

    // Mutating one store must not mutate another.
    reloadedSession.load().document.generator.params.radius = 1;
    assert(reloadedPresets.get('Session lookalike').generator.params.radius === 180, 'store snapshots are isolated');
    assert(
      reloadedNotebook.get(reloadedNotebook.items[0].id).document.generator.id === 'helix',
      'notebook snapshots are isolated',
    );
  }

  // Quota failures keep in-memory state usable.
  {
    const storage = new MemoryStorage();
    const session = new SessionStore({ storage });
    const notebook = new Notebook({ storage });
    const presets = new PresetManager(storage);
    storage.fail = true;

    assert(session.save(createDocument('helix')) === false, 'session reports quota failures');
    assert(/quota/i.test(session.lastError), 'session quota message is visible');
    notebook.add(checkpoint('Unsaved checkpoint'));
    assert(notebook.items.length === 1, 'notebook keeps the checkpoint in memory');
    assert(/quota/i.test(notebook.lastError), 'notebook quota message is visible');
    presets.save('Unsaved preset', createDocument('helix'));
    assert(presets.get('Unsaved preset') !== null, 'preset stays available in memory');
    assert(/quota/i.test(presets.lastError), 'preset quota message is visible');
    assert(presets.lastQuotaError !== null, 'preset quota flag is exposed');
  }

  // JSON round-trips for each store.
  {
    const presets = new PresetManager(null);
    const doc = createDocument('helix');
    doc.generator.params.r = 111;
    const parsed = presets.parse(presets.serialize('Round trip', doc));
    assert(parsed.name === 'Round trip', 'preset JSON keeps the name');
    assert(parsed.document.generator.params.r === 111, 'preset JSON round-trips the document');

    const notebook = new Notebook({ storage: new MemoryStorage() });
    notebook.add(checkpoint('Exported'));
    const imported = new Notebook({ storage: new MemoryStorage() });
    const result = imported.importJSON(notebook.exportJSON());
    assert(result.added === 1, 'notebook JSON round-trips checkpoints');
    assert(imported.items[0].name === 'Exported', 'notebook JSON keeps checkpoint identity');
  }
}
