import { HIDDEN_WORDS, DAILY_ORDER } from './hiddenWords'

describe('HIDDEN_WORDS content invariants', () => {
  test('has entries', () => {
    expect(HIDDEN_WORDS.length).toBeGreaterThan(0)
  })

  test.each(HIDDEN_WORDS.map((w) => [w.id, w] as const))(
    '%s is a valid five-letter answer hidden in its verbatim passage',
    (_id, w) => {
      // exactly five lowercase ascii letters
      expect(w.word).toMatch(/^[a-z]{5}$/)
      // appears as a whole word, case-insensitively, inside the passage text
      const wholeWord = new RegExp(`\\b${w.word}\\b`, 'i')
      expect(wholeWord.test(w.text)).toBe(true)
      // link points at the official library
      expect(w.link.startsWith('https://www.bahai.org/')).toBe(true)
      // collection is one of the two books
      expect(['arabic', 'persian']).toContain(w.collection)
    }
  )

  test('ids are unique', () => {
    const ids = HIDDEN_WORDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('DAILY_ORDER is a permutation of the included ids', () => {
    const ids = HIDDEN_WORDS.map((w) => w.id)
    expect(DAILY_ORDER.length).toBe(ids.length)
    expect([...DAILY_ORDER].sort()).toEqual([...ids].sort())
  })
})
