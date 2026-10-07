import type { TimelineData } from '../src/core'

const d = (iso: string) => new Date(iso)

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

export const manyLanesData: TimelineData = (() => {
  const rand = seeded(42)
  const base = d('2026-10-01').getTime()
  const DAY = 86_400_000
  const lanes = Array.from({ length: 100 }, (_, i) => ({ id: `lane-${i}`, label: `Lane ${i + 1}` }))
  const items = lanes.flatMap((lane, i) => {
    let cursor = base + rand() * 5 * DAY
    return Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, j) => {
      const start = cursor
      const end = start + (2 + rand() * 8) * DAY
      cursor = end + (1 + rand() * 4) * DAY
      return {
        id: `${lane.id}-${j}`,
        lane: lane.id,
        start: new Date(start),
        end: new Date(end),
        label: `Task ${i + 1}.${j + 1}`,
        className: j === 0 && i % 7 === 0 ? 'kind-release' : undefined,
      }
    })
  })
  return { lanes, items }
})()

export const data: TimelineData = {
  lanes: [
    { id: 'design', label: 'Design' },
    { id: 'backend', label: 'Backend' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'qa', label: 'QA' },
  ],
  items: [
    { id: '1', lane: 'design', start: d('2026-10-01'), end: d('2026-10-08'), label: 'Wireframes' },
    {
      id: '2',
      lane: 'design',
      start: d('2026-10-09'),
      end: d('2026-10-15'),
      label: 'Visual design',
    },
    { id: '3', lane: 'backend', start: d('2026-10-05'), end: d('2026-10-20'), label: 'API' },
    {
      id: '4',
      lane: 'backend',
      start: d('2026-10-21'),
      end: d('2026-10-24'),
      label: 'Release',
      className: 'kind-release',
    },
    { id: '5', lane: 'frontend', start: d('2026-10-12'), end: d('2026-10-26'), label: 'Build UI' },
    { id: '6', lane: 'qa', start: d('2026-10-22'), end: d('2026-10-30'), label: 'Test pass' },
    {
      id: '7',
      lane: 'qa',
      start: d('2026-10-31'),
      end: d('2026-11-03'),
      label: 'Release',
      className: 'kind-release',
    },
  ],
}
