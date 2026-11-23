import {
  Canvas2DRenderer,
  FACET_GAP_PX,
  FACET_PAD_PX,
  FACET_TITLE_PX,
  FIT_PADDING,
  axisScaleOf,
  buildGeometry,
  contains,
  drawTubeMap,
  drawTubeMapHighlight,
  drawingBounds,
  drawnMarks,
  facetCells,
  facetGrid,
  fitTransform,
  geometryFold,
  getDpr,
  graphKey,
  keyedView,
  layoutGeometryInputs,
  layoutLabels,
  nodesNotDrawn,
  PASS_BAR_HEIGHT,
  passBarTree,
  passBars,
  passLabelCandidates,
  padded,
  pathLegend,
  resolveColorScheme,
  serializeEl,
  skipAt,
  tubeMapFrame,
  viewportOf,
  walkKey,
  walkPosition,
  walkRowsExtent,
} from '@jbrowse/bandage-core'
import { abridgedText } from '@jbrowse/graph-walks'

import {
  drawnHalos,
  inkOf,
  labelledLengths,
  memo,
  rampInterval,
} from './derived'
import { edgeHtml, layoutName, nodeHtml, nodeText, rowHtml } from './describe'
import { svgDom } from './elDom'
import { rowLink } from './jbrowse'
import {
  esc,
  graphKeyHtml,
  legendsHtml,
  overlayHtml,
  overlaySvg,
  unlabelledCount,
  walkKeyHtml,
  walkRowsLayer,
} from './overlays'
import {
  referenceAssembly,
  referenceName,
  referenceWindow,
  targetOf,
} from './reference'
import { linkWidthOf } from './settings'
import { expandWalks } from './sources'
import {
  abridged as abridgedWalks,
  axis,
  current,
  drawPaths,
  drawnMode,
  facts,
  layoutFit,
  pixelRows,
  settings,
  smallSites,
  state,
  stripRows,
  tube,
  walks,
} from './state'
import { eventElement, ui } from './ui'

import type { Region } from './jbrowse'
import type { Pane } from './overlays'
import type { Facet } from './settings'
import type {
  Bounds,
  FacetGrid,
  Graph,
  LayoutResult,
  LiftedWalk,
  MinigraphBubble,
  PaneTransform,
  UnlabelledPlaceholders,
  WalkLift,
  WalkRows,
} from '@jbrowse/bandage-core'

const CONNECTOR_THICKNESS = 2
const HOVER_BRIGHTEN = 1.4
const SELECT_BRIGHTEN = 1.6
const REBUILD_DEBOUNCE_MS = 150

type Batch = Parameters<Canvas2DRenderer['uploadGeometry']>[0]

const renderer = new Canvas2DRenderer(ui.canvas)
const hoverRenderer = new Canvas2DRenderer(ui.hover)

const EMPTY_BATCH: Batch = {
  nodeStrokes: [],
  nodeStrokeRuns: new Map(),
  arrows: [],
  arrowRuns: new Map(),
  edgeCurves: [],
  edgeCurveRuns: new Map(),
}

const afterDraw: (() => void)[] = []

// `fn` runs after every frame, for what reads the state but isn't drawn here
export function onDraw(fn: () => void) {
  afterDraw.push(fn)
}

// `widthPx` is the room right of the row labels the bars and their readouts
// fit in
function measure(
  layout: LayoutResult | undefined,
  region: Region | undefined,
  bars: WalkRows | undefined,
  widthPx: number,
) {
  return layout
    ? drawingBounds(layout, {
        region,
        extent:
          bars && layout.extent
            ? walkRowsExtent(bars, undefined, { widthPx })
            : undefined,
      })
    : undefined
}

const laidOutOf = memo(measure)
const boundsOf = memo(
  (
    layout: LayoutResult | undefined,
    region: Region | undefined,
    bars: WalkRows | undefined,
    widthPx: number,
    _positionsVersion: number,
  ) => measure(layout, region, bars, widthPx),
)

const boundsKeys = () =>
  [
    state.layout,
    state.stack.length === 0 ? state.region : undefined,
    current().bars,
    layoutFit().width - labelGutterOf(current().rowLabels) - FIT_PADDING,
  ] as const

// The drawing as dragged, which the fit frames
function bounds() {
  return boundsOf(...boundsKeys(), state.positionsVersion)
}

// Bounds that hold still through a drag, so the facet panels don't re-tile
// under the pointer
function laidOutBounds() {
  return laidOutOf(...boundsKeys())
}

const placementOf = memo((panels: WalkLift[] | undefined, facet: Facet) =>
  panels && facet
    ? facetCells(
        panels.map(p => p.walks[0]!.name),
        facet,
      )
    : undefined,
)

// Which grid cell each facet panel takes; see facetCells
function placement() {
  return placementOf(walks().panels, settings.facet)
}

