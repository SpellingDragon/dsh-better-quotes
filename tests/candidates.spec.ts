/** Candidate projection covers both authors, visible finals, and multimodal facts. */
import { describe, expect, it } from 'vitest'
import type { AssistantBlock, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { collectCandidates } from '../src/client/candidates.ts'
import { assistantNode, FILE_REF, IMAGE_REF, snapshotOf, userNode } from './fixtures.client.ts'

const time = Date.UTC(2026, 9, 26, 4, 5, 6)

describe('collectCandidates', () => {
  it('returns no candidates when the Chat view is inactive', () => {
    expect(collectCandidates(undefined)).toEqual([])
  })

  it('projects user text, multimodal facts, skills, references, and identity', () => {
    const [candidate] = collectCandidates(snapshotOf([userNode({
      key: 'user-key',
      seq: 1,
      time,
      messageId: 'message-1',
      content: [
        { type: 'text', text: 'hello' },
        { type: 'image', attachment: IMAGE_REF },
        { type: 'file', attachment: FILE_REF },
      ],
      skills: ['pdf'],
      references: ['Spec'],
    })]))

    expect(candidate).toEqual({
      key: 'user-key',
      role: 'user',
      messageId: 'message-1',
      seq: 1,
      time,
      text: 'hello',
      attachments: [
        {
          kind: 'image',
          id: 'image-1',
          name: 'shot.png',
          mediaType: 'image/png',
          bytes: 2_048,
          width: 640,
          height: 480,
        },
        { kind: 'file', id: 'file-1', name: 'notes.pdf', bytes: 4_096 },
      ],
      skills: ['pdf'],
      references: ['Spec'],
    })
  })

  it('keeps user messages without an identity and defaults empty facts', () => {
    const [candidate] = collectCandidates(snapshotOf([userNode({
      key: 'user-key',
      seq: 1,
      time,
      content: [{ type: 'text', text: 'no identity' }],
    })]))

    expect(candidate).toMatchObject({ role: 'user', seq: 1, skills: [], references: [] })
    expect(candidate?.messageId).toBeUndefined()
  })

  it('marks steering messages', () => {
    const [candidate] = collectCandidates(snapshotOf([userNode({
      key: 'steering-key',
      seq: 2,
      time,
      messageId: 'message-2',
      steering: true,
      content: [{ type: 'text', text: 'mid-turn' }],
    })]))

    expect(candidate).toMatchObject({ role: 'user', steering: true, messageId: 'message-2' })
  })

  it('skips user nodes without quotable content', () => {
    expect(collectCandidates(snapshotOf([
      userNode({ key: 'empty', seq: 1, time, messageId: 'message-1', content: [] }),
    ]))).toEqual([])
  })

  it('projects a settled assistant message and ignores reasoning and tool calls', () => {
    const blocks: readonly AssistantBlock[] = [
      { kind: 'text', text: 'answer' },
      { kind: 'reasoning', text: 'private thinking' },
      { kind: 'image', attachment: IMAGE_REF },
      { kind: 'tool-call', callId: 'call-1', name: 'read', argsRaw: '{}' },
    ]
    const [candidate] = collectCandidates(snapshotOf([assistantNode({
      key: 'assistant-key',
      seq: 3,
      time,
      messageId: 'message-3',
      blocks,
      provider: 'deepseek',
      model: 'deepseek-chat',
    })]))

    expect(candidate).toEqual({
      key: 'assistant-key',
      role: 'assistant',
      messageId: 'message-3',
      seq: 3,
      time,
      text: 'answer',
      attachments: [{
        kind: 'image',
        id: 'image-1',
        name: 'shot.png',
        mediaType: 'image/png',
        bytes: 2_048,
        width: 640,
        height: 480,
      }],
      skills: [],
      references: [],
      route: { provider: 'deepseek', model: 'deepseek-chat' },
    })
  })

  it('includes interrupted finals but skips running or missing finals', () => {
    const nodes = [
      assistantNode({
        key: 'running', seq: 1, time, blocks: [{ kind: 'text', text: 'streaming' }], status: 'running', settledNode: false,
      }),
      assistantNode({
        key: 'missing-final', seq: 2, time, blocks: [{ kind: 'text', text: 'settled without node' }], settledNode: false,
      }),
      assistantNode({
        key: 'interrupted', seq: 3, time, messageId: 'message-3', blocks: [{ kind: 'text', text: 'partial' }], status: 'interrupted',
      }),
    ]

    expect(collectCandidates(snapshotOf(nodes)).map(candidate => candidate.key)).toEqual(['interrupted'])
  })

  it('skips assistant messages without text or images', () => {
    const node = assistantNode({
      key: 'no-text', seq: 1, time, messageId: 'message-1',
      blocks: [{ kind: 'reasoning', text: 'thinking' }, { kind: 'tool-call', callId: 'call-1', name: 'read', argsRaw: '{}' }],
    })

    expect(collectCandidates(snapshotOf([node]))).toEqual([])
  })

  it('omits optional route and image facts when absent', () => {
    const [candidate] = collectCandidates(snapshotOf([assistantNode({
      key: 'assistant-key',
      seq: 1,
      time,
      messageId: 'message-1',
      blocks: [{
        kind: 'image',
        attachment: { attachmentId: 'image-2' as never, mediaType: 'image/webp', bytes: 10, width: 2, height: 3 },
      }],
    })]))

    expect(candidate).toEqual({
      key: 'assistant-key',
      role: 'assistant',
      messageId: 'message-1',
      seq: 1,
      time,
      text: '',
      attachments: [{
        kind: 'image',
        id: 'image-2',
        mediaType: 'image/webp',
        bytes: 10,
        width: 2,
        height: 3,
      }],
      skills: [],
      references: [],
    })
  })

  it('ignores hidden and non-message nodes while ordering by sequence then key', () => {
    const hidden = userNode({
      key: 'hidden', seq: 1, time, messageId: 'message-hidden', visibility: 'hidden', content: [{ type: 'text', text: 'hidden' }],
    })
    const context: ChatConversationViewNode = {
      key: 'context',
      id: 'context',
      kind: 'context',
      target: 'chat',
      anchorSeq: 1,
      location: { kind: 'session' },
      visibility: 'visible',
      data: {},
    }
    const later = userNode({ key: 'b', seq: 2, time, messageId: 'message-b', content: [{ type: 'text', text: 'later' }] })
    const earlier = userNode({ key: 'a', seq: 1, time, messageId: 'message-a', content: [{ type: 'text', text: 'earlier' }] })
    const sameSeq = assistantNode({
      key: 'c', seq: 2, time, messageId: 'message-c', blocks: [{ kind: 'text', text: 'same sequence' }],
    })

    expect(collectCandidates(snapshotOf([later, hidden, context, sameSeq, earlier])).map(candidate => candidate.key))
      .toEqual(['a', 'b', 'c'])
  })
})
