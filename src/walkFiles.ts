import { TabixIndexedFile } from '@gmod/tabix'
import { parseRegion } from '@jbrowse/bandage-core'
import {
  GBZ_CUT_DEFAULTS,
  NodeLimitError,
} from '@jbrowse/bandage-core/gbzWindow'
import { graphTablesGFA } from '@jbrowse/bandage-core/gfa/graphTables'
import { WALK_BUDGETS, WalkReader, walksKept } from '@jbrowse/graph-walks'
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
}

/**
 * A window of a walk file set as GFA text, cut the way the gbz-base cut is:
 * the reference sample's path over the region with `context` bp either side,
 * and the walks of the haplotypes asked for, every one when none are
 */
export async function cutWalksRegion(
  walks: WalkFiles,
  src: WalkCutSource,
  signal?: AbortSignal,
) {
  const region = parseRegion(src.region)
  const header = await walks.header({ signal })
  const sample = src.referenceSample ?? header.references[0] ?? ''
  const anchor = await walks.sequenceFor(sample, region.refName, { signal })
  if (anchor === undefined) {
    const names = await walks.referenceSequences({ signal })
    throw new Error(
      `The walk file has no sequence ${region.refName} on ${sample}; it holds ${names.slice(0, 5).join(', ')}${names.length > 5 ? ', …' : ''}`,
    )
  }
  const { graph, kept, fragments } = await walks.cut(anchor, region, {
    signal,
    context: src.context ?? GBZ_CUT_DEFAULTS.context,
    keep: walksKept(src.haplotypes, anchor),
    byteBudget: WALK_BUDGETS.byteBudget,
  })
  const { limit } = GBZ_CUT_DEFAULTS
  if (kept.size > limit) {
    const windowBp = region.end - region.start
    throw new NodeLimitError(
      limit,
      windowBp,
      Math.max(1, Math.floor((windowBp * limit) / kept.size)),
    )
  }
  const text = graphTablesGFA(graph.tables(kept, fragments))
  return { text, region, sample }
}
