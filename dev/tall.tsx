import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Timeline as TimelineInstance } from '../src/core'
import { Timeline, TimelineLaneMap, TimelineMinimap } from '../src'
import '../timeline.css'
import { manyLanesData } from './data'

const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!
themeSelect.addEventListener('change', () => {
  document.documentElement.style.colorScheme = themeSelect.value
})

const App = () => {
  const [maxHeight, setMaxHeight] = useState(480)
  const [mapWidth, setMapWidth] = useState(48)
  const [showMinimap, setShowMinimap] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [instance, setInstance] = useState<TimelineInstance | null>(null)
  return (
    <>
      <div className="controls">
        <label>
          maxHeight ({maxHeight})
          <input
            type="range"
            min={200}
            max={900}
            value={maxHeight}
            onChange={(event) => setMaxHeight(Number(event.target.value))}
          />
        </label>
        <label>
          lane map width ({mapWidth})
          <input
            type="range"
            min={16}
            max={120}
            value={mapWidth}
            onChange={(event) => setMapWidth(Number(event.target.value))}
          />
        </label>
        <label>
          xy minimap
          <input
            type="checkbox"
            checked={showMinimap}
            onChange={(event) => setShowMinimap(event.target.checked)}
          />
        </label>
      </div>
      {showMinimap && (
        <TimelineMinimap
          timeline={instance}
          laneHeight={2}
          brush="xy"
          style={{ marginBottom: 8 }}
        />
      )}
      <div className="row">
        <Timeline
          lanes={manyLanesData.lanes}
          items={manyLanesData.items}
          maxHeight={maxHeight}
          selected={selected}
          onSelect={setSelected}
          onInstance={setInstance}
        />
        <TimelineLaneMap timeline={instance} width={mapWidth} style={{ marginTop: 28 }} />
      </div>
      <p>
        Selected: {selected ?? 'none'}. Plain wheel scrolls, ctrl/cmd + wheel zooms, drag the map to
        jump.
      </p>
    </>
  )
}

createRoot(document.querySelector('#app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
