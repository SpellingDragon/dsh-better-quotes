/** Chat snapshot fixtures for candidate projection and picker tests. */
import type {
  AssistantBlock, AssistantChatData, ChatConversationViewNode, ChatNode, ChatSnapshot,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

export const IMAGE_REF = {
  attachmentId: 'image-1' as never,
  mediaType: 'image/png' as const,
  bytes: 2_048,
  width: 640,
  height: 480,
  name: 'shot.png',
}

export const FILE_REF = {
  attachmentId: 'file-1' as never,
  name: 'notes.pdf',
  bytes: 4_096,
}

const EMPTY_SNAPSHOT: ChatSnapshot = {
  order: [],
  nodes: {
    get: () => undefined,
    source: () => ({ getSnapshot: () => undefined, subscribe: () => () => undefined }),
    bottomSource: () => ({ getSnapshot: () => false, subscribe: () => () => undefined }),
    turnDataSource: () => ({ getSnapshot: () => [], subscribe: () => () => undefined }),
    processSource: () => ({ getSnapshot: () => undefined, subscribe: () => () => undefined }),
    values: () => [],
  },
  locations: { getTurn: () => [], getStep: () => [] },
  navigation: { items: () => [] },
  timeline: { turnOrder: [], turns: new Map() },
  legacy: {
    nodes: [],
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: [],
  },
}

export function snapshotOf(nodes: readonly ChatConversationViewNode[]): ChatSnapshot {
  return {
    ...EMPTY_SNAPSHOT,
    nodes: {
      ...EMPTY_SNAPSHOT.nodes,
      values: () => nodes,
    },
  }
}

export function userNode(options: {
  readonly key: string
  readonly seq: number
  readonly time: number
  readonly messageId?: string
  readonly content: readonly ContentBlock[]
  readonly steering?: true
  readonly skills?: readonly string[]
  readonly references?: readonly string[]
  readonly visibility?: 'visible' | 'hidden'
}): ChatConversationViewNode {
  const kind = options.steering === true ? 'steering' : 'user'
  const node: ChatConversationViewNode = {
    key: options.key,
    id: options.key,
    kind,
    target: 'chat',
    anchorSeq: options.seq,
    location: { kind: 'session' },
    visibility: options.visibility ?? 'visible',
    data: {
      kind,
      ...(options.messageId === undefined ? {} : { messageId: options.messageId as never }),
      seq: options.seq,
      time: options.time,
      content: options.content,
      source: { kind: 'user' },
      ...(options.skills === undefined ? {} : { skillNames: options.skills }),
      ...(options.references === undefined ? {} : { referenceLabels: options.references }),
    },
  }
  return node as ChatNode<'user' | 'steering'>
}

export function assistantNode(options: {
  readonly key: string
  readonly seq: number
  readonly time: number
  readonly messageId?: string
  readonly blocks: readonly AssistantBlock[]
  readonly status?: AssistantChatData['status']
  readonly provider?: string
  readonly model?: string
  readonly settledNode?: boolean
  readonly visibility?: 'visible' | 'hidden'
}): ChatConversationViewNode {
  const finalNode = options.settledNode === false
    ? undefined
    : {
      kind: 'assistant' as const,
      ...(options.messageId === undefined ? {} : { messageId: options.messageId as never }),
      seq: options.seq,
      time: options.time,
      turn: 1,
      step: 1,
      blocks: options.blocks,
      ...(options.provider === undefined || options.model === undefined
        ? {}
        : { providerMetadata: { provider: options.provider, model: options.model } }),
    }
  const node: ChatConversationViewNode = {
    key: options.key,
    id: options.key,
    kind: 'assistant-step',
    target: 'chat',
    anchorSeq: options.seq,
    location: { kind: 'session' },
    visibility: options.visibility ?? 'visible',
    data: {
      status: options.status ?? 'settled',
      turn: 1,
      step: 1,
      blocks: options.blocks,
      time: options.time,
      ...(finalNode === undefined ? {} : { finalNode }),
    },
  }
  return node as ChatNode<'assistant-step'>
}
