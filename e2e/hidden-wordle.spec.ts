import { test, expect, Page } from '@playwright/test'

/**
 * Hidden Wordle — end-to-end suite (STAGING only).
 *
 * Safety invariants baked into this file:
 *  - Every test navigates only to the configured staging baseURL.
 *  - No /ask, backend, or LLM endpoint is ever called.
 *  - Storage is seeded per-test so the welcome modal never auto-opens and each
 *    test starts from a deterministic fresh game.
 *
 * How the app is driven (from source):
 *  - Standard 5-letter Wordle. Input is a window `keyup` listener: A–Z chars,
 *    `Enter` (e.code === 'Enter'), `Backspace`. So keyboard.type + press works.
 *  - On mount the app writes localStorage['gameState'] = {guesses, solution}
 *    where `solution` is today's real answer (UPPERCASE, 5 letters).
 *  - Seeding any gameState value BEFORE navigation suppresses the 350ms auto
 *    welcome InfoModal. Because our seed 'SEED0' != the real solution, the app
 *    resets guesses to [] and then overwrites gameState.solution with the REAL
 *    solution — which we read back at runtime.
 */

const FRESH_SEED = JSON.stringify({ guesses: [], solution: 'SEED0' })

/** Grid cells that have received a submitted status color (default, non-high-contrast mode). */
const STATUS_CELL_SELECTOR =
  '.w-14.h-14.bg-green-500, .w-14.h-14.bg-yellow-500, .w-14.h-14.bg-slate-400'
const GREEN_CELL_SELECTOR = '.w-14.h-14.bg-green-500'

const WIN_ALERT = /Great Job!|Awesome|Well done!/
const CITATION_RE =
  /^(Arabic|Persian) \d+ · The Hidden Words of Bahá'u'lláh$/

const REVEAL_MS = 350 * 5 // 1750ms — full row reveal animation

const WRONG_GUESS_POOL = [
  'audio',
  'crane',
  'slate',
  'mount',
  'field',
  'lucky',
  'ghost',
  'plumb',
  'wharf',
  'zebra',
]

/**
 * Seed a fresh, welcome-modal-suppressed game before navigation.
 *
 * Conditional on purpose: it only seeds when NO gameState exists yet. On a
 * test's first load that suppresses the auto welcome modal and forces a fresh
 * game (SEED0 != the real answer). On a later reload it leaves any persisted
 * gameState untouched — so the persistence test can verify restoration without
 * this seed clobbering the saved won game.
 */
async function seedFreshGame(page: Page) {
  await page.addInitScript((seed) => {
    if (!window.localStorage.getItem('gameState')) {
      window.localStorage.setItem('gameState', seed)
    }
  }, FRESH_SEED)
}

/** Navigate to staging and wait for the grid to mount. */
async function gotoApp(page: Page) {
  await page.goto('/')
  await expect(page.locator('.w-14.h-14').first()).toBeVisible()
}

/**
 * Read today's REAL solution after the app has overwritten the seed.
 * Polls until gameState.solution is a real 5-letter uppercase word (not SEED0).
 */
async function readSolution(page: Page): Promise<string> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          try {
            return JSON.parse(localStorage.getItem('gameState') || '{}').solution
          } catch {
            return null
          }
        }),
      { timeout: 10_000 }
    )
    .toMatch(/^[A-Z]{5}$/)
  const solution = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gameState') || '{}').solution
  )
  return solution as string
}

async function statusCellCount(page: Page): Promise<number> {
  return page.locator(STATUS_CELL_SELECTOR).count()
}

/** Filled-but-unsubmitted current-row cells carry the `border-black` class. */
const FILLED_CELL_SELECTOR = '.w-14.h-14.border-black'

function filledCells(page: Page) {
  return page.locator(FILLED_CELL_SELECTOR)
}

/**
 * PHYSICAL-keyboard input: exercises the app's headline `window` keyup listener
 * (A–Z). We wait for the filled-cell count to reach the word length so state has
 * caught up before we submit. Used by the reject-guess flows.
 */
async function typeGuessPhysically(page: Page, word: string) {
  await page.keyboard.type(word, { delay: 80 })
  await expect
    .poll(() => filledCells(page).count(), { timeout: 6_000 })
    .toBe(word.length)
  // Let the keyup listener rebind to the full guess before Enter.
  await page.waitForTimeout(150)
}

