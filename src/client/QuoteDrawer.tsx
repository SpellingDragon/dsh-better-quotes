/** Right-Sidebar tab body: select messages, quote them into the composer, or forward them. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Button, IconSearchOutlineRegular, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatBundle, formatDraftQuote, formatForwardPrompt } from './bundle.ts'
import { collectCandidates, type QuoteCandidate } from './candidates.ts'
import { insertQuoteText } from './input.ts'
import type { NS } from './locales.ts'
import { QuoteRow } from './QuoteRow.tsx'

/** Operations injected by the browser plugin. */
export interface QuoteDrawerInjected {
  /** Collapse the right-Sidebar column when it is expanded. */
  readonly collapse: () => void
  /**
   * Send one forwarded bundle into a target Session.
   * @param targetId - target Session.
   * @param text - prompt text carrying the bundle.
   */
  readonly forward: (targetId: SessionId, text: string) => Promise<void>
}

/** Composed props for the quotes tab body. */
export type QuoteDrawerProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<typeof NS>
  & InjectFace<QuoteDrawerInjected>

type Step = 'select' | 'target'
type Failure = 'insert' | 'forward'

/**
 * Render the quotes tab: select messages, then insert one quote bundle or forward it.
 * @param props - tab navigation, Chat/Session seats, input actions, panel verbs, and copy.
 * @returns the tab body.
 */
export function QuoteDrawer({
  sessionId, useConversation, useSessions, inputActions, useTabInfo, collapse, forward, t,
}: QuoteDrawerProps): ReactNode {
  const tabInfo = useTabInfo()
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const sessions = useSessions(state => state)
  const [step, setStep] = useState<Step>('select')
  const [query, setQuery] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [targetId, setTargetId] = useState<SessionId | undefined>()
  const [failure, setFailure] = useState<Failure | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<string | undefined>()
  const listRef = useRef<HTMLUListElement | null>(null)

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

  const selectionParam = (tabInfo.tab.navigation.params as { select?: string } | undefined)?.select
  useEffect(() => {
    setPendingSelect(selectionParam)
  }, [selectionParam, tabInfo.tab.navigation.revision])
  useEffect(() => {
    if (pendingSelect === undefined) return
    const candidate = candidates.find(item => item.messageId === pendingSelect)
    if (candidate === undefined) return
    setSelectedKeys(new Set([candidate.key]))
    setPendingSelect(undefined)
  }, [candidates, pendingSelect])
  useEffect(() => {
    if (!tabInfo.tab.visible) return
    const list = listRef.current
    if (list === null) return
    list.scrollTop = list.scrollHeight
  }, [tabInfo.tab.visible])

  const toggleAll = (): void => {
    setSelectedKeys(allShown ? new Set() : new Set(filtered.map(candidate => candidate.key)))
  }

  const insert = (): void => {
    if (chosen.length === 0) return
    if (!insertQuoteText(inputActions, formatDraftQuote(chosen, sessionId, t))) {
      setFailure('insert')
      return
    }
    setFailure(null)
    setSelectedKeys(new Set())
    collapse()
  }

  const send = async (): Promise<void> => {
    if (targetId === undefined || chosen.length === 0 || sending) return
    setSending(true)
    setFailure(null)
    try {
      await forward(targetId, formatForwardPrompt(formatBundle(chosen, sessionId)))
      setStep('select')
      setSelectedKeys(new Set())
      setTargetId(undefined)
      collapse()
    } catch {
      setFailure('forward')
    } finally {
      setSending(false)
    }
  }

  const failureText = failure === null
    ? null
    : t(failure === 'insert' ? 'drawer.insertFailed' : 'drawer.forwardFailed')

  return (
    <section className="bq-drawer" data-quote-picker="">
      {step === 'target'
        ? (
          <div className="bq-drawer-section">
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
            <footer className="bq-drawer-footer">
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
          <div className="bq-drawer-section">
            <div className="bq-drawer-tools">
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
            {candidates.length === 0
              ? <p className="bq-empty">{t('drawer.empty')}</p>
              : filtered.length === 0
                ? <p className="bq-empty">{t('drawer.noResults')}</p>
                : (
                  <ul className="bq-list" ref={listRef}>
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
            <footer className="bq-drawer-footer">
              <Button
                variant="ghost"
                disabled={selected.size === 0 || sending}
                onClick={() => {
                  setStep('target')
                  setFailure(null)
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
