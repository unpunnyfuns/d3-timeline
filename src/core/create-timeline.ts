import { select } from 'd3-selection'
import { createEmitter } from './events'
import { attachZoom } from './interaction/zoom'
import { renderAxis } from './layers/axis'
import { renderBars } from './layers/bars'
import { renderGrid } from './layers/grid'
import { renderLaneLabels, renderLanes } from './layers/lanes'
import { DEFAULT_TICK_SPACING, createBaseScale, defaultDomain } from './scale'
import { cx } from './types'
import type {
  ResolvedTimelineOptions,
  ScrollState,
  Timeline,
  TimelineData,
  TimelineEvents,
  TimelineOptions,
  ViewState,
} from './types'

const DEFAULTS = {
  rowHeight: 32,
  labelWidth: 160,
  zoomExtent: [0.5, 50] as [number, number],
  axisHeight: 28,
  barInset: 4,
  labelPadding: 6,
}

let instanceCounter = 0

const SVG_NS = 'http://www.w3.org/2000/svg'

const measureWidth = (element: Element): number => {
  const measured = element.getBoundingClientRect().width
  if (measured > 0) return measured
  return Number(element.getAttribute('width')) || 0
}

export const createTimeline = (container: HTMLElement, options: TimelineOptions = {}): Timeline => {
  const rowHeight = options.rowHeight ?? DEFAULTS.rowHeight
  const labelWidth = options.labelWidth ?? DEFAULTS.labelWidth
  const zoomExtent = options.zoomExtent ?? DEFAULTS.zoomExtent
  const axisHeight = options.axisHeight ?? DEFAULTS.axisHeight
  const hook = options.onRender
  const emitter = createEmitter<TimelineEvents>()

  instanceCounter += 1
  const clipId = `timeline-plot-clip-${instanceCounter}`

  let destroyed = false
  let domainInitialised = options.domain !== undefined
  let baseDomain: [Date, Date] = options.domain ?? defaultDomain([])

  const state: ViewState = {
    lanes: [],
    items: [],
    xScale: createBaseScale(baseDomain, 0),
    rowHeight,
    labelWidth,
    axisHeight,
    barInset: options.barInset ?? DEFAULTS.barInset,
    labelPadding: options.labelPadding ?? DEFAULTS.labelPadding,
    labelAlign: options.labelAlign ?? 'start',
    labelOffsetX: options.labelOffsetX ?? 0,
    labelOffsetY: options.labelOffsetY ?? 0,
    classes: options.classes ?? {},
    tickSpacing: options.tickSpacing ?? DEFAULT_TICK_SPACING,
    tickFormat: options.tickFormat ?? null,
    width: measureWidth(container),
    hoveredId: null,
    selectedId: null,
  }

  const plotWidth = () => Math.max(0, state.width - labelWidth)
  const lanesHeight = () => state.lanes.length * rowHeight

  const classes = state.classes
  const root = select(container).attr(
    'class',
    cx(container.getAttribute('class') ?? '', 'timeline', classes.root),
  )
  const axisSvg = root
    .append<SVGSVGElement>(() => document.createElementNS(SVG_NS, 'svg'))
    .attr('class', cx('timeline-axis-svg', classes.axisSvg))
    .attr('height', axisHeight)
  const body = root.append('div').attr('class', cx('timeline-body', classes.body))
  if (options.maxHeight !== undefined) {
    body.style('max-height', `${options.maxHeight}px`).style('overflow-y', 'auto')
  }
  const bodyEl = body.node()!
  const scrollable = options.maxHeight !== undefined
  const getScroll = (): ScrollState => {
    const total = lanesHeight()
    const height = scrollable ? Math.min(bodyEl.clientHeight || total, total) : total
    return { top: scrollable ? bodyEl.scrollTop : 0, height, total }
  }
  const onBodyScroll = () => emitter.emit('scroll', getScroll())
  bodyEl.addEventListener('scroll', onBodyScroll, { passive: true })
  const setScroll = (top: number) => {
    if (destroyed) return
    const { height, total } = getScroll()
    bodyEl.scrollTop = Math.max(0, Math.min(top, total - height))
  }

  const bodySvg = body
    .append<SVGSVGElement>(() => document.createElementNS(SVG_NS, 'svg'))
    .attr('class', cx('timeline-body-svg', classes.bodySvg))

  const clipRect = bodySvg.append('defs').append('clipPath').attr('id', clipId).append('rect')
  const axisG = axisSvg.append('g').attr('class', cx('timeline-axis', classes.axis))
  const plotG = bodySvg
    .append('g')
    .attr('class', 'timeline-plot')
    .attr('clip-path', `url(#${clipId})`)
    .attr('transform', `translate(${labelWidth},0)`)
  const labelsG = bodySvg.append('g').attr('class', cx('timeline-labels', classes.labels))

  const zoom = attachZoom(plotG, {
    getBaseScale: () => createBaseScale(baseDomain, plotWidth()),
    getWidth: plotWidth,
    getHeight: lanesHeight,
    zoomExtent,
    getPanExtent: () => options.panExtent ?? baseDomain,
    onZoom: (xScale) => {
      state.xScale = xScale
      renderMoving()
      emitter.emit('domainchange', zoom.getDomain())
    },
  })

  const gridG = plotG.append('g').attr('class', cx('timeline-grid', classes.grid))
  const lanesG = plotG.append('g').attr('class', cx('timeline-lanes', classes.lanes))
  const barsG = plotG.append('g').attr('class', cx('timeline-bars', classes.bars))

  const drawBars = () => {
    renderBars(barsG, state, barHandlers)
    hook?.('bars', barsG, state)
  }

  const barHandlers = {
    onHover: (id: string | null) => {
      state.hoveredId = id
      drawBars()
      emitter.emit('hover', id)
    },
    onSelect: (id: string | null) => {
      state.selectedId = id
      drawBars()
      emitter.emit('select', id)
    },
  }

  plotG.on('click', () => barHandlers.onSelect(null))

  const renderMoving = () => {
    renderAxis(axisG, state)
    hook?.('axis', axisG, state)
    renderGrid(gridG, state)
    hook?.('grid', gridG, state)
    drawBars()
  }

  const renderAll = () => {
    axisSvg.attr('width', state.width)
    bodySvg.attr('width', state.width).attr('height', lanesHeight())
    clipRect.attr('width', plotWidth()).attr('height', lanesHeight())
    zoom.resize()
    state.xScale = zoom.getScale()
    renderLanes(lanesG, state)
    hook?.('lanes', lanesG, state)
    renderLaneLabels(labelsG, state)
    hook?.('labels', labelsG, state)
    renderMoving()
  }

  const observer = new ResizeObserver(() => {
    if (destroyed) return
    const width = measureWidth(container)
    if (width === state.width) return
    state.width = width
    renderAll()
  })
  observer.observe(container)

  const update = (data: TimelineData) => {
    if (destroyed) return
    state.lanes = data.lanes
    state.items = data.items
    if (!domainInitialised) {
      baseDomain = defaultDomain(data.items)
      domainInitialised = true
    }
    if (state.selectedId && !data.items.some((item) => item.id === state.selectedId)) {
      state.selectedId = null
    }
    renderAll()
    emitter.emit('update', data)
  }

  const setDomain = (domain: [Date, Date]) => {
    if (destroyed) return
    if (domain[1].getTime() <= domain[0].getTime()) {
      throw new Error('setDomain: end must be after start')
    }
    zoom.setDomain(domain)
  }

  const getDomain = () => zoom.getDomain()
  const getData = (): TimelineData => ({ lanes: state.lanes, items: state.items })
  const getPanExtent = (): [Date, Date] => options.panExtent ?? baseDomain
  const getOptions = (): ResolvedTimelineOptions => ({ rowHeight, labelWidth, zoomExtent })

  const setSelected = (id: string | null) => {
    if (destroyed) return
    state.selectedId = id
    drawBars()
  }

  const on: Timeline['on'] = (event, handler) => emitter.on(event, handler)

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    observer.disconnect()
    bodyEl.removeEventListener('scroll', onBodyScroll)
    zoom.destroy()
    plotG.on('click', null)
    emitter.clear()
    root.classed('timeline', false)
    if (classes.root) for (const c of classes.root.split(/\s+/)) root.classed(c, false)
    root.selectAll('*').remove()
  }

  return {
    update,
    setDomain,
    getDomain,
    getData,
    getPanExtent,
    getOptions,
    getScroll,
    setScroll,
    setSelected,
    on,
    destroy,
  }
}