// The faceted pane's one key line under its panels, a gap and a line of text
const FACET_KEY_PX = FACET_GAP_PX + 18

const gridOf = memo(
  (
    place: ReturnType<typeof placement>,
    b: ReturnType<typeof bounds>,
    rows: boolean,
    width: number,
    height: number,
    columns: number,
  ) =>
    place && b && b.w > 0
      ? facetGrid({
          count: place.count,
          bounds: b,
          pixelRows: rows,
          width,
          room: height - FACET_KEY_PX,
          columns: place.columns ?? (columns || undefined),
        })
      : undefined,
)

// How the facet panels tile the pane while lifted walks are side by side
export function grid() {
  return gridOf(
    placement(),
    laidOutBounds(),
    pixelRows(),
    state.width,
    state.height,
    settings.facetColumns,
  )
}

// What the transform maps the drawing into: one facet panel while faceted,
// since every panel shares it, else the pane
export function viewBox() {
  const g = grid()
  return g
    ? { width: g.width, height: g.height }
    : { width: state.width, height: state.height }
}

// .row-label's left offset and padding, and a gap before the drawing
const ROW_LABEL_CHROME_PX = 6 + 8 + 6

// Room on the left for the widest row label, which stays put as the drawing
// pans, so a fitted drawing starts clear of them
const labelGutterOf = memo((labels: { label: string }[]) => {
  if (labels.length === 0) {
    return FIT_PADDING
  }
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.font = `11px ${getComputedStyle(ui.html).fontFamily}`
  const widest = labels.reduce(
    (w, l) => Math.max(w, ctx.measureText(l.label).width),
    0,
  )
  return Math.max(FIT_PADDING, Math.ceil(widest) + ROW_LABEL_CHROME_PX)
})

export function fitted() {
  const b = bounds()
  const g = grid()
  const room = layoutFit()
  return !b
    ? undefined
    : g
      ? fitTransform(b, g.width, g.height, pixelRows(), {
          padLeft: FACET_PAD_PX,
          padTop: FACET_PAD_PX,
          padRight: FACET_PAD_PX,
          padBottom: FACET_PAD_PX,
        })
      : fitTransform(b, room.width, room.height, pixelRows(), {
          padLeft: labelGutterOf(current().rowLabels),
        })
}

export function fit() {
  const t = fitted()
  if (t) {
    state.scale = t.scale
    state.translateX = t.translateX
    state.translateY = t.translateY
  }
}

export function fitView() {
  state.owner = 'fit'
  fit()
  rebuild()
}

const viewport = () => {
  const { width, height } = viewBox()
  return viewportOf(state, axis(), width, height)
}

const sameBounds = (a: Bounds, b: Bounds) =>
  a.minX === b.minX &&
  a.minY === b.minY &&
  a.maxX === b.maxX &&
  a.maxY === b.maxY

// The view the key keys, set REBUILD_DEBOUNCE_MS after the pane's view last
// moved, on the layout it was set on, so the key, and the labels and fit that
// wait on its size, hold still through a pan or zoom. Until one is set on the
// layout drawn, the pane's view as it is, under the key included.
let liveKeyView: Bounds | undefined
let settledKeyView:
  | { view: Bounds; layout: LayoutResult | undefined }
  | undefined
let keyViewTimer: ReturnType<typeof setTimeout> | undefined

function keyView() {
  const live = keyedView(state, axis(), {
    paneWidth: state.width,
    canvasHeight: state.height,
  })
  if (!liveKeyView || !sameBounds(liveKeyView, live)) {
    liveKeyView = live
    clearTimeout(keyViewTimer)
    keyViewTimer = setTimeout(() => {
      settledKeyView = { view: live, layout: state.layout }
      scheduleDraw()
    }, REBUILD_DEBOUNCE_MS)
  }
  return settledKeyView && settledKeyView.layout === state.layout
    ? settledKeyView.view
    : live
}

interface FacetPanel {
  lift: WalkLift
  renderer: Canvas2DRenderer
  hover: Canvas2DRenderer
  batch: Batch
}

let facets: FacetPanel[] = []
// what the pane's canvas holds, which the hover layer lights over it
let paneBatch = EMPTY_BATCH
let shown: { panels?: WalkLift[]; grid?: FacetGrid } = {}
const surfaceHooks: ((canvas: HTMLCanvasElement) => void)[] = []

// `fn` runs on each canvas drawing the pane's transform: the pane's own, and
// every facet panel's as it is made
export function onSurface(fn: (canvas: HTMLCanvasElement) => void) {
  surfaceHooks.push(fn)
  fn(ui.canvas)
}

