/** Sent-message card for a quoted bundle, with per-item source navigation. */
import { useState, type ReactNode } from 'react'
import {
  Button, IconContextInjectionOutlineRegular, Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
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
 * Render a compact, expandable quoted-message card in the transcript.
 * @param props - parsed bundle, Conversation lookup, Session identity, and copy.
 * @returns the inline card and its per-message locate controls.
 */
export function BundleQuote({ node, useConversation, sessionId, t }: BundleQuoteProps): ReactNode {
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const [expanded, setExpanded] = useState(true)
  const [failure, setFailure] = useState(false)
  const bundle = node.data
  const sameSession = bundle.sourceSession === String(sessionId)

  const locate = (item: BundleItem): void => {
    if (!sameSession) return
    const target = chat?.nodes.values().find((candidate) => {
      const data = candidate.data as { messageId?: unknown; seq?: number }
      return item.messageId === undefined
        ? data.seq === item.seq
        : String(data.messageId) === item.messageId
    })
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
        {!sameSession && <Tag tone="warning">{t('bundle.otherSession')}</Tag>}
        <span className="bq-bundle-chevron" aria-hidden>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <span className="bq-bundle-body">
          <span className="bq-bundle-source" title={bundle.sourceSession}>
            {t('bundle.source', { session: shortSession(bundle.sourceSession) })}
          </span>
          {bundle.items.map((item, index) => (
            <span className="bq-bundle-item" key={`${item.sessionId}:${String(item.seq)}:${String(index)}`}>
              <span className="bq-bundle-item-head">
                <Tag tone={item.role === 'assistant' ? 'info' : 'neutral'}>{roleLabel(item, t)}</Tag>
                <span className="bq-bundle-time">{formatTime(item.time)}</span>
                {item.attachments.length > 0 && (
                  <span className="bq-bundle-attachments">
                    {t('bundle.attachments', { count: item.attachments.length })}
                  </span>
                )}
                {sameSession && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bq-bundle-locate"
                    onClick={() => { locate(item) }}
                  >
                    {t('bundle.locate')}
                  </Button>
                )}
              </span>
              <span className="bq-bundle-text">{item.text === '' ? t('row.noText') : item.text}</span>
            </span>
          ))}
          {failure && <span className="bq-bundle-failure" role="alert">{t('bundle.locateFailed')}</span>}
        </span>
      )}
    </span>
  )
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

function shortSession(sessionId: string): string {
  return sessionId.length <= 10 ? sessionId : `${sessionId.slice(0, 8)}…`
}
