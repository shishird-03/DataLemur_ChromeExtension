import { ERROR_MESSAGES } from '../utils/constants';
import type { SyncErrorCode, SyncResult } from '../utils/types';

const ICON = chrome.runtime.getURL('assets/icons/icon128.png');

/** Chrome notifications need a unique id to avoid replacing an unrelated toast. */
function notify(title: string, message: string): void {
  chrome.notifications.create(`dls-${Date.now()}`, {
    type: 'basic',
    iconUrl: ICON,
    title,
    message,
  });
}

export function notifySuccess(problemTitle: string, result: SyncResult): void {
  const headline =
    result.outcome === 'created'
      ? '✓ Solution Synced'
      : result.outcome === 'updated'
        ? '✓ Solution Updated'
        : 'Already Up To Date';
  notify(headline, `${problemTitle} → ${result.path}`);
}

export function notifyError(code: SyncErrorCode, detail?: string): void {
  notify('DataLemur Sync failed', detail ? `${ERROR_MESSAGES[code]} (${detail})` : ERROR_MESSAGES[code]);
}
