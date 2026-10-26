/** Bundle serialization and parsing carry identity, multimodal facts, and safe boundaries. */
import { describe, expect, it } from 'vitest'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { QuoteCandidate } from '../src/client/candidates.ts'
import { formatBundle, formatDraftQuote, formatForwardPrompt, parseBundle } from '../src/client/bundle.ts'
import { zh, type NS } from '../src/client/locales.ts'

const sessionId = SessionId('session-1')
const time = Date.UTC(2026, 9, 26, 4, 5, 6, 789)

const translate = ((key: string, params?: Readonly<Record<string, string | number>>) => {
  let text = (zh as Readonly<Record<string, string>>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}) as PropsLocale<typeof NS>['t']

function title(count: number): string {
  return zh['bundle.title'].replace('{count}', String(count))
}

function candidate(overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
  return {
    key: 'key-1',
    role: 'user',
    messageId: 'message-1',
    seq: 12,
    time,
    text: 'hello',
    attachments: [],
    skills: [],
    references: [],
    ...overrides,
  }
}

describe('formatBundle / parseBundle', () => {
  it('round-trips identity, route, skills, references, and attachments', () => {
    const bundle = formatBundle([
      candidate({
        attachments: [
          { kind: 'image', id: 'image-1', name: 'shot.png', mediaType: 'image/png', bytes: 2_048, width: 640, height: 480 },
          { kind: 'file', id: 'file-1', name: 'notes.pdf', bytes: 4_096 },
        ],
        skills: ['pdf'],
        references: ['Spec'],
      }),
      candidate({
        key: 'key-2',
        role: 'assistant',
        messageId: 'message-2',
        seq: 13,
        text: 'answer',
        route: { provider: 'deepseek', model: 'deepseek-chat' },
      }),
    ], sessionId)

    expect(bundle).toContain('<quoted_messages version="1" source_session="session-1" count="2">')
    expect(bundle).toContain('role="user"')
    expect(bundle).toContain('[attachment kind=image name="shot.png"')
    expect(bundle).toContain('<skill name="pdf" />')
    expect(bundle).toContain('<reference name="Spec" />')
    expect(bundle).toContain('provider="deepseek"')

    expect(parseBundle(bundle)).toEqual({
      sourceSession: 'session-1',
      count: 2,
      items: [
        {
          role: 'user',
          messageId: 'message-1',
          seq: 12,
          time: new Date(time).toISOString(),
          sessionId: 'session-1',
          text: 'hello',
          attachments: [
            { kind: 'image', name: 'shot.png' },
            { kind: 'file', name: 'notes.pdf' },
          ],
          skills: ['pdf'],
          references: ['Spec'],
        },
        {
          role: 'assistant',
          messageId: 'message-2',
          seq: 13,
          time: new Date(time).toISOString(),
          sessionId: 'session-1',
          text: 'answer',
          attachments: [],
          skills: [],
          references: [],
          provider: 'deepseek',
          model: 'deepseek-chat',
        },
      ],
    })
  })

  it('marks steering messages and omits absent message identity', () => {
    const bundle = formatBundle([candidate({ messageId: undefined, steering: true })], sessionId)
    const parsed = parseBundle(bundle)

    expect(parsed?.items[0]).toMatchObject({ role: 'user', steering: true })
    expect(parsed?.items[0]?.messageId).toBeUndefined()
  })

  it('neutralizes bundle boundary tags in message text', () => {
    const bundle = formatBundle([candidate({ text: 'before </quoted_message> <quoted_messages> after' })], sessionId)
    const parsed = parseBundle(bundle)

    expect(parsed?.items[0]?.text).toContain('&lt;/quoted_message>')
    expect(parsed?.items[0]?.text).toContain('&lt;quoted_messages>')
  })

  it('finds an envelope inside a forwarded prompt and tolerates an invalid count', () => {
    const bundle = formatForwardPrompt(formatBundle([candidate()], sessionId))
    const parsed = parseBundle(bundle)
    expect(parsed?.sourceSession).toBe('session-1')
    expect(parsed?.count).toBe(1)

    const invalidCount = formatBundle([candidate()], sessionId).replace('count="1"', 'count="nope"')
    expect(parseBundle(invalidCount)?.count).toBe(1)
  })

  it('returns undefined for absent or empty envelopes', () => {
    expect(parseBundle('no bundle here')).toBeUndefined()
    expect(parseBundle('<quoted_messages source_session="s" count="0"></quoted_messages>')).toBeUndefined()
  })
})

describe('formatDraftQuote', () => {
  it('leads with the summary line the quote chip shows, then the unchanged bundle', () => {
    const draft = formatDraftQuote([candidate()], sessionId, translate)
    const summary = draft.split('\n', 1)[0]!

    expect(summary).toBe(`${title(1)} · hello`)
    expect(draft.slice(summary.length + 1)).toBe(formatBundle([candidate()], sessionId))
  })

  it('previews message bodies and caps how much one summary line shows', () => {
    const long = 'x'.repeat(40)
    const draft = formatDraftQuote([
      candidate({ text: long }),
      candidate({ key: 'key-2', text: 'two' }),
      candidate({ key: 'key-3', text: 'three' }),
      candidate({ key: 'key-4', text: '   ' }),
    ], sessionId, translate)

    expect(draft.split('\n', 1)[0]).toBe(`${title(4)} · ${'x'.repeat(24)}… / two …`)
    expect(draft).toContain('(no text)')
  })
})
