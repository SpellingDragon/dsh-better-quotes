/** Browser plugin registering the multi-select message quote entry in the Session header. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { MessageMultiquote } from './MessageMultiquote.tsx'
import { en, NS, zh, type BetterQuotesKey } from './locales.ts'
import { installStyles } from './styles.ts'

export type {} from './candidates.ts'
export type {} from './format.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by the multi-select quote picker. */
    betterQuotes: BetterQuotesKey
  }
}

/** Browser plugin name. */
export const name = 'dsh-better-quotes'

/** Services required by the header action and its localized copy. */
export const inject = ['slots', 'locale']

/**
 * Register the picker entry; the picker reads the active Chat view through standard Session props.
 * @param ctx - browser root context owning the header contribution and dictionaries.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => installStyles(), 'dsh-better-quotes: styles')
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-better-quotes: dictionaries')
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dsh-better-quotes',
    locale: NS,
  }, MessageMultiquote))
}