/**
 * ON-SCREEN-keyboard input: clicks the tap keyboard, verifying each letter
 * lands before the next click.
 *
 * This is used for the multi-step gameplay flows because it is fully
 * deterministic. The app rebinds its `window` keyup listener via useEffect on
 * every render, so fast PHYSICAL typing across consecutive guesses can hit a
 * stale onChar closure and silently drop keys. The on-screen keys are wired
 * through React prop handlers (`onClick={onChar}`), which always reflect the
 * latest render — no rebind lag, no dropped input.
 */
async function clickGuess(page: Page, word: string) {
  const filled = filledCells(page)

  // Clear any leftover partial input in the current row.
  let leftover = await filled.count()
  while (leftover > 0) {
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect.poll(() => filled.count(), { timeout: 2_000 }).toBe(leftover - 1)
    leftover -= 1
  }

  const letters = word.toUpperCase().split('')
  for (let i = 0; i < letters.length; i++) {
    await page.getByRole('button', { name: letters[i], exact: true }).click()
    await expect.poll(() => filled.count(), { timeout: 3_000 }).toBe(i + 1)
  }
}

/** Submit the filled current row via the on-screen Enter key. */
async function clickEnter(page: Page) {
  await page.getByRole('button', { name: 'Enter', exact: true }).click()
  await expect.poll(() => filledCells(page).count(), { timeout: 5_000 }).toBe(0)
}

/**
 * Fill (on-screen keyboard) and submit a 5-letter guess, then wait for the app
 * to accept it (status cells advance to `expectedTotalStatusCells`) and for the
 * reveal to settle so the next guess isn't dropped mid-animation.
 */
async function submitAcceptedGuess(
  page: Page,
  word: string,
  expectedTotalStatusCells: number
) {
  await clickGuess(page, word)
  await clickEnter(page)
  await expect
    .poll(() => statusCellCount(page), { timeout: 10_000 })
    .toBe(expectedTotalStatusCells)
  // Settling wait for the reveal animation before the next guess.
  await page.waitForTimeout(REVEAL_MS + 150)
}

/**
 * Submit today's solution as a winning guess and wait until the win registers
 * (the winning row's five cells all turn green — an immediate, persistent
 * signal, unlike the auto-dismissing win alert).
 */
async function playWinningGuess(page: Page, solution: string) {
  await clickGuess(page, solution)
  await clickEnter(page)
  await expect
    .poll(() => page.locator(GREEN_CELL_SELECTOR).count(), { timeout: 12_000 })
    .toBe(5)
}

test.beforeEach(async ({ page }) => {
  await seedFreshGame(page)
})

test('1. loads with the core Wordle UI and a readable 5-letter solution', async ({
  page,
}) => {
  await gotoApp(page)

  await expect(page).toHaveTitle('Hidden Wordle')

  // 6 rows x 5 cols = 30 cells minimum.
  await expect
    .poll(() => page.locator('.w-14.h-14').count())
    .toBeGreaterThanOrEqual(30)

  const solution = await readSolution(page)
  expect(solution).toMatch(/^[A-Z]{5}$/)
})

test('2. rejects a too-short guess with "Not enough letters" and adds no row', async ({
  page,
}) => {
  await gotoApp(page)
  await readSolution(page)

  await typeGuessPhysically(page, 'cran') // 4 letters, physical keyboard
  await page.keyboard.press('Enter')

  await expect(page.getByText('Not enough letters')).toBeVisible()
  // No completed row was added.
  expect(await statusCellCount(page)).toBe(0)
})

test('3. rejects an invalid word with "Word not found"', async ({ page }) => {
  await gotoApp(page)
  await readSolution(page)

  await typeGuessPhysically(page, 'zzzzz') // physical keyboard
  await page.keyboard.press('Enter')

  await expect(page.getByText('Word not found')).toBeVisible()
  expect(await statusCellCount(page)).toBe(0)
})

test('4. winning guess opens the passage modal with a valid citation and link', async ({
  page,
}) => {
  await gotoApp(page)
  const solution = await readSolution(page)

  // Submit the solution; the winning row's five cells all turn green.
  await playWinningGuess(page, solution)

  // Win alert (one of three messages) appears after the reveal.
  await expect(page.getByText(WIN_ALERT)).toBeVisible({ timeout: 12_000 })

  // Stats recorded the game.
  const totalGames = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gameStats') || '{}').totalGames
  )
  expect(totalGames).toBeGreaterThanOrEqual(1)

  // The QuoteModal opens shortly after the win alert.
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 12_000 })

  const header = (
    await dialog.locator('h3.quote-header').textContent()
  )?.trim()
  expect(header && header.length).toBeGreaterThan(0)

  await expect(dialog.getByText(CITATION_RE)).toBeVisible()

  const link = dialog.getByRole('link', { name: 'Read at bahai.org' })
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  expect(href!.startsWith('https://www.bahai.org/')).toBe(true)
})

