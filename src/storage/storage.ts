import { DEFAULT_SETTINGS } from '../utils/constants';
import type { Settings, SolvedRecord, Stats } from '../utils/types';

/**
 * Chrome Storage wrapper.
 *
 * Everything lives in `chrome.storage.local`: the token must never leave the
 * machine, and `storage.sync` would replicate it to every signed-in browser.
 */

const KEY_SETTINGS = 'settings';
const KEY_RECORDS = 'records';
const KEY_LAST_SYNC = 'lastSync';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored[KEY_SETTINGS] as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next: Settings = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [KEY_SETTINGS]: next });
  return next;
}

/** True when enough is configured to talk to the GitHub Contents API. */
export function isConfigured(settings: Settings): boolean {
  return Boolean(settings.token && settings.username && settings.repo && settings.branch);
}

/** Synced solutions keyed by repo path, so re-syncing never duplicates a row. */
export async function getRecords(): Promise<Record<string, SolvedRecord>> {
  const stored = await chrome.storage.local.get(KEY_RECORDS);
  return (stored[KEY_RECORDS] as Record<string, SolvedRecord> | undefined) ?? {};
}

export async function upsertRecord(record: SolvedRecord): Promise<Record<string, SolvedRecord>> {
  const records = await getRecords();
  records[record.path] = record;
  await chrome.storage.local.set({ [KEY_RECORDS]: records, [KEY_LAST_SYNC]: record.syncedAt });
  return records;
}

export async function getStats(): Promise<Stats> {
  const stored = await chrome.storage.local.get([KEY_RECORDS, KEY_LAST_SYNC]);
  const records = Object.values((stored[KEY_RECORDS] as Record<string, SolvedRecord>) ?? {});
  return {
    total: records.length,
    easy: records.filter((r) => r.difficulty === 'Easy').length,
    medium: records.filter((r) => r.difficulty === 'Medium').length,
    hard: records.filter((r) => r.difficulty === 'Hard').length,
    lastSync: (stored[KEY_LAST_SYNC] as number | undefined) ?? null,
  };
}

/** Used by the options page "reset progress" action. */
export async function clearRecords(): Promise<void> {
  await chrome.storage.local.remove([KEY_RECORDS, KEY_LAST_SYNC]);
}
