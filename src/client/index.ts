/** Browser plugin: inline picker dock, assistant actions, bundle card, and cross-Session forwarding. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { BundleQuote } from './BundleQuote.tsx'
import { QuoteAction, type QuoteActionInjected } from './QuoteAction.tsx'
import { QuoteDock, type QuoteDockInjected } from './QuoteDock.tsx'
import { en, NS, zh, type BetterQuotesKey } from './locales.ts'
import { createPickerStore } from './picker.ts'
import { BUNDLE_RULE_ID, bundleQuoteRule } from './quote-rule.ts'
import { installStyles } from './styles.ts'

export type {} from './bundle.ts'
export type {} from './candidates.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by the inline picker, bundle card, and assistant actions. */
    betterQuotes: BetterQuotesKey
  }
}

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    betterQuotes: unknown
  }
}

/** Browser plugin name. */
export const name = 'dsh-better-quotes'

/** Services required by the picker, bundle card, actions, and forwarding verb. */
export const inject = ['slots', 'locale', 'uiConversation', 'sessions']

/**
 * Register the inline picker, assistant actions, bundle renderer, and forwarding verb.
 * @param ctx - browser root context owning every contribution.
 */
export function apply(ctx: Context): void {
  const picker = createPickerStore()
  ctx.effect(() => installStyles(), 'dsh-better-quotes: styles')
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-better-quotes: dictionaries')
  ctx.effect(() => ctx.uiConversation.userText.register(bundleQuoteRule), 'dsh-better-quotes: UserText rule')

  const forward = async (targetId: SessionId, text: string): Promise<void> => {
    await ctx.sessions.using(targetId, { source: 'betterQuotes' }, async (reference) => {
      const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
      if (!result.ok) throw new Error(result.error.message)
    })
  }

  ctx.effect(() => ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'better-quotes',
    locale: NS,
    inject: (): QuoteDockInjected => ({
      hooks: { picker: picker.source },
      close: () => { picker.close() },
      forward,
    }),
  }, QuoteDock)), 'dsh-better-quotes: inline picker')

  ctx.effect(() => ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
    name: 'conversation.user.text.node',
    key: BUNDLE_RULE_ID,
    locale: NS,
  }, BundleQuote)), 'dsh-better-quotes: bundle card')

  ctx.effect(() => ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'better-quotes',
    locale: NS,
    inject: (): QuoteActionInjected => ({
      openPicker: (focus?: string) => { picker.open(focus) },
    }),
  }, QuoteAction)), 'dsh-better-quotes: assistant actions')
}