test('5. six wrong guesses lose the game and reveal the solution + passage', async ({
  page,
}) => {
  await gotoApp(page)
  const solution = await readSolution(page)

  const wrong = WRONG_GUESS_POOL.filter(
    (w) => w.toUpperCase() !== solution
  ).slice(0, 6)
  expect(wrong.length).toBe(6)

  for (let i = 0; i < wrong.length; i++) {
    await submitAcceptedGuess(page, wrong[i], (i + 1) * 5)
  }

  // Persistent "The word was X" alert.
  await expect(
    page.getByText(`The word was ${solution}`)
  ).toBeVisible({ timeout: 12_000 })

  // The passage modal opens on a loss too.
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 12_000 })
})

test('6. sharing after a win copies a spoiler-free result to the clipboard', async ({
  page,
}) => {
  await gotoApp(page)
  const solution = await readSolution(page)

  await playWinningGuess(page, solution)

  // Close the auto-opened QuoteModal, then open Stats.
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 12_000 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 12_000 })

  // Open the Stats modal via the navbar chart icon (first svg in .right-icons).
  await page.locator('.right-icons svg').first().click()
  const shareButton = page.getByRole('button', { name: 'Share' })
  await expect(shareButton).toBeVisible({ timeout: 12_000 })
  await shareButton.click()

  await expect(page.getByText('Game copied to clipboard')).toBeVisible()

  const shared = await page.evaluate(() => navigator.clipboard.readText())

  expect(shared).toMatch(/^Hidden Wordle #\d+ [1-6X]\/6\*?\n\n/)
  expect(shared).toContain('https://hiddenwordle.vercel.app')
  expect(shared).toMatch(/[🟩🟨⬜⬛🟧🟦]/u)
  // Share must never spoil the passage.
  expect(shared).not.toContain('Arabic')
  expect(shared).not.toContain('Persian')
  expect(shared).not.toContain('Hidden Words of')
})

test('7. staging emits no Google Analytics and cannot pollute production GA4', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (req) => requests.push(req.url()))

  await gotoApp(page)
  const solution = await readSolution(page)

  // Play a full winning game so any analytics side effects would have fired.
  await playWinningGuess(page, solution)
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 12_000 })

  // (a) The GA4 hostname guard means window.gtag is never defined on staging.
  const gtagType = await page.evaluate(() => typeof (window as any).gtag)
  expect(gtagType).toBe('undefined')

  // (b) No analytics request of any kind was made — not the gtag.js loader and
  //     not a GA4 data-collection hit. This proves staging cannot pollute
  //     production analytics.
  const analyticsRequests = requests.filter((u) =>
    /google-analytics\.com|googletagmanager\.com|analytics\.google\.com|\/g\/collect/.test(
      u
    )
  )
  await test.info().attach('analytics-requests', {
    body: JSON.stringify(analyticsRequests, null, 2),
    contentType: 'application/json',
  })
  expect(analyticsRequests).toEqual([])
})

test('8. renders on a mobile viewport without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoApp(page)
  await readSolution(page)

  // Grid present.
  await expect
    .poll(() => page.locator('.w-14.h-14').count())
    .toBeGreaterThanOrEqual(30)
  // On-screen keyboard present (the Enter key is a stable landmark).
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()

  const scrollWidth = await page.evaluate(
    () => document.scrollingElement!.scrollWidth
  )
  expect(scrollWidth).toBeLessThanOrEqual(391)
})

test('9. a won game is restored after reload', async ({ page }) => {
  await gotoApp(page)
  const solution = await readSolution(page)

  await playWinningGuess(page, solution)

  // The app persists the won game to localStorage['gameState']. The beforeEach
  // seed is conditional (it never overwrites an existing gameState), so a plain
  // reload restores the persisted win — no re-seeding needed here.
  const wonState = await page.evaluate(() => localStorage.getItem('gameState'))
  expect(wonState).toContain(solution)

  await page.reload()
  await expect(page.locator('.w-14.h-14').first()).toBeVisible()

  // The won row is restored: five green cells.
  await expect
    .poll(() => page.locator(GREEN_CELL_SELECTOR).count(), { timeout: 12_000 })
    .toBe(5)

  const totalGames = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gameStats') || '{}').totalGames
  )
  expect(totalGames).toBeGreaterThanOrEqual(1)
})
