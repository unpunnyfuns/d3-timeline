import type { ScaleTime } from 'd3-scale'
import type { Selection } from 'd3-selection'

export type TimelineLayer = 'axis' | 'grid' | 'lanes' | 'labels' | 'bars'

export type LabelAlign = 'start' | 'center' | 'end'

export type LayerSelection = Selection<SVGGElement, unknown, null, undefined>

export type RenderHook = (layer: TimelineLayer, selection: LayerSelection, state: ViewState) => void

export interface TimelineLane {
  id: string
  label: string
}

export interface TimelineItem {
  id: string
  lane: string
  start: Date
  end: Date
  label?: string
  className?: string
}

export interface TimelineData {
  lanes: TimelineLane[]
  items: TimelineItem[]
}

export interface TimelineClasses {
  root?: string
  axisSvg?: string
  body?: string
  bodySvg?: string
  axis?: string
  grid?: string
  gridLine?: string
  lanes?: string
  lane?: string
  laneBorder?: string
  labels?: string
  laneLabel?: string
  bars?: string
  bar?: string
  barRect?: string
  barLabel?: string
}

export const cx = (...parts: (string | undefined | false)[]): string =>
  parts.filter(Boolean).join(' ')

export interface TimelineOptions {
  classes?: TimelineClasses
  maxHeight?: number
  rowHeight?: number
  labelWidth?: number
  domain?: [Date, Date]
  panExtent?: [Date, Date]
  zoomExtent?: [number, number]
  axisHeight?: number
  barInset?: number
  labelPadding?: number
  labelAlign?: LabelAlign
  labelOffsetX?: number
  labelOffsetY?: number
  tickSpacing?: number
  tickFormat?: (date: Date) => string
  onRender?: RenderHook
}

export interface ScrollState {
  top: number
  height: number
  total: number
}

export interface TimelineEvents {
  hover: (id: string | null) => void
  select: (id: string | null) => void
  domainchange: (domain: [Date, Date]) => void
  update: (data: TimelineData) => void
  scroll: (scroll: ScrollState) => void
}

export interface ResolvedTimelineOptions {
  rowHeight: number
  labelWidth: number
  zoomExtent: [number, number]
}

export interface Timeline {
  update(data: TimelineData): void
  setDomain(domain: [Date, Date]): void
  getDomain(): [Date, Date]
  getData(): TimelineData
  getPanExtent(): [Date, Date]
  getOptions(): ResolvedTimelineOptions
  getScroll(): ScrollState
  setScroll(top: number): void
  setSelected(id: string | null): void
  on<K extends keyof TimelineEvents>(event: K, handler: TimelineEvents[K]): () => void
  destroy(): void
}

export interface ViewState {
  lanes: TimelineLane[]
  items: TimelineItem[]
  xScale: ScaleTime<number, number>
  rowHeight: number
  labelWidth: number
  axisHeight: number
  barInset: number
  labelPadding: number
  labelAlign: LabelAlign
  labelOffsetX: number
  labelOffsetY: number
  classes: TimelineClasses
  tickSpacing: number
  tickFormat: ((date: Date) => string) | null
  width: number
  hoveredId: string | null
  selectedId: string | null
}
