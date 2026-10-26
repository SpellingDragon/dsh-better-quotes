// @vitest-environment jsdom
/** Locate drives real scrollers and unfolds a folded process group before scrolling. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { locateMessage } from '../src/client/locate.ts'

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  document.body.innerHTML = ''
})

describe('locateMessage', () => {
  it('centers the target inside the nearest vertical scroller', () => {
    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 })
    Object.defineProperty(scroller, 'clientHeight', { value: 200 })
    scroller.getBoundingClientRect = () => ({ top: 0, height: 200 } as DOMRect)
    const target = document.createElement('div')
    target.getBoundingClientRect = () => ({ top: 300, height: 40 } as DOMRect)
    scroller.append(target)
    document.body.append(scroller)

    expect(locateMessage('message-key')).toBe(false)

    target.dataset.chatNodeKey = 'message-key'
    expect(locateMessage('message-key')).toBe(true)
    expect(scroller.scrollTop).toBe(220)
  })

  it('expands a folded process group before scrolling to its member', () => {
    vi.useFakeTimers()
    const group = document.createElement('div')
    group.dataset.chatGroupKey = 'group-1'
    const toggle = document.createElement('button')
    toggle.setAttribute('aria-controls', 'body-1')
    toggle.setAttribute('aria-expanded', 'false')
    const click = vi.fn()
    toggle.addEventListener('click', click)
    const body = document.createElement('div')
    body.setAttribute('hidden', '')
    const target = document.createElement('div')
    target.dataset.chatNodeKey = 'message-key'
    const scrollIntoView = vi.fn()
    Object.defineProperty(target, 'scrollIntoView', { value: scrollIntoView })
    body.append(target)
    group.append(toggle, body)
    document.body.append(group)

    expect(locateMessage('message-key')).toBe(true)
    expect(click).toHaveBeenCalledOnce()
    expect(scrollIntoView).not.toHaveBeenCalled()

    vi.advanceTimersByTime(350)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})
