import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from 'vitest-browser-react'
import { useState } from 'react'
import { Timeline } from './Timeline'
import { TimelineMinimap } from './TimelineMinimap'
import type { Timeline as TimelineInstance, TimelineItem, TimelineLane } from '../core'

afterEach(cleanup)

const d = (iso: string) => new Date(iso)
const lanes: TimelineLane[] = [
  { id: 'l1', label: 'One' },
  { id: 'l2', label: 'Two' },
]
const items: TimelineItem[] = [
  { id: 'a', lane: 'l1', start: d('2026-01-02'), end: d('2026-01-04') },
  { id: 'b', lane: 'l2', start: d('2026-01-05'), end: d('2026-01-09') },
]
const domain: [Date, Date] = [d('2026-01-01'), d('2026-01-11')]

const Linked = ({ onInstance }: { onInstance?: (t: TimelineInstance | null) => void }) => {
  const [instance, setInstance] = useState<TimelineInstance | null>(null)
  return (
    <>
      <Timeline
        lanes={lanes}
        items={items}
        domain={domain}
        style={{ width: 800 }}
        onInstance={(t) => {
          setInstance(t)
          onInstance?.(t)
        }}
      />
      <TimelineMinimap
        timeline={instance}
        laneHeight={10}
        className="mini"
        style={{ width: 800 }}
      />
    </>
  )
}

test('Timeline reports its instance through onInstance', async () => {
  const onInstance = vi.fn()
  const screen = await render(<Linked onInstance={onInstance} />)
  expect(onInstance).toHaveBeenCalled()
  expect(typeof onInstance.mock.lastCall?.[0]?.getDomain).toBe('function')
  await screen.unmount()
  expect(onInstance).toHaveBeenLastCalledWith(null)
})

test('TimelineMinimap renders bars once an instance is available and follows it', async () => {
  const screen = await render(<Linked />)
  const mini = screen.container.querySelector<SVGSVGElement>('svg.mini')!
  expect(mini.classList.contains('timeline-minimap')).toBe(true)
  expect(mini.querySelectorAll('rect.timeline-minimap-bar').length).toBe(2)
  expect(mini.querySelector<SVGRectElement>('.brush .selection')?.style.display).toBe('none')
  expect(mini.querySelector('g.timeline-minimap-content')?.getAttribute('transform')).toBe(
    'translate(160,0)',
  )
})

test('TimelineMinimap renders an empty svg without an instance and cleans up on unmount', async () => {
  const screen = await render(<TimelineMinimap timeline={null} className="mini" />)
  const mini = screen.container.querySelector<SVGSVGElement>('svg.mini')!
  expect(mini.childElementCount).toBe(0)
  await screen.unmount()
})
