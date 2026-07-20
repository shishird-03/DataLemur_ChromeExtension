/**
 * Self-check for the pure logic that a browser test would not reach cheaply:
 * path building, file rendering, README generation, Base64 and error mapping.
 *
 * Run with `npm test` — it exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict';
import { decodeBase64, encodeBase64 } from './github/base64';
import { codeForStatus } from './github/errors';
import { renderReadme } from './github/readme';
import { previewFor, renderSolutionFile, solutionPath } from './github/sync';
import { DataLemurParser } from './parsers/DataLemurParser';
import type { Problem, SolvedRecord } from './utils/types';

const problem: Problem = {
  site: 'datalemur',
  title: 'Histogram of Tweets',
  difficulty: 'Easy',
  code: 'SELECT 1;\n',
  language: 'sql',
  url: 'https://datalemur.com/questions/sql-histogram-tweets',
};

/* Paths land in the difficulty folder and drop path-hostile characters. */
assert.equal(solutionPath(problem), 'Easy/Histogram of Tweets.sql');
assert.equal(
  solutionPath({ ...problem, title: 'A/B: Test? "X"', difficulty: 'Hard' }),
  'Hard/AB Test X.sql',
);
assert.equal(solutionPath({ ...problem, title: '///' }), 'Easy/Untitled.sql');

/* The committed file keeps a provenance header and the trimmed query. */
const file = renderSolutionFile(problem);
assert.match(file, /^-- Histogram of Tweets\n-- Difficulty: Easy\n-- Source: https:/);
assert.match(file, /\nSELECT 1;\n$/);
assert.deepEqual(previewFor(problem), { path: solutionPath(problem), content: file });

/* README: counts per difficulty, Easy before Hard, pipes escaped. */
const records: SolvedRecord[] = [
  { title: 'Zebra', difficulty: 'Hard', url: 'u1', path: 'Hard/Zebra.sql', syncedAt: 1 },
  { title: 'Alpha', difficulty: 'Easy', url: 'u2', path: 'Easy/Alpha.sql', syncedAt: 2 },
  { title: 'Pipe | Title', difficulty: 'Easy', url: 'u3', path: 'Easy/Pipe Title.sql', syncedAt: 3 },
];
const readme = renderReadme(records);
assert.match(readme, /Solved: 3/);
assert.match(readme, /Easy: 2/);
assert.match(readme, /Medium: 0/);
assert.match(readme, /Hard: 1/);
assert.ok(readme.indexOf('Alpha') < readme.indexOf('Zebra'), 'Easy rows sort before Hard rows');
assert.match(readme, /Pipe \\\| Title/);
assert.match(readme, /Easy\/Alpha\.sql/);
// Spaces in a path must be encoded or the Markdown link breaks.
assert.match(readme, /Easy\/Pipe%20Title\.sql/);

/* Base64 must survive non-Latin1 input (comments in the query). */
const unicode = "-- 汉字 émoji 🚀\nSELECT '±';";
assert.equal(decodeBase64(encodeBase64(unicode)), unicode);

/* HTTP status mapping drives every user-facing error message. */
assert.equal(codeForStatus(401), 'INVALID_TOKEN');
assert.equal(codeForStatus(404), 'REPO_NOT_FOUND');
assert.equal(codeForStatus(409), 'CONFLICT');
assert.equal(codeForStatus(403, new Headers({ 'x-ratelimit-remaining': '0' })), 'RATE_LIMITED');
assert.equal(codeForStatus(403, new Headers({ 'x-ratelimit-remaining': '42' })), 'PERMISSION_DENIED');
assert.equal(codeForStatus(500), 'UNKNOWN');

/* Only real DataLemur question pages activate the parser. */
const parser = new DataLemurParser();
assert.ok(parser.matches('https://datalemur.com/questions/sql-histogram-tweets'));
assert.ok(parser.matches('https://www.datalemur.com/questions/abc?tab=solution'));
assert.ok(!parser.matches('https://datalemur.com/questions'));
assert.ok(!parser.matches('https://datalemur.com/blog/sql-interview-questions'));
assert.ok(!parser.matches('https://evil.com/datalemur.com/questions/x'));

console.log('selfcheck: all assertions passed');
