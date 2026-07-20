# Contributing

## Getting started

```bash
npm install
npm run build     # writes dist/ — load this folder as an unpacked extension
npm run dev       # HMR for the popup and options pages
```

## Before opening a pull request

```bash
npm run lint
npm test
npm run build
```

Then walk the parts of [docs/TESTING.md](docs/TESTING.md) your change touches.

## Ground rules

- **The token stays in the service worker and the options page.** Never pass it to a content
  script, never log it, never put it in a URL.
- **No new runtime dependencies.** The extension ships zero third-party code; keep it that way
  unless there is no reasonable alternative.
- **Selectors must be tolerant.** Site markup changes without notice. Add candidates to the
  existing lists and keep a structural or textual fallback rather than binding to one class name.
- **Keep modules small and single-purpose**, matching the existing layout: parsing in `parsers/`,
  network in `github/`, persistence in `storage/`, UI in `popup/` and `options/`.
- Public functions get a one-line doc comment explaining _why_, not _what_.

## Adding a site parser

1. Create `src/parsers/<Site>Parser.ts` implementing `SiteParser`.
2. Register it in `src/parsers/index.ts`.
3. Extend `content_scripts.matches` and `host_permissions` in `manifest.json`.
4. Add `matches()` cases to `src/selfcheck.ts` — including URLs that must **not** match.

## Commit messages

Short imperative subject, e.g. `Add StrataScratch parser` or `Fix SHA retry on 422`.
