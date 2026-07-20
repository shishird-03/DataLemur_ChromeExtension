import { DataLemurParser } from './DataLemurParser';
import type { SiteParser } from './SiteParser';

/**
 * Parser registry.
 *
 * To support LeetCode / HackerRank / StrataScratch: implement `SiteParser`,
 * add the class here, and widen `content_scripts.matches` in manifest.json.
 */
export const PARSERS: readonly SiteParser[] = [new DataLemurParser()];

export function parserFor(url: string): SiteParser | null {
  return PARSERS.find((parser) => parser.matches(url)) ?? null;
}

export type { SiteParser };
