# Timeline Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@unpunnyfuns/timeline-core` (D3 lanes/bars/axis with zoom, hover, select) and `@unpunnyfuns/timeline-react` wrapper per `docs/superpowers/specs/2026-10-07-timeline-library-design.md`.

**Architecture:** Instance factory `createTimeline(svg, options)` orchestrating pure `render(selection, state)` layers built on D3 joins. Zoom via d3-zoom rescales the x scale. React wrapper is effects over the instance.

**Tech Stack:** pnpm workspaces, TypeScript 5.9, tsup, Vitest 5 browser mode (Playwright/Chromium), oxlint, oxfmt, d3-scale/axis/selection/zoom/time, React 19.

## Global Constraints

- No jsdom. All tests run in Vitest browser mode.
- Functional style: factories and closures, no classes.
- Individual `d3-*` modules only, never the `d3` bundle.
- ESM-only output.
- No inline end-of-line comments.
- Dates only for time values.

---

### Task 1: Monorepo scaffold

**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.oxlintrc.json`, `.oxfmtrc.json`, `packages/core/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts}`, `packages/core/src/index.ts`, `packages/core/src/smoke.test.ts`

- [ ] Root `package.json` with scripts `build`, `test`, `lint`, `format`, `typecheck` running recursively via pnpm.
- [ ] Core package with vitest browser config (`@vitest/browser-playwright`, chromium, headless).
- [ ] Smoke test asserts `document.createElementNS` yields an SVG element in a real browser. Run, pass, commit.

### Task 2: Types and events

**Files:** `packages/core/src/types.ts`, `packages/core/src/events.ts`, `packages/core/src/events.test.ts`

**Produces:** `TimelineLane`, `TimelineItem`, `TimelineData`, `TimelineOptions`, `TimelineEvents`, `Timeline`, `ViewState`; `createEmitter<E>()` returning `{ on, emit, clear }` where `on` returns an unsubscribe fn.

- [ ] Tests: handler receives payload; unsubscribe stops delivery; `clear` removes all. Fail, implement, pass, commit.

### Task 3: Scale

**Files:** `packages/core/src/scale.ts`, `packages/core/src/scale.test.ts`

**Produces:** `createBaseScale(domain: [Date, Date], width: number): ScaleTime<number, number>`; `defaultDomain(items: TimelineItem[]): [Date, Date]` (extent padded 5% each side; if no items, now ± 1 day).

- [ ] Tests: domain endpoints map to 0 and width; padded domain; empty fallback. Fail, implement, pass, commit.

### Task 4: Axis and grid layers

**Files:** `packages/core/src/layers/axis.ts`, `layers/grid.ts`, tests for each.

**Produces:** `renderAxis(g: Selection<SVGGElement,…>, state: ViewState): void`; `renderGrid(g, state): void`; `AXIS_HEIGHT = 28`.

- [ ] Tests: ticks rendered; rendering twice keeps same tick count; grid lines span lane height (`y2 === lanes.length * rowHeight`). Fail, implement, pass, commit.

### Task 5: Lanes layer

**Files:** `layers/lanes.ts`, `layers/lanes.test.ts`

**Produces:** `renderLanes(g, state)` draws `rect.timeline-lane` per lane (alt class `is-alt` on odd index) in plot; `renderLaneLabels(g, state)` draws `text.timeline-lane-label` in the gutter.

- [ ] Tests: counts match lanes; idempotent; exit on removal; label text matches. Fail, implement, pass, commit.

### Task 6: Bars layer with hover and select

**Files:** `layers/bars.ts`, `layers/bars.test.ts`

**Produces:** `renderBars(g, state, handlers: { onHover(id|null), onSelect(id|null) })`. One `g.timeline-bar` per item keyed by id with `rect`, `clipPath`, `text.timeline-bar-label`. Applies `is-hovered`/`is-selected` from state. Items with unknown lane skipped; `end < start` → width 0.

- [ ] Tests: x/width from scale; y from lane index; unknown lane skipped; pointerenter/leave call onHover; click calls onSelect; state classes applied. Fail, implement, pass, commit.

### Task 7: Zoom interaction

**Files:** `interaction/zoom.ts`, `interaction/zoom.test.ts`

**Produces:** `attachZoom(plot: Selection<SVGGElement,…>, opts: { getBaseScale, getWidth, getHeight, zoomExtent, onZoom(xScale) })` returning `{ setDomain(domain), destroy() }`. Uses a `rect.timeline-capture` for events.

- [ ] Tests: wheel event changes scale domain and calls onZoom; `setDomain` produces matching domain; destroy removes listeners. Fail, implement, pass, commit.

### Task 8: createTimeline orchestrator

**Files:** `create-timeline.ts`, `create-timeline.test.ts`, `index.ts`, `timeline.css`

- [ ] Builds SVG skeleton, owns state, ResizeObserver, wires layers and zoom, implements full `Timeline` API from spec. Ship `timeline.css` via package `exports`.
- [ ] Tests: update renders bars; setSelected marks class; select on empty capture clears; domainchange emitted by setDomain; destroy empties svg and later calls no-op. Fail, implement, pass, commit.

### Task 9: React package

**Files:** `packages/react/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts}`, `src/Timeline.tsx`, `src/Timeline.test.tsx`, `src/index.ts`

- [ ] `Timeline` component per spec; `vitest-browser-react` tests: renders bars, prop change updates, callbacks fire. Fail, implement, pass, commit.

### Task 10: Example playground and docs

**Files:** `examples/{package.json,index.html,vite.config.ts,src/main.tsx}`, `README.md`, `packages/*/README.md`, `CLAUDE.md`

- [ ] Vite app showing both core and react usage. READMEs in reference style. CLAUDE.md with commands and architecture. Lint, format, typecheck, test, commit.

### Task 11: Minimap

**Files:** `packages/core/src/minimap.ts`, `minimap.test.ts`, `create-timeline.ts` (+ `getData`, `getPanExtent`, `update` event), `types.ts`, `timeline.css`, `packages/react/src/TimelineMinimap.tsx`, `Timeline.tsx` (+ `onInstance`), tests, READMEs, CLAUDE.md, examples.

- [ ] Core: tests for the new instance members, then minimap tests (strip and bar counts, brush follows `setDomain`, user brush calls `setDomain`, redraw on `update`, destroy unsubscribes). Implement with d3-brush. Commit.
- [ ] React: `onInstance` test, `TimelineMinimap` render/unmount test. Implement. Commit.
- [ ] Docs and example. Lint, format, typecheck, test. Commit.

### Task 12: Geometry options and render hook

- [ ] Add `axisHeight`, `barInset`, `labelPadding`, `tickSpacing`, `tickFormat`, `onRender` to options and `ViewState`; layers read from state. Tests on `createTimeline` for each option and for hook calls per layer. Commit.
- [ ] React props pass-through, docs. Commit.
