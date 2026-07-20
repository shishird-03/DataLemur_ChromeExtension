/** Shared type vocabulary for every layer of the extension. */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** Identifier of a supported coding site. Add a value when adding a parser. */
export type SiteId = 'datalemur' | 'leetcode' | 'hackerrank' | 'stratascratch';

/** A problem as scraped from the page, before any GitHub interaction. */
export interface Problem {
  site: SiteId;
  /** Human readable problem name, e.g. "Histogram of Tweets". */
  title: string;
  difficulty: Difficulty;
  /** Raw solution source as typed by the user. */
  code: string;
  /** File extension without the dot, e.g. "sql". */
  language: string;
  url: string;
}

/** What the content script currently believes about the active tab. */
export interface PageState {
  supported: boolean;
  problem: Problem | null;
  /** True once a submission on this page was judged correct. */
  accepted: boolean;
}

/** User configuration. Persisted with the Chrome Storage API. */
export interface Settings {
  token: string;
  username: string;
  repo: string;
  branch: string;
  /** Enables verbose `[DataLemur Sync]` console logging. */
  devMode: boolean;
  /** Sync automatically as soon as a submission is accepted. */
  autoSync: boolean;
}

/** One synced solution, used to rebuild README.md without re-reading the repo. */
export interface SolvedRecord {
  title: string;
  difficulty: Difficulty;
  url: string;
  path: string;
  syncedAt: number;
}

export interface Stats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  lastSync: number | null;
}

export type SyncOutcome = 'created' | 'updated' | 'unchanged';

export interface SyncResult {
  outcome: SyncOutcome;
  path: string;
  commitUrl: string | null;
}

/** Stable error identities so the UI can render a friendly message per case. */
export type SyncErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_TOKEN'
  | 'REPO_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'NETWORK'
  | 'UNKNOWN';

/* ------------------------------- messaging ------------------------------- */

export type Message =
  | { type: 'GET_PAGE_STATE' }
  | { type: 'PAGE_STATE'; state: PageState }
  | { type: 'SYNC'; problem: Problem };

export type Response<T> = { ok: true; data: T } | { ok: false; code: SyncErrorCode; message: string };
