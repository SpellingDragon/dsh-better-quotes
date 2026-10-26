/** One assistant action next to Fork: click quotes this message, press-and-hold opens multi-select. */
import { useEffect, useRef, type ReactNode } from 'react'
import { IconContextInjectionOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { formatBundle } from './bundle.ts'
import { assistantCandidateByMessage } from './candidates.ts'
import { insertQuoteText } from './input.ts'
import type { NS } from './locales.ts'

/** Press-and-hold threshold before the multi-select picker opens. */
const HOLD_MS = 500

/** Inline picker opener injected by the browser plugin. */
export interface QuoteActionInjected {
  /**
   * Open the conversation-inline picker above the composer.
   * @param focus - durable message identity to preselect.
   */
  readonly openPicker: (focus?: string) => void
}

/** Composed props for the assistant-actions contribution. */
export type QuoteActionProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & PropsLocale<typeof NS>
  & InjectFace<QuoteActionInjected>

/**
 * Render the single quote action between copy and Fork.
 * @param props - durable message id, Chat/input seats, picker opener, and localized copy.
 * @returns the icon action.
 */
export function QuoteAction({ messageId, sessionId, useConversation, inputActions, openPicker, t }: QuoteActionProps): ReactNode {
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const timer = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const clearHold = (): void => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clearHold, [])

  const quoteNow = (): void => {
    const candidate = assistantCandidateByMessage(chat, String(messageId))
    if (candidate === undefined) return
    insertQuoteText(inputActions, formatBundle([candidate], sessionId))
  }
  const label = t('action.quote')
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        className="bq-action"
        aria-label={label}
        aria-keyshortcuts="Shift+Enter"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          quoteNow()
        }}
        onKeyDown={event => {
          if (!event.shiftKey || (event.key !== 'Enter' && event.key !== ' ')) return
          event.preventDefault()
          clearHold()
          suppressClick.current = true
          openPicker(String(messageId))
        }}
        onPointerDown={event => {
          if (event.pointerType === 'mouse' && event.button !== 0) return
          clearHold()
          timer.current = window.setTimeout(() => {
            timer.current = null
            suppressClick.current = true
            openPicker(String(messageId))
          }, HOLD_MS)
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
      >
        <IconContextInjectionOutlineRegular />
      </button>
    </Tooltip>
  )
}
