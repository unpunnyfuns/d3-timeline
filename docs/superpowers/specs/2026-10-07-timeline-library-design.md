# Timeline library design

Framework-agnostic D3 timeline (Gantt-style) chart library with a React wrapper.

## Goals

- Render lanes of time-ranged items against a zoomable, pannable time axis.
- Framework-agnostic core usable from any app; thin React wrapper on top.
- Styling via class names and CSS custom properties, with a shipped default stylesheet.
- One-way data flow: the library never mutates consumer data.

## Out of scope for v1

- Editing (drag/resize). No drag layer, no `change` event.
- Dependencies/connectors between items.
- Hierarchical or collapsible lanes.
- Stacking overlapping items into sub-rows. Items in a lane are assumed not to overlap; if they do, they draw on top of each other.
- Multi-selection.
- Non-`Date` time values.

## Repo layout and tooling

pnpm monorepo:

```
packages/core    @unpunnyfuns/timeline-core   d3 + TypeScript, no framework deps
packages/react   @unpunnyfuns/timeline-react  depends on core, peer dep on react
examples/        Vite playground for manual testing of both packages
```

- TypeScript, ESM-only, built with tsup per package.
- Vitest browser mode with the Playwright provider (Chromium) for both packages. No jsdom.
- oxlint + oxfmt at the root.
- Core depends on individual D3 modules: `d3-scale`, `d3-axis`, `d3-selection`, `d3-zoom`, `d3-time`, `d3-time-format`, `d3-brush`, `d3-transition`. Not the `d3` bundle.
- Functional style throughout: factories and closures, no classes.

Package scope `@unpunnyfuns` is a placeholder.

## Data model

```ts
interface TimelineLane {
  id: string
  label: string
}

interface TimelineItem {
  id: string
  lane: string // TimelineLane.id
  start: Date
  end: Date
  label?: string // inline text rendered inside the bar
  className?: string // extra class on the bar group for per-item styling
}

interface TimelineData {
  lanes: TimelineLane[]
  items: TimelineItem[]
}
```

Lanes are explicit: their order is the render order and empty lanes render as empty rows. Items referencing an unknown lane are ignored. Items may be identical in label and style; there is no special "repeat" concept.

## Core public API

```ts
import { createTimeline } from '@unpunnyfuns/timeline-core'

interface TimelineOptions {
  rowHeight?: number // default 32
  labelWidth?: number // default 160, left gutter for lane labels
  domain?: [Date, Date] // initial visible range; default: item extent padded 5% each side
  zoomExtent?: [number, number] // d3-zoom scaleExtent, default [0.5, 50]
}

interface TimelineEvents {
  hover: (id: string | null) => void // pointerenter / pointerleave on a bar
  select: (id: string | null) => void // click on a bar; click on empty plot area clears
  domainchange: (domain: [Date, Date]) => void // after zoom or pan, and after setDomain
}

interface Timeline {
  update(data: TimelineData): void
  setDomain(domain: [Date, Date]): void
  getDomain(): [Date, Date]
  setSelected(id: string | null): void
  on<K extends keyof TimelineEvents>(event: K, handler: TimelineEvents[K]): () => void
  destroy(): void
}

function createTimeline(svg: SVGSVGElement, options?: TimelineOptions): Timeline
```

Behaviour:

- `update` is idempotent. It re-renders with D3 joins; calling it with the same data produces the same DOM.
- Width is read from the SVG element's bounding box. A `ResizeObserver` on the element triggers a re-render when width changes. Height is set by the library: axis height plus `lanes.length * rowHeight`.
- `setDomain` applies a zoom transform so the visible range matches, then emits `domainchange`.
- `setSelected` sets the selected id without emitting `select`. Selection survives `update` as long as the id still exists.
- `on` returns an unsubscribe function.
- `destroy` removes zoom and pointer listeners, disconnects the observer, and empties the SVG.

## Internals

The instance holds one view state object and passes it to pure render layers.

```ts
interface ViewState {
  lanes: TimelineLane[]
  items: TimelineItem[]
  xScale: ScaleTime<number, number> // time → px, zoom transform already applied
  rowHeight: number
  labelWidth: number
  width: number
  hoveredId: string | null
  selectedId: string | null
}
```

File layout:

```
packages/core/src/
  create-timeline.ts    orchestrator: owns state, zoom, resize observer, event emitter
  layers/
    axis.ts             top time axis via d3-axis; tick format adapts to zoom level
    grid.ts             vertical tick lines spanning the lane area
    lanes.ts            alternating lane backgrounds and lane labels in the left gutter
    bars.ts             one <g class="timeline-bar"> per item: rect + inline label; pointer events
  interaction/
    zoom.ts             d3-zoom on the plot area, x-axis only, updates xScale, emits domainchange
  scale.ts              builds the base xScale from domain and plot width
  events.ts             typed emitter: on / off / emit, no dependencies
  types.ts
  index.ts
```

