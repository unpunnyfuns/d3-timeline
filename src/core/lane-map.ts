import { drag, type D3DragEvent } from 'd3-drag'
import { select } from 'd3-selection'
import { createBaseScale } from './scale'
import { cx, type Timeline, type TimelineData, type TimelineItem } from './types'

export interface LaneMapClasses {
  root?: string
  bar?: string
  window?: string
}

export interface LaneMapOptions {
  timeline: Timeline
  width?: number
  classes?: LaneMapClasses
}

export interface LaneMap {
  destroy(): void
}

const DEFAULT_WIDTH = 40

export const createLaneMap = (svg: SVGSVGElement, options: LaneMapOptions): LaneMap => {
  const { timeline } = options
  const width = options.width ?? DEFAULT_WIDTH
  const classes = options.classes ?? {}
  let destroyed = false
  let data: TimelineData = timeline.getData()

  const root = select(svg).attr(
    'class',
    cx(svg.getAttribute('class') ?? '', 'timeline-lanemap', classes.root),
  )
  const barsG = root.append('g').attr('class', 'timeline-lanemap-bars')
  const windowRect = root
    .append('rect')
    .attr('class', cx('timeline-lanemap-window', classes.window))
    .attr('x', 0)
    .attr('width', width)

  const scaleY = () => {
    const { height, total } = timeline.getScroll()
    return total > 0 ? height / total : 1
  }

  const renderWindow = () => {
    const { top, height } = timeline.getScroll()
    const k = scaleY()
    windowRect.attr('y', top * k).attr('height', height * k)
  }

  const render = () => {
    const { height } = timeline.getScroll()
    const { rowHeight } = timeline.getOptions()
    const k = scaleY()
    const x = createBaseScale(timeline.getPanExtent(), width)
    const laneIndex = new Map(data.lanes.map((lane, i) => [lane.id, i]))
    root
      .attr('width', width)
      .attr('height', height)
      .style('width', `${width}px`)
      .style('flex', 'none')
    const markHeight = Math.max(1, rowHeight * k - 1)

    barsG
      .selectAll<SVGRectElement, TimelineItem>('rect.timeline-lanemap-bar')
      .data(
        data.items.filter((item) => laneIndex.has(item.lane)),
        (item) => item.id,
      )
      .join('rect')
      .attr('class', (item) => cx('timeline-lanemap-bar', classes.bar, item.className))
      .attr('x', (item) => x(item.start))
      .attr('y', (item) => laneIndex.get(item.lane)! * rowHeight * k)
      .attr('width', (item) => Math.max(1, x(item.end) - x(item.start)))
      .attr('height', markHeight)

    renderWindow()
  }

  const scrollTo = (y: number) => {
    const { height } = timeline.getScroll()
    timeline.setScroll(y / scaleY() - height / 2)
  }

  const dragBehavior = drag<SVGSVGElement, unknown>()
    .container(svg)
    .on('start drag', (event: D3DragEvent<SVGSVGElement, unknown, unknown>) => scrollTo(event.y))
  root.call(dragBehavior)

  const offUpdate = timeline.on('update', (next) => {
    data = next
    render()
  })
  const offScroll = timeline.on('scroll', renderWindow)

  render()

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    offUpdate()
    offScroll()
    root.on('.drag', null)
    root.classed('timeline-lanemap', false)
    if (classes.root) for (const c of classes.root.split(/\s+/)) root.classed(c, false)
    root.selectAll('*').remove()
  }

  return { destroy }
}
