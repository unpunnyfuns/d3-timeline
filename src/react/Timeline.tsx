import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  createTimeline,
  type Timeline as TimelineInstance,
  type TimelineItem,
  type TimelineLane,
  type TimelineOptions,
} from '../core'

export interface TooltipContext {
  item: TimelineItem
  lane: TimelineLane
  pinned: boolean
}

export interface TimelineProps extends TimelineOptions {
  lanes: TimelineLane[]
  items: TimelineItem[]
  selected?: string | null
  onHover?: (id: string | null) => void
  onSelect?: (id: string | null) => void
  onDomainChange?: (domain: [Date, Date]) => void
  onInstance?: (timeline: TimelineInstance | null) => void
  renderTooltip?: (context: TooltipContext) => ReactNode
  className?: string
  style?: CSSProperties
}

type Placement = 'bottom' | 'top'

export const Timeline = ({
  lanes,
  items,
  selected = null,
  onHover,
  onSelect,
  onDomainChange,
  onInstance,
  onRender,
  renderTooltip,
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
  const rootRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
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

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(selected)
  const [, bump] = useState(0)
  const [layout, setLayout] = useState<{ placement: Placement; shift: number }>({
    placement: 'bottom',
    shift: 0,
  })

  const domainStart = domain?.[0].getTime()
  const domainEnd = domain?.[1].getTime()
  const panStart = panExtent?.[0].getTime()
  const panEnd = panExtent?.[1].getTime()
  const zoomMin = zoomExtent?.[0]
  const zoomMax = zoomExtent?.[1]
  const hasTickFormat = tickFormat !== undefined
  const classesKey = JSON.stringify(classes ?? {})

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
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
    if (tickSpacing !== undefined) options.tickSpacing = tickSpacing
    if (hasTickFormat) options.tickFormat = (date) => latest.current.tickFormat?.(date) ?? ''
    if (classesKey !== '{}') options.classes = JSON.parse(classesKey)
    if (maxHeight !== undefined) options.maxHeight = maxHeight
    if (latest.current.domain) options.domain = latest.current.domain
    if (panStart !== undefined && panEnd !== undefined) {
      options.panExtent = [new Date(panStart), new Date(panEnd)]
    }
    if (zoomMin !== undefined && zoomMax !== undefined) options.zoomExtent = [zoomMin, zoomMax]

    const instance = createTimeline(root, options)
    const rerender = () => bump((n) => n + 1)
    instance.on('hover', (id) => {
      setHoveredId(id)
      latest.current.onHover?.(id)
    })
    instance.on('select', (id) => {
      setSelectedId(id)
      latest.current.onSelect?.(id)
    })
    instance.on('domainchange', (next) => {
      rerender()
      latest.current.onDomainChange?.(next)
    })
    instance.on('scroll', rerender)
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
    setSelectedId(selected)
  }, [selected])

  useEffect(() => {
    if (domainStart === undefined || domainEnd === undefined) return
    const instance = instanceRef.current
    if (!instance) return
    const [start, end] = instance.getDomain()
    if (start.getTime() === domainStart && end.getTime() === domainEnd) return
    instance.setDomain([new Date(domainStart), new Date(domainEnd)])
  }, [domainStart, domainEnd])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new ResizeObserver(() => bump((n) => n + 1))
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [renderTooltip !== undefined])

  const activeId = hoveredId ?? selectedId
  const activeItem = activeId ? items.find((item) => item.id === activeId) : undefined
  const activeLane = activeItem ? lanes.find((lane) => lane.id === activeItem.lane) : undefined
  const anchor = activeId && renderTooltip ? instanceRef.current?.getAnchor(activeId) : null
  const pinned = activeId !== null && activeId === selectedId && hoveredId === null
  const showTooltip = Boolean(renderTooltip && activeItem && activeLane && anchor)

  useLayoutEffect(() => {
    const tip = tooltipRef.current
    const wrapper = wrapperRef.current
    if (!tip || !wrapper || !anchor) return
    const wrapperBox = wrapper.getBoundingClientRect()
    const tipBox = tip.getBoundingClientRect()
    const centre = anchor.left + anchor.width / 2
    const half = tipBox.width / 2
    const shift = Math.min(Math.max(centre, half), Math.max(half, wrapperBox.width - half)) - centre
    const anchorBottomInPage = wrapperBox.top + anchor.top + anchor.height
    const overflowsBottom = anchorBottomInPage + tipBox.height > window.innerHeight
    const fitsTop = wrapperBox.top + anchor.top - tipBox.height >= 0
    const placement: Placement = overflowsBottom && fitsTop ? 'top' : 'bottom'
    if (placement !== layout.placement || Math.abs(shift - layout.shift) > 0.5) {
      setLayout({ placement, shift })
    }
  })

  const chart = (
    <div
      ref={rootRef}
      className={renderTooltip ? undefined : className}
      style={renderTooltip ? undefined : style}
    />
  )

  if (!renderTooltip) return chart

  const tooltipStyle: CSSProperties | undefined = anchor
    ? {
        position: 'absolute',
        left: anchor.left + anchor.width / 2 + layout.shift,
        top: layout.placement === 'bottom' ? anchor.top + anchor.height : anchor.top,
        transform: layout.placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)',
        pointerEvents: pinned ? 'auto' : 'none',
        zIndex: 1,
      }
    : undefined

  return (
    <div ref={wrapperRef} className={className} style={{ position: 'relative', ...style }}>
      {chart}
      {showTooltip && activeItem && activeLane && (
        <div
          ref={tooltipRef}
          className="timeline-tooltip"
          data-placement={layout.placement}
          style={tooltipStyle}
        >
          {renderTooltip({ item: activeItem, lane: activeLane, pinned })}
        </div>
      )}
    </div>
  )
}
