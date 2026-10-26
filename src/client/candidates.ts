/** Project multi-select candidates from the current Chat snapshot, including durable identity and multimodal facts. */
import type { ChatNode, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/** One durable attachment referenced by a quoted message. */
export interface QuoteAttachment {
  readonly kind: 'image' | 'file'
  readonly id: string
  readonly name?: string
  readonly mediaType?: string
  readonly bytes: number
  readonly width?: number
  readonly height?: number
}

/** One user or assistant message offered to the quote picker. */
export interface QuoteCandidate {
  readonly key: string
  readonly role: 'user' | 'assistant'
  readonly steering?: true
  readonly messageId?: string | undefined
  readonly seq: number
  readonly time: number
  readonly text: string
  readonly attachments: readonly QuoteAttachment[]
  readonly skills: readonly string[]
  readonly references: readonly string[]
  readonly route?: { readonly provider: string; readonly model: string }
}

/**
 * Collect visible, finalized user and assistant messages in log order.
 * @param chat - current Chat snapshot, or undefined when that view is inactive.
 * @returns candidates with text, attachments, skills, references, and durable identity.
 */
export function collectCandidates(chat: ChatSnapshot | undefined): readonly QuoteCandidate[] {
  if (chat === undefined) return []
  const candidates: QuoteCandidate[] = []
  for (const node of chat.nodes.values()) {
    if (node.visibility !== 'visible') continue
    if (node.kind === 'user' || node.kind === 'steering') {
      const candidate = userCandidate(node as ChatNode<'user' | 'steering'>)
      if (candidate !== undefined) candidates.push(candidate)
    } else if (node.kind === 'assistant-step') {
      const candidate = assistantCandidate(node as ChatNode<'assistant-step'>)
      if (candidate !== undefined) candidates.push(candidate)
    }
  }
  return candidates.sort((left, right) => left.seq - right.seq || left.key.localeCompare(right.key))
}

/**
 * Find one finalized assistant candidate by durable message identity, regardless of row visibility.
 * @param chat - current Chat snapshot.
 * @param messageId - assistant message identity from the action row.
 * @returns the candidate, or undefined when no finalized assistant message matches.
 */
export function assistantCandidateByMessage(chat: ChatSnapshot | undefined, messageId: string): QuoteCandidate | undefined {
  if (chat === undefined) return undefined
  for (const node of chat.nodes.values()) {
    if (node.kind !== 'assistant-step') continue
    const candidate = assistantCandidate(node as ChatNode<'assistant-step'>)
    if (candidate?.messageId === messageId) return candidate
  }
  return undefined
}

function userCandidate(node: ChatNode<'user' | 'steering'>): QuoteCandidate | undefined {
  const data = node.data as typeof node.data & { readonly messageId?: unknown }
  const text = textOf(data.content)
  const attachments = attachmentsOf(data.content)
  if (text === '' && attachments.length === 0) return undefined
  return {
    key: node.key,
    role: 'user',
    ...(data.kind === 'steering' ? { steering: true as const } : {}),
    ...(data.messageId === undefined ? {} : { messageId: String(data.messageId) }),
    seq: data.seq,
    time: data.time,
    text,
    attachments,
    skills: data.skillNames ?? [],
    references: data.referenceLabels ?? [],
  }
}

function assistantCandidate(node: ChatNode<'assistant-step'>): QuoteCandidate | undefined {
  const data = node.data
  if (data.status === 'running' || data.finalNode === undefined) return undefined
  const text = data.blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('\n')
  const attachments = data.blocks.flatMap(block => block.kind === 'image' ? [imageAttachment(block.attachment)] : [])
  if (text === '' && attachments.length === 0) return undefined
  const providerMetadata = data.finalNode.providerMetadata
  const messageId = data.finalNode.messageId
  return {
    key: node.key,
    role: 'assistant',
    ...(messageId === undefined ? {} : { messageId: String(messageId) }),
    seq: data.finalNode.seq,
    time: data.finalNode.time,
    text,
    attachments,
    skills: [],
    references: [],
    ...(providerMetadata === undefined
      ? {}
      : { route: { provider: providerMetadata.provider, model: providerMetadata.model } }),
  }
}

function textOf(content: readonly ContentBlock[]): string {
  return content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function attachmentsOf(content: readonly ContentBlock[]): readonly QuoteAttachment[] {
  const attachments: QuoteAttachment[] = []
  for (const block of content) {
    if (block.type === 'image') attachments.push(imageAttachment(block.attachment))
    else if (block.type === 'file') attachments.push(fileAttachment(block.attachment))
  }
  return attachments
}

function imageAttachment(attachment: {
  readonly attachmentId: string
  readonly mediaType: string
  readonly bytes: number
  readonly width: number
  readonly height: number
  readonly name?: string
}): QuoteAttachment {
  return {
    kind: 'image',
    id: String(attachment.attachmentId),
    mediaType: attachment.mediaType,
    bytes: attachment.bytes,
    width: attachment.width,
    height: attachment.height,
    ...(attachment.name === undefined ? {} : { name: attachment.name }),
  }
}

function fileAttachment(attachment: {
  readonly attachmentId: string
  readonly name: string
  readonly bytes: number
}): QuoteAttachment {
  return {
    kind: 'file',
    id: String(attachment.attachmentId),
    name: attachment.name,
    bytes: attachment.bytes,
  }
}
