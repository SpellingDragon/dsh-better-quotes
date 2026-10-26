/** Conversation-inline picker above the composer: select messages, quote them, or forward them. */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Button, IconCloseOutlineRegular, IconSearchOutlineRegular, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatBundle, formatForwardPrompt } from './bundle.ts'
import { collectCandidates, type QuoteCandidate } from './candidates.ts'
import { insertQuoteText } from './input.ts'
import type { NS } from './locales.ts'
import type { PickerState } from './picker.ts'
import { QuoteRow } from './QuoteRow.tsx'

/** Picker state, close verb, and cross-Session forwarding injected by the browser plugin. */
export interface QuoteDockInjected {
  hooks: { picker: { getSnapshot(): PickerState; subscribe(listener: () => void): () => void } }
  readonly close: () => void
  /**
   * Send one forwarded bundle into a target Session.
   * @param targetId - target Session.
   * @param text - prompt text carrying the bundle.
   */
  readonly forward: (targetId: SessionId, text: string) => Promise<void>
}

/** Composed props for the inline picker dock. */
export type QuoteDockProps =
  PropsRuntime<'conversation.input.dock'>
  & PropsLocale<typeof NS>
  & InjectFace<QuoteDockInjected>

type Step = 'select' | 'target'
type Failure = 'insert' | 'forward'
type Status = 'inserted' | 'forwarded'

/**
 * Render the inline picker above the composer while it is open.
 * @param props - Chat/Session seats, input actions, picker state, forwarding verb, and copy.
 * @returns the picker panel, or null while closed.
 */
