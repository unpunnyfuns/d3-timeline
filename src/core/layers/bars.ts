import type { Selection } from 'd3-selection'
import { cx, type TimelineItem, type ViewState } from '../types'

type G = Selection<SVGGElement, unknown, null, undefined>

export interface BarHandlers {
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
}

const prefixes = new WeakMap<Element, string>()
let counter = 0

const clipPrefix = (g: G): string => {
  const node = g.node()!
  let prefix = prefixes.get(node)
  if (!prefix) {
    counter += 1
    prefix = `timeline-clip-${counter}-`
    prefixes.set(node, prefix)
  }
  return prefix
}

const barClass = (item: TimelineItem, state: ViewState): string =>
  cx(
    'timeline-bar',
    state.classes.bar,
    item.className,
    item.id === state.hoveredId && 'is-hovered',
    item.id === state.selectedId && 'is-selected',
  )

export const renderBars = (g: G, state: ViewState, handlers: BarHandlers): void => {
  const laneIndex = new Map(state.lanes.map((lane, i) => [lane.id, i]))
  const visible = state.items.filter((item) => laneIndex.has(item.lane))
  const prefix = clipPrefix(g)
  const barHeight = Math.max(0, state.rowHeight - state.barInset * 2)
  const x = (item: TimelineItem) => state.xScale(item.start)
  const w = (item: TimelineItem) => Math.max(0, state.xScale(item.end) - x(item))
  const anchor = state.labelAlign === 'center' ? 'middle' : state.labelAlign
  const labelX = (item: TimelineItem) => {
    if (state.labelAlign === 'center') return x(item) + w(item) / 2
    if (state.labelAlign === 'end') return x(item) + w(item) - state.labelPadding
    return x(item) + state.labelPadding
  }

  const bars = g
    .selectAll<SVGGElement, TimelineItem>('g.timeline-bar')
    .data(visible, (item) => item.id)
    .join((enter) => {
      const group = enter.append('g')
      group.append('clipPath').append('rect')
      group.append('rect').attr('class', 'timeline-bar-rect')
      group.append('text').attr('class', 'timeline-bar-label')
      group.select('rect.timeline-bar-rect').attr('data-part', 'rect')
      group.select('text.timeline-bar-label').attr('data-part', 'label')
      group
        .on('pointerenter', (_, item) => handlers.onHover(item.id))
        .on('pointerleave', () => handlers.onHover(null))
        .on('click', (event: MouseEvent, item) => {
          event.stopPropagation()
          handlers.onSelect(item.id)
        })
      return group
    })

  bars
    .attr('class', (item) => barClass(item, state))
    .attr('data-id', (item) => item.id)
    .attr('transform', (item) => `translate(0,${laneIndex.get(item.lane)! * state.rowHeight})`)

  bars
    .select('clipPath')
    .attr('id', (item) => prefix + item.id)
    .select('rect')
    .attr('x', x)
    .attr('y', state.barInset)
    .attr('width', w)
    .attr('height', barHeight)

  bars
    .select('rect[data-part="rect"]')
    .attr('class', cx('timeline-bar-rect', state.classes.barRect))
    .attr('x', x)
    .attr('y', state.barInset)
    .attr('width', w)
    .attr('height', barHeight)

  bars
    .select('text[data-part="label"]')
    .attr('class', cx('timeline-bar-label', state.classes.barLabel))
    .attr('clip-path', (item) => `url(#${prefix}${item.id})`)
    .attr('text-anchor', anchor)
    .attr('x', (item) => labelX(item) + state.labelOffsetX)
    .attr('y', state.rowHeight / 2 + state.labelOffsetY)
    .attr('dominant-baseline', 'central')
    .text((item) => item.label ?? '')
}
