/** UserText rule recognizing a quoted-message bundle inside raw or blockquoted text. */
import type { UserTextRule } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { parseBundle, type MessageBundle } from './bundle.ts'

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface UserTextDataMap {
    betterQuoteBundle: MessageBundle
  }
}

/** Rule ID and keyed renderer key for the bundle card. */
export const BUNDLE_RULE_ID = 'betterQuoteBundle'

/**
 * Recognize the first `<quoted_messages>` envelope at or after `from`.
 *
 * A composer quote wraps every line in `> `, so the blockquote is dequoted
 * before parsing. A forwarded prompt embeds the raw envelope and may carry a
 * preamble; only the envelope range becomes the card, leaving the preamble as
 * ordinary text.
 */
export const bundleQuoteRule: UserTextRule<typeof BUNDLE_RULE_ID> = {
  id: BUNDLE_RULE_ID,
  order: -20,
  match(text, from) {
    for (let index = text.indexOf('<quoted_messages', from); index >= 0; index = text.indexOf('<quoted_messages', index + 1)) {
      const lineStart = text.lastIndexOf('\n', index - 1) + 1
      const quotedLine = /^ {0,3}> ?/u.test(text.slice(lineStart, index))
      if (quotedLine) {
        const block = quotedBlock(text, lineStart)
        if (block === undefined || block.start < from) continue
        const bundle = parseBundle(block.text)
        if (bundle !== undefined) return { id: BUNDLE_RULE_ID, start: block.start, end: block.end, data: bundle }
      } else {
        if (index < from) continue
        const closing = '</quoted_messages>'
        const close = text.indexOf(closing, index)
        if (close < 0) continue
        const end = close + closing.length
        const bundle = parseBundle(text.slice(index, end))
        if (bundle !== undefined) return { id: BUNDLE_RULE_ID, start: index, end, data: bundle }
      }
    }
    return undefined
  },
}

function quotedBlock(text: string, start: number): { start: number; end: number; text: string } | undefined {
  let cursor = start
  let end = start
  let sawQuote = false
  while (cursor < text.length) {
    const next = text.indexOf('\n', cursor)
    const lineEnd = next === -1 ? text.length : next
    const line = text.slice(cursor, lineEnd)
    if (!/^ {0,3}>/u.test(line)) break
    sawQuote = true
    end = lineEnd
    if (next === -1) break
    cursor = next + 1
  }
  if (!sawQuote) return undefined
  return {
    start,
    end,
    text: text.slice(start, end).split('\n').map(line => line.replace(/^ {0,3}> ?/u, '')).join('\n'),
  }
}
