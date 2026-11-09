/**
 * core/persistence.js — shared storage boundary and one-time migration.
 *
 * Session, notebook, presets and UI state keep separate responsibilities, but
 * they share versioning, backup, JSON and quota behaviour. Every store writes
 * through a repository so failures are reported instead of silently losing
 * the in-memory document.
 */

export const STORAGE_KEYS = Object.freeze({
  session: 'parametrica.session.v1',
  notebook: 'parametrica.notebook.v1',
  presets: 'parametrica.presets.v0',
  presetMeta: 'parametrica.presets.meta.v1',
  ui: 'parametrica.ui.v1',
});

/**
 * Keys written by older releases. The preset key changed during the
 * Glyph Lab → Parametrica rename; the other stores keep their v1 key.
 */
export const STORAGE_LEGACY_KEYS = Object.freeze({
  [STORAGE_KEYS.session]: [],
  [STORAGE_KEYS.notebook]: [],
  [STORAGE_KEYS.presets]: ['glyph-lab.presets.v2', 'glyph-lab.presets.v1'],
  [STORAGE_KEYS.presetMeta]: [],
  [STORAGE_KEYS.ui]: [],
});

export const STORAGE_MIGRATION_KEY = 'parametrica.storage.migrated.v1';
export const STORAGE_BACKUP_SUFFIX = '.backup.v1';

export class PersistenceRepository {
  constructor(storage = globalThis.localStorage ?? null) {
    this.storage = storage;
    this.lastError = null;
    this.lastQuotaError = null;
  }

  read(key, fallback = null) {
    const raw = this.readText(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      this.lastError = jsonErrorMessage(error);
      return fallback;
    }
  }

  readText(key) {
    if (!this.storage) return null;
    try {
      return this.storage.getItem(key);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      return null;
    }
  }

  write(key, value) {
    return this.writeText(key, JSON.stringify(value));
  }

  writeText(key, value) {
    if (!this.storage) {
      this.lastError = 'storage unavailable';
      this.lastQuotaError = null;
      return false;
    }
    try {
      this.storage.setItem(key, value);
      this.lastError = null;
      this.lastQuotaError = null;
      return true;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.lastQuotaError = isQuotaError(error) ? this.lastError : null;
      return false;
    }
  }

  remove(key) {
    if (!this.storage) return false;
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      return false;
    }
  }

  backup(key) {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return false;
      const backupKey = `${key}${STORAGE_BACKUP_SUFFIX}`;
      if (this.storage.getItem(backupKey) !== null) return true;
      this.storage.setItem(backupKey, raw);
      return true;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      return false;
    }
  }
}

/**
 * Copy legacy keys into their current names and retain one backup per store.
 * Migration is idempotent: the marker is written only after every key has
 * been inspected, and existing data is never deleted, even when it is corrupt.
 */
export function migrateLocalStorage(storage = globalThis.localStorage ?? null) {
  if (!storage) return { migrated: false, backups: [], migratedKeys: [], errors: [] };
  const repository = new PersistenceRepository(storage);
  try {
    if (storage.getItem(STORAGE_MIGRATION_KEY)) {
      return { migrated: false, backups: [], migratedKeys: [], errors: [] };
    }
  } catch (error) {
    return {
      migrated: false,
      backups: [],
      migratedKeys: [],
      errors: [error?.message ?? String(error)],
    };
  }

  const backups = [];
  const migratedKeys = [];
  const errors = [];

  for (const [key, legacyKeys] of Object.entries(STORAGE_LEGACY_KEYS)) {
    // Adopt the first legacy key only when the current key is absent.
    if (repository.readText(key) === null) {
      for (const legacy of legacyKeys) {
        const raw = repository.readText(legacy);
        if (raw === null) continue;
        if (isValidJSON(raw)) {
          if (repository.writeText(key, raw)) migratedKeys.push(`${legacy} → ${key}`);
          else errors.push(`${legacy}: ${repository.lastError}`);
        } else {
          errors.push(`${legacy}: invalid JSON; data preserved`);
        }
        break;
      }
    }

    const raw = repository.readText(key);
    if (raw === null) continue;
    if (repository.backup(key)) backups.push(key);
    else errors.push(`${key}: ${repository.lastError ?? 'backup failed'}`);
    if (!isValidJSON(raw)) errors.push(`${key}: invalid JSON; data preserved`);
  }

  if (!repository.write(STORAGE_MIGRATION_KEY, {
    version: 1,
    at: Date.now(),
    migrated: migratedKeys,
  })) {
    errors.push(`migration marker: ${repository.lastError ?? 'write failed'}`);
  }

  return { migrated: true, backups, migratedKeys, errors };
}

export function createPersistenceRepository(storage = globalThis.localStorage ?? null) {
  return new PersistenceRepository(storage);
}

function isValidJSON(raw) {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

function jsonErrorMessage(error) {
  const message = error?.message ?? String(error);
  return /JSON/i.test(message) ? message : `Invalid JSON: ${message}`;
}

function isQuotaError(error) {
  const name = String(error?.name ?? '');
  const message = String(error?.message ?? '');
  return name === 'QuotaExceededError'
    || /quota/i.test(message)
    || /exceeded/i.test(message);
}
