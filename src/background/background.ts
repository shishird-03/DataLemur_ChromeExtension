import { syncProblem } from '../github/sync';
import { toSyncError } from '../github/errors';
import { getSettings } from '../storage/storage';
import { logger } from '../utils/logger';
import type { Message, PageState, Problem, Response, SyncResult } from '../utils/types';
import { notifyError, notifySuccess } from './notifications';

/**
 * Service worker: the only place that touches the GitHub API.
 *
 * It is the single privileged actor, so the token is read here and in the
 * options page only — never handed to a content script.
 */

void refreshLogging();
chrome.storage.onChanged.addListener(() => void refreshLogging());

async function refreshLogging(): Promise<void> {
  logger.setEnabled((await getSettings()).devMode);
}

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Installed:', details.reason);
  const settings = await getSettings();
  // First run with nothing configured: take the user straight to settings.
  if (details.reason === 'install' && !settings.token) chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  switch (message.type) {
    case 'PAGE_STATE':
      updateBadge(sender.tab?.id, message.state);
      return undefined;

    case 'SYNC':
      handleSync(message.problem).then(sendResponse);
      return true; // keeps the message channel open for the async reply

    default:
      return undefined;
  }
});

/** Runs a sync and turns every failure into a typed response plus a toast. */
async function handleSync(problem: Problem): Promise<Response<SyncResult>> {
  try {
    const result: SyncResult = await syncProblem(problem);
    notifySuccess(problem.title, result);
    return { ok: true, data: result } satisfies Response<SyncResult>;
  } catch (error) {
    const syncError = toSyncError(error);
    logger.error('Sync failed:', syncError.code, syncError.message);
    notifyError(syncError.code);
    return { ok: false, code: syncError.code, message: syncError.message } satisfies Response<SyncResult>;
  }
}

/** Badge mirrors the content script's verdict: ✓ when a sync is available. */
function updateBadge(tabId: number | undefined, state: PageState): void {
  if (tabId === undefined) return;
  const showTick = state.supported && state.accepted && state.problem !== null;
  void chrome.action.setBadgeText({ tabId, text: showTick ? '✓' : '' });
  void chrome.action.setBadgeBackgroundColor({ tabId, color: '#16a34a' });
}
