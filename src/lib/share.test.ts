import { generateEmojiGrid, shareStatus } from './share'

// `var` (not const) so it is hoisted and merely `undefined` — not in a TDZ —
// when settings.ts reads `solution.length` during the mocked import. The
// getter supplies a safe default until a test sets a specific solution.
// eslint-disable-next-line no-var
var mockSolution: string | undefined
jest.mock('./words', () => ({
  ...jest.requireActual('./words'),
  get solution() {
    return mockSolution ?? 'ABCDE'
  },
}))

describe('generateEmojiGrid', () => {
  test('generates grid for ascii', () => {
    const guesses = ['EDCBA', 'VWXYZ', 'ABCDE']
    const tiles = ['C', 'P', 'A'] // Correct, Present, Absemt
    mockSolution = 'ABCDE'

    const grid = generateEmojiGrid(guesses, tiles)
    const gridParts = grid.split('\n')
    expect(gridParts[0]).toBe('PPCPP')
    expect(gridParts[1]).toBe('AAAAA')
    expect(gridParts[2]).toBe('CCCCC')
  })
  test('generates grid for emoji', () => {
    const guesses = ['5️⃣4️⃣3️⃣2️⃣1️⃣', '♠️♥️♦️♣️🔔', '1️⃣2️⃣3️⃣4️⃣5️⃣']
    const tiles = ['C', 'P', 'A'] // Correct, Present, Absemt
    mockSolution = '1️⃣2️⃣3️⃣4️⃣5️⃣'

    const grid = generateEmojiGrid(guesses, tiles)
    const gridParts = grid.split('\n')
    expect(gridParts[0]).toBe('PPCPP')
    expect(gridParts[1]).toBe('AAAAA')
    expect(gridParts[2]).toBe('CCCCC')
  })
})

describe('shareStatus text', () => {
  let clipboardText = ''

  beforeEach(() => {
    mockSolution = 'ABCDE'
    clipboardText = ''
    Object.assign(navigator, {
      clipboard: {
        writeText: (t: string) => {
          clipboardText = t
          return Promise.resolve()
        },
      },
    })
  })

  const share = (lost: boolean, guesses: string[]) => {
    shareStatus(guesses, lost, false, false, false, () => {})
    return clipboardText
  }

  test('leads with the de-spoilered puzzle number and score', () => {
    const text = share(false, ['ABCDE'])
    expect(text).toMatch(/^Hidden Wordle #\d+ 1\/6/)
  })

  test('ends with the share URL and contains the emoji grid', () => {
    const text = share(false, ['ABCDE'])
    expect(text.endsWith('https://hiddenwordle.vercel.app')).toBe(true)
    expect(text).toContain('🟩🟩🟩🟩🟩')
  })

  test('never leaks the passage / answer (no Arabic/Persian reference)', () => {
    const text = share(true, ['VWXYZ', 'VWXYZ', 'VWXYZ', 'VWXYZ', 'VWXYZ', 'VWXYZ'])
    expect(text).not.toMatch(/Arabic|Persian/)
    // lost games render X/6
    expect(text).toMatch(/^Hidden Wordle #\d+ X\/6/)
  })
})
