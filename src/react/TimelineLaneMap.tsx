import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import {
  createLaneMap,
  type LaneMapClasses,
  type LaneMapOptions,
  type Timeline as TimelineInstance,
} from '../core'

export interface TimelineLaneMapProps {
  timeline: TimelineInstance | null
  width?: number
  classes?: LaneMapClasses
  className?: string
  style?: CSSProperties
}

export const TimelineLaneMap = ({
  timeline,
  width,
  classes,
  className,
  style,
}: TimelineLaneMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const classesKey = JSON.stringify(classes ?? {})

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || !timeline) return
    const options: LaneMapOptions = { timeline }
    if (width !== undefined) options.width = width
    if (classesKey !== '{}') options.classes = JSON.parse(classesKey)
    const laneMap = createLaneMap(svg, options)
    return () => laneMap.destroy()
  }, [timeline, width, classesKey])

  return <svg ref={svgRef} className={className} style={style} />
}
