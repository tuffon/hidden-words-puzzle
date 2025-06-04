import { BaseModal } from './BaseModal'
import { encode, decode } from '../../lib/cypher'

type Props = {
  isOpen: boolean
  quote: string
  analyzerUrl: string
  handleClose: () => void
}

export const QuoteModal = ({ isOpen, quote, analyzerUrl, handleClose }: Props) => {
  let quoteArr = quote.split('\n')
  let header = quoteArr[0]
  let body = quoteArr[1]
  return (
    <BaseModal title={header} isOpen={isOpen} handleClose={handleClose}>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        {body}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-300 mt-4">
        Would you like to analyze your guesses? <a target="_blank" href={analyzerUrl} className="text-blue-400">Click here</a>
      </p>
    </BaseModal>
  )
}
