import { getWordOfDay, isWordInWordList } from './words'
import { HIDDEN_WORDS, DAILY_ORDER } from '../constants/hiddenWords'

const MS_IN_DAY = 86400000

describe('getWordOfDay', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  const runForIndex = (index: number) => {
    const epochMs = new Date(2022, 0).valueOf()
    // land mid-day so the floor is unambiguous
    const now = epochMs + index * MS_IN_DAY + MS_IN_DAY / 2
    jest.spyOn(Date, 'now').mockReturnValue(now)
    return getWordOfDay()
  }

  test('is deterministic for a fixed date and selects passage-first', () => {
    const index = 500
    const wod = runForIndex(index)

    const expectedId = DAILY_ORDER[index % DAILY_ORDER.length]
    const expectedEntry = HIDDEN_WORDS.find((w) => w.id === expectedId)!

    expect(wod.puzzleNumber).toBe(index)
    expect(wod.passage.id).toBe(expectedId)
    expect(wod.solution).toBe(expectedEntry.word.toUpperCase())
    // solution is always hidden in that day's passage
    expect(new RegExp(`\\b${wod.solution}\\b`, 'i').test(wod.passage.text)).toBe(
      true
    )
  })

  test('advances to a different puzzle number the next day', () => {
    const a = runForIndex(500)
    jest.restoreAllMocks()
    const b = runForIndex(501)
    expect(b.puzzleNumber).toBe(a.puzzleNumber + 1)
  })

  test('wraps around the DAILY_ORDER after a full cycle', () => {
    const len = DAILY_ORDER.length
    const first = runForIndex(0)
    jest.restoreAllMocks()
    const wrapped = runForIndex(len)
    expect(wrapped.passage.id).toBe(first.passage.id)
    expect(wrapped.puzzleNumber).toBe(len)
  })
})

describe('isWordInWordList', () => {
  test('accepts every curated Hidden Word', () => {
    for (const w of HIDDEN_WORDS) {
      expect(isWordInWordList(w.word)).toBe(true)
      expect(isWordInWordList(w.word.toUpperCase())).toBe(true)
    }
  })

  test('accepts a plain valid guess from the guess list', () => {
    expect(isWordInWordList('crane')).toBe(true)
  })

  test('rejects a non-word', () => {
    expect(isWordInWordList('zzzzz')).toBe(false)
  })
})
