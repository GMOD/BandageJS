import { figureSvg } from '@jbrowse/bandage-core'

import { referenceName } from './reference'
import { current, settings, state, stripGenes, stripRows } from './state'

// the column count only a panel per walk takes
function facetInput() {
  return settings.facet === 'walk' && settings.facetColumns
    ? { field: settings.facet, columns: settings.facetColumns }
    : settings.facet
}

// why Export SVG can't draw the current layout, if it can't
export function exportBlocked() {
  return !state.layout
    ? 'Open a graph first'
    : state.layout.tubeMap
      ? 'A tube map draws no nodes to export'
      : undefined
}

export function exportSvg() {
  const { graph, layout } = state
  if (!graph || !layout) {
    return
  }
  const d = current()
  const strip = stripRows()
  const svg = figureSvg(graph, layout, {
    width: state.width,
    height: state.height,
    walks: state.walkLayers,
    facet: facetInput(),
    colorScheme: settings.colorScheme,
    nodeWidth: settings.nodeWidth,
    contigThickness: settings.nodeThickness,
    referenceName: referenceName(),
    showDeletionEdges: settings.showDeletionEdges,
    region: state.region,
    // a popped bubble is drawn to its own extent, as it is on screen
    fitToDrawing: state.stack.length > 0,
    genes: settings.showGenes ? state.genes : undefined,
    walkRows: d.bars,
    rowGenes: d.rowGenes,
    rowGeneGaps: state.walkGeneNote,
    walkStrip: strip && {
      rows: strip,
      rowGenes: stripGenes(strip),
      rowGeneGaps: state.walkGeneNote,
    },
  })
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${graph.name.replaceAll(/[^\w.-]+/g, '_')}.svg`
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
