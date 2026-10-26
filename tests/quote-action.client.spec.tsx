// @vitest-environment jsdom
/** One action: click quotes immediately; hold or Shift+Enter opens multi-select. */
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MessageId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { QuoteAction, type QuoteActionProps } from '../src/client/QuoteAction.tsx'
import { zh } from '../src/client/locales.ts'
import { assistantNode, snapshotOf } from './fixtures.client.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Tooltip = ({ children }: { children?: ReactNode }) => <>{children}</>
  return { Tooltip, IconContextInjectionOutlineRegular: () => null }
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const messageId = MessageId('message-2')
const time = Date.UTC(2026, 9, 26, 4, 5, 6)

const chat: ChatSnapshot = snapshotOf([
  assistantNode({ key: 'assistant-key', seq: 2, time, messageId: 'message-2', blocks: [{ kind: 'text', text: 'second' }] }),
])

function mount() {
  const insertQuote = vi.fn((_text: string) => true)
  const openQuotes = vi.fn()
  const props = {
    messageId,
    sessionId: SessionId('session-1'),
    useConversation: (<T,>(select: (snapshot: { views: { get: () => ChatSnapshot } }) => T): T =>
      select({ views: { get: () => chat } })) as never,
    inputActions: { insertQuote } as never,
    openQuotes,
    t: ((key: string) => (zh as Readonly<Record<string, string>>)[key] ?? key) as QuoteActionProps['t'],
  } as QuoteActionProps
  return { ...render(<QuoteAction {...props} />), insertQuote, openQuotes }
}

describe('QuoteAction', () => {
  it('quotes this message on a plain click', () => {
    const ui = mount()

    fireEvent.click(ui.getByRole('button', { name: zh['action.quote'] }))

    expect(ui.insertQuote).toHaveBeenCalledOnce()
    expect(ui.insertQuote.mock.calls[0]![0]).toContain('<quoted_messages')
    expect(ui.insertQuote.mock.calls[0]![0]).toContain('second')
    expect(ui.openQuotes).not.toHaveBeenCalled()
  })

  it('opens multi-select on press-and-hold and suppresses the trailing click', () => {
    vi.useFakeTimers()
    const ui = mount()
    const button = ui.getByRole('button', { name: zh['action.quote'] })

    fireEvent.pointerDown(button, { pointerType: 'mouse', button: 0 })
    vi.advanceTimersByTime(500)
    fireEvent.pointerUp(button)
    fireEvent.click(button)

    expect(ui.openQuotes).toHaveBeenCalledWith(messageId)
    expect(ui.insertQuote).not.toHaveBeenCalled()
  })

  it('opens multi-select from the keyboard with Shift+Enter', () => {
    const ui = mount()

    fireEvent.keyDown(ui.getByRole('button', { name: zh['action.quote'] }), { key: 'Enter', shiftKey: true })

    expect(ui.openQuotes).toHaveBeenCalledWith(messageId)
    expect(ui.insertQuote).not.toHaveBeenCalled()
  })
})
