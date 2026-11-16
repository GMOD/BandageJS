import {
  BUBBLE_HALO_COLOR,
  EXON_COLOR,
  HALO_FACTOR,
  LABEL_PAD,
  LABEL_PX,
  RAMP_GRADIENT_CSS,
  abgrToCssRgba,
  exonOutlineTree,
  exonStretches,
  geneLeader,
  walkKeyEntry,
  el,
  serializeEl,
  walkRowsKey,
  walkRowsTree,
} from '@jbrowse/bandage-core'
import { arrowheadOutline } from '@jbrowse/bandage-core/renderer/Canvas2DRenderer'
import {
  LANE_HEAD_HALO_PX,
  LANE_HEAD_LENGTH,
  LANE_HEAD_MIN_PX,
  laneHeadInk,
} from '@jbrowse/bandage-core/renderer/laneHeads'
import { THREAD_PX } from '@jbrowse/bandage-core/renderer/walkLanes'

import { geneText } from './describe'

import type {
  BubbleHalo,
  GeneGaps,
  GenePin,
  GraphKeyEntry,
  GraphKeySection,
  GraphKeySwatch,
  KeyEntry,
  KeyStop,
  LabelLayout,
  LiftedWalk,
  RowGene,
  WalkLift,
  WalkRows,
} from '@jbrowse/bandage-core'

// Everything drawn over the canvas, as markup rebuilt per frame from the
// core's outputs: the plugin's BubbleHalos, GenePins, LabelLayer,
// WalkRowsOverlay, row and size labels and legends, without React.

export interface Pane {
  width: number
  height: number
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  contigThickness: number
  halos: BubbleHalo[]
  genePins: GenePin[]
  // each node's drawn half width, which its exons tick past
  halfWidthPx: (nodeId: string) => number
  // rings round the selected node, strong, and a node named in its details
  rings: { d: string; halfWidthPx: number; strong: boolean }[]
  labels: LabelLayout
  rowLabels: { label: string; y: number }[]
  walkBars: WalkRows | undefined
  // each walk row's genes, by walk name, as offsets along its bar
  rowGenes: Map<string, RowGene[]> | undefined
  // the reference-position ramp's interval, where the bars take its hues
  walkRamp: { start: number; end: number } | undefined
  // where the cut window ends, which the backbone the canvas draws runs to
  regionEnd: number | undefined
  highlight: WalkLift | undefined
}

const GENE_INK = '#1c1c22'

