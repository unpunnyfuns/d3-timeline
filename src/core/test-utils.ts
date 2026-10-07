import { select, type Selection } from 'd3-selection'
import { createBaseScale } from './scale'
import type { ViewState } from './types'

export const d = (iso: string) => new Date(iso)

export const mountSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '800')
  svg.setAttribute('height', '400')
  document.body.appendChild(svg)
  return svg
}

export const mountContainer = (): HTMLDivElement => {
  const div = document.createElement('div')
  div.style.width = '800px'
  document.body.appendChild(div)
  return div
}

export const mountGroup = (): Selection<SVGGElement, unknown, null, undefined> =>
  select(mountSvg()).append('g')

export const makeState = (overrides: Partial<ViewState> = {}): ViewState => ({
  lanes: [
    { id: 'l1', label: 'Lane one' },
    { id: 'l2', label: 'Lane two' },
  ],
  items: [
    { id: 'a', lane: 'l1', start: d('2026-01-02'), end: d('2026-01-04'), label: 'A' },
    { id: 'b', lane: 'l2', start: d('2026-01-05'), end: d('2026-01-09'), label: 'B' },
  ],
  xScale: createBaseScale([d('2026-01-01'), d('2026-01-11')], 500),
  rowHeight: 32,
  labelWidth: 160,
  axisHeight: 28,
  barInset: 4,
  labelPadding: 6,
  labelAlign: 'start',
  labelOffsetX: 0,
  labelOffsetY: 0,
  classes: {},
  tickSpacing: 120,
  tickFormat: null,
  width: 660,
  hoveredId: null,
  selectedId: null,
  ...overrides,
})
