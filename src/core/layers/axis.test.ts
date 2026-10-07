import { afterEach, expect, test } from 'vitest'
import { renderAxis } from './axis'
import { d, makeState, mountGroup } from '../test-utils'
import { createBaseScale } from '../scale'

afterEach(() => {
  document.body.innerHTML = ''
})

test('renders ticks for the scale domain', () => {
  const g = mountGroup()
  renderAxis(g, makeState())
  expect(g.selectAll('.tick').size()).toBeGreaterThan(2)
})

test('rendering twice yields the same tick count', () => {
  const g = mountGroup()
  renderAxis(g, makeState())
  const first = g.selectAll('.tick').size()
  renderAxis(g, makeState())
  expect(g.selectAll('.tick').size()).toBe(first)
})

test('positions itself at axisHeight and honours tickFormat', () => {
  const g = mountGroup()
  renderAxis(g, makeState({ axisHeight: 40, tickFormat: () => 'x' }))
  expect(g.attr('transform')).toBe('translate(160,40)')
  expect(g.select('.tick text').text()).toBe('x')
})

test('defaults to 24-hour tick labels when zoomed to hours', () => {
  const g = mountGroup()
  const scale = createBaseScale([d('2026-01-01T06:00:00'), d('2026-01-01T18:00:00')], 500)
  renderAxis(g, makeState({ xScale: scale }))
  const texts = g
    .selectAll<SVGTextElement, unknown>('.tick text')
    .nodes()
    .map((n) => n.textContent)
  expect(texts.length).toBeGreaterThan(2)
  expect(texts.every((t) => /^\d{2}:\d{2}$/.test(t ?? ''))).toBe(true)
  expect(texts.some((t) => Number(t?.slice(0, 2)) >= 13)).toBe(true)
})
