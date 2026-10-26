/** Assistant action next to Fork that opens the quotes drawer with this message preselected. */
import type { ReactNode } from 'react'
import { IconContextInjectionOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MessageId } from '@deepseek-ai/dsh-llm'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from './locales.ts'

/** Drawer opener injected by the browser plugin. */
export interface QuoteActionInjected {
  /** @param messageId - durable assistant message identity to preselect. */
  readonly openQuotes: (messageId: MessageId) => void
}

/** Composed props for the assistant-actions contribution. */
export type QuoteActionProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & PropsLocale<typeof NS>
  & InjectFace<QuoteActionInjected>

/**
 * Render the quote icon between copy and Fork.
 * @param props - durable message id, drawer opener, and localized copy.
 * @returns the icon action.
 */
export function QuoteAction({ messageId, openQuotes, t }: QuoteActionProps): ReactNode {
  const label = t('action.quote')
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        className="bq-action"
        aria-label={label}
        onClick={() => { openQuotes(messageId) }}
      >
        <IconContextInjectionOutlineRegular />
      </button>
    </Tooltip>
  )
}
