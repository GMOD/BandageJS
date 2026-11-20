import { sizeLeader } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import { overlaySvg } from '../../src/overlays'

import type { LabelLayout } from '@jbrowse/bandage-core'

const pane = (sizes: LabelLayout['sizes']) => ({
  width: 800,
  height: 400,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  contigThickness: 6,
  halos: [],
  genePins: [],
  halfWidthPx: () => 3,
  notDrawn: new Set<string>(),
  rings: [],
  labels: {
    bubbles: [],
    ticks: [],
    genes: [],
    passes: [],
    sizes,
  } satisfies LabelLayout,
  rowLabels: [],
  walkBars: undefined,
  rowGenes: undefined,
  walkRamp: undefined,
  regionEnd: undefined,
  highlight: undefined,
})

// a length that stands off its node on a leader, as core places one where
// the node is drawn shorter than the words or its exons fill it
test('a length stood off its node draws its leader to the point it names, and one on its node draws none', () => {
  const stood = {
    key: 'node:a',
    node: 'a',
    text: '3.6 kb',
    x: 610,
    y: 216,
    leader: { x: 610, y: 200 },
  }
  const along = { key: 'node:b', node: 'b', text: '30 kb', x: 250, y: 200 }
  const leaders = [
    ...overlaySvg(pane([stood, along])).matchAll(
      /<line class="size-leader" x1="([\d.]+)" x2="([\d.]+)" y1="([\d.]+)" y2="([\d.]+)"/g,
    ),
  ].map(m => m.slice(1).map(Number))
  const { x1, x2, y1, y2 } = sizeLeader(stood)!
  expect(leaders).toEqual([[x1, x2, y1, y2]])
})
