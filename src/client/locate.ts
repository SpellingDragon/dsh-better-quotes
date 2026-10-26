/** Locate a rendered Chat node by its stable node key and briefly highlight it. */

/**
 * Find the rendered element for one Chat node key.
 * @param key - stable Chat node key.
 * @returns the matching element, or null when it is not rendered.
 */
export function findMessageElement(key: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  for (const element of document.querySelectorAll<HTMLElement>('[data-chat-node-key]')) {
    if (element.dataset.chatNodeKey === key) return element
  }
  return null
}

/**
 * Scroll to a rendered message and highlight it.
 * @param key - stable Chat node key.
 * @returns whether the message was found and scrolled.
 */
export function locateMessage(key: string): boolean {
  const target = findMessageElement(key)
  if (target === null) return false
  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  target.animate?.(
    [
      { outline: '2px solid currentColor', outlineOffset: '4px' },
      { outline: '2px solid transparent', outlineOffset: '4px' },
    ],
    { duration: 1_600 },
  )
  return true
}
