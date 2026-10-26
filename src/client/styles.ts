/** Plugin-owned stylesheet installed once per browser plugin lifetime. */

const STYLE_ID = 'dsh-better-quotes-styles'

const CSS = `
.bq-header-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.bq-header-label {
  font-size: 13px;
}

@media (max-width: 720px) {
  .bq-header-label {
    display: none;
  }
}

.bq-dialog.bq-dialog {
  width: min(760px, 100%);
  border-radius: var(--dsw-radius-panel);
}

.bq-dialog-content {
  min-height: 0;
}

.bq-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.bq-count {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}

.bq-toolbar-actions {
  display: flex;
  gap: 4px;
}

.bq-search {
  margin-bottom: 10px;
}

.bq-search input {
  width: 100%;
  box-sizing: border-box;
}

.bq-failure {
  margin: 0 0 12px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 13px;
  line-height: 20px;
}

.bq-empty {
  margin: 0;
  padding: 24px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  text-align: center;
}

.bq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 52vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.bq-row {
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
  transition: background-color 120ms ease, border-color 120ms ease;
}

.bq-row[data-selected] {
  border-color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.bq-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bq-checkbox {
  flex: none;
}

.bq-checkbox > span {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.bq-model {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bq-time {
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.bq-locate {
  flex: none;
}

.bq-preview {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.bq-meta-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.bq-meta-icon {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}

.bq-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .bq-row {
    transition: none;
  }
}
`

/**
 * Install the plugin stylesheet unless another instance already owns it.
 * @returns a disposer that removes only the stylesheet this call created.
 */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => undefined
  if (document.getElementById(STYLE_ID) !== null) return () => undefined
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
