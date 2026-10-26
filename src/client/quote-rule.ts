/** UserText rule recognizing a quoted-message bundle inside raw or blockquoted text. */
import type { UserTextRule } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { bundleSummary, parseBundle, type MessageBundle } from './bundle.ts'
import type { NS } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface UserTextDataMap {
    betterQuoteBundle: MessageBundle
  }
}

/** Locale-bound translate that generated the draft summary line. */
type Translate = PropsLocale<typeof NS>['t']

/** Rule ID and keyed renderer key for the bundle card. */
export const BUNDLE_RULE_ID = 'betterQuoteBundle'

/**
 * Build the rule recognizing the first `<quoted_messages>` envelope at or after `from`.
 *
 * A composer quote wraps every line in `> `, so the blockquote is dequoted
 * before parsing. A composer draft also leads with the summary line its quote
 * chip shows; when that line matches the summary regenerated from the parsed
 * bundle, the card owns the line so the sent message shows only the card. A
 * forwarded prompt embeds the raw envelope and may carry a preamble; only the
 * envelope range becomes the card, leaving the preamble as ordinary text.
 * @param t - locale-bound translate that generated the draft summary.
 * @returns the rule registered by the browser plugin.
 */
export function createBundleQuoteRule(t: Translate): UserTextRule<typeof BUNDLE_RULE_ID> {
  return {
    id: BUNDLE_RULE_ID,
    order: -20,
    match(text, from) {
      for (let index = text.indexOf('<quoted_messages', from); index >= 0; index = text.indexOf('<quoted_messages', index + 1)) {
        const lineStart = text.lastIndexOf('\n', index - 1) + 1
        const quotedLine = /^ {0,3}> ?/u.test(text.slice(lineStart, index))
        if (quotedLine) {
          const block = quotedBlock(text, lineStart)
          if (block === undefined) continue
          const bundle = parseBundle(block.text)
          if (bundle === undefined) continue
          const start = matchStart(text, block.start, bundle, true, t, from)
          if (start === undefined) continue
          return { id: BUNDLE_RULE_ID, start, end: block.end, data: bundle }
        } else {
          if (index < from) continue
          const closing = '</quoted_messages>'
          const close = text.indexOf(closing, index)
          if (close < 0) continue
          const end = close + closing.length
          const bundle = parseBundle(text.slice(index, end))
          if (bundle === undefined) continue
          const start = matchStart(text, index, bundle, false, t, from)
          if (start === undefined) continue
          return { id: BUNDLE_RULE_ID, start, end, data: bundle }
        }
      }
      return undefined
    },
  }
}

/**
 * Start one match at the draft summary line when that line precedes the envelope.
 * @param text - message text.
 * @param at - start of the envelope's line.
 * @param bundle - parsed bundle the summary summarizes.
 * @param quoted - whether the lines carry `> ` quote markers.
 * @param t - locale-bound translate that generated the draft summary.
 * @param from - match window start the caller will accept.
 * @returns the summary line's start, the envelope line's start when no summary precedes it, or undefined when the window excludes both.
 */
function matchStart(
  text: string,
  at: number,
  bundle: MessageBundle,
  quoted: boolean,
  t: Translate,
  from: number,
): number | undefined {
  const summary = summaryStart(text, at, bundle, quoted, t)
  if (summary !== undefined && summary >= from) return summary
  return at >= from ? at : undefined
}

/**
 * Locate the draft summary line directly above the envelope.
 * @param text - message text.
 * @param at - start of the envelope's line.
 * @param bundle - parsed bundle the summary summarizes.
 * @param quoted - whether the lines carry `> ` quote markers.
 * @param t - locale-bound translate that generated the draft summary.
 * @returns the summary line's start, or undefined when the previous line is not that summary.
 */
function summaryStart(
  text: string,
  at: number,
  bundle: MessageBundle,
  quoted: boolean,
  t: Translate,
): number | undefined {
  const lineStart = text.lastIndexOf('\n', at - 1) + 1
  if (lineStart === 0) return undefined
  const previousEnd = lineStart - 1
  const previousStart = text.lastIndexOf('\n', previousEnd - 1) + 1
  const line = text.slice(previousStart, previousEnd)
  const bare = quoted ? line.replace(/^ {0,3}> ?/u, '') : line
  if (quoted && bare === line) return undefined
  const expected = bundleSummary(bundle.count, bundle.items.map(item => item.text), t)
  return bare === expected ? previousStart : undefined
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
