import { DIFFICULTIES } from '../utils/constants';
import { findSmallestMatching, isVisible, queryAny, text } from '../utils/dom';
import { readEditorText } from '../utils/editor';
import { logger } from '../utils/logger';
import type { Difficulty, Problem } from '../utils/types';
import type { SiteParser } from './SiteParser';
import { hasAcceptedVerdict } from './verdict';

/** Ordered from most to least specific; the first hit wins. */
const TITLE_SELECTORS = [
  '[data-testid*="question-title" i]',
  '[class*="question-title" i]',
  '[class*="problem-title" i]',
  'main h1',
  'h1',
  'main h2',
] as const;

const DIFFICULTY_SELECTORS = [
  '[data-testid*="difficulty" i]',
  '[class*="difficulty" i]',
  '[class*="badge" i]',
  '[class*="tag" i]',
] as const;

const DIFFICULTY_PATTERN = /^(easy|medium|hard)$/i;

/** Reads DataLemur SQL question pages (https://datalemur.com/questions/...). */
export class DataLemurParser implements SiteParser {
  readonly id = 'datalemur' as const;
  readonly language = 'sql';

  matches(url: string): boolean {
    try {
      const { hostname, pathname } = new URL(url);
      return hostname.endsWith('datalemur.com') && /^\/questions\/[^/]+/.test(pathname);
    } catch {
      return false;
    }
  }

  parse(url: string): Problem | null {
    const title = this.readTitle();
    if (!title) {
      logger.warn('No problem title found yet');
      return null;
    }

    const code = readEditorText();
    if (!code) {
      logger.warn('Editor is empty or not mounted yet');
      return null;
    }

    const problem: Problem = {
      site: this.id,
      title,
      difficulty: this.readDifficulty(),
      code,
      language: this.language,
      url: url.split(/[?#]/)[0]!,
    };
    logger.info('Parsed problem', { title: problem.title, difficulty: problem.difficulty });
    return problem;
  }

  isAccepted(): boolean {
    return hasAcceptedVerdict();
  }

  /** Falls back to the slug so a markup change never blocks a sync. */
  private readTitle(): string {
    const fromDom = text(queryAny(TITLE_SELECTORS));
    if (fromDom) return clean(fromDom);

    const fromTitle = document.title.split(/[|–—]/)[0]?.trim();
    if (fromTitle && !/datalemur/i.test(fromTitle)) return clean(fromTitle);

    const slug = location.pathname.split('/').filter(Boolean).pop();
    return slug ? clean(slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : '';
  }

  /** Defaults to Medium — a wrong bucket is better than refusing to sync. */
  private readDifficulty(): Difficulty {
    const badge = [...document.querySelectorAll(DIFFICULTY_SELECTORS.join(','))].find(
      (el) => DIFFICULTY_PATTERN.test(text(el)) && isVisible(el),
    );
    const label = text(badge) || text(findSmallestMatching(DIFFICULTY_PATTERN));
    const match = DIFFICULTIES.find((d) => d.toLowerCase() === label.toLowerCase());
    return match ?? 'Medium';
  }
}

/** Strips characters that are illegal or awkward in a Git path. */
function clean(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
