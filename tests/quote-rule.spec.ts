/** The UserText rule owns the bundle envelope and its draft summary, leaving unrelated prose alone. */
import { describe, expect, it } from 'vitest'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatBundle, formatDraftQuote, formatForwardPrompt } from '../src/client/bundle.ts'
import type { QuoteCandidate } from '../src/client/candidates.ts'
import { zh, type NS } from '../src/client/locales.ts'
import { BUNDLE_RULE_ID, createBundleQuoteRule } from '../src/client/quote-rule.ts'

const sessionId = SessionId('session-1')
const candidate: QuoteCandidate = {
  key: 'key-1',
  role: 'user',
  messageId: 'message-1',
  seq: 12,
  time: Date.UTC(2026, 9, 26, 4, 5, 6),
  text: 'hello',
  attachments: [],
  skills: [],
  references: [],
}
const context = { read: () => undefined }
const translate = ((key: string, params?: Readonly<Record<string, string | number>>) => {
  let text = (zh as Readonly<Record<string, string>>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}) as PropsLocale<typeof NS>['t']
const rule = createBundleQuoteRule(translate)
const bundle = formatBundle([candidate], sessionId)
const draft = formatDraftQuote([candidate], sessionId, translate)
const blockquote = (text: string): string => text.split('\n').map(line => `> ${line}`).join('\n')

describe('bundleQuoteRule', () => {
  it('matches a raw envelope and parses its messages', () => {
    const node = rule.match(bundle, 0, context)

    expect(node?.id).toBe(BUNDLE_RULE_ID)
    expect(node?.start).toBe(0)
    expect(node?.end).toBe(bundle.length)
    expect(node?.data).toMatchObject({ sourceSession: 'session-1', count: 1 })
  })

  it('matches a composer blockquote and covers the whole quoted block', () => {
    const node = rule.match(blockquote(bundle), 0, context)

    expect(node?.id).toBe(BUNDLE_RULE_ID)
    expect(node?.start).toBe(0)
    expect(node?.end).toBe(blockquote(bundle).length)
    const data = node?.data
    if (data === undefined || !('sourceSession' in data)) throw new Error('bundle data expected')
    expect(data.items[0]?.text).toBe('hello')
  })

  it('owns the draft summary line beside the envelope', () => {
    const raw = rule.match(draft, 0, context)
    expect(raw?.start).toBe(0)
    expect(raw?.end).toBe(draft.length)

    const quoted = rule.match(blockquote(draft), 0, context)
    expect(quoted?.start).toBe(0)
    expect(quoted?.end).toBe(blockquote(draft).length)
  })

  it('keeps a foreign line above the envelope as ordinary text', () => {
    const prompt = `my note\n${bundle}`
    const node = rule.match(prompt, 0, context)
    expect(node?.start).toBe(prompt.indexOf('<quoted_messages'))

    const quoted = `> my note\n${blockquote(bundle)}`
    expect(rule.match(quoted, 0, context)?.start).toBe(quoted.indexOf('<quoted_messages') - 2)
  })

  it('starts at the envelope inside a forwarded prompt', () => {
    const prompt = formatForwardPrompt(bundle)
    const node = rule.match(prompt, 0, context)

    expect(node?.start).toBe(prompt.indexOf('<quoted_messages'))
    expect(node?.end).toBe(prompt.length)
  })

  it('leaves ordinary blockquotes and malformed envelopes to other rules', () => {
    expect(rule.match('> just a normal quote', 0, context)).toBeUndefined()
    expect(rule.match('<quoted_messages source_session="s">', 0, context)).toBeUndefined()
  })

  it('ignores an envelope before the requested offset', () => {
    expect(rule.match(bundle, 1, context)).toBeUndefined()
  })
})
