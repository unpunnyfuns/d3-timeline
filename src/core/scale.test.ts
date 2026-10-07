import { expect, test } from 'vitest'
import { createBaseScale, defaultDomain, isoTickFormat, tickCount } from './scale'
import type { TimelineItem } from './types'

const d = (iso: string) => new Date(iso)

test('maps domain endpoints to 0 and width', () => {
  const scale = createBaseScale([d('2026-01-01'), d('2026-01-11')], 500)
  expect(scale(d('2026-01-01'))).toBe(0)
  expect(scale(d('2026-01-11'))).toBe(500)
  expect(scale(d('2026-01-06'))).toBe(250)
})

test('defaultDomain pads the item extent by 5% each side', () => {
  const items: TimelineItem[] = [
    { id: 'a', lane: 'l', start: d('2026-01-01'), end: d('2026-01-05') },
    { id: 'b', lane: 'l', start: d('2026-01-03'), end: d('2026-01-11') },
  ]
  const [start, end] = defaultDomain(items)
  const span = d('2026-01-11').getTime() - d('2026-01-01').getTime()
  expect(start.getTime()).toBe(d('2026-01-01').getTime() - span * 0.05)
  expect(end.getTime()).toBe(d('2026-01-11').getTime() + span * 0.05)
})

test('defaultDomain falls back to one day either side of now when empty', () => {
  const before = Date.now()
  const [start, end] = defaultDomain([])
  const day = 86_400_000
  expect(start.getTime()).toBeGreaterThanOrEqual(before - day)
  expect(end.getTime() - start.getTime()).toBe(2 * day)
})

test('tickCount scales with width and never drops below two', () => {
  expect(tickCount(960)).toBe(8)
  expect(tickCount(50)).toBe(2)
})

test('isoTickFormat cascades from year to time with ISO-style parts', () => {
  expect(isoTickFormat(d('2026-01-01T00:00:00'))).toBe('2026')
  expect(isoTickFormat(d('2026-03-01T00:00:00'))).toBe('2026-03')
  expect(isoTickFormat(d('2026-03-05T00:00:00'))).toBe('03-05')
  expect(isoTickFormat(d('2026-03-05T14:00:00'))).toBe('14:00')
  expect(isoTickFormat(d('2026-03-05T14:30:00'))).toBe('14:30')
  expect(isoTickFormat(d('2026-03-05T14:30:15'))).toBe(':15')
})
