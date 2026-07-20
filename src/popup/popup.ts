import { previewFor } from '../github/sync';
import { getSettings, getStats, isConfigured } from '../storage/storage';
import { ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import type { Message, PageState, Problem, Response, Stats, SyncResult } from '../utils/types';

/** Popup controller: reads state from the active tab, delegates work to the worker. */

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
};

const ui = {
  status: el('status'),
  title: el('problem-title'),
  difficulty: el('problem-difficulty'),
  repo: el('repo'),
  path: el('target-path'),
  sync: el<HTMLButtonElement>('sync'),
  preview: el<HTMLButtonElement>('preview'),
  settings: el<HTMLButtonElement>('settings'),
  previewPanel: el('preview-panel'),
  previewBody: el('preview-body'),
  lastSync: el('last-sync'),
};

let problem: Problem | null = null;

void main();

async function main(): Promise<void> {
  const settings = await getSettings();
  logger.setEnabled(settings.devMode);

  ui.repo.textContent = isConfigured(settings)
    ? `${settings.username}/${settings.repo} (${settings.branch})`
    : 'Not configured';

  ui.settings.addEventListener('click', () => chrome.runtime.openOptionsPage());
  ui.preview.addEventListener('click', togglePreview);
  ui.sync.addEventListener('click', () => void runSync());

  await Promise.all([loadPageState(isConfigured(settings)), loadStats()]);
}

/** Asks the content script in the active tab what it can see. */
async function loadPageState(configured: boolean): Promise<void> {
  const state = await queryActiveTab();

  if (!state?.supported) {
    setStatus('Open a DataLemur question', 'muted');
    return;
  }
  if (!state.problem) {
    setStatus('Waiting for the editor…', 'warn');
    return;
  }

  problem = state.problem;
  ui.title.textContent = problem.title;
  ui.title.title = problem.title;
  ui.difficulty.textContent = problem.difficulty;
  ui.difficulty.dataset.difficulty = problem.difficulty;
  ui.path.textContent = previewFor(problem).path;
  ui.preview.disabled = false;

  if (!configured) {
    setStatus('Settings required', 'error');
    return;
  }

  ui.sync.disabled = false;
  if (state.accepted) setStatus('✓ Ready to Sync', 'ok');
  else setStatus('Not accepted yet — sync anyway', 'warn');
}

async function loadStats(): Promise<void> {
  const stats: Stats = await getStats();
  el('stat-total').textContent = String(stats.total);
  el('stat-easy').textContent = String(stats.easy);
  el('stat-medium').textContent = String(stats.medium);
  el('stat-hard').textContent = String(stats.hard);
  ui.lastSync.textContent = stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never';
}

function togglePreview(): void {
  if (!problem) return;
  const hidden = ui.previewPanel.classList.toggle('hidden');
  if (!hidden) ui.previewBody.textContent = previewFor(problem).content;
}

async function runSync(): Promise<void> {
  if (!problem) return;
  ui.sync.disabled = true;
  setStatus('Uploading…', 'muted');

  const message: Message = { type: 'SYNC', problem };
  const response = (await chrome.runtime
    .sendMessage(message)
    .catch(() => null)) as Response<SyncResult> | null;

  if (!response) {
    setStatus(ERROR_MESSAGES.NETWORK, 'error');
    ui.sync.disabled = false;
    return;
  }
  if (!response.ok) {
    setStatus(ERROR_MESSAGES[response.code], 'error');
    ui.sync.disabled = false;
    return;
  }

  const labels = { created: '✓ Synced', updated: '✓ Updated', unchanged: 'Already exists' } as const;
  setStatus(labels[response.data.outcome], 'ok');
  await loadStats();
}

/** Returns null when no content script is present (wrong site, or not injected yet). */
async function queryActiveTab(): Promise<PageState | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_STATE',
    } satisfies Message)) as Response<PageState> | undefined;
    return response?.ok ? response.data : null;
  } catch {
    return null;
  }
}

function setStatus(text: string, tone: 'ok' | 'warn' | 'error' | 'muted'): void {
  ui.status.textContent = text;
  ui.status.dataset.tone = tone;
}
