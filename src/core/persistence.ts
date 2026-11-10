/** Shared storage boundary and one-time migration. */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MigrationResult {
  migrated: boolean;
  backups: string[];
  migratedKeys: string[];
  errors: string[];
}

export const STORAGE_KEYS = Object.freeze({
  session: 'parametrica.session.v1',
  notebook: 'parametrica.notebook.v1',
  presets: 'parametrica.presets.v0',
  presetMeta: 'parametrica.presets.meta.v1',
  ui: 'parametrica.ui.v1',
});

export const STORAGE_LEGACY_KEYS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [STORAGE_KEYS.session]: [],
  [STORAGE_KEYS.notebook]: [],
  [STORAGE_KEYS.presets]: ['glyph-lab.presets.v2', 'glyph-lab.presets.v1'],
  [STORAGE_KEYS.presetMeta]: [],
  [STORAGE_KEYS.ui]: [],
});

export const STORAGE_MIGRATION_KEY = 'parametrica.storage.migrated.v1';
export const STORAGE_BACKUP_SUFFIX = '.backup.v1';

export class PersistenceRepository {
  storage: StorageLike | null;
  lastError: string | null;
  lastQuotaError: string | null;

  constructor(storage: StorageLike | null = globalThis.localStorage ?? null) {
    this.storage = storage;
    this.lastError = null;
    this.lastQuotaError = null;
  }

  read<T = unknown>(key: string, fallback: T | null = null): T | null {
    const raw = this.readText(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      this.lastError = jsonErrorMessage(error);
      return fallback;
    }
  }

  readText(key: string): string | null {
    if (!this.storage) return null;
    try {
      return this.storage.getItem(key);
    } catch (error) {
      this.lastError = errorMessage(error);
      return null;
    }
  }

  write(key: string, value: unknown): boolean {
    return this.writeText(key, JSON.stringify(value));
  }

  writeText(key: string, value: string): boolean {
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
      this.lastError = errorMessage(error);
      this.lastQuotaError = isQuotaError(error) ? this.lastError : null;
      return false;
    }
  }

  remove(key: string): boolean {
    if (!this.storage) return false;
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      this.lastError = errorMessage(error);
      return false;
    }
  }

  backup(key: string): boolean {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return false;
      const backupKey = `${key}${STORAGE_BACKUP_SUFFIX}`;
      if (this.storage.getItem(backupKey) !== null) return true;
      this.storage.setItem(backupKey, raw);
      return true;
    } catch (error) {
      this.lastError = errorMessage(error);
      return false;
    }
  }
}

export function migrateLocalStorage(storage: StorageLike | null = globalThis.localStorage ?? null): MigrationResult {
  if (!storage) return { migrated: false, backups: [], migratedKeys: [], errors: [] };
  const repository = new PersistenceRepository(storage);
  try {
    if (storage.getItem(STORAGE_MIGRATION_KEY)) {
      return { migrated: false, backups: [], migratedKeys: [], errors: [] };
    }
  } catch (error) {
    return { migrated: false, backups: [], migratedKeys: [], errors: [errorMessage(error)] };
  }

  const backups: string[] = [];
  const migratedKeys: string[] = [];
  const errors: string[] = [];

  for (const [key, legacyKeys] of Object.entries(STORAGE_LEGACY_KEYS)) {
    if (repository.readText(key) === null) {
      for (const legacy of legacyKeys) {
        const raw = repository.readText(legacy);
        if (raw === null) continue;
        if (isValidJSON(raw)) {
          if (repository.writeText(key, raw)) migratedKeys.push(`${legacy} → ${key}`);
          else errors.push(`${legacy}: ${repository.lastError ?? 'write failed'}`);
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

export function createPersistenceRepository(storage: StorageLike | null = globalThis.localStorage ?? null): PersistenceRepository {
  return new PersistenceRepository(storage);
}

function isValidJSON(raw: string): boolean {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

function jsonErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  return /JSON/i.test(message) ? message : `Invalid JSON: ${message}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isQuotaError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  const message = errorMessage(error);
  return name === 'QuotaExceededError' || /quota/i.test(message) || /exceeded/i.test(message);
}