// Puts up the panels the lifted walks call for, each titled by its walk's key.
// Says whether the pane went from one drawing to panels or back, which fits
// the drawing again, or only the panels changed.
function syncFacets() {
  const { panels } = walks()
  const g = grid()
  if (panels === shown.panels && g === shown.grid) {
    return undefined
  }
  const flipped = (shown.grid !== undefined) !== (g !== undefined)
  const change = flipped ? 'flipped' : 'changed'
  shown = { panels, grid: g }
  facets.forEach(f => {
    f.renderer.dispose()
    f.hover.dispose()
  })
  facets = []
  ui.facets.hidden = !g
  ui.pane.classList.toggle('faceted', !!g)
  if (!panels || !g) {
    ui.facets.replaceChildren()
    return change
  }
  const labels = facts().walkLabels
  const reference = walkReference(panels[0])
  const cells = placement()!.cells
  ui.facets.style.gap = `${FACET_GAP_PX}px`
  ui.facets.style.gridTemplateColumns = `repeat(${g.columns}, ${g.width}px)`
  ui.facets.innerHTML = panels
    .map((lift, i) => {
      const walk = lift.walks[0]!
      const label = labels.get(walk.name) ?? walk.name
      const row = Math.floor(cells[i]! / g.columns) + 1
      const column = (cells[i]! % g.columns) + 1
      return `<div class="facet" style="grid-row:${row};grid-column:${column}"><button type="button" class="facet-title" style="height:${FACET_TITLE_PX}px" data-walk="${esc(walk.name)}">${walkKeyHtml(
        walk,
        label,
        reference,
        `click to highlight ${label} alone`,
      )}</button><div class="facet-canvas"><canvas class="facet-drawing"></canvas><canvas class="facet-hover"></canvas></div></div>`
    })
    .join('')
    .concat(
      `<div class="facet-key" style="grid-row:${Math.floor(cells.reduce((a, b) => Math.max(a, b), 0) / g.columns) + 2};grid-column:1 / -1"></div>`,
    )
  facets = [...ui.facets.querySelectorAll('.facet-canvas')].map((cell, i) => {
    const canvas = cell.querySelector<HTMLCanvasElement>('.facet-drawing')!
    surfaceHooks.forEach(fn => {
      fn(canvas)
    })
    return {
      lift: panels[i]!,
      renderer: new Canvas2DRenderer(canvas),
      hover: new Canvas2DRenderer(
        cell.querySelector<HTMLCanvasElement>('.facet-hover')!,
      ),
      batch: EMPTY_BATCH,
    }
  })
  return change
}

// Where the hovered node sits on a walk, for the walk's key
function hoveredOn(walk: LiftedWalk) {
  const node = state.hoveredNode
    ? facts().nodeById.get(state.hoveredNode)
    : undefined
  return node
    ? (walkPosition(walk, node.id, node.length) ?? 'not on this walk')
    : undefined
}

const FACET_KEY_SECTIONS = new Set(['walks', 'skips', 'too-small'])

// The faceted pane's key line: what every panel greys, the skips, and what
// the panels leave undrawn, each panel's title keying its own walk. Read off
// the panels' batches, so only a rebuild changes it.
const facetKeyOf = memo(
  (graph: Graph, layout: LayoutResult, panels: WalkLift[], _uploads: number) =>
    graphKeyHtml(
      graphKey(graph, layout, {
        region: state.region,
        referenceName: referenceName() ?? referenceAssembly(),
        panels,
        walkLabel: name => facts().walkLabels.get(name) ?? name,
        marks: drawnMarks(facets.map(f => f.batch)),
      }).filter(section => FACET_KEY_SECTIONS.has(section.id)),
      () => undefined,
    ),
)

function drawFacetKey(panels: WalkLift[]) {
  const { graph, layout } = state
  const key = ui.facets.querySelector('.facet-key')
  if (key && graph && layout) {
    setHtml(key, facetKeyOf(graph, layout, panels, uploads))
  }
}

// The panels' titles are built once per set of panels, so the hover's line
// under each is written in place
function drawFacetTitles() {
  const { panels } = shown
  if (!panels || facets.length === 0) {
    return
  }
  drawFacetKey(panels)
  const reference = walkReference(panels[0])
  ui.facets.querySelectorAll('.facet-title .walk-at').forEach((line, i) => {
    const walk = panels[i]!.walks[0]!
    line.textContent = hoveredOn(walk) ?? walkKey(walk, reference).scale ?? ''
  })
}

// The window a lane coloured by reference position spans, by name
function walkReference(lift: WalkLift | undefined) {
  const domain = lift?.referenceDomain
  return domain && { ...domain, name: referenceName() }
}

