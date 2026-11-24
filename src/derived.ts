import {
  LAYOUT_MODES,
  RAMP_GRADIENT_CSS,
  bubbleHalos,
  graphBubbles,
  computeReferenceRamp,
  deletionDrawing,
  deletionEdges,
  facetLifts,
  genePins,
  genesOnRow,
  labelledNodeLengths,
  liftedRowInks,
  nodeInk,
  pathLegend,
  resolveColorScheme,
  tubeMapPicture,
  walkLabelsOf,
  walkLift,
  walkRowLabels,
  walkRows,
  walkRowsKey,
  walkRowsTree,
  placeRowGenes,
} from '@jbrowse/bandage-core'
import { abridgedWalks } from '@jbrowse/graph-walks'

import type { Region } from './jbrowse'
import type { Facet } from './settings'
import type {
  BubbleHalo,
  ColorScheme,
  DeletionDrawing,
  Fold,
  GeneGaps,
  GeneModel,
  Graph,
  GraphNode,
  GraphTables,
  KeyEntry,
  LayoutResult,
  MinigraphBubble,
  NodeSegment,
  NodeWidth,
  RowGene,
  RowInk,
  StripFrame,
  WalkLayer,
  WalkRows,
} from '@jbrowse/bandage-core'
import type { AbridgedWalk } from '@jbrowse/graph-walks'

// The last value of `fn`, recomputed when any of `keys` changes identity.
export function memo<K extends unknown[], T>(fn: (...keys: K) => T) {
  let last: { keys: K; value: T } | undefined
  return (...keys: K) => {
    if (!last || keys.some((k, i) => k !== last!.keys[i])) {
      last = { keys, value: fn(...keys) }
    }
    return last.value
  }
}

// whether depth says anything here: a file with no depth reads 1 everywhere
export const depthVaries = memo(
  (graph: Graph) => new Set(graph.nodes.map(n => n.depth)).size > 1,
)

export const abridgedOf = memo((gfa: string | GraphTables | undefined) =>
  typeof gfa === 'object'
    ? new Map(abridgedWalks(gfa).map(walk => [walk.name, walk]))
    : new Map<string, AbridgedWalk>(),
)

