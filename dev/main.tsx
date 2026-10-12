import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createMinimap,
  createTimeline,
  isoTickFormat,
  type RenderHook,
  type Timeline as TimelineInstance,
  type TimelineItem,
} from '../src/core'
import { Timeline, TimelineLaneMap, TimelineMinimap } from '../src'
import '../timeline.css'
import { data, manyLanesData } from './data'
import { Controls, defaultSettings, type Settings } from './controls'

const coreSvg = document.querySelector<HTMLElement>('#core')!
const status = document.querySelector<HTMLElement>('#core-status')!
const core = createTimeline(coreSvg)
core.update(data)
createMinimap(document.querySelector<SVGSVGElement>('#core-minimap')!, { timeline: core })
core.on('select', (id) => {
  status.textContent = id ? `Selected ${id}` : 'Nothing selected'
})

const tickFormats: Record<Settings['tickFormat'], ((date: Date) => string) | undefined> = {
  default: undefined,
  day: (date) => String(date.getDate()),
  iso: isoTickFormat,
}

const DAY = 86_400_000

const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!
themeSelect.addEventListener('change', () => {
  document.documentElement.style.colorScheme = themeSelect.value
})

const App = () => {
  const [settings, setSettings] = useState(defaultSettings)
  const chartData = settings.manyLanes ? manyLanesData : data
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [instance, setInstance] = useState<TimelineInstance | null>(null)

  const onRender = useMemo<RenderHook>(
    () => (layer, selection, state) => {
      if (layer !== 'bars') return
      const bars = selection.selectAll<SVGGElement, TimelineItem>('g.timeline-bar')
      bars
        .selectAll<SVGTextElement, TimelineItem>('text.duration')
        .data((item) => (settings.showDuration ? [item] : []))
        .join('text')
        .attr('class', 'duration')
        .attr('x', (item) => state.xScale(item.end) - 6)
        .attr('y', state.rowHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .text((item) => `${Math.round((item.end.getTime() - item.start.getTime()) / DAY)}d`)
      if (settings.raiseSelected) {
        bars.filter((item) => item.id === state.selectedId).raise()
      }
    },
    [settings.showDuration, settings.raiseSelected],
  )

  return (
    <>
      <Controls value={settings} onChange={setSettings} />
      <div className={settings.zebra ? 'zebra' : undefined}>
        {settings.minimapPosition === 'top' && (
          <TimelineMinimap
            timeline={instance}
            laneHeight={settings.laneHeight}
            brush={settings.minimapBrush}
            style={{ marginBottom: 8 }}
          />
        )}
        <div className="row">
          <Timeline
            lanes={chartData.lanes}
            items={chartData.items}
            maxHeight={settings.maxHeight || undefined}
            selected={selected}
            onSelect={setSelected}
            onHover={setHovered}
            onInstance={setInstance}
            onRender={onRender}
            rowHeight={settings.rowHeight}
            labelWidth={settings.labelWidth}
            axisHeight={settings.axisHeight}
            barInset={settings.barInset}
            labelPadding={settings.labelPadding}
            labelAlign={settings.labelAlign}
            labelOffsetX={settings.labelOffsetX}
            labelOffsetY={settings.labelOffsetY}
            tickSpacing={settings.tickSpacing}
            tickFormat={tickFormats[settings.tickFormat]}
            renderTooltip={
              settings.tooltip
                ? ({ item, lane, pinned }) => (
                    <div className="card">
                      <strong>{item.label ?? item.id}</strong>
                      <div>{lane.label}</div>
                      <div>
                        {item.start.toLocaleDateString()} to {item.end.toLocaleDateString()} (
                        {Math.round((item.end.getTime() - item.start.getTime()) / DAY)}d)
                      </div>
                      {pinned && (
                        <button type="button" onClick={() => setSelected(null)}>
                          close
                        </button>
                      )}
                    </div>
                  )
                : undefined
            }
          />
          {settings.laneMap && (
            <TimelineLaneMap timeline={instance} style={{ marginTop: settings.axisHeight }} />
          )}
        </div>
        {settings.minimapPosition === 'bottom' && (
          <TimelineMinimap
            timeline={instance}
            laneHeight={settings.laneHeight}
            brush={settings.minimapBrush}
            style={{ marginTop: 8 }}
          />
        )}
      </div>
      <p>
        Selected: {selected ?? 'none'} / Hovered: {hovered ?? 'none'}
      </p>
    </>
  )
}

createRoot(document.querySelector('#react')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
