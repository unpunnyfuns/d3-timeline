import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import {
  createTimeline,
  type Timeline as TimelineInstance,
  type TimelineItem,
  type TimelineLane,
  type TimelineOptions,
} from '../core'

export interface TimelineProps extends TimelineOptions {
  lanes: TimelineLane[]
  items: TimelineItem[]
  selected?: string | null
  onHover?: (id: string | null) => void
  onSelect?: (id: string | null) => void
  onDomainChange?: (domain: [Date, Date]) => void
  onInstance?: (timeline: TimelineInstance | null) => void
  className?: string
  style?: CSSProperties
}

export const Timeline = ({
  lanes,
  items,
  selected = null,
  onHover,
  onSelect,
  onDomainChange,
  onInstance,
  onRender,
  className,
  style,
  rowHeight,
  labelWidth,
  domain,
  panExtent,
  zoomExtent,
  axisHeight,
  barInset,
  labelPadding,
  labelAlign,
  labelOffsetX,
  labelOffsetY,
  tickSpacing,
  tickFormat,
  classes,
  maxHeight,
}: TimelineProps) => {
  const svgRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<TimelineInstance | null>(null)
  const latest = useRef({
    lanes,
    items,
    selected,
    domain,
    onHover,
    onSelect,
    onDomainChange,
    onInstance,
    onRender,
    tickFormat,
  })
  latest.current = {
    lanes,
    items,
    selected,
    domain,
    onHover,
    onSelect,
    onDomainChange,
    onInstance,
    onRender,
    tickFormat,
  }

  const domainStart = domain?.[0].getTime()
  const domainEnd = domain?.[1].getTime()
  const panStart = panExtent?.[0].getTime()
  const panEnd = panExtent?.[1].getTime()
  const zoomMin = zoomExtent?.[0]
  const zoomMax = zoomExtent?.[1]
  const hasTickFormat = tickFormat !== undefined
  const classesKey = JSON.stringify(classes ?? {})

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const options: TimelineOptions = {
      onRender: (layer, selection, state) => latest.current.onRender?.(layer, selection, state),
    }
    if (rowHeight !== undefined) options.rowHeight = rowHeight
    if (labelWidth !== undefined) options.labelWidth = labelWidth
    if (axisHeight !== undefined) options.axisHeight = axisHeight
    if (barInset !== undefined) options.barInset = barInset
    if (labelPadding !== undefined) options.labelPadding = labelPadding
    if (labelAlign !== undefined) options.labelAlign = labelAlign
    if (labelOffsetX !== undefined) options.labelOffsetX = labelOffsetX
    if (labelOffsetY !== undefined) options.labelOffsetY = labelOffsetY
    if (classesKey !== '{}') options.classes = JSON.parse(classesKey)
    if (maxHeight !== undefined) options.maxHeight = maxHeight
    if (tickSpacing !== undefined) options.tickSpacing = tickSpacing
    if (hasTickFormat) options.tickFormat = (date) => latest.current.tickFormat?.(date) ?? ''
    if (latest.current.domain) options.domain = latest.current.domain
    if (panStart !== undefined && panEnd !== undefined) {
      options.panExtent = [new Date(panStart), new Date(panEnd)]
    }
    if (zoomMin !== undefined && zoomMax !== undefined) options.zoomExtent = [zoomMin, zoomMax]

    const instance = createTimeline(svg, options)
    instance.on('hover', (id) => latest.current.onHover?.(id))
    instance.on('select', (id) => latest.current.onSelect?.(id))
    instance.on('domainchange', (next) => latest.current.onDomainChange?.(next))
    instance.update({ lanes: latest.current.lanes, items: latest.current.items })
    instance.setSelected(latest.current.selected)
    instanceRef.current = instance
    latest.current.onInstance?.(instance)
    return () => {
      latest.current.onInstance?.(null)
      instance.destroy()
      instanceRef.current = null
    }
  }, [
    rowHeight,
    labelWidth,
    axisHeight,
    barInset,
    labelPadding,
    labelAlign,
    labelOffsetX,
    labelOffsetY,
    tickSpacing,
    hasTickFormat,
    classesKey,
    maxHeight,
    panStart,
    panEnd,
    zoomMin,
    zoomMax,
  ])

  useLayoutEffect(() => {
    instanceRef.current?.update({ lanes, items })
  }, [lanes, items])

  useLayoutEffect(() => {
    instanceRef.current?.setSelected(selected)
  }, [selected])

  useEffect(() => {
    if (domainStart === undefined || domainEnd === undefined) return
    const instance = instanceRef.current
    if (!instance) return
    const [start, end] = instance.getDomain()
    if (start.getTime() === domainStart && end.getTime() === domainEnd) return
    instance.setDomain([new Date(domainStart), new Date(domainEnd)])
  }, [domainStart, domainEnd])

  return <div ref={svgRef} className={className} style={style} />
}
