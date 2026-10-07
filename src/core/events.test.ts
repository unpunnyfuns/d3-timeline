import { expect, test, vi } from 'vitest'
import { createEmitter } from './events'

type Events = {
  hover: (id: string | null) => void
  count: (n: number) => void
}

test('delivers payload to subscribed handlers', () => {
  const emitter = createEmitter<Events>()
  const handler = vi.fn()
  emitter.on('hover', handler)
  emitter.emit('hover', 'a')
  expect(handler).toHaveBeenCalledWith('a')
})

test('unsubscribe stops delivery', () => {
  const emitter = createEmitter<Events>()
  const handler = vi.fn()
  const off = emitter.on('count', handler)
  off()
  emitter.emit('count', 1)
  expect(handler).not.toHaveBeenCalled()
})

test('clear removes all handlers', () => {
  const emitter = createEmitter<Events>()
  const a = vi.fn()
  const b = vi.fn()
  emitter.on('hover', a)
  emitter.on('count', b)
  emitter.clear()
  emitter.emit('hover', null)
  emitter.emit('count', 2)
  expect(a).not.toHaveBeenCalled()
  expect(b).not.toHaveBeenCalled()
})
