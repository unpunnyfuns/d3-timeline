import { afterEach, expect, test, vi } from 'vitest'
import { select } from 'd3-selection'
import { attachZoom } from './zoom'
import { createBaseScale } from '../scale'
import { d, mountSvg } from '../test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

const setup = () => {
  const base = createBaseScale([d('2026-01-01'), d('2026-01-11')], 500)
  const plot = select(mountSvg()).append('g')
  const onZoom = vi.fn()
  const zoom = attachZoom(plot, {
    getBaseScale: () => base,
    getWidth: () => 500,
    getHeight: () => 64,
    zoomExtent: [0.5, 50],
    onZoom,
  })
  const capture = plot.select<SVGRectElement>('rect.timeline-capture').node()!
  return { base, plot, zoom, onZoom, capture }
}

test('adds a transparent capture rect sized to the plot', () => {
  const { capture } = setup()
  expect(capture.getAttribute('width')).toBe('500')
  expect(capture.getAttribute('height')).toBe('64')
})

test('wheel zooms in and reports a narrower domain', () => {
  const { base, zoom, onZoom, capture } = setup()
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: -200,
      clientX: box.left + 250,
      clientY: box.top + 10,
      bubbles: true,
      cancelable: true,
    }),
  )
  expect(onZoom).toHaveBeenCalled()
  const [start, end] = zoom.getDomain()
  const baseSpan = base.domain()[1]!.getTime() - base.domain()[0]!.getTime()
  expect(end.getTime() - start.getTime()).toBeLessThan(baseSpan)
})

test('setDomain produces a scale with exactly that domain', () => {
  const { zoom, onZoom } = setup()
  zoom.setDomain([d('2026-01-03'), d('2026-01-05')])
  const scale = onZoom.mock.lastCall?.[0]
  expect(scale(d('2026-01-03'))).toBeCloseTo(0, 6)
  expect(scale(d('2026-01-05'))).toBeCloseTo(500, 6)
  expect(zoom.getDomain().map((x) => x.getTime())).toEqual([
    d('2026-01-03').getTime(),
    d('2026-01-05').getTime(),
  ])
})

test('destroy removes the listeners', () => {
  const { onZoom, zoom, capture } = setup()
  zoom.destroy()
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: -200,
      clientX: box.left + 10,
      clientY: box.top + 10,
      bubbles: true,
    }),
  )
  expect(onZoom).not.toHaveBeenCalled()
})

const mouse = (type: string, target: EventTarget, x: number, y: number) =>
  target.dispatchEvent(
    new MouseEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
    }),
  )

test('cannot zoom out past the pan extent', () => {
  const { base, zoom, capture } = setup()
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: 2000,
      clientX: box.left + 250,
      clientY: box.top + 10,
      bubbles: true,
    }),
  )
  expect(zoom.getDomain().map((x) => x.getTime())).toEqual(base.domain().map((x) => x.getTime()))
})

test('cannot pan before the start of the pan extent', () => {
  const { base, zoom, capture } = setup()
  zoom.setDomain([d('2026-01-03'), d('2026-01-05')])
  const box = capture.getBoundingClientRect()
  mouse('mousedown', capture, box.left + 10, box.top + 10)
  mouse('mousemove', window, box.left + 700, box.top + 10)
  mouse('mouseup', window, box.left + 700, box.top + 10)
  const [start, end] = zoom.getDomain()
  expect(start.getTime()).toBe(base.domain()[0]!.getTime())
  expect(end.getTime() - start.getTime()).toBe(
    d('2026-01-05').getTime() - d('2026-01-03').getTime(),
  )
})

test('a wider pan extent allows zooming out beyond the base domain', () => {
  const base = createBaseScale([d('2026-01-01'), d('2026-01-11')], 500)
  const plot = select(mountSvg()).append('g')
  const zoom = attachZoom(plot, {
    getBaseScale: () => base,
    getWidth: () => 500,
    getHeight: () => 64,
    zoomExtent: [0.25, 50],
    getPanExtent: () => [d('2025-12-22'), d('2026-01-21')],
    onZoom: () => {},
  })
  const capture = plot.select<SVGRectElement>('rect.timeline-capture').node()!
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: 5000,
      clientX: box.left + 250,
      clientY: box.top + 10,
      bubbles: true,
    }),
  )
  const [start, end] = zoom.getDomain()
  expect(start.getTime()).toBeCloseTo(d('2025-12-22').getTime(), -1)
  expect(end.getTime()).toBeCloseTo(d('2026-01-21').getTime(), -1)
})

test('horizontal wheel pans without a modifier', () => {
  const { zoom, capture } = setup()
  zoom.setDomain([d('2026-01-03'), d('2026-01-05')])
  const before = zoom.getDomain()[0]!.getTime()
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      deltaX: 50,
      deltaY: 0,
      clientX: box.left + 10,
      clientY: box.top + 10,
      bubbles: true,
      cancelable: true,
    }),
  )
  const [start, end] = zoom.getDomain()
  expect(start.getTime()).toBeGreaterThan(before)
  expect(end.getTime() - start.getTime()).toBe(
    d('2026-01-05').getTime() - d('2026-01-03').getTime(),
  )
})

test('plain vertical wheel is ignored by the zoom', () => {
  const { zoom, onZoom, capture } = setup()
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      deltaY: -200,
      clientX: box.left + 10,
      clientY: box.top + 10,
      bubbles: true,
      cancelable: true,
    }),
  )
  expect(onZoom).not.toHaveBeenCalled()
  expect(zoom.getDomain()[0]!.getTime()).toBe(d('2026-01-01').getTime())
})