// What the drawing is built from, over `viewportBounds` at the scale as it is
function buildOptions(
  graph: Graph,
  layout: LayoutResult,
  viewportBounds: Bounds,
  highlight: WalkLift | undefined,
  paths: boolean,
) {
  const d = current()
  return {
    // walk rows draw every row, the reference's too, as an overlay
    ...layoutGeometryInputs(layout, d.drawing, { drawsRows: !!d.bars }),
    graph,
    nodeById: facts().nodeById,
    colorScheme: resolveColorScheme(settings.colorScheme, graph),
    contigThickness: settings.nodeThickness,
    connectorThickness: CONNECTOR_THICKNESS,
    drawPaths: paths,
    nodeWidth: settings.nodeWidth,
    edgeWidth: linkWidthOf(settings),
    highlight,
    axis: axis(),
    viewportBounds,
    referenceRamp: d.ramp,
    version: state.positionsVersion,
    smallSites: smallSites(),
  }
}

export function rebuild() {
  const { graph, layout } = state
  renderer.resize(state.width, state.height)
  const change = syncFacets()
  if (change === 'flipped') {
    state.owner = 'fit'
  }
  if (change && state.owner === 'fit') {
    fit()
  }
  if (!graph || !layout || layout.tubeMap) {
    uploadPane(EMPTY_BATCH)
    state.built = undefined
    draw()
    return
  }
  const start = performance.now()
  const viewportBounds = padded(viewport(), 1)
  const build = (highlight: WalkLift | undefined, paths: boolean) =>
    buildGeometry(buildOptions(graph, layout, viewportBounds, highlight, paths))
  const g = grid()
  uploadPane(g ? EMPTY_BATCH : build(walks().lift, drawPaths()))
  for (const f of facets) {
    f.renderer.resize(g!.width, g!.height)
    f.hover.resize(g!.width, g!.height)
    f.batch = build(f.lift, false)
    f.renderer.uploadGeometry(f.batch)
  }
  state.geometryMs = performance.now() - start
  performance.mark('geometry')
  state.built = { scale: state.scale, bounds: viewportBounds }
  draw()
}

// What the drawing on the canvas folded as too small to draw: the pane's,
// or while side by side the first panel's, since every panel folds alike
export function drawnFold() {
  return paneBatch.collapsed ?? facets[0]?.batch.collapsed
}

// how wide the drawing on the canvas draws each node, which the hit test
// and every mark round a node reach
export function drawnInk() {
  return inkOf(
    state.graph,
    settings.nodeWidth,
    settings.nodeThickness,
    drawnFold()?.through,
  )
}

function uploadPane(batch: Batch) {
  paneBatch = batch
  renderer.uploadGeometry(batch)
  uploads++
}

let rebuildTimer: ReturnType<typeof setTimeout> | undefined

export function viewportMoved() {
  const built = state.built
  if (
    !tube() &&
    (!built ||
      built.scale !== state.scale ||
      !contains(built.bounds, viewport()))
  ) {
    clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(rebuild, REBUILD_DEBOUNCE_MS)
  }
  scheduleDraw()
}

function perFrame(fn: () => void) {
  let frame = 0
  return () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0
      fn()
    })
  }
}

export const scheduleDraw = perFrame(draw)
export const scheduleRebuild = perFrame(rebuild)

// Markup is rebuilt per frame but rarely changes; reparsing it anyway would
// drop the focus on a bubble chip and a click landing on the info box's link.
const shownHtml = new WeakMap<Element, string>()

function setHtml(el: Element, html: string) {
  if (shownHtml.get(el) === html) {
    return false
  }
  shownHtml.set(el, html)
  el.innerHTML = html
  return true
}

export function tubeFrame(t: PaneTransform = state) {
  const drawing = tube()
  const { scaleX, scaleY } = axisScaleOf(t.scale, pixelRows())
  return drawing
    ? tubeMapFrame(drawing, {
        scaleX,
        translateX: t.translateX,
        scaleY,
        translateY: t.translateY,
        usableHeight: state.height - FIT_PADDING * 2,
      })
    : undefined
}

function drawTube() {
  const { picture } = current()
  const frame = tubeFrame()
  ui.tube.hidden = !picture
  if (!picture || !frame) {
    return
  }
  const dpr = getDpr()
  const width = Math.round(state.width * dpr)
  const height = Math.round(state.height * dpr)
  if (ui.tube.width !== width || ui.tube.height !== height) {
    ui.tube.width = width
    ui.tube.height = height
    ui.tube.style.width = `${state.width}px`
    ui.tube.style.height = `${state.height}px`
  }
  const ctx = ui.tube.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, state.width, state.height)
  drawTubeMap(ctx, picture, {
    ...frame,
    width: state.width,
    highlightNode: state.selectedNode,
  })
}

function paneTransform() {
  const dpr = getDpr()
  const { scaleX, scaleY } = axis()
  return {
    scaleX: scaleX * dpr,
    scaleY: scaleY * dpr,
    translateX: state.translateX * dpr,
    translateY: state.translateY * dpr,
    dpr,
  }
}

