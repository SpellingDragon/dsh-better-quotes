/** Multi-select message quote picker contributed to the Session header. */
import { useMemo, useState, type ReactNode } from 'react'
import {
  Button, Checkbox, fileSizeText, IconChecklistOutlineRegular, IconLinkOutlineRegular,
  IconPaperclipOutlineRegular, IconSearchOutlineRegular, IconSkillOutlineRegular, Input, Modal, Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConversationSnapshot, InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { collectCandidates, type QuoteAttachment, type QuoteCandidate } from './candidates.ts'
import { formatQuote } from './format.ts'
import { NS } from './locales.ts'

/** Standard Session props plus the localized copy this picker owns. */
export type MessageMultiquoteProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>

type Translate = MessageMultiquoteProps['t']

/** Newer hosts expose atomic quote insertion; older hosts keep the plain-text insertion fallback. */
interface QuoteInputActions extends InputActions {
  insertQuote?: (text: string) => boolean
}

/**
 * Render the Session header entry and its multi-select quote dialog.
 * @param props - Session runtime, standard conversation hooks, input actions, and localized copy.
 * @returns the header control and its body-portaled picker.
 */
export function MessageMultiquote({ sessionId, useConversation, inputActions, t }: MessageMultiquoteProps): ReactNode {
  const chat = useConversation((snapshot: ConversationSnapshot) => snapshot.views.get('chat'))
  const quoteActions: QuoteInputActions = inputActions
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [failure, setFailure] = useState<'insert' | 'locate' | null>(null)
  const candidates = useMemo(() => open ? collectCandidates(chat) : [], [chat, open])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle === '' ? candidates : candidates.filter(candidate => matchesQuery(candidate, needle))
  }, [candidates, query])
  const available = useMemo(() => new Set(candidates.map(candidate => candidate.key)), [candidates])
  const selected = useMemo(
    () => new Set([...selectedKeys].filter(key => available.has(key))),
    [available, selectedKeys],
  )

  const show = (): void => {
    setFailure(null)
    setQuery('')
    setOpen(true)
  }
  const cancel = (): void => {
    setFailure(null)
    setOpen(false)
    setQuery('')
    setSelectedKeys(new Set())
  }
  const toggle = (key: string, next: boolean): void => {
    setSelectedKeys((current) => {
      const updated = new Set(current)
      if (next) updated.add(key)
      else updated.delete(key)
      return updated
    })
  }
  const insert = (): void => {
    const chosen = candidates.filter(candidate => selected.has(candidate.key))
    for (const candidate of chosen) {
      const text = formatQuote(candidate, sessionId)
      const inserted = quoteActions.insertQuote === undefined
        ? inputActions.insertText(text, inputActions.captureInsertion())
        : quoteActions.insertQuote(text)
      if (!inserted) {
        setFailure('insert')
        return
      }
    }
    setSelectedKeys(new Set())
    setOpen(false)
  }
  const locate = (key: string): void => {
    const target = findMessageElement(key)
    if (target === null) {
      setFailure('locate')
      return
    }
    setFailure(null)
    setOpen(false)
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    target.animate?.(
      [
        { outline: '2px solid currentColor', outlineOffset: '4px' },
        { outline: '2px solid transparent', outlineOffset: '4px' },
      ],
      { duration: 1_600 },
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="bq-header-button"
        aria-label={t('header.label')}
        title={t('header.label')}
        disabled={chat === undefined}
        onClick={show}
      >
        <IconChecklistOutlineRegular size={16} />
        <span className="bq-header-label">{t('header.label')}</span>
      </Button>
      <Modal
        open={open}
        onClose={cancel}
        title={t('dialog.title')}
        description={t('dialog.description')}
        closeLabel={t('dialog.close')}
        className="bq-dialog"
        contentClassName="bq-dialog-content"
        footer={(
          <div className="bq-footer">
            <Button variant="ghost" onClick={cancel}>{t('dialog.cancel')}</Button>
            <Button variant="primary" disabled={selected.size === 0} onClick={insert}>
              {t('dialog.insert', { count: selected.size })}
            </Button>
          </div>
        )}
      >
        <div className="bq-toolbar">
          <span className="bq-count">{t('dialog.selected', { count: selected.size })}</span>
          <div className="bq-toolbar-actions">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedKeys(new Set(filtered.map(candidate => candidate.key))) }}>
              {t('dialog.selectAll')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedKeys(new Set()) }}>
              {t('dialog.clear')}
            </Button>
          </div>
        </div>
        <div className="bq-search">
          <Input
            value={query}
            onChange={event => { setQuery(event.target.value) }}
            placeholder={t('dialog.search')}
            aria-label={t('dialog.search')}
            icon={<IconSearchOutlineRegular size={14} />}
            data-modal-autofocus=""
          />
        </div>
        {failure !== null && (
          <p className="bq-failure" role="alert">
            {t(failure === 'insert' ? 'dialog.insertFailed' : 'dialog.locateFailed')}
          </p>
        )}
        {candidates.length === 0
          ? <p className="bq-empty">{t('dialog.empty')}</p>
          : filtered.length === 0
            ? <p className="bq-empty">{t('dialog.noResults')}</p>
            : (
              <ul className="bq-list">
                {filtered.map(candidate => (
                  <QuoteRow
                    key={candidate.key}
                    candidate={candidate}
                    checked={selected.has(candidate.key)}
                    onToggle={next => { toggle(candidate.key, next) }}
                    onLocate={() => { locate(candidate.key) }}
                    t={t}
                  />
                ))}
              </ul>
            )}
      </Modal>
    </>
  )
}

