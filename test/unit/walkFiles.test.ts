import { cutGbzRegion, openGbz } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'
import {
  CUT_PRESETS,
  RegionTooLargeError,
  abridgedText,
} from '@jbrowse/graph-walks'
import { LocalFile } from 'generic-filehandle2'

import {
  NOT_LOADED_CSS,
  NOT_LOADED_TEXT,
  formatLocus,
  loadGraph,
  serializeEl,
  walkRowsTree,
  walkStripFrame,
} from '@jbrowse/bandage-core'
import { GBZ_CUT_DEFAULTS } from '@jbrowse/bandage-core/gbzWindow'
import { graphTablesGFA } from '@jbrowse/bandage-core/gfa/graphTables'
import {
  abridgedOf,
  labelledLengths,
  rowsOf,
  stripKey,
  stripTree,
} from '../../src/derived'
import { rowHtml } from '../../src/describe'
import { coreRegion, parseRegion } from '../../src/region'
import {
  cutWalksRegion,
  openWalkFiles,
  walkCutOptions,
} from '../../src/walkFiles'

import type { WalkCutSource } from '../../src/walkFiles'

const DATA = 'test/e2e/data'
const walks = (file = 'hprc-chrM.GRCh38.walks.gz') =>
  openWalkFiles(`${DATA}/${file}`, path => new LocalFile(path))

async function cut(src: WalkCutSource, file?: string) {
  const { gfa, ...rest } = await cutWalksRegion(walks(file), src)
  return { text: graphTablesGFA(gfa), gfa, ...rest }
}

function lines(text: string, kind: string) {
  return text
    .split('\n')
    .filter(line => line.startsWith(`${kind}\t`))
    .map(line => line.split('\t'))
}

const walkNames = (text: string) =>
  lines(text, 'W')
    .map(w => `${w[1]}#${w[2]}#${w[3]}`)
    .toSorted()

test('a walk file cut names the walks the gbz-base cut names, over its nodes', async () => {
  const region = 'chrM:8,000-8,300'
  const fromWalks = await cut({ region })
  const gbz = await openGbz(
    new LocalFile(`${DATA}/hprc-chrM.gbz.db`),
    new LocalFile(`${DATA}/hprc-chrM.haplotype-index.db`),
  )
  const fromGbz = await cutGbzRegion(gbz, { region, referenceSample: 'GRCh38' })
  expect(fromWalks.sample).toBe('GRCh38')
  expect(fromWalks.region).toEqual(fromGbz.region)
  expect(walkNames(fromWalks.text)).toEqual(walkNames(fromGbz.text))
  expect(walkNames(fromWalks.text)).toHaveLength(44)
  const walkNodes = new Set(lines(fromWalks.text, 'S').map(s => s[1]))
  expect(lines(fromGbz.text, 'S').every(s => walkNodes.has(s[1]))).toBe(true)
})

test('a walk file cut keeps the reference and the haplotypes asked for', async () => {
  const { text } = await cut({
    region: 'chrM:100-300',
    haplotypes: ['HG00438', 'HG00621#2'],
  })
  expect(walkNames(text)).toEqual([
    'GRCh38#0#chrM',
    'HG00438#2#MT',
    'HG00621#2#MT',
  ])
})

test('a walk file cut places reference nodes by their coordinate', async () => {
  const { text } = await cut({ region: 'chrM:0-100' })
  const first = lines(text, 'S')[0]!
  expect(first).toContain('SN:Z:GRCh38#0#chrM')
  expect(first).toContain('SO:i:0')
  expect(first).toContain('SR:i:0')
})

test('a walk file cut takes a region named as the file names it', async () => {
  const { text } = await cut({
    region: 'GRCh38#0#chrM:100-300',
    haplotypes: ['HG00438'],
  })
  expect(walkNames(text)).toEqual(['GRCh38#0#chrM', 'HG00438#2#MT'])
})

