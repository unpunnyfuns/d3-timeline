import { afterEach, expect, test, vi } from 'vitest'
import { createTimeline } from './create-timeline'
import { d, mountContainer } from './test-utils'
import type { TimelineData, TimelineLayer, LayerSelection } from './types'

afterEach(() => {
  document.body.innerHTML = ''
})

const data: TimelineData = {
  lanes: [
    { id: 'l1', label: 'One' },
    { id: 'l2', label: 'Two' },
  ],
  items: [
    { id: 'a', lane: 'l1', start: d('2026-01-02'), end: d('2026-01-04'), label: 'A' },
    { id: 'b', lane: 'l2', start: d('2026-01-05'), end: d('2026-01-09'), label: 'B' },
  ],
}

const setup = (options = {}) => {
  const svg = mountContainer()
  const timeline = createTimeline(svg, { domain: [d('2026-01-01'), d('2026-01-11')], ...options })
  timeline.update(data)
  return { svg, timeline }
}

const bar = (svg: HTMLElement, id: string) =>
  svg.querySelector<SVGGElement>(`g.timeline-bar[data-id="${id}"]`)!

test('builds the skeleton and renders lanes and bars', () => {
  const { svg } = setup()
  expect(svg.classList.contains('timeline')).toBe(true)
  expect(svg.querySelectorAll('g.timeline-plot rect.timeline-lane').length).toBe(2)
  expect(svg.querySelectorAll('g.timeline-labels text.timeline-lane-label').length).toBe(2)
  expect(svg.querySelectorAll('g.timeline-bar').length).toBe(2)
  expect(svg.querySelectorAll('g.timeline-axis .tick').length).toBeGreaterThan(0)
  expect(svg.querySelector('svg.timeline-axis-svg')?.getAttribute('height')).toBe('28')
  expect(svg.querySelector('svg.timeline-body-svg')?.getAttribute('height')).toBe(String(2 * 32))
  expect(svg.querySelector('svg.timeline-axis-svg g.timeline-axis')).not.toBeNull()
  expect(
    svg.querySelector('div.timeline-body svg.timeline-body-svg g.timeline-plot'),
  ).not.toBeNull()
  expect(svg.querySelector('svg.timeline-body-svg g.timeline-labels')).not.toBeNull()
})

test('maxHeight caps the body and makes it scroll', () => {
  const { svg } = setup({ maxHeight: 40 })
  const body = svg.querySelector<HTMLElement>('div.timeline-body')!
  expect(body.style.maxHeight).toBe('40px')
  expect(body.style.overflowY).toBe('auto')
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  const { svg: plain } = setup()
  expect(plain.querySelector<HTMLElement>('div.timeline-body')!.style.maxHeight).toBe('')
})

test('plain wheel does not zoom, ctrl+wheel does', () => {
  const { svg, timeline } = setup()
  const before = timeline.getDomain().map((x) => x.getTime())
  const capture = svg.querySelector('rect.timeline-capture')!
  const box = capture.getBoundingClientRect()
  const wheel = (init: WheelEventInit) =>
    capture.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: box.left + 100,
        clientY: box.top + 10,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    )
  wheel({ deltaY: -300 })
  expect(timeline.getDomain().map((x) => x.getTime())).toEqual(before)
  wheel({ deltaY: -300, ctrlKey: true })
  const [start, end] = timeline.getDomain()
  expect(end.getTime() - start.getTime()).toBeLessThan(before[1]! - before[0]!)
})

test('reads width from the element and sizes the plot', () => {
  const { svg } = setup({ labelWidth: 100 })
  const lane = svg.querySelector('rect.timeline-lane')!
  expect(lane.getAttribute('width')).toBe('700')
})

test('hover emits and applies class', () => {
  const { svg, timeline } = setup()
  const onHover = vi.fn()
  timeline.on('hover', onHover)
  bar(svg, 'a').dispatchEvent(new PointerEvent('pointerenter'))
  expect(onHover).toHaveBeenCalledWith('a')
  expect(bar(svg, 'a').classList.contains('is-hovered')).toBe(true)
  bar(svg, 'a').dispatchEvent(new PointerEvent('pointerleave'))
  expect(bar(svg, 'a').classList.contains('is-hovered')).toBe(false)
})

test('click selects, click on empty plot clears', () => {
  const { svg, timeline } = setup()
  const onSelect = vi.fn()
  timeline.on('select', onSelect)
  bar(svg, 'b').dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(onSelect).toHaveBeenCalledWith('b')
  expect(bar(svg, 'b').classList.contains('is-selected')).toBe(true)
  svg
    .querySelector('rect.timeline-capture')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(onSelect).toHaveBeenLastCalledWith(null)
  expect(bar(svg, 'b').classList.contains('is-selected')).toBe(false)
})

