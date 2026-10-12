import { HPRC_GBZ, cutGbzRegion, openGbz } from '@jbrowse/bandage-core'
import { RemoteFile } from 'generic-filehandle2'

import type { GbzSource } from '@jbrowse/bandage-core'
import type { WalkFiles } from './walkFiles'

// A window of a gbz-base database read by range requests, the way the plugin's
// GbzBaseSyntenyAdapter reads one, so a 10 GB graph costs a few MB per cut.
// The cut itself is the core's; the page keeps each opened database for the
// next cut and says what it is waiting on. A gfa-to-tabix walk file set,
// `<prefix>.<sample>.walks.bed.gz` with its node file beside it, takes the
// database's place in a cut: `walkFiles.ts` reads it.

export { parseRegion } from '@jbrowse/bandage-core'
export type { GbzSource } from '@jbrowse/bandage-core'

export const HPRC: Omit<GbzSource, 'region'> = HPRC_GBZ

const opened = new Map<string, ReturnType<typeof openGbz>>()

// The database at `db`, with its haplotype index where there is one, opened
// once for every cut and probe
export function openDb(db: string, index?: string) {
  const key = `${db}|${index ?? ''}`
  let gbz = opened.get(key)
  if (!gbz) {
    gbz = openGbz(new RemoteFile(db), index ? new RemoteFile(index) : undefined)
    opened.set(key, gbz)
    gbz.catch(() => opened.delete(key))
  }
  return gbz
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
  let files = walkSets.get(url)
  if (!files) {
    files = import('./walkFiles').then(async ({ openWalkFiles }) => {
      const opened = openWalkFiles(url)
      await opened.header
      return opened
    })
    walkSets.set(url, files)
    files.catch(() => walkSets.delete(url))
  }
  return files
}

// The reference samples a database or walk file set can be cut along
export async function referenceSamplesAt(db: string, index?: string) {
  return isWalksUrl(db)
    ? (await (await openWalks(db)).header).references
    : (await openDb(db, index)).referenceSamples
}

export async function cutGbz(
  src: GbzSource,
  status: (text: string) => void,
  signal: AbortSignal,
) {
  if (isWalksUrl(src.db)) {
    status('Opening walk files')
    const files = await openWalks(src.db)
    signal.throwIfAborted()
    status(`Cutting ${src.region}`)
    const { cutWalksRegion } = await import('./walkFiles')
    return cutWalksRegion(files, src, signal)
  }
  status('Opening pangenome database')
  const gbz = await openDb(src.db, src.index)
  signal.throwIfAborted()
  status(`Cutting ${src.region}`)
  return cutGbzRegion(gbz, src, signal)
}
