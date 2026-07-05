import { BaseModal } from './BaseModal'
import { HiddenWord } from '../../constants/hiddenWords'

type Props = {
  isOpen: boolean
  passage: HiddenWord
  handleClose: () => void
  onSeeAnalysis?: () => void
}

export const QuoteModal = ({
  isOpen,
  passage,
  handleClose,
  onSeeAnalysis,
}: Props) => {
  // The invocation header ends at the '!' that closes the "O …" vocative —
  // not simply the first '!': Persian 45 opens "Alas! Alas! O Lovers of
  // Worldly Desire!", all of which is invocation. Text is VERBATIM; only the
  // display is styled (uppercase via CSS), the data is never mutated.
  const vocativeStart = passage.text.startsWith('O ')
    ? 0
    : passage.text.indexOf(' O ') + 1
  const bangIndex = passage.text.indexOf('!', Math.max(vocativeStart, 0))
  const header =
    bangIndex === -1 ? passage.text : passage.text.slice(0, bangIndex + 1)
  const body = bangIndex === -1 ? '' : passage.text.slice(bangIndex + 1).trim()
  const citation = `${passage.collection === 'arabic' ? 'Arabic' : 'Persian'} ${
    passage.number
  } · The Hidden Words of Bahá'u'lláh`

  return (
    <BaseModal title="" isOpen={isOpen} handleClose={handleClose}>
      <h3 className="quote-header text-base font-semibold text-gray-900 dark:text-gray-100">
        {header}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {body}
      </p>
      <p className="mt-4 text-xs italic text-gray-500 dark:text-gray-400">
        {citation}
      </p>
      <a
        className="mt-2 inline-block text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        href={passage.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Read at bahai.org
      </a>
      {onSeeAnalysis && (
        <button
          type="button"
          onClick={onSeeAnalysis}
          className="mt-4 block text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          See how you solved it →
        </button>
      )}
    </BaseModal>
  )
}
