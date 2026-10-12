import { TabixIndexedFile } from '@gmod/tabix'
import { parseRegion } from '@jbrowse/bandage-core'
import {
  GBZ_CUT_DEFAULTS,
  NodeLimitError,
} from '@jbrowse/bandage-core/gbzWindow'
import { graphTablesGFA } from '@jbrowse/bandage-core/gfa/graphTables'
import { panSNMatchesPrefix } from '@jbrowse/bandage-core/pansn'
import { RemoteFile } from 'generic-filehandle2'

import type { GraphTables } from '@jbrowse/bandage-core/gfa/graphTables'
import type { GenericFilehandle } from 'generic-filehandle2'

// A `gfa-to-tabix --walks` file set, read by range requests the way the
// plugin's RgfaTabixAdapter reads one: rows of walks and nodes filed under
// fixed chunks of one reference sample,
//
//   walks: anchor cs cs+1  sample#hap#contig fragStart hapOffset piece nsteps steps [pv:i:cs] [nx:i:cs]
//   nodes: anchor cs cs+1  nodeId rank seq start end LN:i:length [SQ:Z:bases]
//
// so a window costs a read of each file over the chunks under it. The cut is
// a port of the plugin's walkRows.ts; its comments say more. `gbz.ts` imports
// this module on first use, so the tabix reader stays out of the page's first
// download.

