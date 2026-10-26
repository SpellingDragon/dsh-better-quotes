/** The UserText rule finds raw and blockquoted bundles without capturing unrelated quotes. */
import { describe, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatBundle, formatForwardPrompt } from '../src/client/bundle.ts'
import type { QuoteCandidate } from '../src/client/candidates.ts'
import { BUNDLE_RULE_ID, bundleQuoteRule } from '../src/client/quote-rule.ts'

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
const bundle = formatBundle([candidate], sessionId)
const blockquote = bundle.split('\n').map(line => `> ${line}`).join('\n')

describe('bundleQuoteRule', () => {
  it('matches a raw envelope and parses its messages', () => {
    const node = bundleQuoteRule.match(bundle, 0, context)

    expect(node?.id).toBe(BUNDLE_RULE_ID)
    expect(node?.start).toBe(0)
    expect(node?.end).toBe(bundle.length)
    expect(node?.data).toMatchObject({ sourceSession: 'session-1', count: 1 })
  })

  it('matches a composer blockquote and covers the whole quoted block', () => {
    const node = bundleQuoteRule.match(blockquote, 0, context)

    expect(node?.id).toBe(BUNDLE_RULE_ID)
    expect(node?.start).toBe(0)
    expect(node?.end).toBe(blockquote.length)
    const data = node?.data
    if (data === undefined || !('sourceSession' in data)) throw new Error('bundle data expected')
    expect(data.items[0]?.text).toBe('hello')
  })

  it('starts at the envelope inside a forwarded prompt', () => {
    const prompt = formatForwardPrompt(bundle)
    const node = bundleQuoteRule.match(prompt, 0, context)

    expect(node?.start).toBe(prompt.indexOf('<quoted_messages'))
    expect(node?.end).toBe(prompt.length)
  })

  it('leaves ordinary blockquotes and malformed envelopes to other rules', () => {
    expect(bundleQuoteRule.match('> just a normal quote', 0, context)).toBeUndefined()
    expect(bundleQuoteRule.match('<quoted_messages source_session="s">', 0, context)).toBeUndefined()
  })

  it('ignores an envelope before the requested offset', () => {
    expect(bundleQuoteRule.match(bundle, 1, context)).toBeUndefined()
  })
})
