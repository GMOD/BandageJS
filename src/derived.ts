import {
  LAYOUT_MODES,
  bubbleHalos,
  graphBubbles,
  computeReferenceRamp,
  deletionDrawing,
  deletionEdges,
  facetLifts,
  formatBp,
  genePins,
  genesOnRow,
  nodeInk,
  pathLegend,
  resolveColorScheme,
  tubeMapPicture,
  walkLabelsOf,
  walkLift,
  walkRowLabels,
  walkRows,
  placeRowGenes,
} from '@jbrowse/bandage-core'

import type { Region } from './jbrowse'
import type { Facet } from './settings'
import type {
  ColorScheme,
  DeletionDrawing,
  GeneModel,
  Graph,
  GraphNode,
  LayoutResult,
  MinigraphBubble,
  NodeWidth,
  WalkLayer,
  WalkRows,
} from '@jbrowse/bandage-core'

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

export interface Abridged {
  steps: number
  bp: number
}

// Each walk a walk file cut abridged, by name, with the steps and bp it left
// out across the walk's fragments
export function abridgedWalks(paths: Graph['paths'] = []) {
  const walks = new Map<string, Abridged>()
  for (const { name, abridged } of paths) {
    if (abridged) {
      const had = walks.get(name)
      walks.set(name, {
        steps: (had?.steps ?? 0) + abridged.steps,
        bp: (had?.bp ?? 0) + abridged.bp,
      })
    }
  }
  return walks
}

function stepsText(steps: number) {
  return steps < 1000
    ? `${steps}`
    : steps < 999_500
      ? `${Math.round(steps / 1000)} k`
      : `${+(steps / 1e6).toFixed(1)} M`
}

export function abridgedCounts({ steps, bp }: Abridged) {
  return `${stepsText(steps)} steps, ${formatBp(bp)} off reference`
}

// What an abridged walk's block says: `HG00097#1: 140 k steps, 2.1 Mb off
// reference`
export function abridgedText(label: string, abridged: Abridged) {
  return `${label}: ${abridgedCounts(abridged)}`
}

export const graphFacts = memo((graph: Graph | undefined) => {
  const deletions = graph ? deletionEdges(graph) : []
  const walkChoices = graph?.paths?.length ? pathLegend(graph.paths) : []
  return {
    nodeById: new Map<string, GraphNode>(graph?.nodes.map(n => [n.id, n])),
    nodeLengths: new Map(graph?.nodes.map(n => [n.id, n.length])),
    allDeletions: deletions,
    walkChoices,
    walkLabels: walkLabelsOf(walkChoices),
    abridged: abridgedWalks(graph?.paths),
    drawable: new Set<string>(
      graph
        ? LAYOUT_MODES.filter(m => m.available(graph)).map(m => m.value)
        : [],
    ),
  }
})

// The bubbles of the graph on screen, `span` the one it was popped out of
export const bubblesOf = memo(
  (graph: Graph | undefined, span: MinigraphBubble | undefined) =>
    graph ? graphBubbles(graph, span) : [],
)

export const inkOf = memo(
  (graph: Graph | undefined, width: NodeWidth, thickness: number) =>
    nodeInk(graph, graphFacts(graph).nodeById, thickness, width),
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
          ? genePins(graph, genes, positions)
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