test('setSelected applies without emitting and survives update', () => {
  const { svg, timeline } = setup()
  const onSelect = vi.fn()
  timeline.on('select', onSelect)
  timeline.setSelected('a')
  expect(onSelect).not.toHaveBeenCalled()
  expect(bar(svg, 'a').classList.contains('is-selected')).toBe(true)
  timeline.update(data)
  expect(bar(svg, 'a').classList.contains('is-selected')).toBe(true)
})

test('setDomain emits domainchange and moves bars', () => {
  const { svg, timeline } = setup()
  const onDomain = vi.fn()
  timeline.on('domainchange', onDomain)
  const before = bar(svg, 'a').querySelector('rect')!.getAttribute('x')
  timeline.setDomain([d('2026-01-02'), d('2026-01-04')])
  expect(onDomain).toHaveBeenCalledTimes(1)
  expect(timeline.getDomain().map((x) => x.getTime())).toEqual([
    d('2026-01-02').getTime(),
    d('2026-01-04').getTime(),
  ])
  expect(bar(svg, 'a').querySelector('rect')!.getAttribute('x')).not.toBe(before)
  expect(() => timeline.setDomain([d('2026-01-04'), d('2026-01-02')])).toThrow()
})

const wheelOut = (svg: HTMLElement) => {
  const capture = svg.querySelector('rect.timeline-capture')!
  const box = capture.getBoundingClientRect()
  capture.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: 5000,
      clientX: box.left + 100,
      clientY: box.top + 10,
      bubbles: true,
    }),
  )
}

test('cannot zoom out beyond the initial domain by default', () => {
  const { svg, timeline } = setup()
  wheelOut(svg)
  expect(timeline.getDomain().map((x) => x.getTime())).toEqual([
    d('2026-01-01').getTime(),
    d('2026-01-11').getTime(),
  ])
})

test('panExtent widens the reachable range', () => {
  const { svg, timeline } = setup({
    panExtent: [d('2025-12-01'), d('2026-03-01')],
    zoomExtent: [0.01, 50],
  })
  wheelOut(svg)
  const [start, end] = timeline.getDomain()
  expect(start.getTime()).toBeCloseTo(d('2025-12-01').getTime(), -1)
  expect(end.getTime()).toBeCloseTo(d('2026-03-01').getTime(), -1)
})

test('defaults the domain to the item extent when none is given', () => {
  const svg = mountContainer()
  const timeline = createTimeline(svg)
  timeline.update(data)
  const [start, end] = timeline.getDomain()
  expect(start.getTime()).toBeLessThan(d('2026-01-02').getTime())
  expect(end.getTime()).toBeGreaterThan(d('2026-01-09').getTime())
})

test('destroy empties the svg and later calls are no-ops', () => {
  const { svg, timeline } = setup()
  timeline.destroy()
  expect(svg.childElementCount).toBe(0)
  expect(() => {
    timeline.update(data)
    timeline.setSelected('a')
    timeline.setDomain([d('2026-01-02'), d('2026-01-04')])
  }).not.toThrow()
  expect(svg.childElementCount).toBe(0)
})

test('exposes data and pan extent and emits update', () => {
  const { timeline } = setup({ labelWidth: 120 })
  expect(timeline.getOptions()).toEqual({ rowHeight: 32, labelWidth: 120, zoomExtent: [0.5, 50] })
  const onUpdate = vi.fn()
  timeline.on('update', onUpdate)
  expect(timeline.getData()).toEqual(data)
  expect(timeline.getPanExtent().map((x) => x.getTime())).toEqual([
    d('2026-01-01').getTime(),
    d('2026-01-11').getTime(),
  ])
  timeline.update({ lanes: data.lanes, items: [] })
  expect(onUpdate).toHaveBeenCalledTimes(1)
  expect(timeline.getData().items).toEqual([])
})

test('geometry options drive layout and tick formatting', () => {
  const { svg } = setup({
    axisHeight: 40,
    barInset: 6,
    labelPadding: 10,
    tickSpacing: 200,
    tickFormat: (date: Date) => `D${date.getDate()}`,
  })
  expect(svg.querySelector('g.timeline-plot')?.getAttribute('transform')).toBe('translate(160,0)')
  expect(svg.querySelector('svg.timeline-axis-svg')?.getAttribute('height')).toBe('40')
  const rect = bar(svg, 'a').querySelector('rect.timeline-bar-rect')!
  expect(rect.getAttribute('y')).toBe('6')
  expect(rect.getAttribute('height')).toBe(String(32 - 12))
  const label = bar(svg, 'a').querySelector('text.timeline-bar-label')!
  expect(Number(label.getAttribute('x')) - Number(rect.getAttribute('x'))).toBe(10)
  const ticks = [...svg.querySelectorAll('g.timeline-axis .tick text')].map((t) => t.textContent)
  expect(ticks.length).toBeLessThanOrEqual(5)
  expect(ticks.every((t) => /^D\d+$/.test(t ?? ''))).toBe(true)
})

