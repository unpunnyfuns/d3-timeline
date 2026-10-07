# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install
npm test                                        # Vitest browser mode, Chromium via Playwright
npx vitest run src/core/layers/bars.test.ts     # single file
npx vitest run -t "wheel zooms"                 # single test by name
npm run build                                   # tsup: dist/index.js (React + core) and dist/core/index.js
npm run typecheck
npm run lint                                    # oxlint
npm run format                                  # oxfmt (format:check for CI)
npm run dev                                     # Vite playground in dev/ (index.html, tall.html)
```

Tests run in a real browser. jsdom is not used and must not be added. `npx playwright install chromium` if the browser is missing.

## Architecture

Single npm package. `src/index.ts` exports the React components and re-exports everything from `src/core`. `src/core/index.ts` is also published as the `./core` subpath for vanilla use.

**Core** (`src/core`) is an instance factory over pure render layers:

- `create-timeline.ts` owns the single `ViewState` (lanes, items, zoomed `xScale`, geometry, hovered/selected ids), builds the SVG skeleton once, and calls layers on every change. It also owns the `ResizeObserver` and the event emitter.
- `layers/*.ts` each export `render(selection, state)` using keyed D3 joins, so repeated calls are idempotent. They never hold state. `bars.ts` wires pointer events and takes handler callbacks.
- Geometry (`axisHeight`, `barInset`, `labelPadding`, `labelAlign`, `labelOffsetX`, `labelOffsetY`, `tickSpacing`, `tickFormat`) lives on `ViewState`, not as module constants, so layers stay pure. `onRender(layer, selection, state)` is invoked by the orchestrator after each layer render; layers themselves don't know about it.
- The axis default `tickFormat` is `defaultTickFormat` in `scale.ts`: d3's multi-scale cascade with 24-hour `%H:%M`. Axis and grid share a width-based tick count from `tickCount` so labels don't collide and grid lines match ticks. Lanes draw a bottom border line rather than stroking the rect.
- `interaction/zoom.ts` wraps d3-zoom on the plot group with a transparent capture rect appended _before_ the layer groups, so bars stay on top for pointer events. Pan and zoom-out are clamped via `translateExtent`/`extent` to `panExtent` (default: the initial domain). `d3-transition` is imported for its side effect because `zoom.transform` needs `selection.interrupt`.
- `minimap.ts` is a second factory, `createMinimap(svg, { timeline })`, drawing a condensed overview plus a d3-brush over the pan extent. It follows the timeline through the `update` and `domainchange` events and drives it with `setDomain`. Brush events without a `sourceEvent` are programmatic echoes and are ignored. The brush is empty at the full view and clearing it resets the domain. With `brush: 'xy'` it uses d3's 2D brush: x drives `setDomain`, y drives `setScroll` (minimap px times `rowHeight / laneHeight`), and `sync` rebuilds the selection from both `domainchange` and `scroll` events. Content is offset by `offset`, defaulting to the timeline's `labelWidth`.
- `lane-map.ts` is `createLaneMap(svg, { timeline })`: a vertical thumbnail (all lanes, items as marks over the pan extent) with a window rect sized by viewport/total. It follows the timeline's `update` and `scroll` events and drives `setScroll` from a d3-drag on the SVG (click or drag centres the window on the pointer). The core exposes `getScroll`/`setScroll` and emits `scroll` from the body's scroll listener; when `maxHeight` is unset the viewport equals the total.
- Data flow is one-way: the library never mutates consumer data. Hover and select update internal state, re-render bars, then emit.
- Only individual `d3-*` modules are dependencies, never the `d3` bundle.

DOM structure: `div.timeline > svg.timeline-axis-svg(g.timeline-axis) + div.timeline-body(max-height/overflow when `maxHeight` set) > svg.timeline-body-svg(defs clipPath, g.timeline-plot(capture rect, grid, lanes, bars; translated by labelWidth; clipped), g.timeline-labels)`. Two SVGs so the axis stays fixed while the body scrolls; lane labels scroll with lanes.

Wheel: d3-zoom's filter only accepts wheel events with ctrl/meta (trackpad pinch arrives that way); plain wheel falls through to scrolling. A separate `wheel.timeline-pan` listener in `zoom.ts` turns horizontal-dominant wheel into `translateBy`.

**React** (`src/react/Timeline.tsx`) creates the core instance in a layout effect keyed on option props that require recreation. Data, selection, and domain are synced by separate effects. Latest props and callbacks (including `onRender` and `tickFormat`) are read through a ref so listeners subscribe once. `onInstance` hands the instance to consumers so `TimelineMinimap` can bind to it.

**Styling** is class names plus `--timeline-*` custom properties in `timeline.css`. Dark mode comes from `light-dark()` values, resolved by the inherited `color-scheme`; the stylesheet deliberately does not set `color-scheme` itself so the page controls it. No presentation attributes in code except layout geometry; `rx`, fill, and stroke are all CSS.

## Conventions

- Functional style: factories and closures, no classes.
- Tests live next to source as `*.test.ts(x)`. `src/core/test-utils.ts` has `mountSvg`, `mountGroup`, `makeState`. React tests use `vitest-browser-react`, whose `render` is async.
- Design and plan docs are in `docs/superpowers/`. The spec predates the single-package layout; file paths there map `packages/core/src` to `src/core` and `packages/react/src` to `src/react`.
