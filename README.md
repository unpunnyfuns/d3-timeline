# @unpunnyfuns/timeline

Gantt-style timeline chart for React, built on D3. The vanilla core is importable on its own.

## Structure

| Path                            | Purpose                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/react/Timeline.tsx`        | `Timeline` component: owns a core instance, syncs props                                       |
| `src/react/TimelineMinimap.tsx` | `TimelineMinimap` component: brush overview bound to a `Timeline` instance                    |
| `src/react/TimelineLaneMap.tsx` | `TimelineLaneMap` component: vertical thumbnail with a viewport window, VS Code minimap style |
| `src/core/create-timeline.ts`   | `createTimeline` factory: state, layers, zoom, resize, events                                 |
| `src/core/minimap.ts`           | `createMinimap` factory: d3-brush overview                                                    |
| `src/core/lane-map.ts`          | `createLaneMap` factory: lane thumbnail that scrolls the body                                 |
| `src/core/layers/*.ts`          | Pure `render(selection, state)` functions: axis, grid, lanes, bars                            |
| `src/core/interaction/zoom.ts`  | d3-zoom controller, x-axis only                                                               |
| `src/core/scale.ts`             | Base time scale, default domain, tick count, 24-hour tick format                              |
| `timeline.css`                  | Default stylesheet, driven by `--timeline-*` custom properties                                |
| `dev/`                          | Vite playground with live controls                                                            |

## React

```tsx
import { useState } from 'react'
import { Timeline, TimelineMinimap } from '@unpunnyfuns/timeline'
import type {
  Timeline as TimelineInstance,
  TimelineItem,
  TimelineLane,
} from '@unpunnyfuns/timeline'
import '@unpunnyfuns/timeline/timeline.css'

const lanes: TimelineLane[] = [{ id: 'a', label: 'Lane A' }]
const items: TimelineItem[] = [
  { id: '1', lane: 'a', start: new Date('2026-01-01'), end: new Date('2026-01-05'), label: 'Task' },
]

const App = () => {
  const [selected, setSelected] = useState<string | null>(null)
  const [instance, setInstance] = useState<TimelineInstance | null>(null)
  return (
    <>
      <Timeline
        lanes={lanes}
        items={items}
        selected={selected}
        onSelect={setSelected}
        onHover={(id) => {}}
        onDomainChange={([start, end]) => {}}
        onInstance={setInstance}
        style={{ width: '100%' }}
      />
      <TimelineMinimap timeline={instance} laneHeight={6} style={{ width: '100%' }} />
    </>
  )
}
```

`Timeline` renders a `div` (axis SVG on top, scrolling body SVG below). Props are `lanes`, `items`, `selected`, the three callbacks, `onInstance`, `onRender`, `className`, `style`, plus every option from the table below. Geometry option changes recreate the instance; `lanes`, `items`, `selected`, `domain` update in place. Callbacks, `onRender`, and `tickFormat` are read through a ref, so new function identities are free.

**Tooltip.** Pass `renderTooltip={({ item, lane, pinned }) => <YourCard … />}` and `Timeline` positions your element in a `div.timeline-tooltip` under the hovered bar, flipping above when there's no room (`data-placement` is `bottom` or `top`) and clamped to the chart width. Hover shows it; clicking a bar pins it to the selection with `pinned: true`, and a pinned tooltip accepts pointer events so it can hold buttons. The library adds no styling beyond position, so style the card yourself and give it a top margin for a gap. With `renderTooltip` set, `className` and `style` go on a relative-positioned wrapper around the chart.

`TimelineMinimap` takes `timeline` (from `onInstance`), `laneHeight`, `offset`, `classes`, `className`, `style`. It renders an empty `<svg>` until `timeline` is non-null. It is a separate element, so put it above or below the chart by DOM order.

`TimelineLaneMap` is the tall-chart companion: a narrow thumbnail of every lane and item with a window showing the visible rows, like the VS Code minimap. It takes `timeline`, `width` (40), `classes`, `className`, `style`. Its height matches the chart's viewport, so place it in a flex row beside the chart with a top margin equal to `axisHeight`. Dragging or clicking on it scrolls the body; scrolling the body moves the window. It only does something useful with `maxHeight` set.

## Vanilla

```ts
import { createTimeline, createMinimap } from '@unpunnyfuns/timeline/core'
import '@unpunnyfuns/timeline/timeline.css'

const timeline = createTimeline(container, { rowHeight: 32, maxHeight: 480 })
timeline.update({ lanes, items })
timeline.on('select', (id) => {})
const minimap = createMinimap(miniSvg, { timeline })
```

```ts
timeline.update(data: TimelineData)
timeline.setDomain(domain: [Date, Date])      // throws if end <= start, emits domainchange
timeline.getDomain(): [Date, Date]
timeline.getData(): TimelineData
timeline.getPanExtent(): [Date, Date]
timeline.getOptions(): { rowHeight, labelWidth, zoomExtent }
timeline.getScroll(): { top, height, total }  // body scroll position, viewport height, content height
timeline.setScroll(top: number)
timeline.getAnchor(id): { left, top, width, height } | null   // bar box relative to the container; null if not rendered or scrolled out of view. Re-read on domainchange and scroll.
timeline.setSelected(id: string | null)       // does not emit select
timeline.on('hover' | 'select', (id: string | null) => void): () => void
timeline.on('domainchange', (domain: [Date, Date]) => void): () => void
timeline.on('update', (data: TimelineData) => void): () => void
timeline.on('scroll', (scroll: ScrollState) => void): () => void
timeline.destroy()
minimap.destroy()
```

### Data

```ts
interface TimelineLane {
  id: string
  label: string
}
interface TimelineItem {
  id: string
  lane: string
  start: Date
  end: Date
  label?: string
  className?: string
}
interface TimelineData {
  lanes: TimelineLane[]
  items: TimelineItem[]
}
```

Lanes render in array order. Items referencing an unknown lane are skipped. Items with `end < start` render with zero width. Items in a lane are expected not to overlap; the library does not enforce this. The library never mutates your data.

### Options

| Option         | Default               | Description                                                                                                                                                                                                            |
| -------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxHeight`    | unset                 | Cap on the body height in px; the body scrolls vertically beyond it while the axis stays fixed                                                                                                                         |
| `rowHeight`    | `32`                  | Lane height in px                                                                                                                                                                                                      |
| `labelWidth`   | `160`                 | Left gutter width for lane labels                                                                                                                                                                                      |
| `domain`       | item extent padded 5% | Initial visible range                                                                                                                                                                                                  |
| `panExtent`    | same as `domain`      | Outer bounds for panning and zooming out                                                                                                                                                                               |
| `zoomExtent`   | `[0.5, 50]`           | d3-zoom scale extent; the minimum is raised so the view never exceeds `panExtent`                                                                                                                                      |
| `axisHeight`   | `28`                  | Height of the axis strip                                                                                                                                                                                               |
| `barInset`     | `4`                   | Vertical gap between a bar and its lane edges                                                                                                                                                                          |
| `labelPadding` | `6`                   | Gap between bar edge and inline label                                                                                                                                                                                  |
| `labelAlign`   | `'start'`             | `'start'`, `'center'`, or `'end'` placement of the inline label                                                                                                                                                        |
| `labelOffsetX` | `0`                   | Horizontal nudge for bar labels                                                                                                                                                                                        |
| `labelOffsetY` | `0`                   | Vertical nudge for bar and lane labels                                                                                                                                                                                 |
| `tickSpacing`  | `120`                 | Target px per axis tick, shared by axis and grid                                                                                                                                                                       |
| `tickFormat`   | `defaultTickFormat`   | `(date: Date) => string`. Default is d3's multi-scale cascade with 24-hour `%H:%M`. `isoTickFormat` is the same cascade with `2026`, `2026-03`, `03-05`, `14:30` parts; `cascadingTickFormat(formats)` builds your own |
| `onRender`     |                       | Render hook, see below                                                                                                                                                                                                 |

Minimap options: `timeline`, `laneHeight` (6), `offset` (defaults to the timeline's `labelWidth`), `brush` (`'x'` or `'xy'`). With `'xy'` the brush is two-dimensional: its x range is the visible domain and its y range is the scrolled viewport, so a short minimap (small `laneHeight`) can drive both zoom and scroll on a tall chart. Resizing the brush vertically is ignored; the height always reflects the viewport. Lane map options: `timeline`, `width` (40), `classes` with `root`, `bar`, `window`.

### Behaviour

- `createTimeline` takes a block element and fills it: `div.timeline > svg.timeline-axis-svg + div.timeline-body > svg.timeline-body-svg`. The axis stays put; lanes and their labels live in the body. With `maxHeight` the body scrolls vertically, otherwise it grows.
- Width is measured from the container and observed with `ResizeObserver`. Heights are set by the library.
- Plain wheel scrolls (the body or the page). `ctrl`/`cmd` + wheel zooms, which is also what trackpad pinch sends. Horizontal wheel pans. Drag pans. Zoom and pan are clamped to `panExtent`. Clicking empty plot area clears selection.
- The minimap brush is empty at the full view. Dragging a brush zooms the timeline; clicking outside the brush restores the full view.
- After `destroy` all methods are no-ops.

### Customisation

**Class names.** For utility-class styling (Tailwind, shadcn), pass a `classes` map and skip the stylesheet. Keys: `root`, `axisSvg`, `body`, `bodySvg`, `axis`, `grid`, `gridLine`, `lanes`, `lane`, `laneBorder`, `labels`, `laneLabel`, `bars`, `bar`, `barRect`, `barLabel`. The minimap takes `root`, `lane`, `bar`, `brush`. Library class names stay on the elements, extras are appended.

```tsx
<Timeline
  classes={{ barRect: 'fill-primary', barLabel: 'fill-primary-foreground', axis: 'text-xs' }}
/>
```

**Hook.** CSS handles paint, options handle geometry. For anything else, `onRender` runs after every layer render with the layer name, its D3 group selection, and the current `ViewState`:

```ts
import type { RenderHook, TimelineItem } from '@unpunnyfuns/timeline'

const onRender: RenderHook = (layer, selection, state) => {
  if (layer !== 'bars') return
  selection
    .selectAll<SVGGElement, TimelineItem>('g.timeline-bar')
    .filter((item) => item.id === state.selectedId)
    .raise()
}
```

Layers are `axis`, `grid`, `lanes`, `labels`, `bars`. The hook runs on every render, including hover and zoom, so keep it idempotent: set attributes, or use a D3 join for extra elements.

## Styling

Import `@unpunnyfuns/timeline/timeline.css` once. Override on `.timeline`, `.timeline-minimap`, or any ancestor:

```css
.timeline {
  --timeline-font: system-ui, sans-serif;
  --timeline-font-size: 12px;
  --timeline-axis-color: #666;
  --timeline-grid-color: #e5e5e5;
  --timeline-lane-alt-bg: transparent;
  --timeline-lane-border: #e5e5e5;
  --timeline-bar-bg: #4a7bd0;
  --timeline-bar-fg: #fff;
  --timeline-bar-radius: 3px;
  --timeline-bar-hover-bg: #3a6bc0;
  --timeline-bar-border: none;
  --timeline-bar-border-width: 1;
  --timeline-bar-selected-outline: #1b3f8a;
  --timeline-bar-selected-width: 2;
}
.timeline-minimap {
  --timeline-minimap-bar-opacity: 0.7;
  --timeline-minimap-brush-bg: rgba(74, 123, 208, 0.18);
  --timeline-minimap-brush-border: #4a7bd0;
}
.kind-release {
  --timeline-bar-bg: #2f9e63;
}
```

Per-item `className` lands on the bar group in both the chart and the minimap, so category colours carry over. Colours use `light-dark()`, so they follow the page's `color-scheme`. Set `color-scheme: light dark` on `:root` to follow the system, or `color-scheme: dark` on an ancestor (shadcn's `.dark` class does this) to force dark. With no `color-scheme` set, the chart is light. Grid and lane borders are translucent so they sit on any background. Zebra striping is off by default; set `--timeline-lane-alt-bg` to stripe odd lanes.

Lane map properties: `--timeline-lanemap-bar-opacity`, `--timeline-lanemap-window-bg`, `--timeline-lanemap-window-border`.

Classes: `timeline`, `timeline-axis`, `timeline-plot`, `timeline-grid-line`, `timeline-lane`, `timeline-lane-border`, `timeline-lane-label`, `timeline-bar`, `timeline-bar-rect`, `timeline-bar-label`, `timeline-minimap`, `timeline-minimap-lane`, `timeline-minimap-bar`, `timeline-lanemap`, `timeline-lanemap-bar`, `timeline-lanemap-window`. State: `is-alt`, `is-hovered`, `is-selected`.

## Development

```sh
npm install
npm test          # vitest browser mode (Chromium)
npm run dev       # playground at / and the tall-chart page at /tall.html
npm run build
npm run lint && npm run format && npm run typecheck
```
