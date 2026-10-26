/** The bundle's Host half intentionally contributes no runtime state. */
import { describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'

describe('dsh-better-quotes host entry', () => {
  it('registers nothing on the Host', () => {
    expect(apply()).toBeUndefined()
  })
})
