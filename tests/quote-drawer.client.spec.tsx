// @vitest-environment jsdom
/** The drawer selects messages, inserts bundles, and forwards them to another Session. */
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
  const Button = ({ children, onClick, disabled, 'aria-label': ariaLabel, title }: {
    children?: ReactNode
    onClick?: () => void
    disabled?: boolean
    'aria-label'?: string
    title?: string
  }) => <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={title}>{children}</button>
  const Checkbox = ({ checked, onChange, label }: {
    checked: boolean
    onChange: (next: boolean) => void
    label: string
  }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={event => { onChange(event.target.checked) }} />
      <span>{label}</span>
    </label>
  )
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
  const SegmentedControl = ({ value, options, onChange, label }: {
    value: string
    options: readonly { value: string; label: string }[]
    onChange: (next: string) => void
    label: string
  }) => (
    <div role="tablist" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => { onChange(option.value) }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
  const Tag = ({ children }: { children?: ReactNode }) => <span>{children}</span>
  const Icon = () => null
  return {
    Button,
    Checkbox,
    Input,
    SegmentedControl,
    Tag,
    IconContextInjectionOutlineRegular: Icon,
    IconLinkOutlineRegular: Icon,
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

function mount(options: { select?: string; insertQuote?: (text: string) => boolean } = {}) {
  const insertQuote = vi.fn(options.insertQuote ?? ((_text: string) => true))
  const forward = vi.fn(async (_target: SessionId, _text: string) => undefined)
  const navigation = { params: options.select === undefined ? {} : { select: options.select }, revision: 0 }
  const props = {
    sessionId,
    useConversation: (<T,>(select: (snapshot: { views: { get: () => ChatSnapshot } }) => T): T =>
      select({ views: { get: () => chat() } })) as never,
    inputActions: { insertQuote } as never,
    useTabInfo: () => ({ tab: { navigation } }),
    useSessionList: (<T,>(select: (state: SessionListState) => T): T => select(sessions)) as never,
    forward,
    t: translate,
  } as QuoteDrawerProps
  return { ...render(<QuoteDrawer {...props} />), insertQuote, forward }
}

describe('QuoteDrawer', () => {
  it('selects messages and inserts one bounded bundle', () => {
    const ui = mount()
    fireEvent.click(ui.getAllByRole('checkbox')[0]!)
    expect(ui.getByText(count(1))).toBeTruthy()

    fireEvent.click(ui.getByRole('button', { name: zh['drawer.insert'].replace('{count}', '1') }))

    expect(ui.insertQuote).toHaveBeenCalledOnce()
    const text = ui.insertQuote.mock.calls[0]![0]
    expect(text).toContain('<quoted_messages')
    expect(text).toContain('source_session="session-1"')
    expect(text).toContain('first')
    expect(ui.getByText(zh['drawer.inserted'])).toBeTruthy()
    expect(ui.getByText(count(0))).toBeTruthy()
  })

  it('preselects the message requested by the assistant action', async () => {
    const ui = mount({ select: 'message-2' })

    await waitFor(() => { expect(ui.getByText(count(1))).toBeTruthy() })
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.insert'].replace('{count}', '1') }))
    expect(ui.insertQuote.mock.calls[0]![0]).toContain('second')
  })

  it('filters messages and reports an empty search', () => {
    const ui = mount()
    const search = ui.getByRole('textbox', { name: zh['drawer.searchMessages'] })

    fireEvent.change(search, { target: { value: 'second' } })
    expect(ui.queryByText('first')).toBeNull()
    expect(ui.getByText('second')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'missing' } })
    expect(ui.getByText(zh['drawer.noResults'])).toBeTruthy()
  })

  it('forwards selected messages to another Session', async () => {
    const ui = mount()
    fireEvent.click(ui.getByRole('tab', { name: zh['drawer.mode.forward'] }))
    fireEvent.click(ui.getAllByRole('checkbox')[0]!)
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.chooseTarget'] }))
    fireEvent.click(ui.getByText('Target'))
    fireEvent.click(ui.getByRole('button', { name: zh['drawer.sendTo'].replace('{title}', 'Target') }))

    await waitFor(() => {
      expect(ui.forward).toHaveBeenCalledWith(
        targetId,
        expect.stringContaining('The user forwarded the following messages'),
      )
    })
    expect(ui.forward.mock.calls[0]![1]).toContain('<quoted_messages')
    expect(await ui.findByText(zh['drawer.forwarded'].replace('{title}', 'Target'))).toBeTruthy()
  })

  it('keeps the drawer open and reports an insert refusal', () => {
    const ui = mount({ insertQuote: () => false })
    fireEvent.click(ui.getAllByRole('checkbox')[0]!)

    fireEvent.click(ui.getByRole('button', { name: zh['drawer.insert'].replace('{count}', '1') }))

    expect(ui.getByRole('alert').textContent).toBe(zh['drawer.insertFailed'])
  })
})
