import { GITHUB_ACCEPT, GITHUB_API, GITHUB_API_VERSION, RETRY } from '../utils/constants';
import { logger } from '../utils/logger';
import type { Settings } from '../utils/types';
import { decodeBase64, encodeBase64 } from './base64';
import { codeForStatus, SyncError, toSyncError } from './errors';

interface ContentsResponse {
  sha: string;
  content?: string;
  encoding?: string;
  html_url?: string;
}

interface PutResponse {
  content: { path: string; html_url?: string };
  commit: { html_url?: string };
}

/** Existing file state needed to decide between create, update and no-op. */
export interface RemoteFile {
  sha: string;
  text: string;
}

/**
 * Minimal GitHub REST client covering exactly what a sync needs:
 * repository verification plus the Contents API (read / create / update).
 */
export class GitHubClient {
  constructor(private readonly settings: Settings) {}

  private get repoBase(): string {
    const { username, repo } = this.settings;
    return `/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;
  }

  /** Fails fast with a precise error before any write is attempted. */
  async verifyAccess(): Promise<void> {
    const repo = await this.request<{ permissions?: { push?: boolean } }>(this.repoBase);
    if (repo.permissions && repo.permissions.push === false) {
      throw new SyncError('PERMISSION_DENIED');
    }
  }

  /** Returns the file at `path` on the configured branch, or null if absent. */
  async getFile(path: string): Promise<RemoteFile | null> {
    const query = `?ref=${encodeURIComponent(this.settings.branch)}`;
    const response = await this.request<ContentsResponse>(
      `${this.repoBase}/contents/${encodePath(path)}${query}`,
      {},
      { allow404: true },
    );
    if (!response) return null;
    return {
      sha: response.sha,
      text: response.content ? decodeBase64(response.content) : '',
    };
  }

  /**
   * Creates or updates `path`. Passing the current `sha` performs an update;
   * omitting it creates the file. A 409/422 (someone else committed first) is
   * retried once with a freshly fetched sha.
   */
  async putFile(path: string, text: string, message: string, sha?: string): Promise<string | null> {
    const body = {
      message,
      content: encodeBase64(text),
      branch: this.settings.branch,
      ...(sha ? { sha } : {}),
    };

    try {
      const result = await this.request<PutResponse>(`${this.repoBase}/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return result.commit.html_url ?? result.content.html_url ?? null;
    } catch (error) {
      if (!(error instanceof SyncError) || error.code !== 'CONFLICT') throw error;
      logger.warn('SHA conflict on', path, '— refetching and retrying once');
      const current = await this.getFile(path);
      const retry = await this.request<PutResponse>(`${this.repoBase}/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...body, ...(current ? { sha: current.sha } : {}) }),
      });
      return retry.commit.html_url ?? retry.content.html_url ?? null;
    }
  }

  /* ------------------------------ transport ------------------------------ */

  private async request<T>(path: string, init?: RequestInit): Promise<T>;
  private async request<T>(path: string, init: RequestInit, opts: { allow404: true }): Promise<T | null>;
  private async request<T>(
    path: string,
    init: RequestInit = {},
    opts: { allow404?: boolean } = {},
  ): Promise<T | null> {
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY.attempts; attempt++) {
      try {
        const response = await fetch(`${GITHUB_API}${path}`, {
          ...init,
          headers: {
            Accept: GITHUB_ACCEPT,
            Authorization: `Bearer ${this.settings.token}`,
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
            'Content-Type': 'application/json',
            ...init.headers,
          },
        });

        if (response.status === 404 && opts.allow404) return null;
        if (response.ok) return (await response.json()) as T;

        const error = new SyncError(
          codeForStatus(response.status, response.headers),
          await describe(response),
        );
        // Only transient classes are worth another attempt.
        if (!isRetryable(response.status)) throw error;
        lastError = error;
      } catch (error) {
        // Retryable failures are recorded, never thrown — so any SyncError
        // arriving here is permanent and must surface immediately.
        if (error instanceof SyncError) throw error;
        lastError = error;
      }

      const delay = RETRY.backoffMs * 2 ** attempt;
      logger.warn(`Request failed (attempt ${attempt + 1}/${RETRY.attempts}), retrying in ${delay}ms`);
      await sleep(delay);
    }

    throw toSyncError(lastError);
  }
}

/** 5xx and rate limits are transient; 4xx client errors are not. */
function isRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}

/** Reads GitHub's error body without ever echoing request headers. */
async function describe(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message;
  } catch {
    return undefined;
  }
}

/** Encodes each path segment but keeps the slashes GitHub expects. */
function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
