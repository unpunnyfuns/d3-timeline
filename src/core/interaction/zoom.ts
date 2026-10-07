import type { ScaleTime } from 'd3-scale'
import type { Selection } from 'd3-selection'
import 'd3-transition'
import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomTransform } from 'd3-zoom'

type G = Selection<SVGGElement, unknown, null, undefined>

export interface ZoomOptions {
  getBaseScale: () => ScaleTime<number, number>
  getWidth: () => number
  getHeight: () => number
  zoomExtent: [number, number]
  getPanExtent?: () => [Date, Date]
  onZoom: (xScale: ScaleTime<number, number>) => void
}

export interface ZoomController {
  setDomain(domain: [Date, Date]): void
  getDomain(): [Date, Date]
  getScale(): ScaleTime<number, number>
  resize(): void
  destroy(): void
}

export const attachZoom = (plot: G, options: ZoomOptions): ZoomController => {
  let transform: ZoomTransform = zoomIdentity

  const capture = plot
    .append('rect')
    .attr('class', 'timeline-capture')
    .attr('fill', 'transparent')
    .attr('width', options.getWidth())
    .attr('height', options.getHeight())

  const getScale = () => transform.rescaleX(options.getBaseScale())

  const getDomain = (): [Date, Date] => {
    const [start, end] = getScale().domain()
    return [start!, end!]
  }

  const isHorizontalWheel = (event: WheelEvent) =>
    Math.abs(event.deltaX) > Math.abs(event.deltaY) && !event.ctrlKey && !event.metaKey

  const behavior = d3Zoom<SVGGElement, unknown>()
    .filter((event: Event) => {
      if (event.type === 'wheel') {
        const wheel = event as WheelEvent
        return wheel.ctrlKey || wheel.metaKey
      }
      return !(event as MouseEvent).ctrlKey && (event as MouseEvent).button === 0
    })
    .on('zoom', (event: D3ZoomEvent<SVGGElement, unknown>) => {
      transform = event.transform
      options.onZoom(getScale())
    })

  plot.on('wheel.timeline-pan', (event: WheelEvent) => {
    if (!isHorizontalWheel(event)) return
    event.preventDefault()
    plot.call(behavior.translateBy, -event.deltaX / transform.k, 0)
  })

  const applyExtents = () => {
    const base = options.getBaseScale()
    const width = options.getWidth()
    const height = options.getHeight()
    const [panStart, panEnd] = options.getPanExtent?.() ?? [base.domain()[0]!, base.domain()[1]!]
    const x0 = base(panStart)
    const x1 = base(panEnd)
    const fitScale = width / Math.max(x1 - x0, 1)
    behavior
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([Math.max(options.zoomExtent[0], fitScale), options.zoomExtent[1]])
      .translateExtent([
        [x0, 0],
        [x1, height],
      ])
  }

  applyExtents()
  plot.call(behavior)

  const setDomain = ([start, end]: [Date, Date]) => {
    const base = options.getBaseScale()
    const width = options.getWidth()
    const k = width / (base(end) - base(start))
    const tx = -base(start) * k
    plot.call(behavior.transform, zoomIdentity.translate(tx, 0).scale(k))
  }

  const resize = () => {
    capture.attr('width', options.getWidth()).attr('height', options.getHeight())
    applyExtents()
  }

  const destroy = () => {
    plot.on('.zoom', null)
    plot.on('wheel.timeline-pan', null)
    capture.remove()
  }

  return { setDomain, getDomain, getScale, resize, destroy }
}
