import { afterEach, expect, it, vi } from 'vitest'
import type { DirectiveBinding, ObjectDirective } from 'vue'
import { countUp } from '../src/directives/countUp'

afterEach(() => vi.unstubAllGlobals())

it('cancels an old animation when the latest count returns to zero', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key))
  const element = { textContent: '' } as HTMLElement
  const directive = countUp as ObjectDirective<HTMLElement, number>
  const binding = { value: 5 } as DirectiveBinding<number>
  if (typeof directive.mounted !== 'function' || typeof directive.updated !== 'function') {
    throw new Error('count directive lifecycle missing')
  }
  directive.mounted(element, binding, null!, null!)
  expect(frames.size).toBe(1)
  directive.updated(element, { ...binding, value: 0, oldValue: 5 }, null!, null!)
  for (const callback of [...frames.values()]) callback(performance.now() + 1000)
  expect(frames.size).toBe(0)
  expect(element.textContent).toBe('0')
})
