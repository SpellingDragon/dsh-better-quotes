/** One selectable message row shared by the quotes drawer. */
import type { ReactNode } from 'react'
import {
  Button, Checkbox, fileSizeText, IconLinkOutlineRegular, IconPaperclipOutlineRegular, IconSkillOutlineRegular, Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { QuoteAttachment, QuoteCandidate } from './candidates.ts'
import type { NS } from './locales.ts'

type Translate = PropsLocale<typeof NS>['t']

/** Props for one message row. */
export interface QuoteRowProps {
  readonly candidate: QuoteCandidate
  readonly checked: boolean
  readonly onToggle: (next: boolean) => void
  readonly onLocate: () => void
  readonly t: Translate
}

/**
 * Render one message row with its role, time, preview, and multimodal facts.
 * @param props - candidate, selection state, actions, and copy.
 * @returns the row.
 */
export function QuoteRow({ candidate, checked, onToggle, onLocate, t }: QuoteRowProps): ReactNode {
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

function formatClock(time: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(time))
}
