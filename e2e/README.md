# Hidden Wordle — end-to-end suite

Playwright (`@playwright/test`) black-box tests that drive the **Hidden Wordle**
game exactly as a player would (keyboard input, real DOM, real clipboard) and
assert its user-facing behavior.

## What it covers

`e2e/hidden-wordle.spec.ts` — nine independent user-story flows:

1. Loads with the core Wordle UI and a readable 5-letter solution.
2. Rejects a too-short guess (`Not enough letters`) and adds no row.
3. Rejects an invalid word (`Word not found`).
4. Winning guess opens the passage (QuoteModal) with a valid citation, a
   non-empty invocation header, and a `Read at bahai.org` link to `bahai.org`.
5. Six wrong guesses lose the game, revealing the solution and the passage.
6. Sharing after a win copies a **spoiler-free** result to the clipboard
   (format + share URL + emoji grid, and no passage text).
7. Staging emits **no Google Analytics** and cannot pollute production GA4.
8. Renders on a 390×844 mobile viewport with no horizontal overflow.
9. A won game is restored after reload.

## How it works (test design)

- **Fresh, deterministic start:** each test seeds
  `localStorage['gameState'] = {guesses:[], solution:'SEED0'}` *before*
  navigation — but only when no `gameState` exists yet. Seeding suppresses the
  auto welcome modal, and because `SEED0` ≠ the real answer the app resets to a
  fresh game and then overwrites `gameState.solution` with today's REAL answer —
  which the test reads back at runtime (`readSolution`). No answer is hard-coded,
  so the suite keeps working as the daily word rotates. The seed is *conditional*
  so that the persistence test's reload restores the saved won game instead of
  being clobbered back to a fresh one.
- **Input — both documented paths are covered:**
  - _Physical keyboard_ (`window` `keyup`, A–Z + Enter): the reject-guess flows
    (2 & 3) use `page.keyboard.type(...)` + `page.keyboard.press('Enter')`.
  - _On-screen tap keyboard_: the multi-step gameplay flows (4–9) click the
    on-screen keys. This is deliberate and makes the suite deterministic: the
    app rebinds a single `window` keyup listener via `useEffect` on every render,
    so blasting physical keys across consecutive guesses can transiently hit a
    stale `onChar` closure and silently drop keystrokes. The on-screen keys are
    wired through React prop handlers (`onClick={onChar}`), which always reflect
    the latest render — no rebind lag. (A human typing at normal speed never hits
    the race; only fast automation does.)
- **Waiting:** Playwright auto-waiting / `expect.poll` everywhere (each typed key
  is confirmed landed before the next); the only fixed waits are single
  reveal-animation settles (`350ms × 5`) between the six guesses of the loss
  flow. The suite runs `workers: 1` so CPU contention doesn't widen that rebind
  window.

## Running

The suite targets the **staging** deployment only (a free static site). It never
calls any backend, `/ask`, or LLM endpoint, and never touches production.

```bash
npm install
npx playwright install chromium

# default target is the staging URL baked into playwright.config.ts
npm run test:e2e

# or point at a different host
STAGING_URL=https://hidden-wordle-git-staging-hidden-wordle.vercel.app/ npm run test:e2e

# handy variants
npx playwright test --reporter=list
npx playwright show-report            # open the HTML report
```

Config lives in `playwright.config.ts` (one `chromium` project, clipboard
permissions granted, `retries: 1`, generous timeouts).
