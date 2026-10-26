// @vitest-environment jsdom
/** The sent bundle card expands, labels foreign sources, and locates same-Session messages. */
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { BundleQuote, type BundleQuoteProps } from '../src/client/BundleQuote.tsx'
import type { MessageBundle } from '../src/client/bundle.ts'
import { zh } from '../src/client/locales.ts'
import { assistantNode, snapshotOf, userNode } from './fixtures.client.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Button = ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  )
  const Tag = ({ children }: { children?: ReactNode }) => <span>{children}</span>
  return {
    Button,
    Tag,
    IconContextInjectionOutlineRegular: () => null,
  }
})

afterEach(cleanup)

const sessionId = SessionId('session-1')
const time = Date.UTC(2026, 9, 26, 4, 5, 6)

const translate = ((key: string, params?: Readonly<Record<string, string | number>>) => {
  let text = (zh as Readonly<Record<string, string>>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}) as BundleQuoteProps['t']

function chat(): ChatSnapshot {
  return snapshotOf([
    userNode({ key: 'user-key', seq: 1, time, messageId: 'message-1', content: [{ type: 'text', text: 'first' }] }),
    assistantNode({ key: 'assistant-key', seq: 2, time, messageId: 'message-2', blocks: [{ kind: 'text', text: 'second' }] }),
  ])
}

function bundle(sourceSession = 'session-1'): MessageBundle {
  return {
    sourceSession,
    count: 2,
    items: [
      {
        role: 'user', messageId: 'message-1', seq: 1, time: new Date(time).toISOString(), sessionId: sourceSession,
        text: 'first', attachments: [], skills: [], references: [],
      },
      {
        role: 'assistant', messageId: 'message-2', seq: 2, time: new Date(time).toISOString(), sessionId: sourceSession,
        text: 'second', attachments: [{ kind: 'image', name: 'shot.png' }], skills: [], references: [],
      },
    ],
  }
}

function mount(data = bundle()) {
  const props = {
    node: { id: 'betterQuoteBundle', start: 0, end: 1, data },
    raw: '',
    interactive: true,
    sessionId,
    useConversation: (<T,>(select: (snapshot: { views: { get: () => ChatSnapshot } }) => T): T =>
      select({ views: { get: () => chat() } })) as never,
    t: translate,
  } as BundleQuoteProps
  return render(<BundleQuote {...props} />)
}

describe('BundleQuote', () => {
  it('renders the bundle and locates a same-Session source', () => {
    const ui = mount()
    expect(ui.getByText(zh['bundle.title'].replace('{count}', '2'))).toBeTruthy()
    expect(ui.getByText('first')).toBeTruthy()
    expect(ui.getByText('second')).toBeTruthy()

    const target = document.createElement('div')
    target.dataset.chatNodeKey = 'user-key'
    const scrollIntoView = vi.fn()
    Object.defineProperty(target, 'scrollIntoView', { value: scrollIntoView })
    document.body.append(target)

    try {
      fireEvent.click(ui.getAllByRole('button', { name: zh['bundle.locate'] })[0]!)
    } finally {
      target.remove()
    }

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('labels a foreign source and hides locate', () => {
    const ui = mount(bundle('session-2'))

    expect(ui.getByText(zh['bundle.otherSession'])).toBeTruthy()
    expect(ui.queryByRole('button', { name: zh['bundle.locate'] })).toBeNull()
  })
})
