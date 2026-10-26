/** Quote serialization keeps text, attachment manifests, and durable identity. */
import { describe, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { QuoteAttachment, QuoteCandidate } from '../src/client/candidates.ts'
import { formatAttachment, formatMetadata, formatQuote } from '../src/client/format.ts'

const sessionId = SessionId('session-1')
const time = Date.UTC(2026, 9, 26, 4, 5, 6, 789)
const image: QuoteAttachment = {
  kind: 'image',
  id: 'image-1',
  name: 'shot.png',
  mediaType: 'image/png',
  bytes: 2_048,
  width: 640,
  height: 480,
}
const file: QuoteAttachment = { kind: 'file', id: 'file-1', name: 'notes.pdf', bytes: 4_096 }

function candidate(overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
  return {
    key: 'key-1',
    role: 'user',
    messageId: 'message-1',
    seq: 12,
    time,
    text: 'hello\nworld',
    attachments: [],
    skills: [],
    references: [],
    ...overrides,
  }
}

describe('formatQuote', () => {
  it('places text first, attachments next, and the durable metadata tail last', () => {
    expect(formatQuote(candidate({ attachments: [image, file], skills: ['pdf'], references: ['Spec'] }), sessionId))
      .toBe([
        'hello\nworld',
        '',
        '[attachment kind=image name="shot.png" media_type="image/png" bytes=2048 width=640 height=480 id="image-1"]',
        '[attachment kind=file name="notes.pdf" bytes=4096 id="file-1"]',
        '',
        `[multiquote role=user speaker=user time=${new Date(time).toISOString()} seq=12 message_id="message-1" session_id="session-1" skills=["pdf"] references=["Spec"]]`,
      ].join('\n'))
  })

  it('uses a placeholder when a message has no text and omits absent identity', () => {
    expect(formatQuote(candidate({ text: '   ', messageId: undefined, attachments: [image] }), sessionId))
      .toContain('(no text)\n\n[attachment kind=image')
    expect(formatMetadata(candidate({ messageId: undefined }), sessionId)).not.toContain('message_id=')
  })
})

describe('formatMetadata', () => {
  it('marks steering messages and includes the producing route', () => {
    expect(formatMetadata(candidate({
      role: 'assistant',
      steering: true,
      route: { provider: 'deepseek', model: 'deepseek-chat' },
    }), sessionId)).toBe(
      `[multiquote role=assistant speaker=assistant mode=steering provider="deepseek" model="deepseek-chat" time=${new Date(time).toISOString()} seq=12 message_id="message-1" session_id="session-1"]`,
    )
  })
})

describe('formatAttachment', () => {
  it('encodes every image fact and a file without media facts', () => {
    expect(formatAttachment(image)).toBe(
      '[attachment kind=image name="shot.png" media_type="image/png" bytes=2048 width=640 height=480 id="image-1"]',
    )
    expect(formatAttachment(file)).toBe('[attachment kind=file name="notes.pdf" bytes=4096 id="file-1"]')
  })

  it('omits unavailable optional image facts', () => {
    expect(formatAttachment({ kind: 'image', id: 'image-2', bytes: 1, mediaType: 'image/webp' }))
      .toBe('[attachment kind=image media_type="image/webp" bytes=1 id="image-2"]')
  })
})
