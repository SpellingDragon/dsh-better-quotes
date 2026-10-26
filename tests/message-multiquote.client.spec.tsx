// @vitest-environment jsdom
/** The picker selects both authors, inserts in log order, and falls back to plain text insertion. */
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import { MessageMultiquote, type MessageMultiquoteProps } from '../src/client/MessageMultiquote.tsx'
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
  const Modal = ({ open, title, children, footer }: {
    open: boolean
    title: string
    children?: ReactNode
    footer?: ReactNode
  }) => open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null
  const Tag = ({ children }: { children?: ReactNode }) => <span>{children}</span>
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
  const Icon = () => null
  return {
    Button,
    Checkbox,
    Input,
    Modal,
    Tag,
    IconChecklistOutlineRegular: Icon,
    IconLinkOutlineRegular: Icon,
    IconPaperclipOutlineRegular: Icon,
    IconSearchOutlineRegular: Icon,
    IconSkillOutlineRegular: Icon,
    fileSizeText: (bytes: number) => `${String(bytes)} B`,
  }
})

afterEach(cleanup)

const sessionId = SessionId('session-1')
const time = Date.UTC(2026, 9, 26, 4, 5, 6)

const translate = ((key: string, params?: Readonly<Record<string, string | number>>) => {
  let text = (zh as Readonly<Record<string, string>>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}) as MessageMultiquoteProps['t']

function count(value: number): string {
  return zh['dialog.selected'].replace('{count}', String(value))
}

function insertLabel(value: number): string {
  return zh['dialog.insert'].replace('{count}', String(value))
}

function mount(
  getChat: () => ChatSnapshot | undefined,
  inputActions: Record<string, unknown>,
) {
  const useConversation = (<T,>(
    select: (snapshot: { views: { get: () => ChatSnapshot | undefined }; activeTargets: ReadonlySet<string> }) => T,
  ): T => select({ views: { get: getChat }, activeTargets: new Set() })) as never
  const props = { sessionId, useConversation, inputActions, t: translate } as MessageMultiquoteProps
  return { ...render(<MessageMultiquote {...props} />), props }
}

function chatWithBoth(): ChatSnapshot {
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

describe('MessageMultiquote', () => {
  it('disables the header entry when the Chat view is inactive', () => {
    const ui = mount(() => undefined, { insertQuote: vi.fn((_text: string) => true) })

    expect(ui.getByRole('button', { name: zh['header.label'] }).hasAttribute('disabled')).toBe(true)
  })

  it('inserts selected messages in log order with durable metadata', () => {
    const insertQuote = vi.fn((_text: string) => true)
    const ui = mount(chatWithBoth, { insertQuote })
    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    const boxes = ui.getAllByRole('checkbox')
    fireEvent.click(boxes[1]!)
    fireEvent.click(boxes[0]!)
    expect(ui.getByText(count(2))).toBeTruthy()

    fireEvent.click(ui.getByRole('button', { name: insertLabel(2) }))

    expect(insertQuote).toHaveBeenCalledTimes(2)
    expect(insertQuote.mock.calls[0]![0]).toContain('first')
    expect(insertQuote.mock.calls[0]![0]).toContain('message_id="message-1"')
    expect(insertQuote.mock.calls[0]![0]).toContain('session_id="session-1"')
    expect(insertQuote.mock.calls[1]![0]).toContain('second')
    expect(insertQuote.mock.calls[1]![0]).toContain('role=assistant')
    expect(ui.queryByRole('dialog', { name: zh['dialog.title'] })).toBeNull()
  })

  it('falls back to plain text insertion on hosts without atomic quote support', () => {
    const span = { start: 0, end: 0, draftRev: 0 }
    const insertText = vi.fn((_text: string, _span: unknown) => true)
    const captureInsertion = vi.fn(() => span)
    const ui = mount(chatWithBoth, { insertText, captureInsertion })
    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    fireEvent.click(ui.getAllByRole('checkbox')[0]!)

    fireEvent.click(ui.getByRole('button', { name: insertLabel(1) }))

    expect(captureInsertion).toHaveBeenCalledOnce()
    expect(insertText).toHaveBeenCalledWith(expect.stringContaining('[multiquote role=user'), span)
  })

  it('filters messages and selects only the visible matches', () => {
    const insertQuote = vi.fn((_text: string) => true)
    const ui = mount(chatWithBoth, { insertQuote })
    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    const search = ui.getByRole('textbox', { name: zh['dialog.search'] })

    fireEvent.change(search, { target: { value: 'second' } })
    expect(ui.queryByText('first')).toBeNull()
    expect(ui.getByText('second')).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: zh['dialog.selectAll'] }))
    expect(ui.getByText(count(1))).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: insertLabel(1) }))
    expect(insertQuote).toHaveBeenCalledTimes(1)
    expect(insertQuote.mock.calls[0]![0]).toContain('second')

    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    fireEvent.change(ui.getByRole('textbox', { name: zh['dialog.search'] }), { target: { value: 'missing' } })
    expect(ui.getByText(zh['dialog.noResults'])).toBeTruthy()
  })

  it('reports an insert refusal and keeps the dialog open', () => {
    const ui = mount(chatWithBoth, { insertQuote: vi.fn((_text: string) => false) })
    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    fireEvent.click(ui.getAllByRole('checkbox')[0]!)

    fireEvent.click(ui.getByRole('button', { name: insertLabel(1) }))

    expect(ui.getByRole('alert').textContent).toBe(zh['dialog.insertFailed'])
    expect(ui.getByRole('dialog', { name: zh['dialog.title'] })).toBeTruthy()
  })

  it('locates a rendered original and closes the dialog', () => {
    const ui = mount(chatWithBoth, { insertQuote: vi.fn((_text: string) => true) })
    fireEvent.click(ui.getByRole('button', { name: zh['header.label'] }))
    const target = document.createElement('div')
    target.dataset.chatNodeKey = 'user-key'
    const scrollIntoView = vi.fn()
    Object.defineProperty(target, 'scrollIntoView', { value: scrollIntoView })
    document.body.append(target)

    try {
      fireEvent.click(ui.getAllByRole('button', { name: zh['row.locate'] })[0]!)
    } finally {
      target.remove()
    }

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(ui.queryByRole('dialog', { name: zh['dialog.title'] })).toBeNull()
  })
})