export function esc(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function dimmed(p: Pane, h: BubbleHalo) {
  return (
    p.highlight !== undefined &&
    !h.nodeIds.some(id => p.highlight!.nodeIds.has(id))
  )
}

const TICK_PX = 9
const TICK_WIDTH = 3

function chip(o: {
  x: number
  y: number
  w: number
  text: string
  color: string
  // the box's edge, where it differs from the text's colour
  border?: string
  small?: boolean
  italic?: boolean
  dimmed?: boolean
  title?: string
  attrs?: string
}) {
  const clickable = o.attrs !== undefined
  return `<g class="chip${clickable ? ' clickable' : ''}" ${
    clickable
      ? `${o.attrs} role="button" tabindex="0" aria-label="Open ${esc(o.text)}"`
      : ''
  } opacity="${o.dimmed ? 0.35 : 1}">${
    o.title ? `<title>${esc(o.title)}</title>` : ''
  }<rect x="${o.x - o.w / 2}" y="${o.y - LABEL_PX - LABEL_PAD + 2}" width="${o.w}" height="${
    LABEL_PX + LABEL_PAD * 2 - 2
  }" rx="3" fill="rgba(255,255,255,0.85)" stroke="${o.border ?? o.color}" stroke-width="${o.small ? 0.6 : 1}"/><text x="${o.x}" y="${o.y}" font-size="${
    o.small ? LABEL_PX - 1 : LABEL_PX
  }" fill="${o.color}"${
    o.italic ? ' font-style="italic" font-weight="600"' : ''
  } text-anchor="middle">${esc(o.text)}</text></g>`
}

// Each exon outlined round its stretch of node, as every host draws it
function exonOutlines(p: Pane) {
  const tree = exonOutlineTree(
    exonStretches(p.genePins, p.halfWidthPx, p.highlight),
    {
      id: 'exon-outline',
      width: p.width,
      height: p.height,
      transform: `translate(${p.translateX} ${p.translateY}) scale(${p.scaleX} ${p.scaleY})`,
    },
  )
  return tree ? serializeEl(tree) : ''
}

const RING_COLOR = '#2f6fd6'
const RING_GAP_PX = 2
const RING_PX = 2.5

function ringPath(d: string, attrs: string) {
  return `<path d="${d}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${attrs}/>`
}

// A ring round each node in `p.rings`, a stroke wider than the node masked
// off the node and a gap round it
function rings(p: Pane) {
  if (p.rings.length === 0) {
    return []
  }
  const x = -p.translateX / p.scaleX
  const y = -p.translateY / p.scaleY
  const w = p.width / p.scaleX
  const h = p.height / p.scaleY
  return [
    `<mask id="ring-cut" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${p.rings
      .map(r =>
        ringPath(
          r.d,
          `stroke="#000" stroke-width="${2 * (r.halfWidthPx + RING_GAP_PX)}"`,
        ),
      )
      .join('')}</mask>`,
    `<g mask="url(#ring-cut)">${p.rings
      .map(r =>
        ringPath(
          r.d,
          `stroke="${RING_COLOR}" stroke-opacity="${r.strong ? 1 : 0.5}" stroke-width="${2 * (r.halfWidthPx + RING_GAP_PX + RING_PX)}"`,
        ),
      )
      .join('')}</g>`,
  ]
}

// Halos, or rings round nodes, in layout units under the pane's transform
function alongNodes(p: Pane, paths: string[]) {
  return paths.length
    ? `<g transform="translate(${p.translateX} ${p.translateY}) scale(${p.scaleX} ${p.scaleY})">${paths.join('')}</g>`
    : ''
}

function halos(p: Pane) {
  const width = p.contigThickness * HALO_FACTOR
  return p.halos
    .filter(h => !h.whole && !h.tick)
    .map(
      h =>
        `<path d="${h.path}" fill="none" stroke="${BUBBLE_HALO_COLOR}" stroke-opacity="${
          dimmed(p, h) ? 0.06 : 0.22
        }" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`,
    )
}

// A small variant's tick above its nodes, which opens it like its chip would
function ticks(p: Pane) {
  const index = new Map(p.halos.map((h, i) => [h, i]))
  return p.labels.ticks
    .map(
      ({ item: h, x, y }) =>
        `<rect class="tick clickable" data-halo="${index.get(h)}" x="${x - TICK_WIDTH / 2}" y="${y - TICK_PX}" width="${TICK_WIDTH}" height="${TICK_PX}" rx="${TICK_WIDTH / 2}" fill="${BUBBLE_HALO_COLOR}" opacity="${
          dimmed(p, h) ? 0.35 : 1
        }"><title>${esc(`${h.label} · click to open`)}</title></rect>`,
    )
    .join('')
}

function geneLabels(p: Pane) {
  return p.labels.genes.map(({ item: { pin }, x, y, w, text }) => {
    const { x1, y1, x2, y2 } = geneLeader(
      { x, y },
      {
        x: pin.at.x * p.scaleX + p.translateX,
        y: pin.at.y * p.scaleY + p.translateY,
      },
      p.contigThickness,
    )
    const name = chip({
      x,
      y,
      w,
      text,
      color: GENE_INK,
      border: EXON_COLOR,
      italic: true,
      title: geneText(pin.gene, pin.covered),
    })
    return `<g class="gene"><line x1="${x1}" x2="${x2}" y1="${y1}" y2="${y2}" stroke="${GENE_INK}" stroke-width="0.8" stroke-opacity="0.6"/>${name}</g>`
  })
}

function chips(p: Pane) {
  const genes = geneLabels(p)
  const bubbles = p.labels.bubbles.map(({ item: h, x, y, w, text }) =>
    chip({
      x,
      y,
      w,
      text,
      color: BUBBLE_HALO_COLOR,
      dimmed: dimmed(p, h),
      title: `${h.label}\n${h.bubble.segmentCount} segments${h.bubble.covering ? '' : ' · click to open'}`,
      // the bubble the drawing is would open into this same drawing
      attrs: h.bubble.covering
        ? undefined
        : `data-halo="${p.halos.indexOf(h)}"`,
    }),
  )
  return genes.join('') + bubbles.join('')
}

// Walk rows as core's element tree, so they read the same here, in the plugin
// and in an exported figure
export function walkRowsLayer(p: Pane) {
  return p.walkBars
    ? walkRowsTree(
        p.walkBars,
        {
          scaleX: p.scaleX,
          scaleY: p.scaleY,
          translateX: p.translateX,
          translateY: p.translateY,
          width: p.width,
          height: p.height,
        },
        { ramp: p.walkRamp, rowGenes: p.rowGenes },
      )
    : undefined
}

// Halos, then exon outlines and rings round nodes, then labels
export function overlaySvg(p: Pane) {
  return (
    alongNodes(p, halos(p)) +
    exonOutlines(p) +
    alongNodes(p, rings(p)) +
    ticks(p) +
    chips(p)
  )
}

export function overlayHtml(p: Pane) {
  const rows = p.rowLabels
    .map(({ label, y }) => ({ label, screenY: y * p.scaleY + p.translateY }))
    .filter(({ screenY }) => screenY >= 0 && screenY <= p.height)
    .map(
      ({ label, screenY }) =>
        `<div class="row-label" style="top:${screenY}px">${esc(label)}</div>`,
    )
  const sizes = p.labels.sizes.map(
    ({ text, x, y }) =>
      `<div class="size-label" style="left:${x}px;top:${y}px">${esc(text)}</div>`,
  )
  return rows.join('') + sizes.join('')
}

const css = abgrToCssRgba

const gradientCss = (stops: readonly KeyStop[]) =>
  `linear-gradient(to right, ${stops.map(s => `${css(s.ink)} ${+(s.offset * 100).toFixed(2)}%`).join(', ')})`

const SWATCH_PX = 18
const SWATCH_LANE_PX = 8

const svgSwatch = (body: string) =>
  `<svg class="swatch-outline" width="${SWATCH_PX}" height="12" viewBox="0 0 ${SWATCH_PX} 12" aria-hidden="true">${body}</svg>`

// heads along a lane, as bandage-core's figure keys them: one inside a lane,
// or two on a thread, each wider than the thread and on a white halo
function headsSwatch(ink: number, haloed: boolean) {
  const width = haloed ? LANE_HEAD_MIN_PX : SWATCH_LANE_PX
  const length = width * LANE_HEAD_LENGTH
  const d = (haloed ? [length, SWATCH_PX] : [SWATCH_PX - 1])
    .map(x => {
      const outline = arrowheadOutline(
        { x, y: 6, angle: 0, length, halfWidth: width / 2, color: ink },
        { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, dpr: 1 },
      )
      return `M${outline.map(p => `${+p.x.toFixed(1)},${+p.y.toFixed(1)}`).join('L')}Z`
    })
    .join('')
  return svgSwatch(
    `<line x2="${SWATCH_PX}" y1="6" y2="6" stroke="${css(ink)}" stroke-width="${haloed ? THREAD_PX : SWATCH_LANE_PX}"/>${
      haloed
        ? `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${2 * LANE_HEAD_HALO_PX}" stroke-linejoin="round"/>`
        : ''
    }<path d="${d}" fill="${css(laneHeadInk(ink, !haloed))}"/>`,
  )
}

// bandage-core's swatch as markup, beside its words in a legend row
function swatchHtml(swatch: GraphKeySwatch) {
  switch (swatch.kind) {
    case 'scale':
      return `<div class="swatch walk scale" style="background:${gradientCss(swatch.stops)}"></div>`
    case 'swatch':
      return `<div class="swatch walk" style="background:${css(swatch.ink)}"></div>`
    case 'chip':
      return `<div class="swatch chip" style="background:${css(swatch.ink)}"></div>`
    case 'width':
      return `<div class="swatch thick" style="background:${css(swatch.ink)};height:${+swatch.px.toFixed(2)}px"></div>`
    case 'hollow':
      return svgSwatch(
        `<rect x="1" y="2" width="16" height="8" rx="4" fill="${css(swatch.ink)}" stroke="${css(swatch.rim)}" stroke-width="${swatch.rimPx}"/>`,
      )
    case 'line':
      return swatch.dashed
        ? `<div class="swatch dashes" style="color:${css(swatch.ink)}"></div>`
        : svgSwatch(
            `<line x1="5" x2="13" y1="6" y2="6" stroke="${css(swatch.ink)}" stroke-width="1.5"/>`,
          )
    case 'outline':
      return svgSwatch(
        `<rect x="1" y="1" width="16" height="10" rx="4" fill="none" stroke="${css(swatch.ink)}" stroke-width="2"/>`,
      )
    case 'halo':
      return svgSwatch(
        `<line x1="5" x2="13" y1="6" y2="6" stroke="${css(swatch.ink)}" stroke-opacity="0.35" stroke-width="8" stroke-linecap="round"/>`,
      )
    case 'threads':
      return svgSwatch(
        [3, 6, 9]
          .map(
            y =>
              `<line x2="18" y1="${y}" y2="${y}" stroke="${css(swatch.ink)}" stroke-width="1.5"/>`,
          )
          .join(''),
      )
    case 'heads':
      return headsSwatch(swatch.ink, swatch.haloed)
    default:
      return svgSwatch(
        '<path d="M0,6 L8,1 L8,11 Z M18,6 L10,1 L10,11 Z" fill="#18181c"/>',
      )
  }
}

// One entry of the key: its swatch, its bold name and words, and under them
// the stretch its scale runs over, or `at` while it stands in
function entryHtml(entry: GraphKeyEntry, hint?: string, at?: string) {
  const title = [entry.hover, hint].filter(Boolean).join(' · ')
  const words = `${entry.strong ? `<strong>${esc(entry.strong)}</strong>` : ''}${esc(entry.text)}`
  const row = entry.swatch
    ? `<div class="legend-row">${swatchHtml(entry.swatch)}<span>${words}</span></div>`
    : `<div class="legend-note">${words}</div>`
  const under = at ?? entry.under
  return entry.walk || under
    ? `<div class="walk-key"${title ? ` title="${esc(title)}"` : ''}>${row}<div class="walk-at">${esc(under ?? '')}</div></div>`
    : row
}

// One walk's key: a swatch, or a short bar of the scale its lane shades by,
// then its name, with the stretch that scale runs over under it. `at`, where
// the hovered node sits on the walk, stands in for the stretch while there is
// one.
export function walkKeyHtml(
  walk: LiftedWalk,
  label: string,
  reference?: { name?: string; start: number; end: number },
  hint?: string,
  at?: string,
) {
  return entryHtml(walkKeyEntry(walk, label, reference), hint, at)
}

const HEADED = new Set(['Node thickness', 'Link thickness'])

// bandage-core's graph key, a box per section
export function graphKeyHtml(
  key: readonly GraphKeySection[],
  at: (walk: LiftedWalk) => string | undefined,
) {
  return key
    .map(
      ({ id, group, entries }) =>
        `<div class="legend key-${id}">${group && HEADED.has(group) ? `<div class="legend-title">${group}</div>` : ''}${entries
          .map(entry =>
            entryHtml(entry, undefined, entry.walk && at(entry.walk)),
          )
          .join('')}</div>`,
    )
    .join('')
}

export function walkRowsKeyHtml(entries: KeyEntry[]) {
  return serializeEl(
    el(
      'div',
      { class: 'legend' },
      ...entries.map(e =>
        e.note
          ? el('div', { class: 'legend-note' }, e.label)
          : el(
              'div',
              { class: 'legend-row' },
              el('div', {
                class: `swatch bar${e.swatch.kind === 'gene' ? ' gene-box' : ''}${e.swatch.kind === 'gap' ? ' gap' : ''}`,
                style:
                  e.swatch.kind === 'gene'
                    ? undefined
                    : e.swatch.kind === 'gap'
                      ? `background:${e.swatch.fill};height:${e.swatch.px}px`
                      : `background:${e.swatch.fill}`,
              }),
              el('span', {}, e.label),
            ),
      ),
    ),
  )
}

export function legendsHtml(o: {
  // bandage-core's graph key (graphKey)
  key: readonly GraphKeySection[]
  // where the hovered node sits on a lifted walk, while one is hovered
  at: (walk: LiftedWalk) => string | undefined
  paths: { name: string; label: string; color: string }[]
  walkBars: WalkRows | undefined
  // the walk rows' gene key, with the rows it couldn't read genes for
  rowGenes: GeneGaps | undefined
  walkRamp: { start: number; end: number } | undefined
}) {
  return [
    graphKeyHtml(o.key, o.at),
    o.paths.length > 0
      ? `<div class="legend">${o.paths
          .map(
            ({ label, color }) =>
              `<div class="legend-row"><div class="swatch" style="background:${color}"></div><span>${esc(label)}</span></div>`,
          )
          .join('')}</div>`
      : '',
    o.walkBars
      ? walkRowsKeyHtml(
          walkRowsKey(o.walkBars, {
            ramp: o.walkRamp,
            rampCss: RAMP_GRADIENT_CSS,
            genes: o.rowGenes,
          }),
        )
      : '',
  ].join('')
}