// The notice for lifted walks a cut left abridged, by their labels
export function tooLargeText(labels: string[]) {
  const several = labels.length > 1
  const names = several
    ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)} are`
    : `${labels[0]} is`
  return `${names} too large to read in full here${several ? ' together' : ''}, so ${several ? 'they are' : 'it is'} drawn abridged`
}

export const graphFacts = memo((graph: Graph | undefined) => {
  const deletions = graph ? deletionEdges(graph) : []
  const walkChoices = graph?.paths?.length ? pathLegend(graph.paths) : []
  return {
    nodeById: new Map<string, GraphNode>(graph?.nodes.map(n => [n.id, n])),
    allDeletions: deletions,
    walkChoices,
    walkLabels: walkLabelsOf(walkChoices),
    placeholders: graph?.nodes.filter(n => n.placeholder).length ?? 0,
    drawable: new Set<string>(
      graph
        ? LAYOUT_MODES.filter(m => m.available(graph)).map(m => m.value)
        : [],
    ),
  }
})

export const labelledLengths = memo((graph: Graph | undefined, on: boolean) =>
  labelledNodeLengths(graph?.nodes ?? [], on),
)

// The bubbles of the graph on screen, `span` the one it was popped out of
export const bubblesOf = memo(
  (graph: Graph | undefined, span: MinigraphBubble | undefined) =>
    graph ? graphBubbles(graph, span) : [],
)

// how wide each node is drawn, a node inside a run of folded sites as wide
// as the run's one stroke
export const inkOf = memo(
  (
    graph: Graph | undefined,
    width: NodeWidth,
    thickness: number,
    through: Fold['through'] | undefined,
  ) => nodeInk(graph, graphFacts(graph).nodeById, thickness, width, 0, through),
)
// the rows the walk rows layout draws for the graph and window
export const rowsOf = memo(
  (graph: Graph | undefined, region: Region | undefined) =>
    graph ? walkRows(graph, region) : undefined,
)

// Each row's genes along its bar, as walk rows or the strip draws them: the
// reference row's from the backbone's genes, the others' from their own
export const rowGenesOf = memo(
  (
    bars: WalkRows | undefined,
    genes: GeneModel[] | undefined,
    walkGenes: Map<string, GeneModel[]> | undefined,
  ) =>
    bars
      ? placeRowGenes(
          [bars.reference, ...bars.rows],
          new Map([
            ...(walkGenes ?? []),
            ...(genes
              ? [
                  [
                    bars.reference.name,
                    genesOnRow(bars.reference, genes),
                  ] as const,
                ]
              : []),
          ]),
        )
      : undefined,
)

// The stretch of reference the ramp colours, as the walk rows and keys take it
export const rampInterval = (
  ramp: { start: number; span: number } | undefined,
) => ramp && { start: ramp.start, end: ramp.start + ramp.span }

// The strip under a node layout draws runs not loaded hollow and keys them,
// as the layout above draws their placeholders
export const stripTree = (
  bars: WalkRows,
  frame: StripFrame,
  ramp: { start: number; end: number } | undefined,
  rowGenes: Map<string, RowGene[]> | undefined,
  inks: readonly RowInk[],
) =>
  walkRowsTree(bars, frame, {
    ramp,
    rowGenes,
    idPrefix: 'strip',
    markUnloaded: true,
    inks,
  })

export const stripKey = (
  bars: WalkRows,
  ramp: { start: number; end: number } | undefined,
  genes: GeneGaps | undefined,
  inks: readonly RowInk[],
) =>
  walkRowsKey(bars, {
    ramp,
    rampCss: RAMP_GRADIENT_CSS,
    genes,
    markUnloaded: true,
    inks,
  })

function keyUnion(a: KeyEntry[], b: KeyEntry[]) {
  const inA = new Set(a.map(e => e.label))
  const after = new Map<string | undefined, KeyEntry[]>()
  let anchor: string | undefined
  for (const e of b) {
    if (inA.has(e.label)) {
      anchor = e.label
    } else {
      after.set(anchor, [...(after.get(anchor) ?? []), e])
    }
  }
  const following = (label: string | undefined) => after.get(label) ?? []
  return [
    ...following(undefined),
    ...a.flatMap(e => [e, ...following(e.label)]),
  ]
}

export const stripKeyReserve = (
  bars: WalkRows,
  ramp: { start: number; end: number } | undefined,
  genes: GeneGaps | undefined,
) =>
  keyUnion(
    stripKey(bars, ramp, genes, []),
    stripKey(
      bars,
      ramp,
      genes,
      bars.rows.map(row => ({ walk: row.name, stops: [] })),
    ),
  )

// The halos along the nodes the drawing draws, and none for a bubble whose
// every drawn node lies inside a site the drawing folds
export const drawnHalos = memo(
  (
    halos: BubbleHalo[],
    graph: Graph | undefined,
    positions: Record<string, NodeSegment[]> | undefined,
    _positions: number,
    fold: Fold | undefined,
  ) =>
    !graph || !positions || !fold || fold.nodes.size === 0
      ? halos
      : bubbleHalos(
          graph,
          halos.map(h => h.bubble),
          Object.fromEntries(
            Object.entries(positions).filter(([id]) => !fold.nodes.has(id)),
          ),
        ).filter(h => !h.nodeIds.every(id => fold.within.has(id))),
)

// A graph that isn't open yet draws no deletions, so the drawing reads the
// same way as one with none.
const NO_DELETIONS: DeletionDrawing = {
  shown: [],
  bypassed: new Map(),
  hidden: new Set(),
}

// What a layout draws besides its nodes, recomputed when the layout, its
// positions or a setting it reads changes rather than per frame.
export const drawnExtras = memo(
  (
    graph: Graph | undefined,
    layout: LayoutResult | undefined,
    _positions: number,
    m: string,
    showBubbles: boolean,
    span: MinigraphBubble | undefined,
    showDeletionEdges: boolean,
    scheme: ColorScheme,
    region: Region | undefined,
    showGenes: boolean,
    genes: GeneModel[] | undefined,
    walkGenes: Map<string, GeneModel[]> | undefined,
  ) => {
    const f = graphFacts(graph)
    const positions = layout?.nodePositions
    const tubeMap = layout?.tubeMap
    const onNodes = m !== 'walkrows' && !tubeMap
    const drawing = graph
      ? deletionDrawing(graph, onNodes ? f.allDeletions : [], showDeletionEdges)
      : NO_DELETIONS
    const bars = m === 'walkrows' ? rowsOf(graph, region) : undefined
    const resolved = resolveColorScheme(scheme, graph)
    return {
      halos:
        showBubbles && onNodes && graph && positions
          ? bubbleHalos(graph, bubblesOf(graph, span), positions)
          : [],
      genePins:
        showGenes && onNodes && graph && positions && genes
          ? genePins(graph, genes, positions, layout.stranded)
          : [],
      bars,
      rowGenes:
        showGenes && bars ? rowGenesOf(bars, genes, walkGenes) : undefined,
      rowLabels: walkRowLabels(bars, layout),
      deletions: drawing.shown,
      drawing,
      ramp:
        resolved === 'reference-position' && graph && !tubeMap
          ? computeReferenceRamp(graph, region)
          : undefined,
      picture: tubeMap ? tubeMapPicture(tubeMap) : undefined,
    }
  },
)

// The walks lifted out of the drawing, each in its lane, and while they are
// side by side a lift of each alone, a panel apiece. The reference ramp is a
// neighbour walk per node, so only a lane coloured by reference position reads
// it. A tube map draws every walk as a tube of its own.
export const walkView = memo(
  (
    graph: Graph | undefined,
    layers: WalkLayer[],
    region: Region | undefined,
    tubeMap: boolean,
    facet: Facet,
  ) => {
    if (!graph || layers.length === 0 || tubeMap) {
      return { lift: undefined, panels: undefined }
    }
    const ramp = layers.some(l => l.color?.field === 'reference')
      ? computeReferenceRamp(graph, region)
      : undefined
    const lift = walkLift(graph, layers, ramp)
    return {
      lift,
      panels:
        facet && lift && lift.walks.length > 1
          ? facetLifts(graph, lift, layers, ramp)
          : undefined,
    }
  },
)

// The colours the lifted walks give the walk rows naming them, as their lanes
// and threads are drawn: each panel's walk while they are side by side
export const rowInksOf = memo((view: ReturnType<typeof walkView>) =>
  liftedRowInks(
    view.panels
      ? view.panels.flatMap(panel => panel.walks.slice(0, 1))
      : (view.lift?.walks ?? []),
  ),
)
