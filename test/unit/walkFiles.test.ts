import { cutGbzRegion, openGbz } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'
import { RegionTooLargeError } from '@jbrowse/graph-walks'
import { LocalFile } from 'generic-filehandle2'

import { formatLocus, loadGraph } from '@jbrowse/bandage-core'
import { graphTablesGFA } from '@jbrowse/bandage-core/gfa/graphTables'
import { abridgedWalks, rowsOf } from '../../src/derived'
import { coreRegion, parseRegion } from '../../src/region'
import { cutWalksRegion, openWalkFiles } from '../../src/walkFiles'

import type { WalkCutSource } from '../../src/walkFiles'

const DATA = 'test/e2e/data'
const walks = (file = 'hprc-chrM.GRCh38.walks.bed.gz') =>
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
    .sort()

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
const ABRIDGED = 'ecoli_pggb_abridged.K12.walks.bed.gz'
const WHOLE = 'ecoli_pggb.K12.walks.bed.gz'
const K12 = 'K12#1#chr:1004500-1004961'

function stepCounts(text: string) {
  return Object.fromEntries(
    lines(text, 'W').map(w => [w[1], w[6]!.split(/[<>]/).length - 1]),
  )
}

test('a walk file cut gives an abridged walk two steps and its counts', async () => {
  const { text, gfa, expanded } = await cut({ region: K12 }, ABRIDGED)
  expect(stepCounts(text)).toMatchObject({ IAI39: 2, Sakai: 2 })
  expect(expanded).toEqual([])
  const graph = loadGraph(gfa, 'cut')
  expect(Object.fromEntries(abridgedWalks(graph.paths))).toEqual({
    'IAI39#1#chr': { steps: 35, bp: 460 },
    'Sakai#1#chr': { steps: 35, bp: 460 },
  })
})

test('a walk file cut reads the abridged walks it expands in full', async () => {
  const { text, expanded } = await cut(
    { region: K12, expand: ['Sakai#1#chr', 'CFT073#1#chr'] },
    ABRIDGED,
  )
  const whole = await cut({ region: K12 }, WHOLE)
  expect(expanded).toEqual(['Sakai#1#chr'])
  expect(stepCounts(text)).toEqual({ ...stepCounts(whole.text), IAI39: 2 })
  expect(stepCounts(text).Sakai).toBe(35)
})

// Sakai read in full takes this cut from 39 nodes to 45, and IAI39 as well
// to 54
test('a walk file cut leaves a lifted walk abridged where reading it would go over the node limit', async () => {
  const { text, expanded, tooLarge } = await cut(
    { region: K12, lifted: ['Sakai#1#chr', 'K12#1#chr'], nodeLimit: 40 },
    ABRIDGED,
  )
  expect(stepCounts(text).Sakai).toBe(2)
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

// gfa-to-tabix --walks --refs REF --chunk 1000 of seven 1 kb nodes: REF walks
// them all, DEL >1>6>7 and SNP >1>2>3>5>6>7, so both skip chr1:3000-4000
test('a haplotype whose deletion spans the window draws as a deletion row', async () => {
  const { gfa, region } = await cutWalksRegion(walks('skip.REF.walks.bed.gz'), {
    region: 'chr1:3,201-3,800',
    context: 0,
  })
  const bars = rowsOf(loadGraph(gfa, 'cut'), region)!
  expect(bars.rows.map(r => r.label).sort()).toEqual(['DEL#1', 'SNP#1'])
  for (const row of bars.rows) {
    expect(row).toMatchObject({ bp: 0, gapBp: bars.reference.bp })
    expect(row.runs).toEqual([
      expect.objectContaining({ start: 0, gap: true, cause: 'deleted' }),
    ])
  }
})
