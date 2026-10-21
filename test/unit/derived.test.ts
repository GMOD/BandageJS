import { loadGraph } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import { abridgedText, memo, tooLargeText, walkView } from '../../src/derived'

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

test("an abridged walk's block counts the steps and bp it left out", () => {
  expect(abridgedText('HG00097#1', { steps: 140_000, bp: 2_100_000 })).toBe(
    'HG00097#1: 140 k steps, 2.1 Mb off reference',
  )
  expect(abridgedText('Sakai#1', { steps: 35, bp: 460 })).toBe(
    'Sakai#1: 35 steps, 460 bp off reference',
  )
})

test('the notice names the lifted walks a cut left abridged', () => {
  expect(tooLargeText(['HG00133#1'])).toBe(
    'HG00133#1 is too large to read in full here, so it is drawn abridged',
  )
  expect(tooLargeText(['IAI39', 'Sakai'])).toBe(
    'IAI39 and Sakai are too large to read in full here together, so they are drawn abridged',
  )
})
