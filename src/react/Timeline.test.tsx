import { afterEach, expect, test, vi } from 'vitest'
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

test('renders an svg with bars and forwards className', async () => {
  const screen = await render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      className="mine"
      style={{ width: 800 }}
    />,
  )
  const svg = screen.container.querySelector<HTMLElement>('.timeline')!
  expect(svg.classList.contains('timeline')).toBe(true)
  expect(svg.classList.contains('mine')).toBe(true)
  expect(svg.querySelectorAll('g.timeline-bar').length).toBe(2)
})

test('updates when items change and reflects selected prop', async () => {
  const screen = await render(
    <Timeline lanes={lanes} items={items} domain={domain} selected="a" style={{ width: 800 }} />,
  )
  const svg = screen.container.querySelector<HTMLElement>('.timeline')!
  expect(svg.querySelector('g.timeline-bar[data-id="a"]')?.classList.contains('is-selected')).toBe(
    true,
  )
  await screen.rerender(
    <Timeline
      lanes={lanes}
      items={[items[0]!]}
      domain={domain}
      selected={null}
      style={{ width: 800 }}
    />,
  )
  expect(svg.querySelectorAll('g.timeline-bar').length).toBe(1)
  expect(svg.querySelector('g.timeline-bar[data-id="a"]')?.classList.contains('is-selected')).toBe(
    false,
  )
})

test('fires callbacks', async () => {
  const onSelect = vi.fn()
  const onHover = vi.fn()
  const onDomainChange = vi.fn()
  const screen = await render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      onSelect={onSelect}
      onHover={onHover}
      onDomainChange={onDomainChange}
      style={{ width: 800 }}
    />,
  )
  const bar = screen.container.querySelector<SVGGElement>('g.timeline-bar[data-id="b"]')!
  bar.dispatchEvent(new PointerEvent('pointerenter'))
  bar.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(onHover).toHaveBeenCalledWith('b')
  expect(onSelect).toHaveBeenCalledWith('b')
  expect(onDomainChange).not.toHaveBeenCalled()
})

test('destroys the instance on unmount', async () => {
  const screen = await render(
    <Timeline lanes={lanes} items={items} domain={domain} style={{ width: 800 }} />,
  )
  const svg = screen.container.querySelector<HTMLElement>('.timeline')!
  await screen.unmount()
  expect(svg.childElementCount).toBe(0)
})

test('passes geometry options and onRender through to the core', async () => {
  const onRender = vi.fn()
  const screen = await render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      axisHeight={40}
      barInset={6}
      labelPadding={10}
      tickSpacing={200}
      tickFormat={(date) => `D${date.getDate()}`}
      onRender={onRender}
      style={{ width: 800 }}
    />,
  )
  const svg = screen.container.querySelector<HTMLElement>('.timeline')!
  expect(svg.querySelector('svg.timeline-axis-svg')?.getAttribute('height')).toBe('40')
  expect(svg.querySelector('rect.timeline-bar-rect')?.getAttribute('y')).toBe('6')
  expect(svg.querySelector('g.timeline-axis .tick text')?.textContent).toMatch(/^D\d+$/)
  expect(onRender.mock.calls.some((call) => call[0] === 'bars')).toBe(true)
  const next = vi.fn()
  await screen.rerender(
    <Timeline
      lanes={lanes}
      items={[items[0]!]}
      domain={domain}
      axisHeight={40}
      onRender={next}
      style={{ width: 800 }}
    />,
  )
  expect(next.mock.calls.some((call) => call[0] === 'bars')).toBe(true)
})

test('classes map reaches the core and survives identity changes', async () => {
  const screen = await render(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      classes={{ root: 'r', barRect: 'br' }}
      style={{ width: 800 }}
    />,
  )
  const svg = screen.container.querySelector<HTMLElement>('.timeline')!
  expect(svg.classList.contains('r')).toBe(true)
  expect(svg.querySelector('rect.timeline-bar-rect')?.classList.contains('br')).toBe(true)
  const before = svg.querySelector('g.timeline-bar')
  await screen.rerender(
    <Timeline
      lanes={lanes}
      items={items}
      domain={domain}
      classes={{ root: 'r', barRect: 'br' }}
      style={{ width: 800 }}
    />,
  )
  expect(svg.querySelector('g.timeline-bar')).toBe(before)
})
