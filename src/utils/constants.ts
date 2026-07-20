import type { Difficulty, SyncErrorCode } from './types';

export const LOG_PREFIX = '[DataLemur Sync]';

export const GITHUB_API = 'https://api.github.com';
export const GITHUB_ACCEPT = 'application/vnd.github+json';
export const GITHUB_API_VERSION = '2022-11-28';

export const README_PATH = 'README.md';

export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'] as const;

/** Phrases that indicate a judged-correct submission, matched case-insensitively. */
export const ACCEPTED_PATTERNS: readonly RegExp[] = [
  /\baccepted\b/i,
  /\bcorrect\s*(answer|solution)?\b/i,
  /\bcongratulations\b/i,
  /\ball\s+test\s+cases\s+passed\b/i,
  /\bsolution\s+is\s+correct\b/i,
] as const;

/** Phrases that must veto an accept match ("Wrong Answer", "Incorrect"). */
export const REJECTED_PATTERNS: readonly RegExp[] = [
  /\bincorrect\b/i,
  /\bwrong\s+answer\b/i,
  /\bnot\s+correct\b/i,
  /\bfailed\b/i,
] as const;

export const RETRY = {
  attempts: 3,
  /** Base delay in ms; doubles per attempt. */
  backoffMs: 600,
} as const;

/** Default settings applied on first run and merged over partial stored values. */
export const DEFAULT_SETTINGS = {
  token: '',
  username: '',
  repo: '',
  branch: 'main',
  devMode: false,
  autoSync: false,
} as const;

export const ERROR_MESSAGES: Record<SyncErrorCode, string> = {
  NOT_CONFIGURED: 'Open Settings and add your GitHub token, username and repository.',
  INVALID_TOKEN: 'Invalid or expired GitHub token.',
  REPO_NOT_FOUND: 'Repository not found. Check the username, repo name and branch.',
  PERMISSION_DENIED: 'Permission denied. The token needs the "repo" (or Contents: read/write) scope.',
  RATE_LIMITED: 'GitHub rate limit reached. Try again in a few minutes.',
  CONFLICT: 'The file changed on GitHub while syncing. Try again.',
  NETWORK: 'Network error. Check your internet connection.',
  UNKNOWN: 'Something went wrong while syncing.',
};
