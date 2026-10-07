import { brush as brush2d, brushX, type BrushBehavior, type D3BrushEvent } from 'd3-brush'
import { select } from 'd3-selection'
import { createBaseScale } from './scale'
import { cx, type Timeline, type TimelineData, type TimelineItem, type TimelineLane } from './types'

export interface MinimapOptions {
  timeline: Timeline
  laneHeight?: number
  offset?: number
  brush?: 'x' | 'xy'
  classes?: MinimapClasses
}

export interface MinimapClasses {
  root?: string
  lane?: string
  bar?: string
  brush?: string
}

export interface Minimap {
  destroy(): void
}

const DEFAULT_LANE_HEIGHT = 6

const measureWidth = (svg: SVGSVGElement): number => {
  const measured = svg.getBoundingClientRect().width
  if (measured > 0) return measured
  return Number(svg.getAttribute('width')) || 0
}

export const createMinimap = (svg: SVGSVGElement, options: MinimapOptions): Minimap => {
  const { timeline } = options
  const laneHeight = options.laneHeight ?? DEFAULT_LANE_HEIGHT
  const offset = options.offset ?? timeline.getOptions().labelWidth
  const mode = options.brush ?? 'x'
  let destroyed = false
  let width = measureWidth(svg)
  let data: TimelineData = timeline.getData()
  let applying = false

  const classes = options.classes ?? {}
  const root = select(svg).attr(
    'class',
    cx(svg.getAttribute('class') ?? '', 'timeline-minimap', classes.root),
  )
  const content = root
    .append('g')
    .attr('class', 'timeline-minimap-content')
    .attr('transform', `translate(${offset},0)`)
  const lanesG = content.append('g').attr('class', 'timeline-minimap-lanes')
  const barsG = content.append('g').attr('class', 'timeline-minimap-bars')
  const brushG = content.append('g').attr('class', cx('brush', classes.brush))

  const plotWidth = () => Math.max(0, width - offset)
  const scale = () => createBaseScale(timeline.getPanExtent(), plotWidth())
  const height = () => data.lanes.length * laneHeight

  const yScale = () => laneHeight / timeline.getOptions().rowHeight

  const isFullView = ([start, end]: [Date, Date]) => {
    const [panStart, panEnd] = timeline.getPanExtent()
    return start.getTime() <= panStart.getTime() && end.getTime() >= panEnd.getTime()
  }

  const isFullScroll = () => {
    const { height: viewport, total } = timeline.getScroll()
    return viewport >= total
  }

  const brush: BrushBehavior<unknown> = (mode === 'xy' ? brush2d<unknown>() : brushX<unknown>()).on(
    'brush end',
    (event: D3BrushEvent<unknown>) => {
      if (applying || !event.sourceEvent || event.type !== 'end') return
      const x = scale()
      let xr: [number, number] | null = null
      let yr: [number, number] | null = null
      if (event.selection) {
        if (mode === 'xy') {
          const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]]
          xr = [x0, x1]
          yr = [y0, y1]
        } else {
          xr = event.selection as [number, number]
        }
      }
      if (!xr || xr[1] - xr[0] < 1) {
        if (mode === 'xy') timeline.setScroll(0)
        if (!isFullView(timeline.getDomain())) timeline.setDomain(timeline.getPanExtent())
        else sync()
        return
      }
      if (yr) timeline.setScroll(yr[0] / yScale())
      timeline.setDomain([x.invert(xr[0]), x.invert(xr[1])])
    },
  )

  const sync = () => {
    const x = scale()
    const domain = timeline.getDomain()
    applying = true
    if (mode === 'xy') {
      const { top, height: viewport } = timeline.getScroll()
      const k = yScale()
      const full = isFullView(domain) && isFullScroll()
      brushG.call(
        brush.move,
        full
          ? null
          : [
              [x(domain[0]), top * k],
              [x(domain[1]), (top + viewport) * k],
            ],
      )
    } else {
      brushG.call(brush.move, isFullView(domain) ? null : [x(domain[0]), x(domain[1])])
    }
    applying = false
  }

  const render = () => {
    const x = scale()
    const laneIndex = new Map(data.lanes.map((lane, i) => [lane.id, i]))
    svg.setAttribute('height', String(height()))

    lanesG
      .selectAll<SVGRectElement, TimelineLane>('rect.timeline-minimap-lane')
      .data(data.lanes, (lane) => lane.id)
      .join('rect')
      .attr('class', (_, i) => cx('timeline-minimap-lane', i % 2 === 1 && 'is-alt', classes.lane))
      .attr('x', 0)
      .attr('y', (_, i) => i * laneHeight)
      .attr('width', plotWidth())
      .attr('height', laneHeight)

    barsG
      .selectAll<SVGRectElement, TimelineItem>('rect.timeline-minimap-bar')
      .data(
        data.items.filter((item) => laneIndex.has(item.lane)),
        (item) => item.id,
      )
      .join('rect')
      .attr('class', (item) => cx('timeline-minimap-bar', classes.bar, item.className))
      .attr('x', (item) => x(item.start))
      .attr('y', (item) => laneIndex.get(item.lane)! * laneHeight + 1)
      .attr('width', (item) => Math.max(0, x(item.end) - x(item.start)))
      .attr('height', Math.max(1, laneHeight - 2))

    brush.extent([
      [0, 0],
      [plotWidth(), height()],
    ])
    brushG.call(brush)
    sync()
  }

  const offUpdate = timeline.on('update', (next) => {
    data = next
    render()
  })
  const offDomain = timeline.on('domainchange', sync)
  const offScroll = timeline.on('scroll', sync)

  const observer = new ResizeObserver(() => {
    if (destroyed) return
    const next = measureWidth(svg)
    if (next === width) return
    width = next
    render()
  })
  observer.observe(svg)

  render()

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    offUpdate()
    offDomain()
    offScroll()
    observer.disconnect()
    brushG.on('.brush', null)
    root.classed('timeline-minimap', false)
    if (classes.root) for (const c of classes.root.split(/\s+/)) root.classed(c, false)
    root.selectAll('*').remove()
  }

  return { destroy }
}
