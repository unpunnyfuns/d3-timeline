import { afterEach, expect, test, vi } from 'vitest'
import { renderBars } from './bars'
import { d, makeState, mountGroup } from '../test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

const handlers = () => ({ onHover: vi.fn(), onSelect: vi.fn() })

test('positions bars from the scale and lane index', () => {
  const g = mountGroup()
  const state = makeState()
  renderBars(g, state, handlers())
  const bars = g.selectAll<SVGGElement, unknown>('g.timeline-bar').nodes()
  expect(bars.length).toBe(2)
  const rectB = bars[1]?.querySelector('rect.timeline-bar-rect')
  expect(rectB?.getAttribute('x')).toBe(String(state.xScale(d('2026-01-05'))))
  expect(rectB?.getAttribute('width')).toBe(
    String(state.xScale(d('2026-01-09')) - state.xScale(d('2026-01-05'))),
  )
  expect(bars[1]?.getAttribute('transform')).toBe('translate(0,32)')
  expect(bars[1]?.querySelector('text.timeline-bar-label')?.textContent).toBe('B')
})

test('skips items with unknown lane and clamps negative widths to zero', () => {
  const g = mountGroup()
  const state = makeState({
    items: [
      { id: 'x', lane: 'nope', start: d('2026-01-02'), end: d('2026-01-03') },
      { id: 'y', lane: 'l1', start: d('2026-01-05'), end: d('2026-01-02') },
    ],
  })
  renderBars(g, state, handlers())
  const bars = g.selectAll<SVGGElement, unknown>('g.timeline-bar').nodes()
  expect(bars.length).toBe(1)
  expect(bars[0]?.querySelector('rect.timeline-bar-rect')?.getAttribute('width')).toBe('0')
})

test('applies per-item className and state classes', () => {
  const g = mountGroup()
  const state = makeState({ hoveredId: 'a', selectedId: 'b' })
  state.items[0]!.className = 'kind-red'
  renderBars(g, state, handlers())
  const [a, b] = g.selectAll<SVGGElement, unknown>('g.timeline-bar').nodes()
  expect(a?.classList.contains('kind-red')).toBe(true)
  expect(a?.classList.contains('is-hovered')).toBe(true)
  expect(b?.classList.contains('is-selected')).toBe(true)
  expect(b?.classList.contains('is-hovered')).toBe(false)
})

test('pointer events call hover and select handlers with ids', () => {
  const g = mountGroup()
  const h = handlers()
  renderBars(g, makeState(), h)
  const bar = g.select<SVGGElement>('g.timeline-bar').node()!
  bar.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
  expect(h.onHover).toHaveBeenCalledWith('a')
  bar.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
  expect(h.onHover).toHaveBeenLastCalledWith(null)
  bar.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(h.onSelect).toHaveBeenCalledWith('a')
})

test('re-rendering keeps element identity and removes gone items', () => {
  const g = mountGroup()
  const state = makeState()
  renderBars(g, state, handlers())
  const before = g.select<SVGGElement>('g.timeline-bar').node()
  renderBars(g, { ...state, items: [state.items[0]!] }, handlers())
  expect(g.selectAll('g.timeline-bar').size()).toBe(1)
  expect(g.select<SVGGElement>('g.timeline-bar').node()).toBe(before)
})