test('a walk file cut names the sequences it holds for one it lacks', async () => {
  await expect(
    cutWalksRegion(walks(), { region: 'chr1:0-100' }),
  ).rejects.toThrow(/no sequence chr1 on GRCh38; it holds GRCh38#0#chrM/)
})

test('a 1-based locus cuts the window it names', async () => {
  const { region } = await cutWalksRegion(walks(), {
    region: coreRegion(parseRegion('chrM:8,001-8,300')),
  })
  expect(region).toEqual({ refName: 'chrM', start: 8000, end: 8300 })
  expect(formatLocus(region)).toBe('chrM:8,001-8,300')
})

// gfa-to-tabix --walks --refs K12 --abridge-steps 20 of the E. coli pggb graph,
// which abridges IAI39 and Sakai here, and the same without abridging
const ABRIDGED = 'ecoli_pggb_abridged.K12.walks.gz'
const WHOLE = 'ecoli_pggb.K12.walks.gz'
const K12 = 'K12#1#chr:1004500-1004961'

function wLine(text: string, sample: string) {
  return lines(text, 'W').find(w => w[1] === sample)
}

const abridged = (gfa: Parameters<typeof abridgedOf>[0]) => [
  ...abridgedOf(gfa).values(),
]

// IAI39's ten placeholders hold 11 bp and Sakai's six 6 bp; each fragment and
// the departure off it hold the same placeholder, counted once
test('a walk file cut gives an abridged walk a placeholder for each run off the reference, and its bp', async () => {
  const { gfa, expanded } = await cut({ region: K12 }, ABRIDGED)
  const placeholders = gfa.nodes.names.filter(
    (_, i) => gfa.nodes.placeholders?.[i] === 1,
  )
  expect(new Set(placeholders.map(name => name.split(':')[0]))).toEqual(
    new Set(['IAI39#1#chr', 'Sakai#1#chr']),
  )
  expect(expanded).toEqual([])
  expect(abridged(gfa)).toStrictEqual([
    { name: 'IAI39#1#chr', bp: 11 },
    { name: 'Sakai#1#chr', bp: 6 },
  ])
})

test("an abridged walk's not-loaded text is graph-walks' wording", async () => {
  const { gfa } = await cut({ region: K12 }, ABRIDGED)
  expect(
    Array.from(abridgedOf(gfa).values(), walk => abridgedText(walk)),
  ).toEqual([
    'IAI39#1#chr: 11 bp off the reference not loaded',
    'Sakai#1#chr: 6 bp off the reference not loaded',
  ])
})

test("a walk file cut takes the browser preset, with this viewer's node limit", () => {
  expect(walkCutOptions({ region: K12 })).toEqual({
    ...CUT_PRESETS.browser,
    haplotypes: undefined,
    referenceSample: undefined,
    nodeLimit: GBZ_CUT_DEFAULTS.limit,
  })
  expect(walkCutOptions({ region: K12, context: 0 }).context).toBe(0)
})

test("a placeholder's length is labelled with node lengths off, and every node's with them on", async () => {
  const { gfa } = await cut({ region: K12 }, ABRIDGED)
  const graph = loadGraph(gfa, 'cut')
  const placeholders = graph.nodes.filter(n => n.placeholder)
  expect(placeholders.length).toBeGreaterThan(0)
  expect(labelledLengths(graph, false)).toEqual(
    new Map(placeholders.map(n => [n.id, n.length])),
  )
  expect(labelledLengths(graph, true)).toEqual(
    new Map(graph.nodes.map(n => [n.id, n.length])),
  )
})

test("the strip under a node layout draws an abridged walk's runs not loaded hollow, as the layout draws their placeholders, and keys them", async () => {
  const { gfa, region } = await cut({ region: K12 }, ABRIDGED)
  const bars = rowsOf(loadGraph(gfa, 'cut'), region)!
  const frame = walkStripFrame(bars, { width: 800 })
  expect(
    bars.rows.filter(r => r.runs.some(run => run.unloaded)).map(r => r.name),
  ).toEqual(['IAI39#1#chr', 'Sakai#1#chr'])
  expect(serializeEl(walkRowsTree(bars, frame))).not.toContain(NOT_LOADED_CSS)
  expect(serializeEl(stripTree(bars, frame, undefined, undefined))).toContain(
    NOT_LOADED_CSS,
  )
  expect(stripKey(bars, undefined, undefined).map(e => e.label)).toContain(
    NOT_LOADED_TEXT,
  )
})

test('a walk file cut reads the abridged walks it expands in full', async () => {
  const { text, gfa, expanded } = await cut(
    { region: K12, expand: ['Sakai#1#chr', 'CFT073#1#chr'] },
    ABRIDGED,
  )
  const whole = await cut({ region: K12 }, WHOLE)
  expect(expanded).toEqual(['Sakai#1#chr'])
  expect(wLine(text, 'Sakai')).toEqual(wLine(whole.text, 'Sakai'))
  expect(abridged(gfa)).toStrictEqual([{ name: 'IAI39#1#chr', bp: 11 }])
})

// Sakai read in full takes this cut from 39 nodes to 45, and IAI39 as well
// to 54
test('a walk file cut leaves a lifted walk abridged where reading it would go over the node limit', async () => {
  const { gfa, expanded, tooLarge } = await cut(
    { region: K12, lifted: ['Sakai#1#chr', 'K12#1#chr'], nodeLimit: 40 },
    ABRIDGED,
  )
  expect(abridgedOf(gfa).has('Sakai#1#chr')).toBe(true)
  expect(expanded).toEqual([])
  expect(tooLarge).toEqual(['Sakai#1#chr'])
})

test('a walk file cut reads a lifted walk in full where it fits', async () => {
  const { expanded, tooLarge } = await cut(
    { region: K12, lifted: ['Sakai#1#chr'], nodeLimit: 45 },
    ABRIDGED,
  )
  expect(expanded).toEqual(['Sakai#1#chr'])
  expect(tooLarge).toEqual([])
})

test('a walk file cut keeps the walks it was asked to expand when it leaves the lifted ones abridged', async () => {
  const { expanded, tooLarge } = await cut(
    {
      region: K12,
      expand: ['Sakai#1#chr'],
      lifted: ['IAI39#1#chr'],
      nodeLimit: 45,
    },
    ABRIDGED,
  )
  expect(expanded).toEqual(['Sakai#1#chr'])
  expect(tooLarge).toEqual(['IAI39#1#chr'])
})

test('a walk file cut fails where a walk it was asked to expand goes over the node limit', async () => {
  await expect(
    cut({ region: K12, expand: ['Sakai#1#chr'], nodeLimit: 40 }, ABRIDGED),
  ).rejects.toBeInstanceOf(RegionTooLargeError)
})

// test/e2e/data/stepless.REF.gfa: REF walks seven 1 kb nodes, chr1:0-7000;
// JUMP#1 leaves after node 1 and rejoins at node 6, with nothing of its own
// between, and OWN#1 takes a 400 bp node of its own in place of node 4, so
// neither has a step on chr1:3,201-3,800
test('a haplotype with no step in the window draws its departure under the reference, stating its facts', async () => {
  const { gfa, region } = await cutWalksRegion(walks('stepless.REF.walks.gz'), {
    region: 'chr1:3,201-3,800',
    context: 0,
  })
  const bars = rowsOf(loadGraph(gfa, 'cut'), region)!
  const row = (label: string) => bars.rows.find(r => r.label === label)!
  expect(bars.rows.map(r => r.label).toSorted()).toEqual(['JUMP#1', 'OWN#1'])
  expect(row('JUMP#1')).toMatchObject({
    stepless: true,
    bp: 0,
    offReferenceBp: 0,
    gapBp: bars.reference.bp,
    departures: [
      expect.objectContaining({ leavePos: 1000, rejoinPos: 5000, ownBp: 0 }),
    ],
  })
  expect(row('OWN#1')).toMatchObject({
    stepless: true,
    offReferenceBp: 400,
    departures: [
      expect.objectContaining({ leavePos: 3000, rejoinPos: 4000, ownBp: 400 }),
    ],
  })
  for (const r of bars.rows) {
    expect(r.placementChoice).toBeUndefined()
    expect(r.runs).toEqual([
      expect.objectContaining({ start: 0, gap: true, cause: 'departure' }),
    ])
  }
  expect(rowHtml(row('JUMP#1'), bars.reference)).toBe(
    '<strong>JUMP#1</strong> no step on REF across 4 kb · 0 bp of its own',
  )
  expect(rowHtml(row('OWN#1'), bars.reference)).toBe(
    '<strong>OWN#1</strong> no step on REF across 1 kb · 400 bp of its own',
  )
})

// With context, the cut holds JUMP#1's steps on the flanks, nodes 1 and 6, and
// nothing between, and OWN#1's own node
test('a walk whose steps in the cut are the flanks of its departure reads as a stepless row at any context', async () => {
  for (const context of [500, undefined]) {
    const { gfa, region } = await cutWalksRegion(
      walks('stepless.REF.walks.gz'),
      { region: 'chr1:3,201-3,800', context },
    )
    const bars = rowsOf(loadGraph(gfa, 'cut'), region)!
    const row = (label: string) => bars.rows.find(r => r.label === label)!
    expect(gfa.walks.names).toContain('OWN#1#chr1')
    expect(gfa.walks.names).not.toContain('JUMP#1#chr1')
    expect(rowHtml(row('JUMP#1'), bars.reference)).toBe(
      '<strong>JUMP#1</strong> no step on REF across 4 kb · 0 bp of its own',
    )
    expect(rowHtml(row('OWN#1'), bars.reference)).toBe(
      '<strong>OWN#1</strong> 400 bp<br>chr1:3,001-3,400',
    )
  }
})
