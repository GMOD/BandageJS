import { HPRC_GBZ, cutGbzRegion, openGbz } from '@jbrowse/bandage-core'
import { RemoteFile } from 'generic-filehandle2'

import { readOnce } from './read'
import { coreRegion, parseRegion } from './region'

import type { GbzSource } from '@jbrowse/bandage-core'
import type { WalkFiles } from './walkFiles'

// A window of a gbz-base database read by range requests, the way the plugin's
// GbzBaseSyntenyAdapter reads one, so a 10 GB graph costs a few MB per cut.
// The cut itself is the core's; the page keeps each opened database for the
// next cut and says what it is waiting on. A gfa-to-tabix walk file set,
// `<prefix>.<sample>.walks.bed.gz` with its `.tbi`, takes the
// database's place in a cut: `walkFiles.ts` reads it.

export type { GbzSource } from '@jbrowse/bandage-core'

export const HPRC: Omit<GbzSource, 'region'> = HPRC_GBZ

export const isHprc = (src: { db: string; index?: string }) =>
  src.db === HPRC.db && src.index === HPRC.index

export const HPRC_WALKS =
  'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f2.GRCh38.walks.bed.gz'

const opened = new Map<string, ReturnType<typeof openGbz>>()

// The database at `db`, with its haplotype index where there is one, opened
// once for every cut and probe
function openDb(db: string, index?: string) {
  return readOnce(opened, `${db}|${index ?? ''}`, () =>
    openGbz(new RemoteFile(db), index ? new RemoteFile(index) : undefined),
  )
}

const WALKS = /\.walks\.bed\.gz$/i

export function isWalksUrl(url: string) {
  try {
    return WALKS.test(new URL(url, 'http://host').pathname)
  } catch {
    return WALKS.test(url)
  }
}

const walkSets = new Map<string, Promise<WalkFiles>>()

function openWalks(url: string) {
  return readOnce(walkSets, url, () =>
    import('./walkFiles').then(async ({ openWalkFiles }) => {
      const files = openWalkFiles(url)
      await files.header()
      return files
    }),
  )
}

// The reference samples a database or walk file set can be cut along
export async function referenceSamplesAt(db: string, index?: string) {
  return isWalksUrl(db)
    ? (await (await openWalks(db)).header()).references
    : (await openDb(db, index)).referenceSamples
}

export async function cutGbz(
  src: GbzSource,
  status: (text: string) => void,
  signal: AbortSignal,
) {
  const cut = { ...src, region: coreRegion(parseRegion(src.region)) }
  if (isWalksUrl(src.db)) {
    status('Opening walk files')
    const files = await openWalks(src.db)
    signal.throwIfAborted()
    status(`Cutting ${src.region}`)
    const { cutWalksRegion } = await import('./walkFiles')
    return cutWalksRegion(files, cut, signal)
  }
  status('Opening pangenome database')
  const gbz = await openDb(src.db, src.index)
  signal.throwIfAborted()
  status(`Cutting ${src.region}`)
  return cutGbzRegion(gbz, cut, signal)
}
