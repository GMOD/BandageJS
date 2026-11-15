import { parseRegion } from '@jbrowse/bandage-core'
import { GBZ_CUT_DEFAULTS } from '@jbrowse/bandage-core/gbzWindow'
import {
  CUT_PRESETS,
  RegionTooLargeError,
  WalkReader,
  abridgedWalks,
} from '@jbrowse/graph-walks'
import { RemoteFile } from 'generic-filehandle2'

import type { WalkFilehandle } from '@jbrowse/graph-walks'

// A `gfa-to-tabix --walks` file, `<prefix>.<ref>.walks.gz` with its directory
// `.walks.gz.idx` beside it, read by range requests and cut by
// @jbrowse/graph-walks, the reader the JBrowse graph plugin uses.
// `gbz.ts` imports this module on first use, so the walk reader stays out of
// the page's first download.

export type WalkFiles = WalkReader

export function openWalkFiles(
  url: string,
  open: (url: string) => WalkFilehandle = u => new RemoteFile(u),
): WalkFiles {
  return WalkReader.open(url, open)
}

export interface WalkCutSource {
  region: string
  haplotypes?: string[]
  referenceSample?: string
  context?: number
  // walks, by sample#haplotype#contig, to read in full where the file abridges
  // them
  expand?: string[]
  // walks to read in full where that keeps the cut under its budgets
  lifted?: string[]
  nodeLimit?: number
}

export const walkCutOptions = (src: WalkCutSource) => ({
  ...CUT_PRESETS.browser,
  haplotypes: src.haplotypes,
  referenceSample: src.referenceSample,
  context: src.context ?? CUT_PRESETS.browser.context,
  nodeLimit: src.nodeLimit ?? GBZ_CUT_DEFAULTS.limit,
})

async function cutReading(
  walks: WalkFiles,
  src: WalkCutSource,
  expand: string[],
  signal?: AbortSignal,
) {
  const region = parseRegion(src.region)
  const wanted = new Set(expand)
  const expanded = new Set<string>()
  const { tables, sample } = await walks.cutRegion(region, {
    ...walkCutOptions(src),
    signal,
    expand: name => {
      if (wanted.has(name)) {
        expanded.add(name)
      }
      return wanted.has(name)
    },
  })
  return { gfa: tables, region, sample, expanded: [...expanded] }
}

/**
 * A window of a walk file set as graph tables, cut by the browser's rules:
 * the reference sample's path over the region with `context` bp either
 * side, and the walks of the haplotypes asked for, every one when none are.
 * `expanded` names the abridged walks the cut read in full. Where reading the
 * lifted walks in full takes the cut over a budget, it cuts again with them
 * abridged, and `tooLarge` names them.
 */
export async function cutWalksRegion(
  walks: WalkFiles,
  src: WalkCutSource,
  signal?: AbortSignal,
) {
  const expand = src.expand ?? []
  const lifted = (src.lifted ?? []).filter(name => !expand.includes(name))
  try {
    const cut = await cutReading(walks, src, [...expand, ...lifted], signal)
    return { ...cut, tooLarge: [] as string[] }
  } catch (e) {
    if (!(e instanceof RegionTooLargeError) || lifted.length === 0) {
      throw e
    }
  }
  const cut = await cutReading(walks, src, expand, signal)
  const abridged = new Set(abridgedWalks(cut.gfa).map(walk => walk.name))
  return { ...cut, tooLarge: lifted.filter(name => abridged.has(name)) }
}