let uploads = 0
let paintedBase: unknown[] = []

// The drawing and the tube map with the selection, repainted only when what
// they show changes, so a hover alone costs drawHover's layer and no more
function drawBase() {
  const base = [
    uploads,
    current().picture,
    state.scale,
    state.translateX,
    state.translateY,
    state.width,
    state.height,
    getDpr(),
    state.selectedNode,
  ]
  if (base.every((v, i) => Object.is(v, paintedBase[i]))) {
    return
  }
  paintedBase = base
  const id = state.selectedNode
  const selection = new Map(id === null ? [] : [[id, SELECT_BRIGHTEN]])
  const transform = paneTransform()
  for (const r of [renderer, ...facets.map(f => f.renderer)]) {
    r.setNodeHighlights(selection)
    r.updateTransform(transform)
    r.render([1, 1, 1, 1])
  }
  drawTube()
}

function paintHover(r: Canvas2DRenderer, batch: Batch, lit: string | null) {
  r.uploadGeometry(batch)
  r.setNodeHighlights(new Map(lit === null ? [] : [[lit, HOVER_BRIGHTEN]]))
  r.setEdgeHighlight(state.hoveredEdge, HOVER_BRIGHTEN)
  r.updateTransform(paneTransform())
  r.renderHighlights()
}

// The hover alone, on transparent canvases over the drawing and each panel
function drawHover() {
  const lit =
    state.hoveredNode === state.selectedNode ? null : state.hoveredNode
  hoverRenderer.resize(state.width, state.height)
  const { picture } = current()
  const frame = tubeFrame()
  if (picture && frame) {
    const { ctx } = hoverRenderer
    const dpr = getDpr()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ui.hover.width, ui.hover.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawTubeMapHighlight(ctx, picture, {
      ...frame,
      width: state.width,
      highlightNode: lit,
    })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  } else {
    paintHover(hoverRenderer, paneBatch, lit)
  }
  for (const f of facets) {
    paintHover(f.hover, f.batch, lit)
  }
}

// Each walk lifted by pass along its own length, under a drawing of nodes
// on one canvas, as bandage-core's figure stacks it, but for a walk whose row
// the strip draws
function drawPassBars() {
  const { lift } = walks()
  const bars =
    facets.length === 0 && state.layout && !tube() && !current().bars
      ? passBars(lift, stripRows())
      : []
  ui.passBars.hidden = bars.length === 0
  setHtml(
    ui.passBars,
    bars
      .map(
        bar =>
          `<svg width="${state.width}" height="${PASS_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${serializeEl(
            passBarTree(
              bar,
              facts().walkLabels.get(bar.walk) ?? bar.walk,
              state.width,
            ),
          )}</svg>`,
      )
      .join(''),
  )
}

function draw() {
  drawBase()
  drawHover()
  drawOverlays()
  drawPassBars()
  drawFacetTitles()
  drawInfo()
  drawStats()
  afterDraw.forEach(fn => {
    fn()
  })
}

// The selected node, and a node its details name under the pointer, which the
// overlay rings, unless the drawing folded it
function ringsOf(
  layout: LayoutResult | undefined,
  halfWidthPx: (id: string) => number,
) {
  const fromDetails =
    !state.pointer && !state.stripHover ? state.hoveredNode : null
  const folded = drawnFold()?.nodes
  return [
    ...(state.selectedNode ? [{ id: state.selectedNode, strong: true }] : []),
    ...(fromDetails && fromDetails !== state.selectedNode
      ? [{ id: fromDetails, strong: false }]
      : []),
  ].flatMap(({ id, strong }) => {
    const segments = folded?.has(id) ? undefined : layout?.nodePositions[id]
    return segments?.length
      ? [
          {
            d: `M${segments.map(s => `${s.x} ${s.y}`).join('L')}`,
            halfWidthPx: halfWidthPx(id),
            strong,
          },
        ]
      : []
  })
}

let overlayBubbles: MinigraphBubble[] = []

// The bubble whose chip `target` is in, if any
export function bubbleAt(target: EventTarget | null) {
  const halo =
    target instanceof Element
      ? target.closest('[data-halo]')?.getAttribute('data-halo')
      : undefined
  return halo != null ? overlayBubbles[Number(halo)] : undefined
}

// Walk rows run to thousands of SVG elements, too many to build every frame.
// A pan or zoom moves the rows last built instead, which reach half a pane
// past its top and bottom, and builds them again once the view rests, or
// sooner where it has strayed too far.
const ROWS_MARGIN = 0.5
const MAX_ROWS_STRETCH = 1.5

interface RowsTransform {
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
}

