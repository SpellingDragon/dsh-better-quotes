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
 *
 * Native `scrollIntoView` alone can no-op when the row sits in a folded process
 * group or a custom scrollport, so the nearest vertical scroller is also driven
 * directly from measured positions.
 *
 * @param key - stable Chat node key.
 * @returns whether the message was found; scrolling continues asynchronously
 *          when a folded group had to be expanded first.
 */
export function locateMessage(key: string): boolean {
  const target = findMessageElement(key)
  if (target === null) return false
  const expandedFold = revealFoldedGroup(target)
  if (expandedFold) {
    window.setTimeout(() => { scrollAndHighlight(target) }, 350)
    return true
  }
  scrollAndHighlight(target)
  return true
}

function revealFoldedGroup(target: HTMLElement): boolean {
  if (target.closest('[hidden], [data-chat-motion="collapse"]') === null) return false
  const group = target.closest<HTMLElement>('[data-chat-group-key]')
  if (group === null) return false
  const toggle = group.querySelector<HTMLButtonElement>('button[aria-controls][aria-expanded="false"]')
  if (toggle === null) return false
  toggle.click()
  return true
}

function scrollAndHighlight(target: HTMLElement): void {
  const scroller = verticalScroller(target)
  if (scroller === null) {
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  } else {
    const scrollerRect = scroller.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta = targetRect.top + targetRect.height / 2 - (scrollerRect.top + scrollerRect.height / 2)
    scroller.scrollTop += delta
  }
  target.animate?.(
    [
      { outline: '2px solid currentColor', outlineOffset: '4px' },
      { outline: '2px solid transparent', outlineOffset: '4px' },
    ],
    { duration: 1_600 },
  )
}

function verticalScroller(target: HTMLElement): HTMLElement | null {
  for (let node = target.parentElement; node !== null; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue
    const overflowY = window.getComputedStyle(node).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && node.scrollHeight > node.clientHeight) {
      return node
    }
  }
  return null
}
