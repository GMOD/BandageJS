import { TabixIndexedFile } from '@gmod/tabix'
import { parseRegion } from '@jbrowse/bandage-core'
import { GBZ_CUT_DEFAULTS } from '@jbrowse/bandage-core/gbzWindow'
import { WALK_BUDGETS, WalkReader } from '@jbrowse/graph-walks'
import { RemoteFile } from 'generic-filehandle2'

import type { GenericFilehandle } from 'generic-filehandle2'

// A `gfa-to-tabix --walks` file, read by range requests and cut by
// @jbrowse/graph-walks, the reader the JBrowse graph plugin uses.
// `gbz.ts` imports this module on first use, so the tabix reader stays out of
// the page's first download.

export type WalkFiles = WalkReader

function withTbi(url: string) {
  return url.replace(/(?=$|[?#])/, '.tbi')
}

export function openWalkFiles(
  url: string,
  open: (url: string) => GenericFilehandle = u => new RemoteFile(u),
): WalkFiles {
  return new WalkReader(
    new TabixIndexedFile({
      filehandle: open(url),
      tbiFilehandle: open(withTbi(url)),
    }),
  )
}

export interface WalkCutSource {
  region: string
  haplotypes?: string[]
  referenceSample?: string
  context?: number
  // walks, by sample#haplotype#contig, to read in full where the file abridges
  // them
  expand?: string[]
}

/**
 * A window of a walk file set as graph tables, cut the way the gbz-base cut
 * is: the reference sample's path over the region with `context` bp either
 * side, and the walks of the haplotypes asked for, every one when none are.
 * `expanded` names the abridged walks the cut read in full.
 */
export async function cutWalksRegion(
  walks: WalkFiles,
  src: WalkCutSource,
  signal?: AbortSignal,
) {
  const region = parseRegion(src.region)
  const wanted = new Set(src.expand)
  const expanded = new Set<string>()
  const { tables, sample } = await walks.cutRegion(region, {
    signal,
    haplotypes: src.haplotypes,
    referenceSample: src.referenceSample,
    context: src.context ?? GBZ_CUT_DEFAULTS.context,
    byteBudget: WALK_BUDGETS.byteBudget,
    nodeLimit: GBZ_CUT_DEFAULTS.limit,
    expand: name => {
      if (wanted.has(name)) {
        expanded.add(name)
      }
      return wanted.has(name)
    },
  })
  return { gfa: tables, region, sample, expanded: [...expanded] }
}
