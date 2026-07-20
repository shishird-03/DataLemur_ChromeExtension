import { getSettings, isConfigured, upsertRecord } from '../storage/storage';
import { README_PATH } from '../utils/constants';
import { logger } from '../utils/logger';
import type { Problem, SolvedRecord, SyncResult } from '../utils/types';
import { SyncError, toSyncError } from './errors';
import { GitHubClient } from './github';
import { renderReadme } from './readme';

/**
 * The one operation the extension exists for: push a solved problem into the
 * configured repository and keep README.md in step.
 */
export async function syncProblem(problem: Problem): Promise<SyncResult> {
  const settings = await getSettings();
  if (!isConfigured(settings)) throw new SyncError('NOT_CONFIGURED');

  const client = new GitHubClient(settings);
  logger.info('Verifying repository access...');
  await client.verifyAccess();

  const path = solutionPath(problem);
  const content = renderSolutionFile(problem);

  logger.info('Reading existing file', path);
  const existing = await client.getFile(path);

  if (existing && existing.text.trim() === content.trim()) {
    logger.info('Remote file is already identical — skipping commit');
    await recordSynced(problem, path);
    return { outcome: 'unchanged', path, commitUrl: null };
  }

  const verb = existing ? 'Update' : 'Add';
  logger.info(`Uploading (${verb.toLowerCase()})...`);
  const commitUrl = await client.putFile(
    path,
    content,
    `${verb} solution: ${problem.title}`,
    existing?.sha,
  );

  const records = await recordSynced(problem, path);
  await updateReadme(client, records);

  logger.info('Success');
  return { outcome: existing ? 'updated' : 'created', path, commitUrl };
}

/** `Easy/Histogram of Tweets.sql` — folders are created implicitly by the API. */
export function solutionPath(problem: Problem): string {
  return `${problem.difficulty}/${sanitiseFileName(problem.title)}.${problem.language}`;
}

/** File body: a provenance header the user can read months later, then the query. */
export function renderSolutionFile(problem: Problem): string {
  return [
    `-- ${problem.title}`,
    `-- Difficulty: ${problem.difficulty}`,
    `-- Source: ${problem.url}`,
    '',
    problem.code.trim(),
    '',
  ].join('\n');
}

async function recordSynced(problem: Problem, path: string): Promise<SolvedRecord[]> {
  const records = await upsertRecord({
    title: problem.title,
    difficulty: problem.difficulty,
    url: problem.url,
    path,
    syncedAt: Date.now(),
  });
  return Object.values(records);
}

/** README failures must not fail the sync — the solution is already committed. */
async function updateReadme(client: GitHubClient, records: SolvedRecord[]): Promise<void> {
  try {
    const content = renderReadme(records);
    const existing = await client.getFile(README_PATH);
    if (existing && existing.text.trim() === content.trim()) return;
    logger.info('Updating README.md');
    await client.putFile(README_PATH, content, `Update README (${records.length} solved)`, existing?.sha);
  } catch (error) {
    logger.warn('README update failed:', toSyncError(error).message);
  }
}

/** Keeps spaces (readable in GitHub) but drops path-hostile characters. */
function sanitiseFileName(title: string): string {
  return (
    title
      .replace(/[\\/:*?"<>|#%{}$!'@+`=]/g, '')
      .replace(/\.+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'Untitled'
  );
}

/** Exactly what would be committed, without touching the network. */
export function previewFor(problem: Problem): { path: string; content: string } {
  return { path: solutionPath(problem), content: renderSolutionFile(problem) };
}