function QuoteRow({ candidate, checked, onToggle, onLocate, t }: {
  readonly candidate: QuoteCandidate
  readonly checked: boolean
  readonly onToggle: (next: boolean) => void
  readonly onLocate: () => void
  readonly t: Translate
}) {
  const speaker = candidate.steering === true
    ? t('row.steering')
    : candidate.role === 'user' ? t('row.user') : t('row.assistant')
  const time = formatClock(candidate.time)
  return (
    <li className="bq-row" data-selected={checked || undefined}>
      <div className="bq-row-head">
        <Checkbox
          checked={checked}
          onChange={onToggle}
          label={t('row.select', { speaker, time })}
          className="bq-checkbox"
        />
        <Tag tone={candidate.role === 'assistant' ? 'info' : 'neutral'}>{speaker}</Tag>
        {candidate.route !== undefined && (
          <span className="bq-model">{`${candidate.route.provider}/${candidate.route.model}`}</span>
        )}
        <time className="bq-time" dateTime={new Date(candidate.time).toISOString()}>{time}</time>
        <Button
          variant="ghost"
          size="sm"
          className="bq-locate"
          aria-label={t('row.locate')}
          title={t('row.locate')}
          onClick={onLocate}
        >
          <IconLinkOutlineRegular size={14} />
        </Button>
      </div>
      <p className="bq-preview">{candidate.text.trim() === '' ? t('row.noText') : candidate.text}</p>
      {candidate.attachments.length > 0 && (
        <div className="bq-meta-group" role="group" aria-label={t('row.attachments')}>
          <IconPaperclipOutlineRegular size={13} className="bq-meta-icon" />
          {candidate.attachments.map(attachment => (
            <Tag key={`${attachment.kind}:${attachment.id}`} tone="quiet">{attachmentLabel(attachment, t)}</Tag>
          ))}
        </div>
      )}
      {candidate.skills.length > 0 && (
        <div className="bq-meta-group" role="group" aria-label={t('row.skills')}>
          <IconSkillOutlineRegular size={13} className="bq-meta-icon" />
          {candidate.skills.map(skill => <Tag key={skill} tone="quiet">{skill}</Tag>)}
        </div>
      )}
      {candidate.references.length > 0 && (
        <div className="bq-meta-group" role="group" aria-label={t('row.references')}>
          {candidate.references.map(reference => <Tag key={reference} tone="outline">{reference}</Tag>)}
        </div>
      )}
    </li>
  )
}

function attachmentLabel(attachment: QuoteAttachment, t: Translate): string {
  const kind = t(attachment.kind === 'image' ? 'attachment.image' : 'attachment.file')
  const name = attachment.name ?? t('attachment.unnamed')
  const dimensions = attachment.width === undefined || attachment.height === undefined
    ? undefined
    : `${String(attachment.width)}×${String(attachment.height)}`
  return [kind, name, dimensions, fileSizeText(attachment.bytes)].filter(part => part !== undefined).join(' · ')
}

function matchesQuery(candidate: QuoteCandidate, needle: string): boolean {
  return [
    candidate.role,
    candidate.steering === true ? 'steering' : '',
    candidate.text,
    candidate.route?.provider ?? '',
    candidate.route?.model ?? '',
    ...candidate.skills,
    ...candidate.references,
    ...candidate.attachments.map(attachment => attachment.name ?? ''),
  ].join('\n').toLowerCase().includes(needle)
}

function formatClock(time: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(time))
}

function findMessageElement(key: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>('[data-chat-node-key]')) {
    if (element.dataset.chatNodeKey === key) return element
  }
  return null
}
