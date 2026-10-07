import type { Selection } from 'd3-selection'
import { cx, type TimelineLane, type ViewState } from '../types'

type G = Selection<SVGGElement, unknown, null, undefined>

const plotWidth = (state: ViewState) => Math.max(0, state.width - state.labelWidth)

export const renderLanes = (g: G, state: ViewState): void => {
  g.selectAll<SVGRectElement, TimelineLane>('rect.timeline-lane')
    .data(state.lanes, (lane) => lane.id)
    .join('rect')
    .attr('class', (_, i) => cx('timeline-lane', i % 2 === 1 && 'is-alt', state.classes.lane))
    .attr('x', 0)
    .attr('y', (_, i) => i * state.rowHeight)
    .attr('width', plotWidth(state))
    .attr('height', state.rowHeight)

  g.selectAll<SVGLineElement, TimelineLane>('line.timeline-lane-border')
    .data(state.lanes, (lane) => lane.id)
    .join('line')
    .attr('class', cx('timeline-lane-border', state.classes.laneBorder))
    .attr('x1', 0)
    .attr('x2', plotWidth(state))
    .attr('y1', (_, i) => (i + 1) * state.rowHeight)
    .attr('y2', (_, i) => (i + 1) * state.rowHeight)
}

export const renderLaneLabels = (g: G, state: ViewState): void => {
  g.selectAll<SVGTextElement, TimelineLane>('text.timeline-lane-label')
    .data(state.lanes, (lane) => lane.id)
    .join('text')
    .attr('class', cx('timeline-lane-label', state.classes.laneLabel))
    .attr('x', 8)
    .attr('y', (_, i) => i * state.rowHeight + state.rowHeight / 2 + state.labelOffsetY)
    .attr('dominant-baseline', 'central')
    .text((lane) => lane.label)
}
