import { panSNContig, parseLocus } from '@jbrowse/bandage-core'

import type { Region } from './jbrowse'

// A region as people type it and JBrowse writes it, 1-based and closed
export function parseRegion(text: string): Region {
  const region = parseLocus(text)
  if (!region) {
    throw new Error(
      `"${text}" is not a region like chr6:160,614,798-160,647,758`,
    )
  }
  return region
}

// The 0-based half-open text bandage-core's parseRegion reads, as its gbz cut
// takes a region
export function coreRegion(r: Region) {
  return `${r.refName}:${r.start}-${r.end}`
}

// Whether `typed` names the contig `refName`: in full, or by the bare contig
// of a PanSN name, so `chr6` finds `GRCh38#0#chr6`
export function namesContig(typed: string, refName: string) {
  return typed === refName || panSNContig(typed) === panSNContig(refName)
}

// The region moved along its contig by `fraction` of its width, back when
// negative, no further than the contig's start
export function shifted(r: Region, fraction: number): Region {
  const width = r.end - r.start
  const start = Math.max(0, r.start + Math.round(width * fraction))
  return { refName: r.refName, start, end: start + width }
}

// Whether `inner` lies within `outer` on the same contig
export function within(inner: Region, outer: Region) {
  return (
    namesContig(inner.refName, outer.refName) &&
    inner.start >= outer.start &&
    inner.end <= outer.end
  )
}
