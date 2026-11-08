import { expect, test } from '@playwright/test'

import { hubFrom, withOverlay } from '../../src/hubConfig'
import {
  cutTrack,
  graphViewLink,
  nodeLink,
  regionLink,
  rowLink,
} from '../../src/jbrowse'

import type { GraphNode, WalkRow } from '@jbrowse/bandage-core'

const DB = 'https://s3/x.gbz.db'
const adapter = { type: 'GbzBaseSyntenyAdapter', uri: DB }

function target(tracks: object[]) {
  const hub = hubFrom(
    {
      plugins: [{ name: 'GraphGenomeView' }],
      assemblies: [{ name: 'hg38' }, { name: 'HG00097.1' }],
      tracks,
    },
    'https://example.org/config.json',
  )
  return { host: 'https://jbrowse.example/', hub, assembly: hub.assemblies[0]! }
}

interface Spec {
  views: {
    tracks?: (string | { type?: string; trackId: string; rows?: unknown })[]
    maxRegionBp?: number
    layoutMode?: string
  }[]
}

const isSpec = (spec: unknown): spec is Spec =>
  typeof spec === 'object' &&
  spec !== null &&
  'views' in spec &&
  Array.isArray(spec.views)

function specOf(link: string) {
  const spec: unknown = JSON.parse(
    decodeURIComponent(link.split('session=spec-')[1]!),
  )
  if (!isSpec(spec)) {
    throw new Error(`No session spec in ${link}`)
  }
  return spec
}

function lanesDisplay(link: string) {
  return specOf(link)
    .views[0]?.tracks?.filter(x => typeof x !== 'string')
    .find(x => x.type === 'MultiWaySyntenyDisplay')
}

function lanesIn(link: string) {
  return lanesDisplay(link)?.trackId
}

const region = { refName: 'chr1', start: 0, end: 100 }

test('the lanes are the gbz GraphTrack when the hub has no SyntenyTrack', () => {
  const t = target([
    { type: 'GraphTrack', trackId: 'lanes', assemblyNames: ['hg38'], adapter },
  ])
  expect(cutTrack(t, DB)?.trackId).toBe('lanes')
  expect(lanesIn(regionLink(t, region, ['HG00097']))).toBe('lanes')
})

test('a gbz SyntenyTrack is the lanes over a gbz GraphTrack beside it', () => {
  const t = target([
    { type: 'GraphTrack', trackId: 'graph', assemblyNames: ['hg38'], adapter },
    {
      type: 'SyntenyTrack',
      trackId: 'lanes',
      assemblyNames: ['hg38'],
      adapter,
    },
  ])
  expect(cutTrack(t, DB)?.trackId).toBe('lanes')
  expect(lanesIn(regionLink(t, region, ['HG00097']))).toBe('lanes')
})

test('a hub naming the database by gbzDbLocation still has its lanes', () => {
  const t = target([
    {
      type: 'GraphTrack',
      trackId: 'lanes',
      assemblyNames: ['hg38'],
      adapter: { type: 'GbzBaseSyntenyAdapter', gbzDbLocation: { uri: DB } },
    },
  ])
  expect(cutTrack(t, DB)?.trackId).toBe('lanes')
})

test('a walk file cut takes the lanes reading that walk file', () => {
  const walks = 'https://s3/x.GRCh38.walks.gz'
  const t = target([
    { type: 'GraphTrack', trackId: 'gbz', assemblyNames: ['hg38'], adapter },
    {
      type: 'GraphTrack',
      trackId: 'walks',
      assemblyNames: ['hg38'],
      adapter: {
        type: 'WalkTabixSyntenyAdapter',
        walksUri: 'https://s3/x.GRCh38',
      },
    },
  ])
  expect(cutTrack(t, walks)?.trackId).toBe('walks')
  expect(cutTrack(t, DB)?.trackId).toBe('gbz')
  expect(cutTrack(t, 'https://s3/other.walks.gz')).toBeUndefined()
  expect(lanesIn(regionLink(t, region, ['HG00097'], walks))).toBe('walks')
})

test('the region link keeps the lanes asked for as rows.kept', () => {
  const t = target([
    { type: 'GraphTrack', trackId: 'lanes', assemblyNames: ['hg38'], adapter },
  ])
  expect(lanesDisplay(regionLink(t, region, ['HG00097']))?.rows).toEqual({
    kept: ['HG00097#1', 'HG00097#2'],
  })
})

test("the graph view link raises the plugin's region cap to a wide cut", () => {
  const t = target([
    { type: 'GraphTrack', trackId: 'lanes', assemblyNames: ['hg38'], adapter },
  ])
  const lanes = cutTrack(t, DB)!
  const view = (end: number) =>
    specOf(
      graphViewLink(
        t,
        lanes,
        { refName: 'chr1', start: 0, end },
        [],
        'tubemap',
      ),
    ).views[1]
  expect(view(100)?.maxRegionBp).toBe(5_000_000)
  expect(view(8_000_000)?.maxRegionBp).toBe(8_000_000)
  expect(view(100)?.layoutMode).toBe('tubemap')
})

const geneTrack = (trackId: string) => ({
  type: 'FeatureTrack',
  trackId,
  assemblyNames: ['HG00097#1'],
  adapter: { type: 'Gff3TabixAdapter', uri: `https://x/${trackId}.gff.gz` },
})

function tracksIn(link: string | undefined) {
  return specOf(link!).views[0]?.tracks
}

test("a haplotype's links open the gene track the hub's overlay chose", () => {
  const hub = withOverlay(
    hubFrom(
      {
        assemblies: [{ name: 'hg38' }, { name: 'HG00097#1' }],
        tracks: [geneTrack('first'), geneTrack('chosen')],
      },
      'https://example.org/config.json',
    ),
    { genes: { 'HG00097#1': 'chosen' } },
  )
  const t = {
    host: 'https://jbrowse.example/',
    hub,
    assembly: hub.assemblies[0]!,
  }
  const node: GraphNode = {
    id: 'n',
    name: 'n',
    length: 10,
    depth: 1,
    stable: { refName: 'HG00097#1#chr1', start: 5000, rank: 1 },
  }
  const row: WalkRow = {
    name: 'HG00097#1#chr1',
    label: 'HG00097#1#chr1',
    sample: 'HG00097',
    haplotype: 1,
    bp: 100,
    offReferenceBp: 0,
    gapBp: 0,
    complete: true,
    runs: [],
    axis: { contig: 'chr1', start: 5000, reversed: false },
  }
  expect(tracksIn(nodeLink(node, t))).toEqual(['chosen'])
  expect(tracksIn(rowLink(row, false, t))).toEqual(['chosen'])
})