// the rows' inputs and the transform they were built under, which brings the
// margin above the pane into view
let rowsBuilt: { inputs: unknown[]; t: RowsTransform } | undefined
let rowsTimer: ReturnType<typeof setTimeout> | undefined

const stretched = (k: number) =>
  k > MAX_ROWS_STRETCH || k < 1 / MAX_ROWS_STRETCH

function drawWalkRows(p: Pane | undefined) {
  if (!p) {
    clearTimeout(rowsTimer)
    rowsBuilt = undefined
    ui.walkRows.replaceChildren()
    ui.walkRows.removeAttribute('transform')
    return
  }
  const margin = p.height * ROWS_MARGIN
  const want: RowsTransform = {
    scaleX: p.scaleX,
    scaleY: p.scaleY,
    translateX: p.translateX,
    translateY: p.translateY + margin,
  }
  const inputs = [
    p.walkBars,
    p.walkRamp?.start,
    p.walkRamp?.end,
    p.rowGenes,
    p.width,
    p.height,
  ]
  const built = rowsBuilt
  if (
    !built ||
    inputs.some((v, i) => v !== built.inputs[i]) ||
    stretched(want.scaleX / built.t.scaleX) ||
    stretched(want.scaleY / built.t.scaleY) ||
    Math.abs(want.translateY - built.t.translateY) > margin
  ) {
    const rows = walkRowsLayer({ ...p, ...want, height: p.height + 2 * margin })
    ui.walkRows.replaceChildren(...(rows ? [svgDom(rows)] : []))
    rowsBuilt = { inputs, t: want }
  }
  const { t } = rowsBuilt!
  const kx = want.scaleX / t.scaleX
  const ky = want.scaleY / t.scaleY
  const transform = `translate(${p.translateX - t.translateX * kx} ${p.translateY - t.translateY * ky}) scale(${kx} ${ky})`
  if (ui.walkRows.getAttribute('transform') !== transform) {
    ui.walkRows.setAttribute('transform', transform)
    clearTimeout(rowsTimer)
    const resting =
      kx === 1 &&
      ky === 1 &&
      want.translateX === t.translateX &&
      want.translateY === t.translateY
    if (!resting) {
      rowsTimer = setTimeout(() => {
        rowsBuilt = undefined
        scheduleDraw()
      }, REBUILD_DEBOUNCE_MS)
    }
  }
}

// The key over `batch`'s marks
function legendsOf(
  layout: LayoutResult | undefined,
  halos: ReturnType<typeof drawnHalos>,
  unlabelled: UnlabelledPlaceholders | undefined,
  batch: KeyedBatch,
) {
  const { graph } = state
  const f = facts()
  const d = current()
  const { lift } = walks()
  const labelsNodeSizes = !layout?.tubeMap && !lift
  return layout && graph
    ? legendsHtml({
        key: graphKey(graph, layout, {
          region: state.region,
          referenceName: referenceName() ?? referenceAssembly(),
          referenceRamp: d.ramp,
          lift,
          walkLabel: name => f.walkLabels.get(name) ?? name,
          nodeWidth: settings.nodeWidth,
          edgeWidth: linkWidthOf(settings),
          contigThickness: settings.nodeThickness,
          connectorThickness: CONNECTOR_THICKNESS,
          drawsNodes: !d.bars && !layout.tubeMap,
          marks: drawnMarks([batch], keyView()),
          genePins: d.genePins,
          genesFrom: state.genesFrom,
          halos,
          unlabelled: labelsNodeSizes ? 'reserved' : undefined,
        }),
        unlabelled: labelsNodeSizes
          ? unlabelledCount(unlabelled, f.placeholders)
          : undefined,
        at: hoveredOn,
        paths: drawPaths() && graph.paths ? pathLegend(graph.paths) : [],
        walkBars: d.bars,
        rowGenes: d.rowGenes?.size ? state.walkGeneNote : undefined,
        walkRamp: d.bars ? rampInterval(d.ramp) : undefined,
      })
    : ''
}

// Writes the key and measures it, true when it changed
function showLegends(html: string) {
  const changed = setHtml(ui.legends, html)
  if (changed) {
    state.legendSize = {
      width: ui.legends.offsetWidth,
      height: ui.legends.offsetHeight,
    }
  }
  return changed
}

type KeyedBatch = Parameters<typeof drawnMarks>[0][number]

// how often a new layout's fit is made again for a key whose column moved
const KEY_FITS = 3

