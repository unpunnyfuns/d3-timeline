import { afterEach, expect, test, vi } from 'vitest'
import { createMinimap } from './minimap'
import { createTimeline } from './create-timeline'
import { d, mountContainer, mountSvg } from './test-utils'
import type { TimelineData } from './types'

afterEach(() => {
  document.body.innerHTML = ''
})

const data: TimelineData = {
  lanes: [
    { id: 'l1', label: 'One' },
    { id: 'l2', label: 'Two' },
  ],
  items: [
    { id: 'a', lane: 'l1', start: d('2026-01-02'), end: d('2026-01-04') },
    { id: 'b', lane: 'l2', start: d('2026-01-05'), end: d('2026-01-09') },
    { id: 'c', lane: 'nope', start: d('2026-01-05'), end: d('2026-01-09') },
  ],
}

const setup = () => {
  const timeline = createTimeline(mountContainer(), { domain: [d('2026-01-01'), d('2026-01-11')] })
  timeline.update(data)
  const svg = mountSvg()
  const minimap = createMinimap(svg, { timeline, laneHeight: 10, offset: 0 })
  return { timeline, svg, minimap }
}

test('offset defaults to the timeline label width and shifts the content', () => {
  const timeline = createTimeline(mountContainer(), {
    domain: [d('2026-01-01'), d('2026-01-11')],
    labelWidth: 160,
  })
  timeline.update(data)
  const svg = mountSvg()
  createMinimap(svg, { timeline, laneHeight: 10 })
  expect(svg.querySelector('g.timeline-minimap-content')?.getAttribute('transform')).toBe(
    'translate(160,0)',
  )
  const bar = svg.querySelector<SVGRectElement>('rect.timeline-minimap-bar')!
  expect(bar.getAttribute('x')).toBe('64')
  expect(bar.getAttribute('width')).toBe('128')
  expect(svg.querySelector('rect.timeline-minimap-lane')?.getAttribute('width')).toBe('640')
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  expect(selectionRect(svg).getAttribute('x')).toBe('128')
})

const selectionRect = (svg: SVGSVGElement) =>
  svg.querySelector<SVGRectElement>('.brush .selection')!

test('draws a strip per lane and a bar per visible item across the pan extent', () => {
  const { svg } = setup()
  expect(svg.classList.contains('timeline-minimap')).toBe(true)
  expect(svg.querySelectorAll('rect.timeline-minimap-lane').length).toBe(2)
  const bars = svg.querySelectorAll<SVGRectElement>('rect.timeline-minimap-bar')
  expect(bars.length).toBe(2)
  expect(bars[0]?.getAttribute('x')).toBe('80')
  expect(bars[0]?.getAttribute('width')).toBe('160')
  expect(bars[1]?.getAttribute('y')).toBe('11')
  expect(svg.getAttribute('height')).toBe('20')
})

test('brush starts empty at the default view and follows setDomain', () => {
  const { svg, timeline } = setup()
  expect(selectionRect(svg).style.display).toBe('none')
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  expect(selectionRect(svg).style.display).toBe('')
  expect(selectionRect(svg).getAttribute('x')).toBe('160')
  expect(selectionRect(svg).getAttribute('width')).toBe('160')
  timeline.setDomain(timeline.getPanExtent())
  expect(selectionRect(svg).style.display).toBe('none')
})

