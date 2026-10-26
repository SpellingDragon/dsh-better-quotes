// @vitest-environment jsdom
/** The right-Sidebar quotes tab selects rows in place and carries quote or forward from its footer. */
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { QuoteDrawer, type QuoteDrawerProps } from '../src/client/QuoteDrawer.tsx'
import { zh } from '../src/client/locales.ts'
import { assistantNode, snapshotOf, userNode } from './fixtures.client.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Button = ({ children, onClick, disabled, 'aria-label': ariaLabel }: {
    children?: ReactNode
    onClick?: () => void
    disabled?: boolean
    'aria-label'?: string
  }) => <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>
  const Checkbox = ({ checked }: { checked: boolean }) => <input type="checkbox" checked={checked} readOnly />
  const Input = ({ value, onChange, placeholder, 'aria-label': ariaLabel }: {
    value?: string
    onChange?: (event: { target: { value: string } }) => void
    placeholder?: string
    'aria-label'?: string
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={event => { onChange?.({ target: { value: event.target.value } }) }}
    />
  )
  const Tag = ({ children }: { children?: ReactNode }) => <span>{children}</span>
  const Icon = () => null
  return {
    Button,
    Checkbox,
    Input,
    Tag,
    IconPaperclipOutlineRegular: Icon,
    IconSearchOutlineRegular: Icon,
    IconSkillOutlineRegular: Icon,
    fileSizeText: (bytes: number) => `${String(bytes)} B`,
  }
})

afterEach(cleanup)

const sessionId = SessionId('session-1')
const targetId = SessionId('session-2')
const time = Date.UTC(2026, 9, 26, 4, 5, 6)

