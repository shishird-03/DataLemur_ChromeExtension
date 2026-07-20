# Manual testing checklist

Run `npm test` first (pure logic), then walk this list against a real Chrome profile.
Open the service-worker console from `chrome://extensions` → _service worker_, and the page
console on DataLemur, with **Developer logging** enabled in settings.

## Setup

- [ ] `npm run build` succeeds; `dist/` loads via **Load unpacked** with no manifest errors
- [ ] First install opens the options page automatically
- [ ] **Test connection** with correct settings reports _Connected_
- [ ] Settings survive a browser restart

## Detection

- [ ] On `https://datalemur.com/questions/<slug>` the popup shows the problem title and difficulty
- [ ] On the DataLemur home page or blog, the popup shows _Open a DataLemur question_ and Sync is disabled
- [ ] Navigating between questions inside the SPA (no reload) updates the popup
- [ ] Opening the popup before the editor mounts shows _Waiting for the editor…_, and it recovers after typing
- [ ] Editing the SQL updates the **Preview** contents

## Verdict

- [ ] Submitting a wrong answer leaves the status as _Not accepted yet_ and no badge appears
- [ ] Submitting a correct answer flips the status to _✓ Ready to Sync_ and shows the ✓ badge
- [ ] The badge is per-tab: another tab on a different site has no badge

## Sync

- [ ] **Sync** creates `Easy|Medium|Hard/<Problem>.sql` with the header comment and the query
- [ ] Commit message is `Add solution: <title>` on create
- [ ] Syncing the same solution again reports _Already exists_ and creates no commit
- [ ] Changing the query and syncing again updates the file (`Update solution: <title>`) — one file, not two
- [ ] The repo `README.md` reflects new totals and rows after each sync
- [ ] A Chrome notification appears for success and for every failure
- [ ] The popup progress panel and _Last sync_ update without reopening

## Auto-sync

- [ ] With auto-sync on, an accepted submission syncs with no interaction
- [ ] Re-rendering the page (resize, tab switch) does not produce repeat commits for the same solution
- [ ] Turning auto-sync off stops automatic commits immediately

## Error cases

| Scenario        | How to reproduce                                | Expected                                 |
| --------------- | ----------------------------------------------- | ---------------------------------------- |
| Invalid token   | Change one character in the token               | _Invalid or expired GitHub token_        |
| Repo missing    | Set repository to `does-not-exist`              | _Repository not found_                   |
| Wrong branch    | Set branch to `nope`                            | _Repository not found_                   |
| Read-only token | Fine-grained token with Contents: Read          | _Permission denied_                      |
| Offline         | DevTools → Network → Offline, then Sync         | _Network error_ after retries            |
| Not configured  | Clear the token, reload the popup               | _Settings required_, Sync disabled       |
| File conflict   | Edit the file on github.com, then sync a change | Succeeds after one automatic SHA refetch |

## Edge cases

- [ ] Title containing `/`, `:`, `?` or quotes produces a valid path with those characters removed
- [ ] Non-ASCII characters in a SQL comment round-trip correctly through GitHub (UTF-8 Base64)
- [ ] A very long title is truncated to 120 characters and still commits
- [ ] Empty editor: Sync stays disabled — nothing is committed
- [ ] Two tabs open on different questions each report their own problem
- [ ] Service worker idle-terminated (wait ~30s, then Sync from the popup) still works
- [ ] _Reset progress_ clears local counts and leaves GitHub untouched
- [ ] Dark mode and light mode both render correctly (toggle the OS theme with the popup open)
- [ ] The token never appears in any console output, notification or committed file
