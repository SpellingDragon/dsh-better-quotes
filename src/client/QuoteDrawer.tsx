/** Right-sidebar drawer for selecting messages, quoting them, or forwarding them to another Session. */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  Button, IconSearchOutlineRegular, Input, SegmentedControl,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatBundle, formatForwardPrompt } from './bundle.ts'
import { collectCandidates, type QuoteCandidate } from './candidates.ts'
import { insertQuoteText } from './input.ts'
import { locateMessage } from './locate.ts'
import type { NS } from './locales.ts'
import { QuoteRow } from './QuoteRow.tsx'

/** Operations and live Session catalog injected by the browser plugin. */
export interface QuoteDrawerInjected {
  hooks: { sessionList: ObservableSnapshot<SessionListState> }
  /**
   * Send one forwarded bundle into a target Session.
   * @param targetId - target Session.
   * @param text - prompt text carrying the bundle.
   */
  readonly forward: (targetId: SessionId, text: string) => Promise<void>
}

/** Composed props for the quotes drawer body. */
export type QuoteDrawerProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<typeof NS>
  & InjectFace<QuoteDrawerInjected>

type Mode = 'quote' | 'forward'
type Step = 'select' | 'target'
type Failure = 'insert' | 'forward' | 'locate'
type Status = 'inserted' | 'forwarded'

/**
 * Render the drawer: select messages, then quote into the composer or forward to another Session.
 * @param props - tab runtime, Chat/Session hooks, input actions, forwarding verb, and copy.
 * @returns the drawer body.
 */
export function QuoteDrawer({
  sessionId, useConversation, inputActions, useTabInfo, useSessionList, forward, t,
}: QuoteDrawerProps): ReactNode {
  const tabInfo = useTabInfo()
  const chat = useConversation(snapshot => snapshot.views.get('chat'))
  const sessions = useSessionList(state => state)
  const modeId = useId()
  const [mode, setMode] = useState<Mode>('quote')
  const [step, setStep] = useState<Step>('select')
  const [query, setQuery] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [targetId, setTargetId] = useState<SessionId | undefined>()
  const [failure, setFailure] = useState<Failure | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [forwardedTo, setForwardedTo] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<string | undefined>()

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

  const changeMode = (next: Mode): void => {
    setMode(next)
    setStep('select')
    setFailure(null)
    setStatus(null)
    setForwardedTo('')
    setTargetId(undefined)
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

  const locate = (candidate: QuoteCandidate): void => {
    if (!locateMessage(candidate.key)) {
      setFailure('locate')
      setStatus(null)
      return
    }
    setFailure(null)
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

  const failureText = failure === null
    ? null
    : t(failure === 'insert'
      ? 'drawer.insertFailed'
      : failure === 'forward' ? 'drawer.forwardFailed' : 'drawer.locateFailed')

  return (
    <div className="bq-drawer">
      <header className="bq-drawer-header">
        <h2 className="bq-drawer-title">{t('tab.title')}</h2>
        <SegmentedControl
          id={modeId}
          value={mode}
          options={[
            { value: 'quote', label: t('drawer.mode.quote') },
            { value: 'forward', label: t('drawer.mode.forward') },
          ]}
          onChange={changeMode}
          label={t('drawer.mode.label')}
          disabled={sending}
        />
      </header>

      {step === 'target' && mode === 'forward'
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
              data-modal-autofocus=""
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
              <span className="bq-toolbar-actions">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedKeys(new Set(filtered.map(candidate => candidate.key))) }}>
                  {t('drawer.selectAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedKeys(new Set()) }}>
                  {t('drawer.clear')}
                </Button>
              </span>
            </div>
            <Input
              value={query}
              onChange={event => { setQuery(event.target.value) }}
              placeholder={t('drawer.searchMessages')}
              aria-label={t('drawer.searchMessages')}
              icon={<IconSearchOutlineRegular size={14} />}
              data-modal-autofocus=""
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
                        onLocate={() => { locate(candidate) }}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
            <footer className="bq-drawer-footer">
              <Button
                variant="primary"
                disabled={selected.size === 0 || sending}
                onClick={() => {
                  if (mode === 'quote') insert()
                  else {
                    setStep('target')
                    setFailure(null)
                    setStatus(null)
                  }
                }}
              >
                {mode === 'quote'
                  ? t('drawer.insert', { count: selected.size })
                  : t('drawer.chooseTarget')}
              </Button>
            </footer>
          </div>
        )}
    </div>
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
