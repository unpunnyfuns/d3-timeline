import type { Selection } from 'd3-selection'
import { tickCount } from '../scale'
import { cx, type ViewState } from '../types'

type G = Selection<SVGGElement, unknown, null, undefined>

export const renderGrid = (g: G, state: ViewState): void => {
  const height = state.lanes.length * state.rowHeight
  g.selectAll<SVGLineElement, Date>('line.timeline-grid-line')
    .data(
      state.xScale.ticks(tickCount(state.width - state.labelWidth, state.tickSpacing)),
      (tick) => tick.getTime(),
    )
    .join('line')
    .attr('class', cx('timeline-grid-line', state.classes.gridLine))
    .attr('x1', (tick) => state.xScale(tick))
    .attr('x2', (tick) => state.xScale(tick))
    .attr('y1', 0)
    .attr('y2', height)
}