export function QuoteDock({
  sessionId, useConversation, useSessions, inputActions, usePicker, close, forward, t,
}: QuoteDockProps): ReactNode {
  const picker = usePicker(state => state)
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const sessions = useSessions(state => state)
  const [step, setStep] = useState<Step>('select')
  const [query, setQuery] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [targetId, setTargetId] = useState<SessionId | undefined>()
  const [failure, setFailure] = useState<Failure | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [forwardedTo, setForwardedTo] = useState('')
  const [sending, setSending] = useState(false)

  const candidates = useMemo(() => collectCandidates(chat), [chat])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle === '' ? candidates : candidates.filter(candidate => matchesQuery(candidate, needle))
  }, [candidates, query])
  const available = useMemo(() => new Set(candidates.map(candidate => candidate.key)), [candidates])
  const selected = useMemo(
    () => new Set([...selectedKeys].filter(key => available.has(key))),
    [available, selectedKeys],
  )
  const chosen = useMemo(() => candidates.filter(candidate => selected.has(candidate.key)), [candidates, selected])
  const allShown = filtered.length > 0 && filtered.every(candidate => selected.has(candidate.key))
  const targets = useMemo(() => {
    const needle = targetQuery.trim().toLowerCase()
    return sessions.ids
      .filter(id => id !== sessionId && sessions.byId[id]?.origin !== 'subagent')
      .flatMap(id => {
        const summary = sessions.byId[id]
        if (summary === undefined) return []
        if (needle !== '' && !`${summary.displayTitle}\n${summary.cwd ?? ''}`.toLowerCase().includes(needle)) return []
        return [summary]
      })
  }, [sessionId, sessions, targetQuery])
  const selectedTarget = targetId === undefined ? undefined : sessions.byId[targetId]

  useEffect(() => {
    if (picker.open) return
    setStep('select')
    setQuery('')
    setTargetQuery('')
    setSelectedKeys(new Set())
    setTargetId(undefined)
    setFailure(null)
    setStatus(null)
    setForwardedTo('')
  }, [picker.open])

  useEffect(() => {
    if (!picker.open || picker.focus === null) return
    const candidate = candidates.find(item => item.messageId === picker.focus)
    if (candidate === undefined || selected.has(candidate.key)) return
    setSelectedKeys(new Set([candidate.key]))
  }, [candidates, picker.focus, picker.open, selected])

  const toggleAll = (): void => {
    setSelectedKeys(allShown ? new Set() : new Set(filtered.map(candidate => candidate.key)))
  }

  const insert = (): void => {
    if (chosen.length === 0) return
    if (!insertQuoteText(inputActions, formatBundle(chosen, sessionId))) {
      setFailure('insert')
      setStatus(null)
      return
    }
    setFailure(null)
    setStatus('inserted')
    setSelectedKeys(new Set())
  }

  const send = async (): Promise<void> => {
    if (targetId === undefined || chosen.length === 0 || sending) return
    setSending(true)
    setFailure(null)
    setStatus(null)
    try {
      const title = selectedTarget?.displayTitle ?? String(targetId)
      await forward(targetId, formatForwardPrompt(formatBundle(chosen, sessionId)))
      setForwardedTo(title)
      setStatus('forwarded')
      setStep('select')
      setSelectedKeys(new Set())
      setTargetId(undefined)
    } catch {
      setFailure('forward')
    } finally {
      setSending(false)
    }
  }

  if (!picker.open) return null

  const failureText = failure === null
    ? null
    : t(failure === 'insert' ? 'drawer.insertFailed' : 'drawer.forwardFailed')

  return (
    <section className="bq-dock" data-quote-picker="">
      <header className="bq-dock-header">
        <h2 className="bq-dock-title">{t('tab.title')}</h2>
        <Button variant="ghost" size="sm" className="bq-dock-close" aria-label={t('drawer.close')} onClick={close}>
          <IconCloseOutlineRegular size={14} />
        </Button>
      </header>

      {step === 'target'
        ? (
          <div className="bq-dock-section">
            <div className="bq-target-head">
              <Button variant="ghost" size="sm" onClick={() => { setStep('select'); setFailure(null) }} disabled={sending}>
                {t('drawer.back')}
              </Button>
              <span className="bq-target-title">{t('drawer.target.title')}</span>
            </div>
            <Input
              value={targetQuery}
              onChange={event => { setTargetQuery(event.target.value) }}
              placeholder={t('drawer.searchSessions')}
              aria-label={t('drawer.searchSessions')}
              icon={<IconSearchOutlineRegular size={14} />}
            />
            {failureText !== null && <p className="bq-failure" role="alert">{failureText}</p>}
            <ul className="bq-target-list">
              {targets.map(target => (
                <li key={target.id}>
                  <button
                    type="button"
                    className="bq-target-row"
                    data-selected={target.id === targetId || undefined}
                    onClick={() => { setTargetId(target.id) }}
                    disabled={sending}
                  >
                    <span className="bq-target-name">{target.displayTitle}</span>
                    {target.cwd !== undefined && <span className="bq-target-cwd">{target.cwd}</span>}
                    {target.running && <span className="bq-target-running">{t('drawer.running')}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {targets.length === 0 && <p className="bq-empty">{t('drawer.noSessions')}</p>}
            <footer className="bq-dock-footer">
              <span className="bq-count">{t('drawer.selected', { count: selected.size })}</span>
              <Button
                variant="primary"
                disabled={selectedTarget === undefined || selected.size === 0 || sending}
                onClick={() => { void send() }}
              >
                {sending
                  ? t('drawer.sending')
                  : selectedTarget === undefined
                    ? t('drawer.send')
                    : t('drawer.sendTo', { title: selectedTarget.displayTitle })}
              </Button>
            </footer>
          </div>
        )
        : (
          <div className="bq-dock-section">
            <div className="bq-dock-tools">
              <span className="bq-count">{t('drawer.selected', { count: selected.size })}</span>
              <Button variant="ghost" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
                {allShown ? t('drawer.clear') : t('drawer.selectAll')}
              </Button>
            </div>
            <Input
              value={query}
              onChange={event => { setQuery(event.target.value) }}
              placeholder={t('drawer.searchMessages')}
              aria-label={t('drawer.searchMessages')}
              icon={<IconSearchOutlineRegular size={14} />}
            />
            {failureText !== null && <p className="bq-failure" role="alert">{failureText}</p>}
            {status !== null && (
              <p className="bq-status" role="status">
                {status === 'inserted'
                  ? t('drawer.inserted')
                  : t('drawer.forwarded', { title: forwardedTo })}
              </p>
            )}
            {candidates.length === 0
              ? <p className="bq-empty">{t('drawer.empty')}</p>
              : filtered.length === 0
                ? <p className="bq-empty">{t('drawer.noResults')}</p>
                : (
                  <ul className="bq-list">
                    {filtered.map(candidate => (
                      <QuoteRow
                        key={candidate.key}
                        candidate={candidate}
                        checked={selected.has(candidate.key)}
                        onToggle={(next) => {
                          setSelectedKeys((current) => {
                            const updated = new Set(current)
                            if (next) updated.add(candidate.key)
                            else updated.delete(candidate.key)
                            return updated
                          })
                        }}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
            <footer className="bq-dock-footer">
              <Button
                variant="ghost"
                disabled={selected.size === 0 || sending}
                onClick={() => {
                  setStep('target')
                  setFailure(null)
                  setStatus(null)
                }}
              >
                {t('drawer.forward')}
              </Button>
              <Button variant="primary" disabled={selected.size === 0 || sending} onClick={insert}>
                {t('drawer.insert', { count: selected.size })}
              </Button>
            </footer>
          </div>
        )}
    </section>
  )
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
