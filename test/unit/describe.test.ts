import {
  deletionEdges,
  loadGraph,
  placeholderHoverText,
  referenceLabel,
} from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import {
  ago,
  edgeHtml,
  geneText,
  genesOn,
  nodeHtml,
  recentDetail,
  rowHtml,
} from '../../src/describe'

import type { WalkRow } from '@jbrowse/bandage-core'

test('a recent graph says where it came from and the assembly declared for it', () => {
  const now = Date.UTC(2026, 0, 10)
  const r = {
    kind: 'url' as const,
    url: 'https://example.org/graphs/bare.gfa',
    name: 'bare.gfa',
    at: now - 10_000,
    declared: { chr6: { assembly: 'hg38' } },
  }
  expect(recentDetail(r, 'https://page.example/', now)).toBe(
    'example.org on hg38 · just now',
  )
  expect(
    recentDetail({ ...r, declared: undefined }, 'https://page.example/', now),
  ).toBe('example.org · just now')
})

test('ago says just now under a minute, else the nearest unit', () => {
  const now = Date.UTC(2026, 0, 10)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const minute = 60_000
  expect(ago(now - 30_000, now)).toBe('just now')
  expect(ago(now - 5 * minute, now)).toBe(rtf.format(-5, 'minute'))
  expect(ago(now - 3 * 60 * minute, now)).toBe(rtf.format(-3, 'hour'))
  expect(ago(now - 2 * 24 * 60 * minute, now)).toBe(rtf.format(-2, 'day'))
})

test('geneText gives the span 1-based with the strand, and says when it runs past the cut', () => {
  const gene = {
    name: 'LPA',
    refName: 'chr6',
    start: 160_531_481,
    end: 160_664_275,
    strand: -1,
    exons: [],
  }
  expect(geneText(gene)).toBe(
    `LPA\nchr6:${(160_531_482).toLocaleString()}-${(160_664_275).toLocaleString()}, − strand`,
  )
  expect(geneText({ ...gene, strand: 0 }, 0.5)).toBe(
    `LPA\nchr6:${(160_531_482).toLocaleString()}-${(160_664_275).toLocaleString()}\nRuns past the cut`,
  )
})

test('genesOn names the genes over a backbone node and its exons in them', () => {
  const refName = 'GRCh38#0#chr6'
  const lpa = {
    name: 'LPA',
    refName,
    start: 100,
    end: 900,
    strand: -1,
    exons: [
      { start: 100, end: 150 },
      { start: 400, end: 450 },
      { start: 480, end: 520 },
    ],
  }
  const node = (start: number, length: number, rank = 0) => ({
    id: 'n',
    name: 'n',
    length,
    depth: 1,
    stable: { refName, start, rank },
  })
  expect(genesOn(node(390, 100), [lpa])).toEqual([
    { name: 'LPA', here: '2 exons here' },
  ])
  expect(genesOn(node(200, 100), [lpa])).toEqual([
    { name: 'LPA', here: 'intron here' },
  ])
  expect(genesOn(node(900, 100), [lpa])).toEqual([])
  expect(genesOn(node(390, 100, 1), [lpa])).toEqual([])
})

test('nodeHtml lists three genes over a node and counts the rest', () => {
  const refName = 'chr'
  const gene = (name: string, exons: { start: number; end: number }[]) => ({
    name,
    refName,
    start: 0,
    end: 100,
    strand: 1,
    exons,
  })
  const html = nodeHtml(
    {
      id: 'n',
      name: 'n',
      length: 100,
      depth: 1,
      stable: { refName, start: 0, rank: 0 },
    },
    [
      gene('aaa', [{ start: 0, end: 100 }]),
      gene('bbb', [
        { start: 0, end: 10 },
        { start: 50, end: 60 },
      ]),
      gene('ccc', []),
      gene('ddd', [{ start: 0, end: 100 }]),
      gene('eee', [{ start: 0, end: 100 }]),
    ],
  )
  expect(html).toContain('<em>aaa</em><br>')
  expect(html).toContain('<em>bbb</em>: 2 exons here')
  expect(html).toContain('<em>ccc</em>: intron here')
  expect(html).not.toContain('ddd')
  expect(html).toContain('+2 more genes')
})

test('rowHtml gives a walk row the bp it walks and its contig span, and says where a departure is a placement choice', () => {
  const row: WalkRow = {
    name: 'HG00097#1#CM1',
    label: 'HG00097#1',
    sample: 'HG00097',
    haplotype: 1,
    bp: 12_300,
    offReferenceBp: 0,
    gapBp: 0,
    complete: true,
    runs: [],
  }
  expect(
    rowHtml({ ...row, axis: { contig: 'CM1', start: 100_000 } }, undefined),
  ).toBe(
    `<strong>HG00097#1</strong> 12.3 kb<br>CM1:${(100_001).toLocaleString()}-${(112_300).toLocaleString()}`,
  )
  // 4.2 kb of the bar are spent away from the window, drawn as a break
  const away = {
    ...row,
    runs: [
      { start: 0, bp: 8100, onReference: true },
      {
        start: 8100,
        bp: 120,
        onReference: false,
        gap: true as const,
        cause: 'away' as const,
        heldBp: 4200,
      },
    ],
    axis: { contig: 'CM1', start: 20_000 },
  }
  expect(rowHtml(away, undefined)).toBe(
    `<strong>HG00097#1</strong> 8.1 kb<br>CM1:${(20_001).toLocaleString()}-${(32_300).toLocaleString()}`,
  )
  expect(rowHtml({ ...row, placementChoice: true }, undefined)).toBe(
    '<strong>HG00097#1</strong> 12.3 kb · placement choice',
  )
})

test("hovering a placeholder says bandage-core's placeholder text, as the plugin does", () => {
  const placeholder = {
    id: 'p',
    name: 'IAI39#1#chr:1004600-1004611',
    length: 11,
    depth: 1,
    placeholder: true as const,
    stable: { refName: 'IAI39#1#chr', start: 1004600, rank: 1 },
  }
  expect(nodeHtml(placeholder)).toBe(placeholderHoverText(placeholder))
  expect(nodeHtml(placeholder)).toBe(
    "11 bp of IAI39#1's route, nodes not shown",
  )
})

// HG002 takes the 1 to 3 link past node 2, 50 bp of GRCh38 chr1
const SKIP_GFA = [
  'H\tVN:Z:1.1',
  `S\t1\t${'A'.repeat(100)}`,
  `S\t2\t${'C'.repeat(50)}`,
  `S\t3\t${'G'.repeat(100)}`,
  'L\t1\t+\t2\t+\t0M',
  'L\t2\t+\t3\t+\t0M',
  'L\t1\t+\t3\t+\t0M',
  'W\tGRCh38\t0\tchr1\t0\t250\t>1>2>3',
  'W\tHG002\t1\tchr1\t0\t200\t>1>3',
].join('\n')

test('a link skipping reference sequence says the bp it skips of the named reference, as the plugin does, and names no event', () => {
  const graph = loadGraph(SKIP_GFA, 'skip', { referencePath: 'GRCh38#0#chr1' })
  const [skip] = deletionEdges(graph)
  const edge = graph.edges[skip!.edgeIndex]!
  const html = edgeHtml(edge, skip, id => id, referenceLabel(graph))
  expect(html).toBe(
    'skips 50 bp of GRCh38 chr1 sequence<br>GRCh38#0#chr1:101-150',
  )
  expect(html).not.toMatch(/deletion/i)
})
