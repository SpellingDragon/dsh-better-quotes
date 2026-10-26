// @vitest-environment jsdom
/** The browser entry registers the inline picker, bundle card, assistant actions, and forwarding verb. */
import { describe, expect, it, vi } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { apply, inject } from '../src/client/index.ts'
import { NS, zh } from '../src/client/locales.ts'
import { BUNDLE_RULE_ID } from '../src/client/quote-rule.ts'
import { apply as hostApply } from '../src/index.ts'

vi.mock('@deepseek-ai/dsh-client-store', () => {
  let state: unknown
  return {
    createSnapshotStore: (init: unknown) => {
      state = init
      return {
        getSnapshot: () => state,
        subscribe: () => () => undefined,
        set: (next: unknown) => { state = next },
        update: (mutator: (draft: unknown) => void) => { mutator(state) },
      }
    },
  }
})

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Stub = () => null
  return {
    Button: Stub,
    Checkbox: Stub,
    Input: Stub,
    SegmentedControl: Stub,
    Tag: Stub,
    Tooltip: Stub,
    IconChecklistOutlineRegular: Stub,
    IconCloseOutlineRegular: Stub,
    IconContextInjectionOutlineRegular: Stub,
    IconLinkOutlineRegular: Stub,
    IconPaperclipOutlineRegular: Stub,
    IconSearchOutlineRegular: Stub,
    IconSkillOutlineRegular: Stub,
    fileSizeText: (bytes: number) => String(bytes),
  }
})

describe('dsh-better-quotes browser plugin', () => {
  it('registers every surface, opens the inline picker, and forwards through the sessions service', async () => {
    hostApply()
    const effects: (() => void)[] = []
    const entries: Record<string, { options: Record<string, unknown>; component: unknown }[]> = {}
    const prompt = vi.fn(async () => ({ ok: true as const, value: { accepted: true as const } }))
    const using = vi.fn(async (
      _target: SessionId,
      _options: unknown,
      operation: (reference: unknown) => Promise<unknown>,
    ) => operation({ binding: { session: { prompt } } }))
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

    expect(inject).toEqual(['slots', 'locale', 'uiConversation', 'sessions'])
    expect(registerLocale).toHaveBeenCalledWith(NS, expect.objectContaining({ zh }))
    expect(registerRule).toHaveBeenCalledWith(expect.objectContaining({ id: BUNDLE_RULE_ID }))
    expect(document.getElementById('dsh-better-quotes-styles')).not.toBeNull()

    const dock = entries['conversation.input.dock']?.[0]
    expect(dock?.options.id).toBe('better-quotes')
    const dockFace = (dock?.options.inject as () => {
      hooks: { picker: { getSnapshot(): { open: boolean; focus: string | null } } }
      close: () => void
      forward: (target: SessionId, text: string) => Promise<void>
    })()
    expect(dockFace.hooks.picker.getSnapshot()).toEqual({ open: false, focus: null })

    const action = entries['conversation.chat.assistant-actions']?.[0]
    expect(action?.options.id).toBe('better-quotes')
    const actionFace = (action?.options.inject as () => {
      openPicker: (focus?: string) => void
    })()
    actionFace.openPicker('message-1')
    expect(dockFace.hooks.picker.getSnapshot()).toEqual({ open: true, focus: 'message-1' })
    dockFace.close()
    expect(dockFace.hooks.picker.getSnapshot()).toEqual({ open: false, focus: null })

    await dockFace.forward(SessionId('session-2'), 'forwarded')
    expect(using).toHaveBeenCalledWith(
      SessionId('session-2'),
      { source: 'betterQuotes' },
      expect.any(Function),
    )
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: 'forwarded' }], 'queue')

    const card = entries['conversation.user.text.node']?.[0]
    expect(card?.options.key).toBe(BUNDLE_RULE_ID)

    for (const dispose of effects) dispose()
    expect(document.getElementById('dsh-better-quotes-styles')).toBeNull()
  })
})
