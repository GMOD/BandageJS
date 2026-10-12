import { cutGbzRegion, openGbz } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'
import { LocalFile } from 'generic-filehandle2'

import { cutWalksRegion, decodeSteps, openWalkFiles } from '../../src/walkFiles'

const DATA = 'test/e2e/data'
const walks = () =>
  openWalkFiles(
    `${DATA}/hprc-chrM.GRCh38.walks.bed.gz`,
    path => new LocalFile(path),
  )

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

test('decodeSteps reads node-id deltas with the strand in the low bit', () => {
  const ids = new Int32Array(3)
  const rev = new Uint8Array(3)
  decodeSteps('20,3,-4', ids, rev, 0)
  expect([...ids]).toEqual([10, 11, 9])
  expect([...rev]).toEqual([0, 1, 0])
})

test('a walk file cut names the walks the gbz-base cut names, over its nodes', async () => {
  const region = 'chrM:8,000-8,300'
  const fromWalks = await cutWalksRegion(walks(), { region })
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
  const { text } = await cutWalksRegion(walks(), {
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
  const { text } = await cutWalksRegion(walks(), { region: 'chrM:0-100' })
  const first = lines(text, 'S')[0]!
  expect(first).toContain('SN:Z:GRCh38#0#chrM')
  expect(first).toContain('SO:i:0')
  expect(first).toContain('SR:i:0')
})

test('a walk file cut names the sequences it holds for one it lacks', async () => {
  await expect(
    cutWalksRegion(walks(), { region: 'chr1:0-100' }),
  ).rejects.toThrow(/no sequence chr1 on GRCh38; it holds GRCh38#0#chrM/)
})
