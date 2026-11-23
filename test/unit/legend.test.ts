import {
  axisScaleOf,
  buildGeometry,
  deletionDrawing,
  departureTable,
  deletionEdges,
  drawingBounds,
  drawnMarks,
  fitTransform,
  graphKey,
  layoutGeometryInputs,
  layoutModeByValue,
  loadGraph,
  walkLift,
} from '@jbrowse/bandage-core'
import { RUNS_ON_KEY } from '@jbrowse/bandage-core/graphKey'
import { expect, test } from '@playwright/test'

import { legendsHtml, walkRowsKeyHtml } from '../../src/overlays'

import type {
  Graph,
  LayoutResult,
  SmallSites,
  WalkLayer,
} from '@jbrowse/bandage-core'

// the reference walks 0, 1, 2; `a` skips 1 and takes the dashed link
const SKIP = [
  ...[100, 10, 100].map((n, id) => `S\t${id}\t${'A'.repeat(n)}`),
  'P\tref#0#chr\t0+,1+,2+\t*',
  'P\ta#1#c\t0+,2+\t*',
  ...['0 1', '1 2', '0 2'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
].join('\n')

// R walks three reference nodes; A leaves it for a 75 kb loop the cut did not
// load, a placeholder, and comes back
const UNLOADED = [
  'S\tr1\t*\tLN:i:20000',
  'S\tr2\t*\tLN:i:30000',
  'S\tr3\t*\tLN:i:25000',
  'S\tp1\t*\tLN:i:75000\tnl:i:1',
  'L\tr1\t+\tr2\t+\t0M',
  'L\tr2\t+\tr3\t+\t0M',
  'L\tr1\t+\tp1\t+\t0M',
  'L\tp1\t+\tr3\t+\t0M',
  'W\tR\t0\tchr\t0\t75000\t>r1>r2>r3',
  'W\tA\t1\tchr\t0\t120000\t>r1>p1>r3',
].join('\n')

// ref steps a 1 bp node and alt another between two 1 kb reference nodes
const SNP = [
  'S\tr1\t*\tLN:i:1000',
  'S\tx\tA',
  'S\ty\tC',
  'S\tr2\t*\tLN:i:1000',
  'L\tr1\t+\tx\t+\t0M',
  'L\tx\t+\tr2\t+\t0M',
  'L\tr1\t+\ty\t+\t0M',
  'L\ty\t+\tr2\t+\t0M',
  'W\tref\t0\tchr\t0\t2001\t>r1>x>r2',
  'W\talt\t1\tchr\t0\t2001\t>r1>y>r2',
].join('\n')

// alt goes round a and b twice
const REPEAT = [
  'S\tr1\t*\tLN:i:100',
  'S\ta\t*\tLN:i:50',
  'S\tb\t*\tLN:i:50',
  'S\tr2\t*\tLN:i:100',
  'L\tr1\t+\ta\t+\t0M',
  'L\ta\t+\tb\t+\t0M',
  'L\tb\t+\ta\t+\t0M',
  'L\tb\t+\tr2\t+\t0M',
  'W\tref\t0\tchr\t0\t300\t>r1>a>b>r2',
  'W\talt\t1\tchr\t0\t400\t>r1>a>b>a>b>r2',
].join('\n')

// The legend of the ordered layout fit to `width`, drawn at `zoom` times the
// fit's scale
function legendAt(
  width: number,
  walks: (string | WalkLayer)[] = [],
  gfa = SKIP,
  reference = 'ref#0#chr',
  smallSites: SmallSites = 'hidden',
  zoom = 1,
) {
  const graph = loadGraph(gfa, 'cut', { referencePath: reference })
  const layout = layoutModeByValue('ordered').run(graph, undefined)!
  const fit = fitTransform(drawingBounds(layout, {}), width, 300, false)!
  const lift = walks.length
    ? walkLift(
        graph,
        walks.map(walk => (typeof walk === 'string' ? { walk } : walk)),
      )
    : undefined
  const batch = buildGeometry({
    ...layoutGeometryInputs(
      layout,
      deletionDrawing(graph, deletionEdges(graph), true),
      { drawsRows: false },
    ),
    graph,
    nodeById: new Map(graph.nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    contigThickness: 6,
    connectorThickness: 2,
    drawPaths: false,
    nodeWidth: 'depth',
    highlight: lift,
    axis: axisScaleOf(fit.scale * zoom, false),
    smallSites,
  })
  return legendsHtml({
    key: graphKey(graph, layout, { lift, marks: drawnMarks([batch]) }),
    at: () => undefined,
    paths: [],
    walkBars: undefined,
    rowGenes: undefined,
    walkRamp: undefined,
  })
}

// At the 150 px fit the skip's 10 bp come to 2.9 px at the reference's px a
// bp, so it folds however long the ordered layout draws its link, and the
// key counts it; drawn as nodes it is one dashed skip, which a short span
// once keyed apart as "short skip"
test("the legend is bandage-core's graph key: each skip row only where its mark is drawn", () => {
  const wide = legendAt(1200)
  expect(wide).toContain('class="swatch dashes"')
  expect(wide).toMatch(/skips .+? sequence/)
  const narrow = legendAt(150)
  expect(narrow).not.toMatch(/skips .+? sequence/)
  expect(narrow).toMatch(/1 skip under \d+ bp not drawn/)
  const asNodes = legendAt(150, [], SKIP, 'ref#0#chr', 'nodes')
  expect(asNodes).toMatch(/skips .+? sequence/)
  expect(asNodes).not.toContain('short skip')
})

test('the legend keys the node thickness ends and a lifted walk with what it fades', () => {
  const lifted = legendAt(1200, ['a#1#c'])
  expect(lifted).toContain('<div class="legend-title">Node thickness</div>')
  expect(lifted).toContain('<strong>a#1#c</strong>')
  expect(lifted).toContain('<span>other haplotypes</span>')
  expect(lifted).not.toMatch(/skips .+? sequence/)
})

test('the legend keys nodes not shown only where a hollow node is drawn', () => {
  expect(legendAt(1200, [], UNLOADED, 'R')).toContain('nodes not shown')
  expect(legendAt(1200, ['R#0#chr'], UNLOADED, 'R')).not.toContain(
    'nodes not shown',
  )
  expect(legendAt(1200, ['A#1#chr'], UNLOADED, 'R')).toContain(
    'nodes not shown',
  )
})

test('a lifted walk beside a skip it does not take keys the faded dashes', () => {
  expect(legendAt(1200, ['ref#0#chr'])).toMatch(/skips .+? sequence/)
})

// The 1 bp allele y for the reference's 1 bp x is 2 bp, 1.2 px at the
// 1200 px fit's 0.6 px a bp, and folds there however much room the ordered
// layout gives it; zoomed in ten times it comes to 12 px and is drawn
test('the key ends with the nodes the drawing folds as too small to draw, and the bp they are under', () => {
  expect(legendAt(1200, [], SNP, 'ref', 'hidden', 10)).not.toContain(
    'not drawn',
  )
  const folded = legendAt(1200, [], SNP, 'ref')
  expect(folded).toMatch(
    /<div class="legend key-too-small"><div class="legend-note">1 node under \d+ bp not drawn<\/div><\/div>$/,
  )
  expect(legendAt(1200, [], SNP, 'ref', 'nodes')).not.toContain('not drawn')
})

test("a walk lifted by pass keys its threads' heads with core's heads swatch", () => {
  const html = legendAt(
    1200,
    [{ walk: 'alt#1#chr', color: { field: 'pass' } }],
    REPEAT,
    'ref',
  )
  const row = html
    .split('<div class="legend-row">')
    .find(r => r.includes('<span>the way the walk runs</span>'))
  expect(row).toBeDefined()
  expect(row).toContain('stroke="#ffffff"')
  expect(row!.match(/<path /g)).toHaveLength(2)
})

// t hangs off r1's end, stepped only by y, which leaves the reference 93 kb
// before the cut starts: no drawn link meets t's far end
const TAILED: Graph = {
  name: 'tail',
  nodes: [
    {
      id: 'r1+',
      name: 'r1',
      length: 1000,
      depth: 2,
      stable: { refName: 'chr', start: 0, rank: 0 },
    },
    {
      id: 'r2+',
      name: 'r2',
      length: 1000,
      depth: 2,
      stable: { refName: 'chr', start: 1000, rank: 0 },
    },
    { id: 't+', name: 't', length: 40, depth: 1 },
  ],
  edges: [
    { from: 'r1+', to: 'r2+' },
    { from: 'r1+', to: 't+' },
  ],
  paths: [{ name: 'ref', nodeIds: ['r1+', 'r2+'] }],
  departures: {
    ...departureTable([
      {
        name: 'y#1#chr',
        hapStart: 1000,
        ownBp: 40,
        missingBp: 0,
        leavePos: -93_000,
        leaveReversed: false,
        leavePasses: 1,
        rejoinPos: 1000,
        rejoinReversed: false,
        rejoinPasses: 1,
        fromSteps: true,
      },
    ]),
    offsets: Int32Array.of(0, 1),
    steps: Int32Array.of(2),
  },
}

test("a tail whose free end no drawn link meets is keyed with core's tab swatch and words", () => {
  const layout: LayoutResult = {
    nodePositions: {
      'r1+': [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
      'r2+': [
        { x: 1000, y: 0 },
        { x: 2000, y: 0 },
      ],
      't+': [
        { x: 1000, y: 200 },
        { x: 1040, y: 200 },
      ],
    },
  }
  const batch = buildGeometry({
    axis: { scaleX: 0.5, scaleY: 0.5 },
    nodePositions: layout.nodePositions,
    graph: TAILED,
    nodeById: new Map(TAILED.nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    contigThickness: 6,
    connectorThickness: 2,
    drawPaths: false,
  })
  const html = legendsHtml({
    key: graphKey(TAILED, layout, {
      marks: drawnMarks([batch]),
      drawsNodes: true,
    }),
    at: () => undefined,
    paths: [],
    walkBars: undefined,
    rowGenes: undefined,
    walkRamp: undefined,
  })
  const row = html
    .split('<div class="legend-row">')
    .find(r => r.includes(`<span>${RUNS_ON_KEY}</span>`))
  expect(row).toBeDefined()
  expect(row).toContain(
    '<path d="M0,6 L8,1 L8,11 Z M18,6 L10,1 L10,11 Z" fill="#18181c"/>',
  )
})

test("the walk rows key draws the rows' chevrons on the swatch for a stretch walked against the reference", () => {
  const html = walkRowsKeyHtml([
    {
      swatch: { kind: 'bar', fill: '#9e9e9e', chevrons: true },
      label: "walked against GRCh38#0's direction",
    },
    { swatch: { kind: 'bar', fill: '#3c4148' }, label: 'off the path' },
  ])
  expect(html.match(/<polyline /g)?.length).toBeGreaterThan(0)
  expect(html.split('off the path')[0]).toContain('<polyline ')
  expect(html.split('walked against')[1]).not.toContain('<polyline ')
})