test('clicking outside the brush clears it and restores the full view', () => {
  const { svg, timeline } = setup()
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  const onDomain = vi.fn()
  timeline.on('domainchange', onDomain)
  const overlay = svg.querySelector<SVGRectElement>('.brush .overlay')!
  const box = overlay.getBoundingClientRect()
  const mouse = (type: string, target: EventTarget, x: number) =>
    target.dispatchEvent(
      new MouseEvent(type, {
        clientX: x,
        clientY: box.top + 5,
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
    )
  mouse('mousedown', overlay, box.left + 600)
  mouse('mouseup', window, box.left + 600)
  expect(onDomain).toHaveBeenCalledTimes(1)
  expect(timeline.getDomain().map((x) => x.getTime())).toEqual(
    timeline.getPanExtent().map((x) => x.getTime()),
  )
  expect(selectionRect(svg).style.display).toBe('none')
})

test('dragging the brush sets the timeline domain once', () => {
  const { svg, timeline } = setup()
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  const onDomain = vi.fn()
  timeline.on('domainchange', onDomain)
  const sel = selectionRect(svg)
  const box = sel.getBoundingClientRect()
  const mouse = (type: string, target: EventTarget, x: number) =>
    target.dispatchEvent(
      new MouseEvent(type, {
        clientX: x,
        clientY: box.top + 5,
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
    )
  mouse('mousedown', sel, box.left + 80)
  mouse('mousemove', window, box.left + 160)
  mouse('mouseup', window, box.left + 160)
  expect(onDomain).toHaveBeenCalledTimes(1)
  expect(timeline.getDomain().map((x) => x.getTime())).toEqual([
    d('2026-01-04').getTime(),
    d('2026-01-06').getTime(),
  ])
})

test('redraws when the timeline data updates', () => {
  const { svg, timeline } = setup()
  timeline.update({ lanes: data.lanes.slice(0, 1), items: data.items.slice(0, 1) })
  expect(svg.querySelectorAll('rect.timeline-minimap-lane').length).toBe(1)
  expect(svg.querySelectorAll('rect.timeline-minimap-bar').length).toBe(1)
  expect(svg.getAttribute('height')).toBe('10')
})

test('destroy empties the svg and stops following the timeline', () => {
  const { svg, timeline, minimap } = setup()
  minimap.destroy()
  expect(svg.childElementCount).toBe(0)
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  timeline.update(data)
  expect(svg.childElementCount).toBe(0)
})

test('classes map adds extra class names to minimap parts', () => {
  const timeline = createTimeline(mountContainer(), { domain: [d('2026-01-01'), d('2026-01-11')] })
  timeline.update(data)
  const svg = mountSvg()
  createMinimap(svg, { timeline, classes: { root: 'r', lane: 'ln', bar: 'b', brush: 'br' } })
  expect(svg.classList.contains('r')).toBe(true)
  expect(svg.querySelector('rect.timeline-minimap-lane')?.classList.contains('ln')).toBe(true)
  expect(svg.querySelector('rect.timeline-minimap-bar')?.classList.contains('b')).toBe(true)
  expect(svg.querySelector('g.brush')?.classList.contains('br')).toBe(true)
})

const tallSetup = () => {
  const lanes = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}`, label: `L${i}` }))
  const timeline = createTimeline(mountContainer(), {
    domain: [d('2026-01-01'), d('2026-01-11')],
    rowHeight: 32,
    maxHeight: 160,
  })
  timeline.update({
    lanes,
    items: lanes.map((lane, i) => ({
      id: `i${i}`,
      lane: lane.id,
      start: d('2026-01-02'),
      end: d('2026-01-04'),
    })),
  })
  const svg = mountSvg()
  createMinimap(svg, { timeline, laneHeight: 10, offset: 0, brush: 'xy' })
  return { timeline, svg }
}

test('xy brush reflects both the domain and the scroll viewport', async () => {
  const { svg, timeline } = tallSetup()
  const sel = selectionRect(svg)
  expect(sel.style.display).toBe('')
  expect(sel.getAttribute('y')).toBe('0')
  expect(sel.getAttribute('height')).toBe('50')
  expect(sel.getAttribute('width')).toBe('800')
  timeline.setScroll(64)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(sel.getAttribute('y')).toBe('20')
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  expect(sel.getAttribute('x')).toBe('160')
  expect(sel.getAttribute('width')).toBe('160')
})

test('dragging the xy brush scrolls the body as well as setting the domain', async () => {
  const { svg, timeline } = tallSetup()
  timeline.setDomain([d('2026-01-03'), d('2026-01-05')])
  const sel = selectionRect(svg)
  const box = sel.getBoundingClientRect()
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
  mouse('mousedown', sel, box.left + 80, box.top + 25)
  mouse('mousemove', window, box.left + 160, box.top + 45)
  mouse('mouseup', window, box.left + 160, box.top + 45)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(timeline.getDomain()[0]!.getTime()).toBe(d('2026-01-04').getTime())
  expect(timeline.getScroll().top).toBe(64)
})