// Fits a new layout beside the key it will draw. The key names what the
// build folds at the fit's scale and its column moves the fit, so it is
// written from that fold alone and the fit made again until the column
// holds: the drawing is then built once, at the scale its key was measured at
export function fitBesideKey() {
  const { graph, layout } = state
  fit()
  if (graph && layout && !layout.tubeMap && facets.length === 0) {
    let moved = true
    for (let tries = 0; moved && tries < KEY_FITS; tries++) {
      const column = layoutFit().width
      const collapsed = geometryFold(
        buildOptions(
          graph,
          layout,
          padded(viewport(), 1),
          walks().lift,
          drawPaths(),
        ),
      )
      const halos = drawnHalos(
        current().halos,
        graph,
        layout.nodePositions,
        state.positionsVersion,
        collapsed,
      )
      showLegends(
        legendsOf(layout, halos, undefined, {
          edgeCurves: [],
          nodeStrokes: [],
          collapsed,
        }),
      )
      moved = layoutFit().width !== column
      if (moved) {
        fit()
      }
    }
  }
}

function drawOverlays() {
  const { graph } = state
  // faceted, each panel's title is its walk's key and nothing else is drawn
  const layout = facets.length > 0 ? undefined : state.layout
  const f = facts()
  const d = current()
  const { lift } = walks()
  const { scaleX, scaleY } = axis()
  const back = state.stack.at(-1)
  const backLabel = back && `◀ Back to ${back.graph.name}`
  const ink = drawnInk()
  const halos = drawnHalos(
    d.halos,
    graph,
    layout?.nodePositions,
    state.positionsVersion,
    drawnFold(),
  )
  const ramp = rampInterval(d.ramp)
  const walkRamp = d.bars ? ramp : undefined
  const labelsNodeSizes = !layout?.tubeMap && !lift
  const labels = layoutLabels({
    graph,
    drawnInk: paneBatch,
    paneWidth: state.width,
    canvasHeight: state.height,
    axisScale: axis(),
    translateX: state.translateX,
    translateY: state.translateY,
    contigThickness: settings.nodeThickness,
    legendSize: state.legendSize,
    drawnRowLabels: d.rowLabels,
    bubbleHalos: halos,
    genePins: d.genePins,
    liftedWalks: lift?.walks.map(w => w.name),
    poppedFrom: backLabel ? { label: backLabel } : undefined,
    nodePositions: layout?.nodePositions,
    labelsNodeSizes,
    nodeLengths: labelledLengths(graph, settings.nodeLengthLabels),
    nodeById: f.nodeById,
    alleleDeletions: layout?.alleleDeletions ?? [],
    positionsVersion: state.positionsVersion,
    passLabels:
      layout && lift?.walks.some(walk => walk.walkPasses)
        ? passLabelCandidates(
            paneBatch,
            lift,
            {
              scaleX,
              scaleY,
              translateX: state.translateX,
              translateY: state.translateY,
            },
            { width: state.width, height: state.height },
          )
        : [],
    folded: drawnFold()?.nodes,
  })
  const pane = {
    width: state.width,
    height: state.height,
    scaleX,
    scaleY,
    translateX: state.translateX,
    translateY: state.translateY,
    contigThickness: settings.nodeThickness,
    halos,
    genePins: d.genePins,
    halfWidthPx: ink.halfWidthPx,
    notDrawn: nodesNotDrawn(paneBatch),
    rings: d.bars ? [] : ringsOf(layout, ink.halfWidthPx),
    labels,
    rowLabels: d.rowLabels,
    walkBars: d.bars,
    rowGenes: d.rowGenes,
    walkRamp,
    regionEnd: state.region?.end,
    highlight: lift,
  }
  ui.svg.setAttribute('width', String(state.width))
  ui.svg.setAttribute('height', String(state.height))
  setHtml(ui.marks, layout ? overlaySvg(pane) : '')
  drawWalkRows(layout && pane.walkBars ? pane : undefined)
  setHtml(ui.html, layout ? overlayHtml(pane) : '')
  overlayBubbles = halos.map(h => h.bubble)

  const column = layoutFit().width
  if (showLegends(legendsOf(layout, halos, labels.unlabelled, paneBatch))) {
    if (state.owner === 'fit' && layoutFit().width !== column) {
      fit()
      rebuild()
    } else {
      scheduleDraw()
    }
  }
  ui.back.hidden = !backLabel
  ui.back.textContent = backLabel ?? ''
  // the hint teaches the bubble chips only while they are on screen
  ui.hint.classList.toggle('no-bubbles', !settings.showBubbles)
}

const shownGenes = () => (settings.showGenes ? state.genes : undefined)

const INFO_OFFSET_PX = 14

