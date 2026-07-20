import { toSyncError } from '../github/errors';
import { GitHubClient } from '../github/github';
import { clearRecords, getSettings, saveSettings } from '../storage/storage';
import { logger } from '../utils/logger';
import type { Settings } from '../utils/types';

/** Options controller: edits settings and verifies them against GitHub. */

const field = <T extends HTMLInputElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
};

const form = document.getElementById('form') as HTMLFormElement;
const status = document.getElementById('status') as HTMLParagraphElement;
const fields = {
  token: field('token'),
  username: field('username'),
  repo: field('repo'),
  branch: field('branch'),
  autoSync: field('autoSync'),
  devMode: field('devMode'),
};

void load();

async function load(): Promise<void> {
  const settings = await getSettings();
  logger.setEnabled(settings.devMode);
  fields.token.value = settings.token;
  fields.username.value = settings.username;
  fields.repo.value = settings.repo;
  fields.branch.value = settings.branch;
  fields.autoSync.checked = settings.autoSync;
  fields.devMode.checked = settings.devMode;
}

/** Reads the form without trimming the token's meaningful characters away. */
function readForm(): Settings {
  return {
    token: fields.token.value.trim(),
    username: fields.username.value.trim(),
    repo: fields.repo.value.trim().replace(/\.git$/, ''),
    branch: fields.branch.value.trim() || 'main',
    autoSync: fields.autoSync.checked,
    devMode: fields.devMode.checked,
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveSettings(readForm());
  logger.setEnabled(fields.devMode.checked);
  setStatus('Settings saved.', 'ok');
});

document.getElementById('test')?.addEventListener('click', async () => {
  setStatus('Checking repository access…', 'muted');
  try {
    // Verify what is on screen, so the user can test before saving.
    await new GitHubClient(readForm()).verifyAccess();
    setStatus('✓ Connected — the repository is writable.', 'ok');
  } catch (error) {
    setStatus(toSyncError(error).message, 'error');
  }
});

document.getElementById('reset')?.addEventListener('click', async () => {
  if (!confirm('Clear the local solved list and stats? Files already on GitHub are untouched.')) return;
  await clearRecords();
  setStatus('Local progress cleared.', 'warn');
});

function setStatus(text: string, tone: 'ok' | 'warn' | 'error' | 'muted'): void {
  status.textContent = text;
  status.dataset.tone = tone;
}
