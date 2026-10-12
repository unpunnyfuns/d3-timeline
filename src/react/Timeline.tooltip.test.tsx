import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from 'vitest-browser-react'
import { Timeline } from './Timeline'
import type { TimelineItem, TimelineLane } from '../core'

afterEach(cleanup)

const d = (iso: string) => new Date(iso)
const lanes: TimelineLane[] = [
  { id: 'l1', label: 'One' },
  { id: 'l2', label: 'Two' },
]
const items: TimelineItem[] = [
  { id: 'a', lane: 'l1', start: d('2026-01-02'), end: d('2026-01-04'), label: 'A' },
  { id: 'b', lane: 'l2', start: d('2026-01-05'), end: d('2026-01-09'), label: 'B' },
]
const domain: [Date, Date] = [d('2026-01-01'), d('2026-01-11')]

const mount = (extra: Partial<React.ComponentProps<typeof Timeline>> = {}) =>
  render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      className="wrap"
      style={{ width: 800 }}
      renderTooltip={({ item, lane, pinned }) => (
        <div className="card">
          {item.label} in {lane.label} {pinned ? 'pinned' : 'hover'}
        </div>
      )}
      {...extra}
    />,
  )

const barEl = (root: Element, id: string) =>
  root.querySelector<SVGGElement>(`g.timeline-bar[data-id="${id}"]`)!

test('wrapper gets className and style, tooltip hidden until hover', async () => {
  const screen = await mount()
  const wrap = screen.container.querySelector<HTMLElement>('.wrap')!
  expect(wrap.classList.contains('timeline')).toBe(false)
  expect(wrap.querySelector('.timeline')).not.toBeNull()
  expect(getComputedStyle(wrap).position).toBe('relative')
  expect(wrap.querySelector('.timeline-tooltip')).toBeNull()
})

test('hover shows the tooltip under the bar, leave hides it', async () => {
  const screen = await mount()
  const wrap = screen.container.querySelector<HTMLElement>('.wrap')!
  barEl(wrap, 'a').dispatchEvent(new PointerEvent('pointerenter'))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const tip = wrap.querySelector<HTMLElement>('.timeline-tooltip')!
  expect(tip.textContent).toBe('A in One hover')
  expect(tip.dataset.placement).toBe('bottom')
  const rect = barEl(wrap, 'a').querySelector('rect.timeline-bar-rect')!.getBoundingClientRect()
  const tipBox = tip.getBoundingClientRect()
  expect(tipBox.top).toBeCloseTo(rect.bottom, 0)
  expect(tipBox.left + tipBox.width / 2).toBeCloseTo(rect.left + rect.width / 2, 0)
  expect(getComputedStyle(tip).pointerEvents).toBe('none')
  barEl(wrap, 'a').dispatchEvent(new PointerEvent('pointerleave'))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(wrap.querySelector('.timeline-tooltip')).toBeNull()
})

test('click pins the tooltip and it accepts pointer events', async () => {
  const screen = await mount()
  const wrap = screen.container.querySelector<HTMLElement>('.wrap')!
  barEl(wrap, 'b').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const tip = wrap.querySelector<HTMLElement>('.timeline-tooltip')!
  expect(tip.textContent).toBe('B in Two pinned')
  expect(getComputedStyle(tip).pointerEvents).toBe('auto')
  barEl(wrap, 'a').dispatchEvent(new PointerEvent('pointerenter'))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(wrap.querySelector('.timeline-tooltip')!.textContent).toBe('A in One hover')
  barEl(wrap, 'a').dispatchEvent(new PointerEvent('pointerleave'))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(wrap.querySelector('.timeline-tooltip')!.textContent).toBe('B in Two pinned')
})

test('without renderTooltip the root is the timeline itself', async () => {
  const screen = await render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      className="plain"
      style={{ width: 800 }}
    />,
  )
  const root = screen.container.querySelector<HTMLElement>('.plain')!
  expect(root.classList.contains('timeline')).toBe(true)
})
