import { parserFor, type SiteParser } from '../parsers';
import { observeThrottled, onUrlChange } from '../utils/dom';
import { getSettings } from '../storage/storage';
import { logger } from '../utils/logger';
import type { Message, PageState } from '../utils/types';

/**
 * Content script: watches the problem page, keeps a snapshot of the current
 * problem and verdict, and answers state queries from the popup.
 *
 * It never talks to GitHub — network work belongs to the service worker.
 */

let parser: SiteParser | null = null;
let state: PageState = { supported: false, problem: null, accepted: false };
let observer: MutationObserver | null = null;
/** Guards against repeated auto-syncs of an unchanged solution. */
let autoSyncedKey: string | null = null;

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  logger.setEnabled(settings.devMode);

  attach(location.href);
  onUrlChange((url) => {
    logger.info('Navigation detected:', url);
    attach(url);
  });
}

/** (Re)binds the parser and observer for the page currently displayed. */
function attach(url: string): void {
  observer?.disconnect();
  observer = null;
  parser = parserFor(url);
  state = { supported: parser !== null, problem: null, accepted: false };
  autoSyncedKey = null;

  if (!parser) {
    logger.info('Not a supported problem page');
    publish();
    return;
  }

  logger.info('Extracting DOM...');
  refresh();
  observer = observeThrottled(document.body, refresh);
}

/** Re-reads the problem and verdict; publishes only when something changed. */
function refresh(): void {
  if (!parser) return;

  const problem = parser.parse(location.href);
  const accepted = parser.isAccepted();

  const changed =
    accepted !== state.accepted ||
    problem?.title !== state.problem?.title ||
    problem?.code !== state.problem?.code;

  state = { supported: true, problem, accepted };
  if (!changed) return;

  if (accepted) logger.info('Submission accepted — ready to sync');
  publish();
  if (accepted && problem) void requestAutoSync();
}

/** Tells the worker to update the toolbar badge for this tab. */
function publish(): void {
  const message: Message = { type: 'PAGE_STATE', state };
  chrome.runtime.sendMessage(message).catch(() => {
    /* Worker asleep or extension reloading — the popup will re-query. */
  });
}

/** Fires a sync without user input when auto-sync is enabled in settings. */
async function requestAutoSync(): Promise<void> {
  const settings = await getSettings();
  if (!settings.autoSync || !state.problem) return;

  // One auto-sync per (problem, solution) so a re-render cannot spam commits.
  const key = `${state.problem.title}::${state.problem.code}`;
  if (key === autoSyncedKey) return;
  autoSyncedKey = key;

  logger.info('Auto-sync enabled — syncing');
  const message: Message = { type: 'SYNC', problem: state.problem };
  await chrome.runtime.sendMessage(message).catch(() => undefined);
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type !== 'GET_PAGE_STATE') return undefined;
  // Re-read on demand so a popup opened after a mutation storm is never stale.
  if (parser) refresh();
  sendResponse({ ok: true, data: state });
  return undefined;
});
