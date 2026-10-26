/** Markdown blockquote serialization for one selected message and its durable metadata. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { QuoteAttachment, QuoteCandidate } from './candidates.ts'

/**
 * Serialize one message as an ordinary Markdown blockquote with a machine-readable metadata tail.
 * @param candidate - selected message and its multimodal facts.
 * @param sessionId - Session that owns the original event.
 * @returns quote text accepted by the composer's atomic quote insertion.
 */
export function formatQuote(candidate: QuoteCandidate, sessionId: SessionId): string {
  const lines: string[] = [candidate.text.trim() === '' ? '(no text)' : candidate.text.trim()]
  if (candidate.attachments.length > 0) {
    lines.push('')
    for (const attachment of candidate.attachments) lines.push(formatAttachment(attachment))
  }
  lines.push('')
  lines.push(formatMetadata(candidate, sessionId))
  return lines.join('\n')
}

/**
 * Encode the original event identity and sender facts the model needs for lookup.
 * @param candidate - selected message.
 * @param sessionId - Session that owns the original event.
 * @returns one bracket-delimited metadata line.
 */
export function formatMetadata(candidate: QuoteCandidate, sessionId: SessionId): string {
  const fields = [
    `role=${candidate.role}`,
    `speaker=${candidate.role}`,
    ...(candidate.steering === true ? ['mode=steering'] : []),
    ...(candidate.route === undefined ? [] : [
      `provider=${JSON.stringify(candidate.route.provider)}`,
      `model=${JSON.stringify(candidate.route.model)}`,
    ]),
    `time=${new Date(candidate.time).toISOString()}`,
    `seq=${String(candidate.seq)}`,
    ...(candidate.messageId === undefined ? [] : [`message_id=${JSON.stringify(candidate.messageId)}`]),
    `session_id=${JSON.stringify(String(sessionId))}`,
    ...(candidate.skills.length === 0 ? [] : [`skills=${JSON.stringify(candidate.skills)}`]),
    ...(candidate.references.length === 0 ? [] : [`references=${JSON.stringify(candidate.references)}`]),
  ]
  return `[multiquote ${fields.join(' ')}]`
}

/**
 * Encode one image or file reference without copying its bytes.
 * @param attachment - durable attachment fact.
 * @returns one bracket-delimited attachment line.
 */
export function formatAttachment(attachment: QuoteAttachment): string {
  const fields = [
    `kind=${attachment.kind}`,
    ...(attachment.name === undefined ? [] : [`name=${JSON.stringify(attachment.name)}`]),
    ...(attachment.mediaType === undefined ? [] : [`media_type=${JSON.stringify(attachment.mediaType)}`]),
    `bytes=${String(attachment.bytes)}`,
    ...(attachment.width === undefined ? [] : [`width=${String(attachment.width)}`]),
    ...(attachment.height === undefined ? [] : [`height=${String(attachment.height)}`]),
    `id=${JSON.stringify(attachment.id)}`,
  ]
  return `[attachment ${fields.join(' ')}]`
}
