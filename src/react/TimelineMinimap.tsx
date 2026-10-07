import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import {
  createMinimap,
  type MinimapClasses,
  type MinimapOptions,
  type Timeline as TimelineInstance,
} from '../core'

export interface TimelineMinimapProps {
  timeline: TimelineInstance | null
  laneHeight?: number
  offset?: number
  brush?: 'x' | 'xy'
  classes?: MinimapClasses
  className?: string
  style?: CSSProperties
}

export const TimelineMinimap = ({
  timeline,
  laneHeight,
  offset,
  brush,
  classes,
  className,
  style,
}: TimelineMinimapProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const classesKey = JSON.stringify(classes ?? {})

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || !timeline) return
    const options: MinimapOptions = { timeline }
    if (laneHeight !== undefined) options.laneHeight = laneHeight
    if (offset !== undefined) options.offset = offset
    if (brush !== undefined) options.brush = brush
    if (classesKey !== '{}') options.classes = JSON.parse(classesKey)
    const minimap = createMinimap(svg, options)
    return () => minimap.destroy()
  }, [timeline, laneHeight, offset, brush, classesKey])

  return <svg ref={svgRef} className={className} style={style} />
}
