import { ERROR_MESSAGES } from '../utils/constants';
import type { SyncErrorCode } from '../utils/types';

/** Error carrying a stable code so every UI can render a friendly message. */
export class SyncError extends Error {
  constructor(
    readonly code: SyncErrorCode,
    message?: string,
  ) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'SyncError';
  }
}

/** Maps an HTTP status (plus GitHub's rate-limit headers) to a SyncErrorCode. */
export function codeForStatus(status: number, headers?: Headers): SyncErrorCode {
  if (status === 401) return 'INVALID_TOKEN';
  if (status === 404) return 'REPO_NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 403) {
    return headers?.get('x-ratelimit-remaining') === '0' ? 'RATE_LIMITED' : 'PERMISSION_DENIED';
  }
  return 'UNKNOWN';
}

export function toSyncError(cause: unknown): SyncError {
  if (cause instanceof SyncError) return cause;
  if (cause instanceof TypeError) return new SyncError('NETWORK');
  return new SyncError('UNKNOWN', cause instanceof Error ? cause.message : undefined);
}
