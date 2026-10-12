import { afterEach, expect, test, vi } from 'vitest'
import { createLaneMap } from './lane-map'
import { createTimeline } from './create-timeline'
import { d, mountContainer, mountSvg } from './test-utils'
import type { TimelineData } from './types'

afterEach(() => {
  document.body.innerHTML = ''
})

const lanes = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}`, label: `L${i}` }))
const data: TimelineData = {
  lanes,
  items: lanes.map((lane, i) => ({
    id: `i${i}`,
    lane: lane.id,
    start: d(`2026-01-0${(i % 9) + 1}`),
    end: d(`2026-01-${10 + (i % 9)}`),
  })),
}

const setup = (maxHeight?: number) => {
  const container = mountContainer()
  const timeline = createTimeline(container, {
    domain: [d('2026-01-01'), d('2026-01-21')],
    rowHeight: 32,
    ...(maxHeight === undefined ? {} : { maxHeight }),
  })
  timeline.update(data)
  const svg = mountSvg()
  const laneMap = createLaneMap(svg, { timeline, width: 40 })
  return { container, timeline, svg, laneMap }
}

const windowRect = (svg: SVGSVGElement) =>
  svg.querySelector<SVGRectElement>('rect.timeline-lanemap-window')!

test('draws a thumbnail sized to the viewport with one mark per item', () => {
  const { svg } = setup(160)
  expect(svg.classList.contains('timeline-lanemap')).toBe(true)
  expect(svg.getAttribute('width')).toBe('40')
  expect(svg.getAttribute('height')).toBe('160')
  const marks = svg.querySelectorAll<SVGRectElement>('rect.timeline-lanemap-bar')
  expect(marks.length).toBe(10)
  expect(marks[1]?.getAttribute('y')).toBe('16')
  expect(Number(marks[0]?.getAttribute('x'))).toBe(0)
})

test('window reflects the viewport and follows scrolling', async () => {
  const { svg, timeline } = setup(160)
  expect(windowRect(svg).getAttribute('y')).toBe('0')
  expect(windowRect(svg).getAttribute('height')).toBe('80')
  timeline.setScroll(80)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(windowRect(svg).getAttribute('y')).toBe('40')
})

test('without maxHeight the window covers everything', () => {
  const { svg } = setup()
  expect(svg.getAttribute('height')).toBe('320')
  expect(windowRect(svg).getAttribute('height')).toBe('320')
})

test('dragging on the map scrolls the timeline', async () => {
  const { svg, timeline } = setup(160)
  const box = svg.getBoundingClientRect()
  const mouse = (type: string, target: EventTarget, y: number) =>
    target.dispatchEvent(
      new MouseEvent(type, {
        clientX: box.left + 20,
        clientY: box.top + y,
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
    )
  mouse('mousedown', svg, 120)
  mouse('mouseup', window, 120)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const { top } = timeline.getScroll()
  expect(top).toBeCloseTo(120 * 2 - 80, 0)
})

test('destroy empties the svg and stops following', async () => {
  const { svg, timeline, laneMap } = setup(160)
  laneMap.destroy()
  expect(svg.childElementCount).toBe(0)
  timeline.setScroll(80)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(svg.childElementCount).toBe(0)
})

test('pins its width with an inline style so page CSS cannot stretch it', () => {
  const style = document.createElement('style')
  style.textContent = 'svg { width: 100% }'
  document.head.appendChild(style)
  const { svg } = setup(160)
  expect(svg.style.width).toBe('40px')
  expect(svg.getBoundingClientRect().width).toBe(40)
  style.remove()
})
