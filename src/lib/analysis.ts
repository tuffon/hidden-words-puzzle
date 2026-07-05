import { unicodeSplit } from './words'

export type Feedback = ('correct' | 'present' | 'absent')[]

// Compute the green/yellow/gray feedback a guess would earn against a given
// solution. This mirrors getGuessStatuses() in statuses.ts exactly — including
// the two-pass handling of DUPLICATE letters (all correct positions are claimed
// first, then each remaining guess letter can only "present"-match an
// as-yet-unclaimed solution position). The difference is that statuses.ts reads
// the module-level daily `solution`; here the solution is an explicit argument
// so the analysis is pure and works for any candidate word.
export const computeFeedback = (guess: string, solution: string): Feedback => {
  const splitSolution = unicodeSplit(solution)
  const splitGuess = unicodeSplit(guess)

  const solutionCharsTaken = splitSolution.map(() => false)
  const statuses: Feedback = Array.from(Array(splitGuess.length))

  // Pass 1: exact-position (correct) matches claim their solution slot.
  splitGuess.forEach((letter, i) => {
    if (letter === splitSolution[i]) {
      statuses[i] = 'correct'
      solutionCharsTaken[i] = true
    }
  })

  // Pass 2: the rest are present (if an unclaimed instance remains) or absent.
  splitGuess.forEach((letter, i) => {
    if (statuses[i]) return

    if (!splitSolution.includes(letter)) {
      statuses[i] = 'absent'
      return
    }

    const indexOfPresentChar = splitSolution.findIndex(
      (x, index) => x === letter && !solutionCharsTaken[index]
    )

    if (indexOfPresentChar > -1) {
      statuses[i] = 'present'
      solutionCharsTaken[indexOfPresentChar] = true
    } else {
      statuses[i] = 'absent'
    }
  })

  return statuses
}

// Does `guess` produce the same feedback against `candidate` as it did against
// the real `solution`? If so, `candidate` is still consistent with what the
// player saw for that guess. Inputs are expected to share a single letter case.
export const matchesFeedback = (
  candidate: string,
  guess: string,
  solution: string
): boolean => {
  const target = computeFeedback(guess, solution)
  const actual = computeFeedback(guess, candidate)
  return (
    target.length === actual.length &&
    target.every((status, i) => status === actual[i])
  )
}

// Given the ordered guesses of a solved game and the pool of possible answers
// (the words in HIDDEN_WORDS), return how many pool words are still consistent
// with the feedback AFTER each guess. The real solution is taken to be the last
// guess (a solved game ends on the answer), so the returned series narrows
// monotonically toward that answer, e.g. [24, 3, 1].
//
// Comparison is case-insensitive: guesses arrive uppercase from the game grid,
// while the answer pool is stored lowercase.
export const possibleAnswersAfterEachGuess = (
  guesses: string[],
  answerPool: string[]
): number[] => {
  if (guesses.length === 0) {
    return []
  }

  const normalizedGuesses = guesses.map((g) => g.toLowerCase())
  const normalizedPool = answerPool.map((w) => w.toLowerCase())
  const solution = normalizedGuesses[normalizedGuesses.length - 1]

  return normalizedGuesses.map((_, cutoff) => {
    const guessesSoFar = normalizedGuesses.slice(0, cutoff + 1)
    return normalizedPool.filter((candidate) =>
      guessesSoFar.every((guess) => matchesFeedback(candidate, guess, solution))
    ).length
  })
}