// The node file beside a walk file, keeping a query string at the end
function besideWalks(url: string, kind: string) {
  return url.replace(/\.walks\.bed\.gz(?=$|[?#])/i, `.${kind}.bed.gz`)
}

function withTbi(url: string) {
  return url.replace(/(?=$|[?#])/, '.tbi')
}

export interface WalkFiles {
  walks: TabixIndexedFile
  nodes: TabixIndexedFile
  header: Promise<WalkHeader>
}

export function openWalkFiles(
  url: string,
  open: (url: string) => GenericFilehandle = u => new RemoteFile(u),
): WalkFiles {
  const tabix = (file: string) =>
    new TabixIndexedFile({
      filehandle: open(file),
      tbiFilehandle: open(withTbi(file)),
    })
  const walks = tabix(url)
  return {
    walks,
    nodes: tabix(besideWalks(url, 'nodes')),
    header: walks.getHeaderLines().then(walkHeader),
  }
}

export interface WalkHeader {
  chunk: number
  maxNode: number | undefined
  references: string[]
  haplotypes: string[]
}

function integerTag(line: string, tag: string) {
  const match = new RegExp(`(?:^|\\t)${tag}:i:(\\d+)`).exec(line)
  return match ? Number(match[1]) : undefined
}

export function walkHeader(lines: string[]): WalkHeader {
  let chunk: number | undefined
  let maxNode: number | undefined
  const references: string[] = []
  const haplotypes: string[] = []
  for (const line of lines) {
    const [key, value = ''] = line.split('\t')
    if (key === '#reference') {
      references.push(value)
    } else if (key === '#haplotype') {
      haplotypes.push(value)
    } else {
      chunk ??= integerTag(line, 'chunk')
      maxNode ??= integerTag(line, 'maxnode')
    }
  }
  return { chunk: chunk ?? 65536, maxNode, references, haplotypes }
}

// A node reaching into the window starts at most `maxNode` bp before it, so
// its row sits that many chunks back, and never less than one, which holds
// the detour a haplotype takes into the window's first reference node
export function chunkQueryStart(start: number, { chunk, maxNode }: WalkHeader) {
  const lookback =
    maxNode === undefined ? 1 : Math.max(1, Math.ceil(maxNode / chunk))
  return Math.max(0, (Math.floor(start / chunk) - lookback) * chunk)
}

interface WalkChunk {
  refName: string
  start: number
}

interface WalkRow {
  name: string
  fragStart: number
  hapOffset: number
  piece: number
  n: number
  enc: string
  prev?: WalkChunk
  next?: WalkChunk
}

export function parseWalkRow(line: string): WalkRow {
  const c = line.split('\t')
  const row: WalkRow = {
    name: c[3]!,
    fragStart: Number(c[4]),
    hapOffset: Number(c[5]),
    piece: Number(c[6]),
    n: Number(c[7]),
    enc: c[8]!,
  }
  for (const tag of c.slice(9)) {
    const side = tag.startsWith('pv:')
      ? 'prev'
      : tag.startsWith('nx:')
        ? 'next'
        : undefined
    if (side) {
      const at = tag.lastIndexOf(':')
      row[side] = {
        refName: tag[3] === 'Z' ? tag.slice(5, at) : c[0]!,
        start: Number(tag.slice(at + 1)),
      }
    }
  }
  return row
}

// Each step is `2 × (id − previous id) + r`, the first from 0, with `r` 1 on
// the reverse strand
export function decodeSteps(
  enc: string,
  ids: Int32Array,
  rev: Uint8Array,
  at: number,
) {
  let prev = 0
  let i = at
  for (const field of enc.split(',')) {
    const d = Number(field)
    const r = d & 1
    rev[i] = r
    prev += (d - r) / 2
    ids[i++] = prev
  }
}

interface WalkNode {
  refName: string
  start: number
  end: number
  rank: number
  onWindow: boolean
}

interface WalkRun {
  name: string
  hapOffset: number
  ids: Int32Array
  rev: Uint8Array
  prev?: WalkChunk
  next?: WalkChunk
}

// Rows of consecutive piece index on one path, decoded into one run
function joinPieces(rows: WalkRow[]): WalkRun[] {
  const byPath = new Map<string, WalkRow[]>()
  for (const row of rows) {
    const key = `${row.name}\t${row.fragStart}`
    const list = byPath.get(key)
    if (list) {
      list.push(row)
    } else {
      byPath.set(key, [row])
    }
  }
  const runs: WalkRun[] = []
  for (const pieces of byPath.values()) {
    pieces.sort((a, b) => a.piece - b.piece)
    let from = 0
    for (let i = 1; i <= pieces.length; i++) {
      if (
        i === pieces.length ||
        pieces[i]!.piece !== pieces[i - 1]!.piece + 1
      ) {
        runs.push(decodeRun(pieces.slice(from, i)))
        from = i
      }
    }
  }
  return runs
}

function decodeRun(pieces: WalkRow[]): WalkRun {
  const n = pieces.reduce((sum, p) => sum + p.n, 0)
  const ids = new Int32Array(n)
  const rev = new Uint8Array(n)
  let at = 0
  for (const p of pieces) {
    decodeSteps(p.enc, ids, rev, at)
    at += p.n
  }
  const first = pieces[0]!
  return {
    name: first.name,
    hapOffset: first.hapOffset,
    ids,
    rev,
    prev: first.prev,
    next: pieces.at(-1)!.next,
  }
}

interface WalkFragment {
  name: string
  hapStart: number
  hapEnd: number
  ids: Int32Array
  rev: Uint8Array
}

/**
 * The reference over the window, and each run from its first to its last
 * step there, followed off the reference to where it rejoins when the rows
 * hold that; the reference is cut out as far as those rejoins reach. `open`
 * lists the chunks a run cut off at the end of the rows goes on in.
 */
function walkCut(
  runs: WalkRun[],
  nodes: Map<number, WalkNode>,
  refName: string,
) {
  const onWindow = (id: number) => nodes.get(id)?.onWindow === true
  const reference = (id: number) => {
    const node = nodes.get(id)
    return node?.rank === 0 ? node : undefined
  }
  const open = new Map<string, WalkChunk>()
  const goesOn = (chunk: WalkChunk | undefined) => {
    if (chunk) {
      open.set(`${chunk.refName}:${chunk.start}`, chunk)
    }
  }
  const rejoin = (run: WalkRun, at: number, dir: number) => {
    const { ids } = run
    let i = at + dir
    while (i >= 0 && i < ids.length && reference(ids[i]!) === undefined) {
      i += dir
    }
    if (i < 0 || i >= ids.length) {
      goesOn(dir < 0 ? run.prev : run.next)
      return i - dir
    }
    const from = reference(ids[at]!)!
    const to = reference(ids[i]!)!
    if (to.refName !== refName) {
      return i - dir
    }
    const adjacent =
      i === at + dir && (to.start === from.end || to.end === from.start)
    return adjacent ? at : i
  }
  let reachStart = Infinity
  let reachEnd = -Infinity
  const spans: { run: WalkRun; first: number; last: number }[] = []
  for (const run of runs) {
    const { ids } = run
    let first = -1
    let last = -1
    for (let i = 0; i < ids.length; i++) {
      if (onWindow(ids[i]!)) {
        if (first < 0) {
          first = i
        }
        last = i
      }
    }
    if (first >= 0) {
      if (run.name !== refName) {
        first = rejoin(run, first, -1)
        last = rejoin(run, last, 1)
        for (const i of [first, last]) {
          const node = reference(ids[i]!)
          if (node) {
            reachStart = Math.min(reachStart, node.start)
            reachEnd = Math.max(reachEnd, node.end)
          }
        }
      }
      spans.push({ run, first, last })
    }
  }
  const inReach = (id: number) => {
    const node = reference(id)
    return (
      onWindow(id) ||
      (node?.refName === refName &&
        node.end > reachStart &&
        node.start < reachEnd)
    )
  }
  const kept = new Set<number>()
  for (const [id, node] of nodes) {
    if (node.onWindow) {
      kept.add(id)
    }
  }
  for (const span of spans) {
    const { ids } = span.run
    if (span.run.name === refName) {
      while (span.first > 0 && inReach(ids[span.first - 1]!)) {
        span.first--
      }
      while (span.last < ids.length - 1 && inReach(ids[span.last + 1]!)) {
        span.last++
      }
    }
    for (let i = span.first; i <= span.last; i++) {
      kept.add(ids[i]!)
    }
  }
  const length = (id: number) => {
    const node = nodes.get(id)
    return node === undefined ? 0 : node.end - node.start
  }
  const fragments: WalkFragment[] = []
  for (const { run, first: f, last: l } of spans) {
    const { ids, rev } = run
    let first = f
    let last = l
    while (first > 0 && kept.has(ids[first - 1]!)) {
      first--
    }
    while (last < ids.length - 1 && kept.has(ids[last + 1]!)) {
      last++
    }
    let hapStart = run.hapOffset
    for (let i = 0; i < first; i++) {
      hapStart += length(ids[i]!)
    }
    let hapEnd = hapStart
    for (let i = first; i <= last; i++) {
      hapEnd += length(ids[i]!)
    }
    fragments.push({
      name: run.name,
      hapStart,
      hapEnd,
      ids: ids.subarray(first, last + 1),
      rev: rev.subarray(first, last + 1),
    })
  }
  return { kept, fragments, open: [...open.values()] }
}

/**
 * The cut as the tables of the GFA it stands for: nodes by reference
 * position, a link for each pair of consecutive steps, and a walk per
 * fragment, the reference's first and the rest by name
 */
function cutTables(
  nodes: Map<number, WalkNode>,
  kept: Set<number>,
  fragments: WalkFragment[],
  anchor: string,
): GraphTables {
  const held = [...kept]
    .flatMap(id => {
      const node = nodes.get(id)
      return node ? [{ ...node, id }] : []
    })
    .sort((x, y) =>
      x.refName < y.refName
        ? -1
        : x.refName > y.refName
          ? 1
          : x.start - y.start || x.id - y.id,
    )
  const index = new Map<number, number>()
  const names: string[] = []
  const refNames: string[] = []
  const refIndex = new Map<string, number>()
  const lengths = new Int32Array(held.length)
  const refs = new Int32Array(held.length)
  const starts = new Float64Array(held.length)
  const ranks = new Int32Array(held.length)
  held.forEach(({ id, refName, start, end, rank }, i) => {
    index.set(id, i)
    names.push(String(id))
    let ref = refIndex.get(refName)
    if (ref === undefined) {
      ref = refNames.length
      refIndex.set(refName, ref)
      refNames.push(refName)
    }
    lengths[i] = end - start
    refs[i] = ref
    starts[i] = start
    ranks[i] = rank
  })
  const nodeIndex = (id: number) => {
    let i = index.get(id)
    if (i === undefined) {
      i = names.length
      index.set(id, i)
      names.push(String(id))
    }
    return i
  }

  const byLine = new Map<string, [number, number]>()
  for (const { ids, rev } of fragments) {
    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1]! * 2 + rev[i - 1]!
      const b = ids[i]! * 2 + rev[i]!
      byLine.set(
        `${ids[i - 1]}\t${rev[i - 1] ? '-' : '+'}\t${ids[i]}\t${rev[i] ? '-' : '+'}`,
        [a, b],
      )
    }
  }
  const lines = [...byLine.keys()].sort()
  const from = new Int32Array(lines.length)
  const to = new Int32Array(lines.length)
  const strands = new Uint8Array(lines.length)
  lines.forEach((line, k) => {
    const [a, b] = byLine.get(line)!
    from[k] = nodeIndex(Math.floor(a / 2))
    to[k] = nodeIndex(Math.floor(b / 2))
    strands[k] = (a % 2) | ((b % 2) << 1)
  })

  const walks = [...fragments].sort(
    (a, b) =>
      Number(b.name === anchor) - Number(a.name === anchor) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : a.hapStart - b.hapStart),
  )
  const offsets = new Int32Array(walks.length + 1)
  walks.forEach(({ ids }, p) => {
    offsets[p + 1] = offsets[p]! + ids.length
  })
  const steps = new Int32Array(offsets[walks.length]!)
  const reversed = new Uint8Array(steps.length)
  walks.forEach(({ ids, rev }, p) => {
    const at = offsets[p]!
    for (let j = 0; j < ids.length; j++) {
      steps[at + j] = nodeIndex(ids[j]!)
    }
    reversed.set(rev, at)
  })
  return {
    nodes: { names, lengths, refs, starts, ranks, refNames },
    links: { from, to, strands },
    walks: {
      names: walks.map(f => f.name),
      starts: Float64Array.from(walks, f => f.hapStart),
      ends: Float64Array.from(walks, f => f.hapEnd),
      offsets,
      steps,
      reversed,
    },
  }
}

// A walk cut off at the edge of the rows goes on in the chunk its row names,
// which a cut reads out to in this many rounds, at most this many chunks away
const FOLLOW_ROUNDS = 3
const FOLLOW_CHUNKS = 4

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
  files: WalkFiles,
  src: WalkCutSource,
  signal?: AbortSignal,
) {
  const region = parseRegion(src.region)
  const header = await files.header
  const sample = src.referenceSample ?? header.references[0] ?? ''
  const anchor = await anchorFor(files, region.refName, sample, signal)
  const { chunk } = header
  const context = src.context ?? GBZ_CUT_DEFAULTS.context
  const window = {
    start: Math.max(0, region.start - context),
    end: region.end + context,
  }
  const wanted = src.haplotypes?.length ? src.haplotypes : undefined
  const keep = (name: string) =>
    name === anchor ||
    wanted === undefined ||
    wanted.some(prefix => panSNMatchesPrefix(name, prefix))

  const rows: WalkRow[] = []
  const nodes = new Map<number, WalkNode>()
  const read = (from: number, to: number) =>
    Promise.all([
      files.walks.getLines(anchor, from, to, {
        signal,
        lineCallback: line => {
          const row = parseWalkRow(line)
          if (keep(row.name)) {
            rows.push(row)
          }
        },
      }),
      files.nodes.getLines(anchor, from, to, {
        signal,
        lineCallback: line => {
          const c = line.split('\t')
          const id = Number(c[3])
          if (!nodes.has(id)) {
            const rank = Number(c[4])
            const start = Number(c[6])
            const end = Number(c[7])
            nodes.set(id, {
              rank,
              refName: c[5]!,
              start,
              end,
              onWindow:
                rank === 0 &&
                c[5] === anchor &&
                end > window.start &&
                start < window.end,
            })
          }
        },
      }),
    ])

  let first = chunkQueryStart(window.start, header)
  let last = Math.floor((window.end - 1) / chunk) * chunk
  await read(first, window.end)
  let cut = walkCut(joinPieces(rows), nodes, anchor)
  const [lo, hi] = [first - FOLLOW_CHUNKS * chunk, last + FOLLOW_CHUNKS * chunk]
  for (let round = 0; round < FOLLOW_ROUNDS; round++) {
    const starts = cut.open
      .filter(c => c.refName === anchor && c.start >= lo && c.start <= hi)
      .map(c => c.start)
    const spans = [
      { from: Math.min(first, ...starts), to: first },
      { from: last + chunk, to: Math.max(last, ...starts) + 1 },
    ].filter(span => span.to > span.from)
    if (spans.length === 0) {
      break
    }
    first = Math.min(first, ...starts)
    last = Math.max(last, ...starts)
    await Promise.all(spans.map(({ from, to }) => read(from, to)))
    cut = walkCut(joinPieces(rows), nodes, anchor)
  }
  const { limit } = GBZ_CUT_DEFAULTS
  if (cut.kept.size > limit) {
    const windowBp = region.end - region.start
    throw new NodeLimitError(
      limit,
      windowBp,
      Math.max(1, Math.floor((windowBp * limit) / cut.kept.size)),
    )
  }
  const text = graphTablesGFA(cutTables(nodes, cut.kept, cut.fragments, anchor))
  return { text, region, sample }
}

// The walk file's sequence for `refName` on `sample`: a walk file names its
// reference sequences in full PanSN, `GRCh38#0#chr6`
async function anchorFor(
  files: WalkFiles,
  refName: string,
  sample: string,
  signal?: AbortSignal,
) {
  const names = await files.walks.getReferenceSequenceNames({ signal })
  const found = [refName, `${sample}#0#${refName}`, `${sample}#${refName}`]
    .map(n => n.replace(/^([^#]+)#([^#]+)$/, '$1#0#$2'))
    .find(n => names.includes(n))
  if (found === undefined) {
    throw new Error(
      `The walk file has no sequence ${refName} on ${sample}; it holds ${names.slice(0, 5).join(', ')}${names.length > 5 ? ', …' : ''}`,
    )
  }
  return found
}
