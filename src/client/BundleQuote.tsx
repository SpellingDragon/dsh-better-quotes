/** Sent-message card for a quoted bundle; expanding it reveals clickable source items. */
import { useState, type ReactNode } from 'react'
import { IconContextInjectionOutlineRegular, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatConversationViewNode, ChatNode, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { UserTextNodeProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { BundleItem } from './bundle.ts'
import { locateMessage } from './locate.ts'
import type { NS } from './locales.ts'
import { BUNDLE_RULE_ID } from './quote-rule.ts'

/** Composed props for the bundle rule's keyed user-text renderer. */
export type BundleQuoteProps =
  UserTextNodeProps<typeof BUNDLE_RULE_ID>
  & PropsLocale<typeof NS>

/**
 * Render a compact, collapsed-by-default quoted-message card in the transcript.
 * @param props - parsed bundle, Conversation lookup, Session identity, and copy.
 * @returns the card; same-Session items locate their source when clicked.
 */
export function BundleQuote({ node, useConversation, sessionId, t }: BundleQuoteProps): ReactNode {
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const [expanded, setExpanded] = useState(false)
  const [failure, setFailure] = useState(false)
  const bundle = node.data
  const sameSession = bundle.sourceSession === String(sessionId)

  const locate = (item: BundleItem): void => {
    const target = findSourceNode(chat, item)
    if (target === undefined || !locateMessage(target.key)) {
      setFailure(true)
      return
    }
    setFailure(false)
  }

  return (
    <span className="bq-bundle" data-quote-bundle="">
      <button
        type="button"
        className="bq-bundle-summary"
        aria-expanded={expanded}
        onClick={() => { setExpanded(current => !current) }}
      >
        <IconContextInjectionOutlineRegular size={14} />
        <span className="bq-bundle-title">{t('bundle.title', { count: bundle.count })}</span>
        {!sameSession && (
          <span title={bundle.sourceSession}>
            <Tag tone="warning">{t('bundle.otherSession')}</Tag>
          </span>
        )}
        <span className="bq-bundle-chevron" aria-hidden>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <span className="bq-bundle-body">
          {bundle.items.map((item, index) => {
            const body = (
              <>
                <span className="bq-bundle-item-head">
                  <Tag tone={item.role === 'assistant' ? 'info' : 'neutral'}>{roleLabel(item, t)}</Tag>
                  <span className="bq-bundle-time">{formatTime(item.time)}</span>
                  {item.attachments.length > 0 && (
                    <span className="bq-bundle-attachments">
                      {t('bundle.attachments', { count: item.attachments.length })}
                    </span>
                  )}
                </span>
                <span className="bq-bundle-text">{item.text === '' ? t('row.noText') : item.text}</span>
              </>
            )
            const key = `${item.sessionId}:${String(item.seq)}:${String(index)}`
            return sameSession
              ? (
                <button
                  type="button"
                  className="bq-bundle-item"
                  key={key}
                  title={t('bundle.locate')}
                  onClick={() => { locate(item) }}
                >
                  {body}
                </button>
              )
              : <span className="bq-bundle-item" key={key}>{body}</span>
          })}
          {failure && <span className="bq-bundle-failure" role="alert">{t('bundle.locateFailed')}</span>}
        </span>
      )}
    </span>
  )
}

function findSourceNode(chat: ChatSnapshot | undefined, item: BundleItem): ChatConversationViewNode | undefined {
  return chat?.nodes.values().find(candidate => matchesItem(candidate, item))
}

function matchesItem(candidate: ChatConversationViewNode, item: BundleItem): boolean {
  if (candidate.kind === 'user' || candidate.kind === 'steering') {
    const data = (candidate as ChatNode<'user' | 'steering'>).data
    const messageId = (data as typeof data & { messageId?: unknown }).messageId
    return item.messageId !== undefined && messageId !== undefined
      ? String(messageId) === item.messageId
      : data.seq === item.seq
  }
  if (candidate.kind === 'assistant-step') {
    const final = (candidate as ChatNode<'assistant-step'>).data.finalNode
    if (final === undefined) return false
    return item.messageId !== undefined && final.messageId !== undefined
      ? String(final.messageId) === item.messageId
      : final.seq === item.seq
  }
  return false
}

function roleLabel(item: BundleItem, t: BundleQuoteProps['t']): string {
  if (item.steering === true) return t('row.steering')
  return item.role === 'user' ? t('row.user') : t('row.assistant')
}

function formatTime(time: string): string {
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return time
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
