import { afterEach, expect, test } from 'vitest'
import { renderGrid } from './grid'
import { tickCount } from '../scale'
import { makeState, mountGroup } from '../test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

test('draws one line per tick spanning all lanes', () => {
  const g = mountGroup()
  const state = makeState()
  renderGrid(g, state)
  const lines = g.selectAll<SVGLineElement, unknown>('line.timeline-grid-line')
  expect(lines.size()).toBe(state.xScale.ticks(tickCount(state.width - state.labelWidth)).length)
  lines.each(function () {
    expect(this.getAttribute('y2')).toBe(String(state.lanes.length * state.rowHeight))
  })
})

test('rendering twice does not duplicate lines', () => {
  const g = mountGroup()
  renderGrid(g, makeState())
  const first = g.selectAll('line').size()
  renderGrid(g, makeState())
  expect(g.selectAll('line').size()).toBe(first)
})
