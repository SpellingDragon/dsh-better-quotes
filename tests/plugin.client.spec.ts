// @vitest-environment jsdom
/** The browser entry registers the quotes tab, bundle card, assistant actions, and forwarding verb. */
import { describe, expect, it, vi } from 'vitest'
import { MessageId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { apply, inject, TAB_ID, TAB_KIND } from '../src/client/index.ts'
import { NS, zh } from '../src/client/locales.ts'
import { BUNDLE_RULE_ID } from '../src/client/quote-rule.ts'
import { apply as hostApply } from '../src/index.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Stub = () => null
  return {
    Button: Stub,
    Checkbox: Stub,
    Input: Stub,
    Tag: Stub,
    Tooltip: Stub,
    IconContextInjectionOutlineRegular: Stub,
    IconPaperclipOutlineRegular: Stub,
    IconSearchOutlineRegular: Stub,
    IconSkillOutlineRegular: Stub,
    fileSizeText: (bytes: number) => String(bytes),
  }
})

describe('dsh-better-quotes browser plugin', () => {
  it('registers every surface, opens the quotes tab, and forwards through the sessions service', async () => {
    hostApply()
    const effects: (() => void)[] = []
    const entries: Record<string, { options: Record<string, unknown>; component: unknown }[]> = {}
    const prompt = vi.fn(async () => ({ ok: true as const, value: { accepted: true as const } }))
    const using = vi.fn(async (
      _target: SessionId,
      _options: unknown,
      operation: (reference: unknown) => Promise<unknown>,
    ) => operation({ binding: { session: { prompt } } }))
    interface TabDefinition {
      id: string
      kind: string
      title: () => string
      guide: readonly { title: () => string; description: () => string }[]
    }
    const registerTab = vi.fn((_definition: TabDefinition) => () => undefined)
    const openTab = vi.fn()
    const registerRule = vi.fn(() => () => undefined)
    const registerLocale = vi.fn(() => () => undefined)
    const ctx = {
      effect: (run: () => (() => void) | void) => {
        const dispose = run()
        if (typeof dispose === 'function') effects.push(dispose)
        return dispose
      },
      locale: {
        register: registerLocale,
        bind: () => (key: keyof typeof zh) => zh[key],
      },
      uiConversation: { userText: { register: registerRule } },
      sessions: { using },
      sidebarRight: { openTab },
      sidebarRightTabs: { register: registerTab },
      slots: {
        inject: (_name: string, register: () => () => void) => register(),
        register: (options: Record<string, unknown>, component: unknown) => {
          const name = String(options.name)
          entries[name] ??= []
          entries[name]!.push({ options, component })
          return () => undefined
        },
      },
    }

    apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale', 'uiConversation', 'sessions', 'sidebarRight', 'sidebarRightTabs'])
    expect(registerLocale).toHaveBeenCalledWith(NS, expect.objectContaining({ zh }))
    expect(registerRule).toHaveBeenCalledWith(expect.objectContaining({ id: BUNDLE_RULE_ID }))
    expect(document.getElementById('dsh-better-quotes-styles')).not.toBeNull()

    const definition = registerTab.mock.calls[0]![0]
    expect(definition.id).toBe(TAB_ID)
    expect(definition.kind).toBe(TAB_KIND)
    expect(definition.title()).toBe(zh['tab.title'])
    expect(definition.guide[0]?.description()).toBe(zh['tab.description'])

    const tab = entries['sidebar.right.pane.tab']?.[0]
    expect(tab?.options.key).toBe(TAB_ID)
    const tabFace = (tab?.options.inject as (() => {
      forward: (target: SessionId, text: string) => Promise<void>
    }) | undefined)?.()
    await tabFace?.forward(SessionId('session-2'), 'forwarded')
    expect(using).toHaveBeenCalledWith(
      SessionId('session-2'),
      { source: 'betterQuotes' },
      expect.any(Function),
    )
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: 'forwarded' }], 'queue')

    const card = entries['conversation.user.text.node']?.[0]
    expect(card?.options.key).toBe(BUNDLE_RULE_ID)

    const action = entries['conversation.chat.assistant-actions']?.[0]
    expect(action?.options.id).toBe('better-quotes')
    const actionFace = (action?.options.inject as (() => {
      openQuotes: (messageId: MessageId) => void
    }) | undefined)?.()
    actionFace?.openQuotes(MessageId('message-1'))
    expect(openTab).toHaveBeenCalledWith(TAB_KIND, { params: { select: 'message-1' } })

    for (const dispose of effects) dispose()
    expect(document.getElementById('dsh-better-quotes-styles')).toBeNull()
  })
})