Each layer exports `render(selection, state)` and uses D3 joins (`enter`/`update`/`exit`) keyed by id so repeated calls are idempotent.

SVG structure, created once:

```
svg.timeline
  g.timeline-axis
  g.timeline-plot               translated by labelWidth, clipped to plot width
    g.timeline-grid
    g.timeline-lanes
    g.timeline-bars
  g.timeline-labels             left gutter, not clipped
```

Zoom is bound to `g.timeline-plot` with a transparent capture rect so wheel and drag work over empty space. Only the x translation and scale are used; y is ignored. `zoom.ts` rescales the base scale and triggers a render of axis, grid, and bars (lanes don't move horizontally).

Hover and select are handled in `bars.ts` via `pointerenter`, `pointerleave`, and `click`. A click on the capture rect clears selection. State classes `is-hovered` and `is-selected` are applied on the bar group.

Inline labels are `<text>` inside the bar group, clipped to the bar's rect via a per-bar `clipPath`, so text never spills outside a narrow bar.

## React wrapper

```tsx
import { Timeline } from '@unpunnyfuns/timeline-react'
import '@unpunnyfuns/timeline-core/timeline.css'

;<Timeline
  lanes={lanes}
  items={items}
  rowHeight={32}
  labelWidth={160}
  domain={domain}
  selected={selectedId}
  onHover={setHovered}
  onSelect={setSelected}
  onDomainChange={setDomain}
  className="my-timeline"
  style={{ width: '100%' }}
/>
```

- Renders the `<svg>` itself and forwards `className` and `style`.
- `useEffect` creates the instance on mount and destroys it on unmount.
- Separate effects call `update`, `setDomain`, and `setSelected` when the corresponding props change.
- Callbacks are stored in refs so subscriptions are registered once.
- Props mirror core options; no extra features in the wrapper.

## Styling

Core ships `timeline.css`. Consumers import it once and override custom properties on `.timeline` or any ancestor.

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
```

Class names: `timeline`, `timeline-axis`, `timeline-plot`, `timeline-grid`, `timeline-lanes`, `timeline-lane`, `timeline-labels`, `timeline-lane-label`, `timeline-bars`, `timeline-bar`, `timeline-bar-label`. State classes: `is-hovered`, `is-selected`.

Per-item `className` is added to the bar group, so a consumer can colour categories by redefining `--timeline-bar-bg` on that class. The stylesheet ships a `prefers-color-scheme: dark` block with adjusted defaults. Zebra striping is off by default.

## Error handling

- Items whose `lane` doesn't match a lane id are skipped silently.
- Items with `end < start` are rendered with zero width.
- `setDomain` with `end <= start` throws.
- Calling any method after `destroy` is a no-op.

## Testing

Vitest browser mode, Chromium via Playwright. Tests mount a real `<svg>` in the document, call `createTimeline`, and assert on DOM and emitted events.

- `scale.test.ts`: domain and width map to expected pixels; zoom transform rescales correctly.
- `layers/*.test.ts`: render twice with the same state, assert element counts and key attributes are unchanged; render with removed items, assert exit.
- `interaction/zoom.test.ts`: dispatch wheel event on the plot, assert `domainchange` payload and that axis ticks moved.
- `layers/bars.test.ts`: pointer events produce `hover` and `select` with correct ids and state classes; click on empty plot clears.
- `create-timeline.test.ts`: lifecycle, `destroy` removes listeners and children, methods after destroy are no-ops.
- `packages/react`: render the component, change `items` and `selected` props, assert the SVG updates; assert callbacks fire.

The `examples/` playground is for manual inspection only and has no tests.

## Minimap (added 2026-10-07)

A separate focus+context view in the D3 brush-and-zoom style.

Core additions:

- `Timeline` gains `getData(): TimelineData`, `getPanExtent(): [Date, Date]`, `getOptions()` (resolved `rowHeight`, `labelWidth`, `zoomExtent`), and an `update` event emitted after each `update()` call.
- `createMinimap(svg: SVGSVGElement, options: { timeline: Timeline; laneHeight?: number; offset?: number }): { destroy(): void }`. `offset` shifts the content right and defaults to the timeline's `labelWidth` so the two line up.
  - Draws one `rect.timeline-minimap-lane` strip per lane and one `rect.timeline-minimap-bar` per item across the full pan extent. `laneHeight` defaults to 6. Height is set by the library.
  - A d3-brush x-only brush mirrors the timeline's current domain and is empty when the domain covers the pan extent (the default view), as in the D3 brush-and-zoom example. User brush moves call `timeline.setDomain`; clearing the brush by clicking outside it sets the domain back to the pan extent. Moves caused by `domainchange` are applied with `brush.move` and ignored for emitting, using `event.sourceEvent` to tell them apart.
  - Subscribes to `update` and `domainchange`, observes its own width, and unsubscribes on `destroy`.
  - Adds `d3-brush` as a dependency.
- Classes: `timeline-minimap`, `timeline-minimap-lane`, `timeline-minimap-bar`; brush parts via d3's `.selection` and `.handle`. Bars reuse `--timeline-bar-bg` so per-item colours match the main chart, dimmed by `--timeline-minimap-bar-opacity`. Brush styled by `--timeline-minimap-brush-bg`, `--timeline-minimap-brush-border`.

React:

- `Timeline` gets `onInstance?: (timeline: Timeline | null) => void`, called with the instance after creation and `null` before destroy.
- `TimelineMinimap` takes `timeline: Timeline | null`, `laneHeight`, `className`, `style`. Renders its own `<svg>`; creates the minimap when `timeline` is non-null and destroys it on change or unmount.

## Customisation (added 2026-10-08)

CSS covers paint; geometry and extra elements need code. Two mechanisms:

Geometry options on `TimelineOptions`, all optional, carried on `ViewState`:

| Option         | Default             | Effect                                                                              |
| -------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `axisHeight`   | 28                  | Height of the axis strip above the lanes                                            |
| `barInset`     | 4                   | Vertical gap between a bar and its lane edges                                       |
| `labelPadding` | 6                   | Horizontal gap between bar start and inline label                                   |
| `labelAlign`   | start               | start, center, or end alignment of the inline label within its bar                  |
| `labelOffsetX` | 0                   | Horizontal nudge for bar labels                                                     |
| `labelOffsetY` | 0                   | Vertical nudge for bar and lane labels; labels use `dominant-baseline: central`     |
| `tickSpacing`  | 120                 | Target pixels per axis tick; drives the tick count for axis and grid                |
| `tickFormat`   | 24-hour multi-scale | `(date: Date) => string` for axis tick labels. Default is d3's cascade with `%H:%M` |

Render hook: `onRender?: (layer: TimelineLayer, selection, state: ViewState) => void` with `TimelineLayer = 'axis' | 'grid' | 'lanes' | 'labels' | 'bars'`. Called after each layer renders, every time it renders, with the layer's D3 group selection. Consumers may set attributes or append elements; they are responsible for keeping their changes idempotent. `ViewState` and `TimelineLayer` become public types.

React: the geometry options are props; changing them recreates the instance. `onRender` is read through the latest-props ref so it never forces recreation.

## Tall charts: sticky axis and scrolling body (added 2026-10-08)

Target: up to a few hundred lanes without virtualization.

- `createTimeline(container: HTMLElement, options)` replaces the SVG argument. The container gets class `timeline` and this structure:

  ```
  div.timeline
    svg.timeline-axis-svg        height = axisHeight; contains g.timeline-axis
    div.timeline-body            overflow-y: auto when maxHeight is set
      svg.timeline-body-svg      height = lanes * rowHeight; contains plot and labels
  ```

  Lane labels live in the body SVG so they scroll with their lanes. Width is measured from the container.

- New option `maxHeight?: number`. When set, the body is capped at that height and scrolls vertically; the axis stays in place. When unset, the body grows and nothing scrolls.
- Wheel handling: plain wheel is not captured, so it scrolls the body or page. `ctrl`/`meta` + wheel zooms (trackpad pinch arrives as ctrl + wheel). Wheel with a dominant horizontal delta pans. Drag pans as before.
- Minimap is unchanged and still takes its own SVG.
- React `Timeline` renders a `div` instead of an `svg`; `className` and `style` go on it. `maxHeight` is a prop.
- `classes` gains `axisSvg`, `body`, `bodySvg`.

## Tooltip / popover (added 2026-10-12)

Consumer renders content, library positions it.

- Core: `getAnchor(id): { left, top, width, height } | null`, the bar's box relative to the timeline container, null when the item is not rendered or is outside the scrolled viewport. Consumers re-read on `domainchange` and `scroll`.
- React: `renderTooltip?: (ctx: { item: TimelineItem; lane: TimelineLane; pinned: boolean }) => ReactNode`. When set, `Timeline` renders a wrapper `div` (gets `className`/`style`, `position: relative`) containing the chart root and a `div.timeline-tooltip` positioned at the active bar: centred horizontally, below the bar, flipped above when there is no room below, clamped to the wrapper width. `data-placement` is `bottom` or `top`.
- Active item is the hovered one, else the selected one. `pinned` is true when showing the selected item. The tooltip element has `pointer-events: none` unless pinned.
- Position re-syncs on hover, select, domainchange, scroll, and container resize.
- No default content or styling beyond positioning.
