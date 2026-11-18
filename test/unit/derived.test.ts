import {
  WALK_ON_PATH_STRIP_INK,
  abgrHex,
  loadGraph,
  passBars,
  serializeEl,
  walkStripFrame,
} from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import {
  memo,
  rowInksOf,
  rowsOf,
  stripKey,
  stripTree,
  tooLargeText,
  walkView,
} from '../../src/derived'

test('memo recomputes only when a key changes identity', () => {
  let calls = 0
  const f = memo((a: object, n: number) => {
    calls++
    return { a, n }
  })
  const key = {}
  const first = f(key, 1)
  expect(f(key, 1)).toBe(first)
  expect(calls).toBe(1)
  expect(f({}, 1)).not.toBe(first)
  expect(f({}, 1)).not.toBe(first)
  expect(calls).toBe(3)
  f(key, 2)
  expect(calls).toBe(4)
})

const WALKS = [
  'S\tv1\tAAAA',
  'S\tv2\tCC',
  'S\tv3\tGGG',
  'S\ta1\tTTTTTT',
  'L\tv1\t+\tv2\t+\t0M',
  'L\tv2\t+\tv3\t+\t0M',
  'L\tv1\t+\ta1\t+\t0M',
  'L\ta1\t+\tv3\t+\t0M',
  'W\tref\t0\tchr\t0\t9\t>v1>v2>v3',
  'W\talt\t1\tchr\t0\t13\t>v1>a1>v3',
].join('\n')

test('walkView lifts walks as lanes, and side by side a lift of each alone', () => {
  const graph = loadGraph(WALKS, 'walks', { referencePath: 'ref' })
  const layers = [{ walk: 'ref#0#chr' }, { walk: 'alt#1#chr' }]
  const lanes = walkView(graph, layers, undefined, false, '')
  expect(lanes.lift!.walks.map(w => w.encoding.field)).toEqual(['walk', 'walk'])
  expect(lanes.panels).toBeUndefined()
  const facets = walkView(graph, layers, undefined, false, 'walk')
  expect(
    facets.panels!.map(p => [p.walks[0]!.name, p.walks[0]!.encoding]),
  ).toEqual([
    ['ref#0#chr', { field: 'progress', scheme: 'red' }],
    ['alt#1#chr', { field: 'progress', scheme: 'red' }],
  ])
  expect(
    walkView(graph, [{ walk: 'alt#1#chr' }], undefined, false, 'walk').panels,
  ).toBeUndefined()
  expect(walkView(graph, layers, undefined, true, 'walk')).toEqual({
    lift: undefined,
    panels: undefined,
  })
})

test('the notice names the lifted walks a cut left abridged', () => {
  expect(tooLargeText(['HG00133#1'])).toBe(
    'HG00133#1 is too large to read in full here, so it is drawn abridged',
  )
  expect(tooLargeText(['IAI39', 'Sakai'])).toBe(
    'IAI39 and Sakai are too large to read in full here together, so they are drawn abridged',
  )
})

// hap steps the repeat r twice, so a lift by pass threads it in two colours
const REPEAT = [
  'S\ts1\t*\tLN:i:1000',
  'S\ts2\t*\tLN:i:500',
  'S\tr\t*\tLN:i:200',
  'S\tu\t*\tLN:i:3000',
  'S\ts5\t*\tLN:i:1000',
  'L\ts1\t+\ts2\t+\t0M',
  'L\ts2\t+\tr\t+\t0M',
  'L\tr\t+\tr\t+\t0M',
  'L\tr\t+\tu\t+\t0M',
  'L\tu\t+\ts5\t+\t0M',
  'P\tref#0#chr1\ts1+,s2+,r+,u+,s5+\t*',
  'P\thap#1#ctg\ts1+,s2+,r+,r+,u+,s5+\t*',
].join('\n')

const stopColors = (svg: string) =>
  [...svg.matchAll(/<stop offset="[^"]*" stop-color="([^"]+)"/g)].map(m => m[1])

const barFills = (key: ReturnType<typeof stripKey>) =>
  key.map(entry => entry.swatch.kind === 'bar' && entry.swatch.fill)

test("a walk lifted by pass paints its strip row in its passes' colours, and loses its pass bar under the strip", () => {
  const graph = loadGraph(REPEAT, 'repeat')
  const view = walkView(
    graph,
    [{ walk: 'hap#1#ctg', color: { field: 'pass' } }],
    undefined,
    false,
    '',
  )
  const drawn = view.lift!.walks[0]!.walkPasses!
  const passColors = drawn.passes.map(pass => abgrHex(pass.ink))
  expect(passColors).toHaveLength(2)
  const bars = rowsOf(graph, undefined)!
  const frame = walkStripFrame(bars, { width: 800 })
  const inks = rowInksOf(view)
  expect(
    stopColors(serializeEl(stripTree(bars, frame, undefined, undefined, []))),
  ).toEqual([])
  expect(
    stopColors(serializeEl(stripTree(bars, frame, undefined, undefined, inks))),
  ).toEqual(expect.arrayContaining(passColors))
  expect(barFills(stripKey(bars, undefined, undefined, []))).not.toContain(
    WALK_ON_PATH_STRIP_INK,
  )
  expect(barFills(stripKey(bars, undefined, undefined, inks))).toContain(
    WALK_ON_PATH_STRIP_INK,
  )
  expect(passBars(view.lift, undefined).map(bar => bar.walk)).toEqual([
    'hap#1#ctg',
  ])
  expect(passBars(view.lift, bars)).toEqual([])
})
