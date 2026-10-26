// @vitest-environment jsdom
/** The browser entry registers its header action, styles, and locale, then removes them with the fiber. */
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { NS, zh } from '../src/client/locales.ts'
import { apply as hostApply } from '../src/index.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Stub = () => null
  return {
    Button: Stub,
    Checkbox: Stub,
    Input: Stub,
    Modal: Stub,
    Tag: Stub,
    IconChecklistOutlineRegular: Stub,
    IconLinkOutlineRegular: Stub,
    IconPaperclipOutlineRegular: Stub,
    IconSearchOutlineRegular: Stub,
    IconSkillOutlineRegular: Stub,
    fileSizeText: (bytes: number) => String(bytes),
  }
})

describe('dsh-better-quotes browser plugin', () => {
  it('registers the header action, stylesheet, and localized copy, then removes them', () => {
    hostApply()
    const entries: { options: Record<string, unknown>; component: unknown }[] = []
    const disposers: (() => void)[] = []
    const registerLocale = vi.fn(() => () => undefined)
    const ctx = {
      effect: (run: () => (() => void) | void) => {
        const dispose = run()
        if (typeof dispose === 'function') disposers.push(dispose)
        return dispose
      },
      locale: { register: registerLocale },
      slots: {
        inject: (_name: string, register: () => () => void) => register(),
        register: (options: Record<string, unknown>, component: unknown) => {
          entries.push({ options, component })
          return () => undefined
        },
      },
    }

    apply(ctx as never)

    expect(inject).toEqual(['slots', 'locale'])
    expect(entries).toHaveLength(1)
    expect(entries[0]!.options).toMatchObject({ id: 'dsh-better-quotes', locale: NS })
    expect(entries[0]!.component).toBeTypeOf('function')
    expect(registerLocale).toHaveBeenCalledWith(NS, expect.objectContaining({ zh }))
    expect(document.getElementById('dsh-better-quotes-styles')).not.toBeNull()

    for (const dispose of disposers) dispose()
    expect(document.getElementById('dsh-better-quotes-styles')).toBeNull()
  })
})