// The hover's box beside the pointer over the drawing, turned back from the
// pane's edges; elsewhere in the corner
export function placeInfo() {
  const at = ui.info.classList.contains('interactive')
    ? undefined
    : state.pointer
  const s = ui.info.style
  if (!at) {
    s.left = s.top = s.right = s.bottom = ''
    return
  }
  const w = ui.info.offsetWidth
  const h = ui.info.offsetHeight
  // the open details bound the pane at their left, or on a phone their top
  const beside = !ui.details.hidden && ui.details.offsetLeft > state.width / 2
  const below = !ui.details.hidden && !beside
  const right = beside ? ui.details.offsetLeft : state.width
  const bottom = below ? ui.details.offsetTop : state.height
  const x =
    at.x + INFO_OFFSET_PX + w > right
      ? at.x - INFO_OFFSET_PX - w
      : at.x + INFO_OFFSET_PX
  const y =
    at.y + INFO_OFFSET_PX + h > bottom
      ? at.y - INFO_OFFSET_PX - h
      : at.y + INFO_OFFSET_PX
  s.left = `${Math.max(0, x)}px`
  s.top = `${Math.max(0, y)}px`
  s.right = s.bottom = 'auto'
}

// The hover, else the selected walk row with where to open it; the selected
// node's details are a panel of their own. Only the selection goes to the
// live region, so a screen reader doesn't read out every hover.
function drawInfo() {
  const f = facts()
  const hovered = state.hoveredNode
    ? f.nodeById.get(state.hoveredNode)
    : undefined
  const edge =
    state.hoveredEdge !== null
      ? state.graph?.edges[state.hoveredEdge]
      : undefined
  const selected = state.selectedNode
    ? f.nodeById.get(state.selectedNode)
    : undefined
  const bars = current().bars ?? stripRows()
  const selectedRow = bars
    ? [bars.reference, ...bars.rows].find(r => r.name === state.selectedRow)
    : undefined
  let html = ''
  let interactive = false
  if (hovered && (state.pointer || state.stripHover)) {
    html = nodeHtml(hovered, shownGenes())
  } else if (edge && state.graph && state.hoveredEdge !== null) {
    html = edgeHtml(
      edge,
      skipAt(
        state.graph,
        state.hoveredEdge,
        current().deletions,
        state.layout?.deletionRoutes,
      ),
      id => f.nodeById.get(id)?.name ?? id,
      referenceName() ?? referenceAssembly(),
    )
  } else if (selectedRow) {
    const ref = referenceWindow()
    const isReference = selectedRow === bars?.reference
    const link =
      ref && rowLink(selectedRow, isReference, targetOf(ref), ref.contigs)
    const abridged = abridgedWalks().get(selectedRow.name)
    html = `${rowHtml(selectedRow, bars?.reference)}${
      abridged
        ? `<br>${esc(abridgedText(abridged, f.walkLabels.get(abridged.name)))}`
        : ''
    }<div class="info-actions">${
      link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener">Show in JBrowse ↗</a>`
        : ''
    }${
      abridged
        ? '<button type="button" data-expand>Load its steps</button>'
        : ''
    }<button type="button" data-close aria-label="Deselect">✕</button></div>`
    interactive = true
  }
  setHtml(ui.info, html)
  ui.info.hidden = html === ''
  ui.info.classList.toggle('interactive', interactive)
  placeInfo()
  const said = selected
    ? `Selected ${nodeText(selected)}`
    : selectedRow
      ? `Selected ${selectedRow.label}`
      : ''
  if (ui.announce.textContent !== said) {
    ui.announce.textContent = said
  }
}

ui.info.addEventListener('click', e => {
  const target = eventElement(e)
  if (target?.closest('[data-expand]') && state.selectedRow) {
    expandWalks([state.selectedRow])
  } else if (target?.closest('[data-close]')) {
    state.selectedNode = null
    state.selectedRow = null
    scheduleDraw()
  }
})

function drawStats() {
  const g = state.graph
  const counts = g
    ? [
        `${g.nodes.length.toLocaleString()} nodes`,
        `${g.edges.length.toLocaleString()} edges`,
        ...(g.paths?.length
          ? [`${g.paths.length.toLocaleString()} paths`]
          : []),
        layoutName(drawnMode().label),
      ]
    : []
  const timings = [
    ...(state.layoutMs !== undefined
      ? [`layout ${state.layoutMs.toFixed(0)} ms`]
      : []),
    ...(state.geometryMs !== undefined
      ? [`geometry ${state.geometryMs.toFixed(0)} ms`]
      : []),
  ]
  ui.stats.textContent = counts.join(' · ')
  ui.stats.title = timings.join(' · ')
}

export function showCaption() {
  const graph = state.graph
  const src = state.source
  ui.caption.hidden = !graph
  if (graph) {
    ui.caption.innerHTML = `<strong>${esc(graph.name)}</strong>${
      src?.description && graph.name === src.name
        ? `<span>${esc(src.description)}</span>`
        : ''
    }`
  }
}

new ResizeObserver(() => {
  state.width = ui.pane.clientWidth
  state.height = ui.pane.clientHeight
  if (state.owner === 'fit') {
    fit()
  }
  rebuild()
}).observe(ui.pane)