test('labelOffsetY nudges bar and lane labels and labels use central baseline', () => {
  const { svg } = setup({ labelOffsetY: 3 })
  const barLabel = bar(svg, 'a').querySelector('text.timeline-bar-label')!
  expect(barLabel.getAttribute('y')).toBe(String(16 + 3))
  expect(barLabel.getAttribute('dominant-baseline')).toBe('central')
  const laneLabel = svg.querySelector('text.timeline-lane-label')!
  expect(laneLabel.getAttribute('y')).toBe(String(16 + 3))
  expect(laneLabel.getAttribute('dominant-baseline')).toBe('central')
})

test('labelAlign centres or right-aligns bar labels and labelOffsetX nudges them', () => {
  const centred = setup({ labelAlign: 'center', labelOffsetX: 2 })
  const rect = bar(centred.svg, 'a').querySelector('rect.timeline-bar-rect')!
  const label = bar(centred.svg, 'a').querySelector('text.timeline-bar-label')!
  const x = Number(rect.getAttribute('x'))
  const w = Number(rect.getAttribute('width'))
  expect(label.getAttribute('text-anchor')).toBe('middle')
  expect(Number(label.getAttribute('x'))).toBeCloseTo(x + w / 2 + 2, 6)

  document.body.innerHTML = ''
  const right = setup({ labelAlign: 'end' })
  const rect2 = bar(right.svg, 'a').querySelector('rect.timeline-bar-rect')!
  const label2 = bar(right.svg, 'a').querySelector('text.timeline-bar-label')!
  expect(label2.getAttribute('text-anchor')).toBe('end')
  expect(Number(label2.getAttribute('x'))).toBeCloseTo(
    Number(rect2.getAttribute('x')) + Number(rect2.getAttribute('width')) - 6,
    6,
  )
})

test('onRender is called per layer with the group selection and state', () => {
  const onRender = vi.fn()
  const { svg, timeline } = setup({ onRender })
  const layers = onRender.mock.calls.map((call) => call[0])
  expect(new Set(layers)).toEqual(new Set(['axis', 'grid', 'lanes', 'labels', 'bars']))
  const barsCall = onRender.mock.calls.find((call) => call[0] === 'bars')!
  expect(barsCall[1].node()).toBe(svg.querySelector('g.timeline-bars'))
  expect(barsCall[2].items).toEqual(data.items)
  onRender.mockClear()
  timeline.setDomain([d('2026-01-02'), d('2026-01-04')])
  const after = onRender.mock.calls.map((call) => call[0])
  expect(after).toEqual(['axis', 'grid', 'bars'])
})

test('onRender changes survive re-render when consumer keeps them idempotent', () => {
  const { svg } = setup({
    onRender: (layer: TimelineLayer, selection: LayerSelection) => {
      if (layer !== 'bars') return
      selection.selectAll('text.timeline-bar-label').attr('dy', '-2')
    },
  })
  expect(bar(svg, 'a').querySelector('text')?.getAttribute('dy')).toBe('-2')
})

test('classes map adds extra class names to each part', () => {
  const { svg } = setup({
    classes: {
      root: 'r',
      axis: 'ax',
      grid: 'gr',
      gridLine: 'gl',
      lanes: 'ls',
      lane: 'ln',
      laneBorder: 'lb',
      labels: 'lbs',
      laneLabel: 'll',
      bars: 'bs',
      bar: 'b',
      barRect: 'br',
      barLabel: 'bl',
    },
  })
  const has = (sel: string, cls: string) => svg.querySelector(sel)?.classList.contains(cls) ?? false
  expect(svg.classList.contains('r')).toBe(true)
  expect(has('g.timeline-axis', 'ax')).toBe(true)
  expect(has('g.timeline-grid', 'gr')).toBe(true)
  expect(has('line.timeline-grid-line', 'gl')).toBe(true)
  expect(has('g.timeline-lanes', 'ls')).toBe(true)
  expect(has('rect.timeline-lane', 'ln')).toBe(true)
  expect(has('line.timeline-lane-border', 'lb')).toBe(true)
  expect(has('g.timeline-labels', 'lbs')).toBe(true)
  expect(has('text.timeline-lane-label', 'll')).toBe(true)
  expect(has('g.timeline-bars', 'bs')).toBe(true)
  expect(has('g.timeline-bar', 'b')).toBe(true)
  expect(has('rect.timeline-bar-rect', 'br')).toBe(true)
  expect(has('text.timeline-bar-label', 'bl')).toBe(true)
  expect(bar(svg, 'a').classList.contains('timeline-bar')).toBe(true)
})

test('exposes scroll state, setScroll, and a scroll event when maxHeight applies', async () => {
  const { svg, timeline } = setup({ maxHeight: 40 })
  const onScroll = vi.fn()
  timeline.on('scroll', onScroll)
  expect(timeline.getScroll()).toEqual({ top: 0, height: 40, total: 64 })
  timeline.setScroll(20)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(svg.querySelector<HTMLElement>('div.timeline-body')!.scrollTop).toBe(20)
  expect(timeline.getScroll().top).toBe(20)
  expect(onScroll).toHaveBeenCalledWith({ top: 20, height: 40, total: 64 })
})
