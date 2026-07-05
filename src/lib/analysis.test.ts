import {
  computeFeedback,
  matchesFeedback,
  possibleAnswersAfterEachGuess,
} from './analysis'
import { HIDDEN_WORDS } from '../constants/hiddenWords'

describe('computeFeedback — duplicate letters', () => {
  // Guess "AABBB" against solution "ABCDE": there is only ONE 'A' and ONE 'B'
  // in the solution. A naive "is this letter in the solution?" check would
  // wrongly mark the SECOND 'A' present and all three 'B's present. The correct
  // (statuses.ts) algorithm claims each solution letter at most once, so the
  // extra duplicates must come back absent.
  test('does not over-credit duplicate guess letters', () => {
    expect(computeFeedback('AABBB', 'ABCDE')).toEqual([
      'correct', // A matches position 0
      'absent', // second A — solution's only A is already claimed
      'present', // B exists in solution (position 1)
      'absent', // solution's only B is already claimed
      'absent', // ditto
    ])
  })

  test('two present letters when the solution genuinely has two', () => {
    // ERASE vs SPEED: both E's are present (solution has two E's), R and A
    // absent, S present.
    expect(computeFeedback('ERASE', 'SPEED')).toEqual([
      'present',
      'absent',
      'absent',
      'present',
      'present',
    ])
  })

  test('all-correct only when the guess equals the solution', () => {
    expect(computeFeedback('HEART', 'HEART')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ])
  })
})

describe('matchesFeedback', () => {
  test('accepts a candidate that reproduces the observed feedback', () => {
    // Guess AABBB vs solution ABCDE yields [C, absent, present, absent, absent].
    // Candidate ABXYZ has exactly one A (position 0) and one B (position 1, so
    // "present" not "correct"), reproducing that pattern — it survives.
    expect(matchesFeedback('ABXYZ', 'AABBB', 'ABCDE')).toBe(true)
  })

  test('rejects a candidate whose duplicate letters would show differently', () => {
    // Candidate AABYZ has two A's and would light the second A/greens
    // differently, so it cannot be the answer given what the player saw.
    expect(matchesFeedback('AABYZ', 'AABBB', 'ABCDE')).toBe(false)
  })

  test('a word always matches its own feedback', () => {
    expect(matchesFeedback('SHARE', 'STARE', 'SHARE')).toBe(true)
  })
})

describe('possibleAnswersAfterEachGuess', () => {
  test('returns an empty series when there are no guesses', () => {
    expect(possibleAnswersAfterEachGuess([], ['heart'])).toEqual([])
  })

  test('hand-checked small example narrows 4 -> 1', () => {
    // Pool of five words sharing the S_ARE frame. Solution is SHARE.
    const pool = ['STARE', 'SPARE', 'SHARE', 'SNARE', 'SCARE']
    // Guess STARE vs SHARE => [correct, absent, correct, correct, correct]:
    // the absent 'T' eliminates STARE itself but keeps the four words whose
    // second letter is not T. Then the solved guess SHARE pins it to one.
    expect(possibleAnswersAfterEachGuess(['STARE', 'SHARE'], pool)).toEqual([
      4, 1,
    ])
  })

  test('is case-insensitive between uppercase guesses and the lowercase pool', () => {
    const pool = ['stare', 'spare', 'share', 'snare', 'scare']
    expect(possibleAnswersAfterEachGuess(['STARE', 'SHARE'], pool)).toEqual([
      4, 1,
    ])
  })

  test('over the real Hidden Words pool: non-increasing and ends solved', () => {
    const pool = HIDDEN_WORDS.map((w) => w.word)
    // A plausible solved game whose last guess is a real answer ("heart").
    const guesses = ['CRANE', 'SLOPE', 'HEART']
    const series = possibleAnswersAfterEachGuess(guesses, pool)

    expect(series).toHaveLength(guesses.length)
    // never widens
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeLessThanOrEqual(series[i - 1])
    }
    // never exceeds the pool
    expect(series[0]).toBeLessThanOrEqual(pool.length)
    // The solving guess narrows to exactly the passages that are letter-for-
    // letter indistinguishable from the answer — i.e. every Hidden Word whose
    // word IS "heart". Several passages share that word, so this is a small
    // number > 1, not necessarily 1.
    const heartPassages = pool.filter((w) => w === 'heart').length
    expect(heartPassages).toBeGreaterThan(1)
    expect(series[series.length - 1]).toBe(heartPassages)
  })
})
