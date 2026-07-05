import { BaseModal } from './BaseModal'
import { HIDDEN_WORDS, HiddenWord } from '../../constants/hiddenWords'
import { CharStatus } from '../../lib/statuses'
import {
  computeFeedback,
  possibleAnswersAfterEachGuess,
} from '../../lib/analysis'
import { unicodeSplit } from '../../lib/words'
import { getStoredIsHighContrastMode } from '../../lib/localStorage'
import classnames from 'classnames'

type Props = {
  isOpen: boolean
  guesses: string[]
  passage?: HiddenWord
  handleClose: () => void
  onShare?: () => void
}

const STATUS_LABEL: { [key in CharStatus]: string } = {
  correct: 'correct',
  present: 'in the Hidden Word, wrong place',
  absent: 'not in the Hidden Word',
}

const ANSWER_POOL = HIDDEN_WORDS.map((w) => w.word)

const Tile = ({ letter, status }: { letter: string; status: CharStatus }) => {
  const isHighContrast = getStoredIsHighContrastMode()
  const classes = classnames(
    'w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded border-2 text-lg font-bold uppercase text-white',
    {
      'bg-orange-500 border-orange-500': status === 'correct' && isHighContrast,
      'bg-green-500 border-green-500': status === 'correct' && !isHighContrast,
      'bg-cyan-500 border-cyan-500': status === 'present' && isHighContrast,
      'bg-yellow-500 border-yellow-500':
        status === 'present' && !isHighContrast,
      'bg-slate-400 dark:bg-slate-700 border-slate-400 dark:border-slate-700':
        status === 'absent',
    }
  )
  return (
    <div
      className={classes}
      role="img"
      aria-label={`${letter}, ${STATUS_LABEL[status]}`}
    >
      <span aria-hidden="true">{letter}</span>
    </div>
  )
}

export const AnalysisModal = ({
  isOpen,
  guesses,
  passage,
  handleClose,
  onShare,
}: Props) => {
  if (guesses.length === 0) {
    return (
      <BaseModal
        title="How you solved it"
        isOpen={isOpen}
        handleClose={handleClose}
      >
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Solve today&apos;s Hidden Word to see how each guess narrowed it down.
        </p>
      </BaseModal>
    )
  }

  // A solved game ends on the answer, so the final guess is the solution.
  const solution = guesses[guesses.length - 1]
  // Prefer the passage the caller already knows (today's game); for an inbound
  // shared "?solve=" link, recover it from the pool by the solved word.
  const resolvedPassage =
    passage ?? HIDDEN_WORDS.find((w) => w.word === solution.toLowerCase())
  const citation = resolvedPassage
    ? `${resolvedPassage.collection === 'arabic' ? 'Arabic' : 'Persian'} ${
        resolvedPassage.number
      } · The Hidden Words of Bahá'u'lláh`
    : undefined

  const remaining = possibleAnswersAfterEachGuess(guesses, ANSWER_POOL)
  // The reflective series: the whole pool, then what stayed possible after each
  // guess. The final guess IS the answer, so the series always resolves to
  // "solved" — e.g. 146 → 24 → 3 → solved. (Some words, like "heart", appear in
  // several passages, so the raw count before the final guess can stay above 1;
  // the player still solved it, hence the terminal label is always "solved".)
  const narrowing = [ANSWER_POOL.length, ...remaining]
  const narrowingLabels = narrowing.map((count, i) =>
    i === narrowing.length - 1 ? 'solved' : String(count)
  )

  return (
    <BaseModal
      title="How you solved it"
      isOpen={isOpen}
      handleClose={handleClose}
    >
      {citation && (
        <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
          {citation}
        </p>
      )}

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Each guess quietly narrowed the {ANSWER_POOL.length} Hidden Words down
        to the one before you.
      </p>

      <p
        className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200"
        aria-label={`Possible Hidden Words remaining: ${narrowingLabels.join(
          ', then '
        )}.`}
      >
        <span aria-hidden="true">{narrowingLabels.join(' → ')}</span>
      </p>

      <ol className="mt-4 space-y-3 text-left">
        {guesses.map((guess, guessIndex) => {
          const statuses = computeFeedback(guess, solution)
          const letters = unicodeSplit(guess)
          const count = remaining[guessIndex]
          const solved = guessIndex === guesses.length - 1
          return (
            <li key={guessIndex} className="flex flex-col gap-1">
              <div
                className="flex justify-center gap-1"
                role="group"
                aria-label={`Guess ${guessIndex + 1}: ${letters.join(', ')}`}
              >
                {letters.map((letter, i) => (
                  <Tile key={i} letter={letter} status={statuses[i]} />
                ))}
              </div>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {solved
                  ? 'You found the Hidden Word — solved.'
                  : `${count} Hidden ${
                      count === 1 ? 'Word' : 'Words'
                    } still possible`}
              </p>
            </li>
          )
        })}
      </ol>

      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="mt-5 inline-block text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Share how you solved it
        </button>
      )}
    </BaseModal>
  )
}