const translate = ((key: string, params?: Readonly<Record<string, string | number>>) => {
  let text = (zh as Readonly<Record<string, string>>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}) as QuoteDrawerProps['t']

function chat(): ChatSnapshot {
  return snapshotOf([
    userNode({ key: 'user-key', seq: 1, time, messageId: 'message-1', content: [{ type: 'text', text: 'first' }] }),
    assistantNode({
      key: 'assistant-key',
      seq: 2,
      time,
      messageId: 'message-2',
      blocks: [{ kind: 'text', text: 'second' }],
      provider: 'deepseek',
      model: 'deepseek-chat',
    }),
  ])
}

const sessions: SessionListState = {
  ids: [targetId, sessionId],
  byId: {
    [String(sessionId)]: {
      id: sessionId, displayTitle: 'Current', running: false, blank: false, updatedAt: 1, retainedBy: {},
    },
    [String(targetId)]: {
      id: targetId, displayTitle: 'Target', cwd: '/tmp/target', running: false, blank: false, updatedAt: 2, retainedBy: {},
    },
  },
  phase: 'ready',
  projectionsBySession: {},
}

function count(value: number): string {
  return zh['drawer.selected'].replace('{count}', String(value))
}

function insertName(value: number): string {
  return zh['drawer.insert'].replace('{count}', String(value))
}

function mount(options: { select?: string; insertQuote?: (text: string) => boolean; visible?: boolean } = {}) {
  const insertQuote = vi.fn(options.insertQuote ?? ((_text: string) => true))
  const forward = vi.fn(async (_target: SessionId, _text: string) => undefined)
  const collapse = vi.fn()
  const navigation = {
    params: options.select === undefined ? {} : { select: options.select },
    revision: 0,
  }
  const tab = { navigation, visible: options.visible ?? true }
  const props = {
    sessionId,
    useConversation: (<T,>(select: (snapshot: { views: { get: () => ChatSnapshot } }) => T): T =>
      select({ views: { get: () => chat() } })) as never,
    useSessions: (<T,>(select: (list: SessionListState) => T): T => select(sessions)) as never,
    inputActions: { insertQuote } as never,
    useTabInfo: () => ({ tab }),
    collapse,
    forward,
    t: translate,
  } as QuoteDrawerProps
  const ui = render(<QuoteDrawer {...props} />)
  return {
    ...ui,
    insertQuote,
    forward,
    collapse,
    navigate(select: string) {
      navigation.params = { select }
      navigation.revision += 1
      ui.rerender(<QuoteDrawer {...props} />)
    },
    setVisible(visible: boolean) {
      tab.visible = visible
      ui.rerender(<QuoteDrawer {...props} />)
    },
  }
}

describe('QuoteDrawer', () => {
  it('toggles a row by clicking it and inserts one bounded bundle', () => {
    const ui = mount()

    fireEvent.click(ui.getByText('first'))
    expect(ui.getByText(count(1))).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: insertName(1) }))

    expect(ui.insertQuote).toHaveBeenCalledOnce()
    const text = ui.insertQuote.mock.calls[0]![0]
    expect(text.startsWith(`${zh['bundle.title'].replace('{count}', '1')} · first`)).toBe(true)
    expect(text).toContain('<quoted_messages')
    expect(text).toContain('source_session="session-1"')
    expect(text).toContain('first')
    expect(ui.getByText(count(0))).toBeTruthy()
    expect(ui.collapse).toHaveBeenCalledOnce()
  })

  it('preselects the message the opener navigated to', async () => {
    const ui = mount({ select: 'message-2' })

    await waitFor(() => { expect(ui.getByText(count(1))).toBeTruthy() })
    fireEvent.click(ui.getByRole('button', { name: insertName(1) }))
    expect(ui.insertQuote.mock.calls[0]![0]).toContain('second')
  })

  it('replaces the selection when the tab is navigated again', async () => {
    const ui = mount()

    fireEvent.click(ui.getByText('first'))
    ui.navigate('message-2')

    await waitFor(() => { expect(ui.getByText(count(1))).toBeTruthy() })
    fireEvent.click(ui.getByRole('button', { name: insertName(1) }))
    expect(ui.insertQuote.mock.calls[0]![0]).toContain('second')
    expect(ui.insertQuote.mock.calls[0]![0]).not.toContain('first')
  })

  it('filters rows, toggles all shown rows, and reports an empty search', () => {
    const ui = mount()
    const search = ui.getByRole('textbox', { name: zh['drawer.searchMessages'] })

    fireEvent.change(search, { target: { value: 'second' } })
    expect(ui.queryByText('first')).toBeNull()
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.selectAll'] }))
    expect(ui.getByText(count(1))).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.clear'] }))
    expect(ui.getByText(count(0))).toBeTruthy()

    fireEvent.change(search, { target: { value: 'missing' } })
    expect(ui.getByText(zh['drawer.noResults'])).toBeTruthy()
  })

  it('forwards the selection to another Session', async () => {
    const ui = mount()
    fireEvent.click(ui.getByText('first'))
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.forward'] }))
    fireEvent.click(ui.getByText('Target'))
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.sendTo'].replace('{title}', 'Target') }))

    await waitFor(() => {
      expect(ui.forward).toHaveBeenCalledWith(
        targetId,
        expect.stringContaining('The user forwarded the following messages'),
      )
    })
    expect(ui.forward.mock.calls[0]![1]).toContain('<quoted_messages')
    expect(ui.collapse).toHaveBeenCalledOnce()
  })

  it('reports an insert refusal and keeps the selection', () => {
    const ui = mount({ insertQuote: () => false })
    fireEvent.click(ui.getByText('first'))
    fireEvent.click(ui.getByRole('button', { name: insertName(1) }))

    expect(ui.getByRole('alert').textContent).toBe(zh['drawer.insertFailed'])
    expect(ui.getByText(count(1))).toBeTruthy()
    expect(ui.collapse).not.toHaveBeenCalled()
  })

  it('jumps the message list to the newest messages whenever the tab becomes visible', () => {
    const ui = mount({ visible: false })
    const list = ui.container.querySelector('.bq-list')
    if (list === null) throw new Error('message list expected')
    Object.defineProperty(list, 'scrollHeight', { value: 420, configurable: true })

    ui.setVisible(true)

    expect(list.scrollTop).toBe(420)
  })
})
