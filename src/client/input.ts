/** Quote insertion with a plain-text fallback for hosts that predate `insertQuote`. */
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'

interface QuoteInputActions extends InputActions {
  insertQuote?: (text: string) => boolean
}

/**
 * Insert one bundle, preferring the atomic quote node and falling back to text at the caret.
 * @param inputActions - Session input actions.
 * @param text - serialized quoted-message bundle.
 * @returns whether the draft accepted the insertion.
 */
export function insertQuoteText(inputActions: InputActions, text: string): boolean {
  const actions: QuoteInputActions = inputActions
  return actions.insertQuote === undefined
    ? inputActions.insertText(text, inputActions.captureInsertion())
    : actions.insertQuote(text)
}
