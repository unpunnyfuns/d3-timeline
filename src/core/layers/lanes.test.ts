import { afterEach, expect, test } from 'vitest'
import { renderLaneLabels, renderLanes } from './lanes'
import { makeState, mountGroup } from '../test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

test('draws one background rect per lane with alternating class', () => {
  const g = mountGroup()
  const state = makeState()
  renderLanes(g, state)
  const rects = g.selectAll<SVGRectElement, unknown>('rect.timeline-lane')
  expect(rects.size()).toBe(2)
  expect(rects.nodes()[0]?.classList.contains('is-alt')).toBe(false)
  expect(rects.nodes()[1]?.classList.contains('is-alt')).toBe(true)
  expect(rects.nodes()[1]?.getAttribute('y')).toBe('32')
  expect(rects.nodes()[1]?.getAttribute('width')).toBe('500')
})

test('draws a bottom border line per lane', () => {
  const g = mountGroup()
  renderLanes(g, makeState())
  const lines = g.selectAll<SVGLineElement, unknown>('line.timeline-lane-border').nodes()
  expect(lines.length).toBe(2)
  expect(lines[0]?.getAttribute('y1')).toBe('32')
  expect(lines[1]?.getAttribute('y2')).toBe('64')
})

test('removes rects for lanes that disappear', () => {
  const g = mountGroup()
  renderLanes(g, makeState())
  renderLanes(g, makeState({ lanes: [{ id: 'l1', label: 'Only' }] }))
  expect(g.selectAll('rect.timeline-lane').size()).toBe(1)
})

test('draws lane labels with text and vertical centre', () => {
  const g = mountGroup()
  const state = makeState()
  renderLaneLabels(g, state)
  const labels = g.selectAll<SVGTextElement, unknown>('text.timeline-lane-label')
  expect(labels.size()).toBe(2)
  expect(labels.nodes()[0]?.textContent).toBe('Lane one')
  expect(labels.nodes()[1]?.getAttribute('y')).toBe('48')
  renderLaneLabels(g, state)
  expect(g.selectAll('text.timeline-lane-label').size()).toBe(2)
})
