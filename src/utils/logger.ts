import { LOG_PREFIX } from './constants';

/**
 * Namespaced console logger, silent unless developer mode is enabled.
 *
 * Every context (worker, content script, popup) has its own module instance,
 * so each one calls `logger.setEnabled()` once after reading settings.
 */
class Logger {
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  info(...args: unknown[]): void {
    if (this.enabled) console.log(LOG_PREFIX, ...args);
  }

  warn(...args: unknown[]): void {
    if (this.enabled) console.warn(LOG_PREFIX, ...args);
  }

  /** Errors are always surfaced — they are actionable even outside dev mode. */
  error(...args: unknown[]): void {
    console.error(LOG_PREFIX, ...args);
  }
}

export const logger = new Logger();
