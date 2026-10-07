import { axisTop } from 'd3-axis'
import type { Selection } from 'd3-selection'
import { defaultTickFormat, tickCount } from '../scale'
import type { ViewState } from '../types'

type G = Selection<SVGGElement, unknown, null, undefined>

export const renderAxis = (g: G, state: ViewState): void => {
  const axis = axisTop(state.xScale)
    .ticks(tickCount(state.width - state.labelWidth, state.tickSpacing))
    .tickSizeOuter(0)
    .tickPadding(6)
  const format = state.tickFormat ?? defaultTickFormat
  axis.tickFormat(format as (d: Date | { valueOf(): number }) => string)
  g.attr('transform', `translate(${state.labelWidth},${state.axisHeight})`).call(axis)
  g.select('.domain').remove()
}
