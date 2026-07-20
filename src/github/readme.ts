import { DIFFICULTIES } from '../utils/constants';
import type { Difficulty, SolvedRecord } from '../utils/types';

/** Difficulty order for the solutions table; alphabetical within a bucket. */
const ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

/**
 * Renders README.md from the local record set.
 *
 * The records are the source of truth, so the file is regenerated in full on
 * every sync — no fragile in-place patching of the previous README.
 */
export function renderReadme(records: readonly SolvedRecord[]): string {
  const sorted = [...records].sort(
    (a, b) => ORDER[a.difficulty] - ORDER[b.difficulty] || a.title.localeCompare(b.title),
  );

  const counts = DIFFICULTIES.map(
    (difficulty) => `${difficulty}: ${sorted.filter((r) => r.difficulty === difficulty).length}`,
  );

  const rows = sorted.map(
    (r) => `| [${escapeCell(r.title)}](${encodeURI(r.path)}) | ${r.difficulty} | [Link](${r.url}) |`,
  );

  return [
    '# DataLemur SQL Solutions',
    '',
    `Solved: ${sorted.length}`,
    '',
    ...counts,
    '',
    '| Problem | Difficulty | Question |',
    '|---------|------------|----------|',
    ...rows,
    '',
    '---',
    '',
    '_Synced automatically by [DataLemur Sync](https://github.com/topics/datalemur-sync)._',
    '',
  ].join('\n');
}

/** Escapes the pipe so a title never breaks the Markdown table. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}
