/** Browser plugin: quotes tab, assistant actions, bundle card, and cross-Session forwarding. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { MessageId } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { IconContextInjectionOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { BundleQuote } from './BundleQuote.tsx'
import { QuoteAction, type QuoteActionInjected } from './QuoteAction.tsx'
import { QuoteDrawer, type QuoteDrawerInjected } from './QuoteDrawer.tsx'
import { en, NS, zh, type BetterQuotesKey } from './locales.ts'
import { BUNDLE_RULE_ID, createBundleQuoteRule } from './quote-rule.ts'
import { installStyles } from './styles.ts'

export type {} from './bundle.ts'
export type {} from './candidates.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by the quotes tab, bundle card, and assistant actions. */
    betterQuotes: BetterQuotesKey
  }
}

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap {
    /** Durable message identity the opener asked the quotes tab to preselect. */
    'better-quotes': { readonly select?: string }
  }
}

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    betterQuotes: unknown
  }
}

/** Browser plugin name. */
export const name = 'dsh-better-quotes'

/** Tab-type identity and the kind opened through `ctx.sidebarRight`. */
export const TAB_ID = 'dsh-better-quotes'
export const TAB_KIND = 'better-quotes'

/** Services required by the quotes tab, bundle card, actions, and forwarding verb. */
export const inject = ['slots', 'locale', 'uiConversation', 'sessions', 'sidebarRight', 'sidebarRightTabs']

/**
 * Register the quotes tab, assistant actions, bundle renderer, and forwarding verb.
 * @param ctx - browser root context owning every contribution.
 */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => installStyles(), 'dsh-better-quotes: styles')
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-better-quotes: dictionaries')
  ctx.effect(() => ctx.uiConversation.userText.register(createBundleQuoteRule(t)), 'dsh-better-quotes: UserText rule')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    title: () => t('tab.title'),
    guide: [{
      id: 'quotes',
      order: 10,
      title: () => t('tab.title'),
      description: () => t('tab.description'),
      icon: IconContextInjectionOutlineRegular,
    }],
  }), 'dsh-better-quotes: tab type')

  const forward = async (targetId: SessionId, text: string): Promise<void> => {
    await ctx.sessions.using(targetId, { source: 'betterQuotes' }, async (reference) => {
      const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
      if (!result.ok) throw new Error(result.error.message)
    })
  }

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
    locale: NS,
    inject: (): QuoteDrawerInjected => ({
      collapse: () => {
        if (ctx.sidebarRight.isExpanded()) ctx.sidebarRight.toggleExpanded()
      },
      forward,
    }),
  }, QuoteDrawer)), 'dsh-better-quotes: quotes tab')

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
      openQuotes: (messageId: MessageId) => {
        ctx.sidebarRight.openTab(TAB_KIND, { params: { select: String(messageId) } })
      },
    }),
  }, QuoteAction)), 'dsh-better-quotes: assistant action')
}
