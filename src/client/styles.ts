/** Plugin-owned stylesheet installed once per browser plugin lifetime. */

const STYLE_ID = 'dsh-better-quotes-styles'

const CSS = `
.bq-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

@media (hover: hover) {
  .bq-action:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
}

.bq-action:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.bq-drawer {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 100%;
  min-height: 0;
  padding: 12px 12px 0;
  font-size: 13px;
}

.bq-drawer-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.bq-drawer input {
  width: 100%;
  box-sizing: border-box;
}

.bq-drawer-tools,
.bq-target-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bq-target-title {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  font-weight: 500;
}

.bq-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 0 12px;
  border-top: 0.5px solid var(--dsw-alias-border-l4);
}

.bq-count {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}

.bq-failure {
  margin: 0;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}

.bq-status {
  margin: 0;
  color: var(--dsw-alias-state-success-primary);
  font-size: 12px;
  line-height: 18px;
}

.bq-empty {
  margin: 0;
  padding: 20px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  text-align: center;
}

.bq-list {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  margin: 0;
  padding: 0 0 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.bq-target-list {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.bq-target-row {
  width: 100%;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.bq-target-row[data-selected] {
  border-color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.bq-target-row:disabled {
  cursor: default;
  opacity: 0.5;
}

.bq-target-name,
.bq-target-cwd {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bq-target-name {
  font-size: 13px;
}

.bq-target-cwd {
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}

.bq-target-running {
  display: inline-block;
  margin-top: 2px;
  color: var(--dsw-alias-state-success-primary);
  font-size: 10px;
}

.bq-row {
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

@media (hover: hover) {
  .bq-row:hover {
    border-color: var(--dsw-alias-border-l3);
  }
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

/* The checkbox owns the accessible selection name; the row header carries the visible facts. */
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
  max-width: 150px;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bq-time {
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.bq-preview {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.bq-meta-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.bq-meta-icon {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}

.bq-bundle {
  display: block;
  margin: 6px 0;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-lg);
}

.bq-bundle-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.bq-bundle-title {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.bq-bundle-chevron {
  margin-left: auto;
}

.bq-bundle-body {
  display: block;
  padding: 0 8px 8px;
}

.bq-bundle-item {
  display: block;
  width: 100%;
  padding: 6px 0;
  border: 0;
  border-top: 0.5px solid var(--dsw-alias-border-l4);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

button.bq-bundle-item {
  cursor: pointer;
}

@media (hover: hover) {
  button.bq-bundle-item:hover .bq-bundle-item-head {
    color: var(--dsw-alias-label-primary);
  }
}

.bq-bundle-item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.bq-bundle-time,
.bq-bundle-attachments {
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}

.bq-bundle-text {
  display: block;
  max-height: 6em;
  margin-top: 4px;
  overflow: auto;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.bq-bundle-failure {
  display: block;
  margin-top: 4px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px;
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
