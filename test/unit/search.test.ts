import { FIT_PADDING, SMALL_SITE_PX } from '@jbrowse/bandage-core'
import { NO_FOLD } from '@jbrowse/bandage-core/levelOfDetail'
import { expect, test } from '@playwright/test'

import {
  MAX_FIND_ZOOM,
  NODE_SHARE,
  findNodes,
  frameScale,
  unfoldScale,
} from '../../src/search'

import type { Site } from '@jbrowse/bandage-core'

const nodes = ['s10', 'S1', 's100', 'as1', 'x', 's1b'].map(name => ({ name }))
const names = (found: { name: string }[]) => found.map(n => n.name)

test('findNodes ranks exact, then prefix, then contains, ignoring case', () => {
  expect(names(findNodes(nodes, 's1'))).toEqual([
    'S1',
    's10',
    's100',
    's1b',
    'as1',
  ])
})

test('findNodes trims the query and finds nothing for a blank one', () => {
  expect(names(findNodes(nodes, '  X '))).toEqual(['x'])
  expect(findNodes(nodes, '   ')).toEqual([])
  expect(findNodes(nodes, 'nope')).toEqual([])
})

test('findNodes stops at the limit, keeping the best matches', () => {
  expect(names(findNodes(nodes, 's1', 2))).toEqual(['S1', 's10'])
  expect(names(findNodes(nodes, '1', 3))).toEqual(['s10', 'S1', 's100'])
  expect(findNodes(nodes, 's1', 0)).toEqual([])
})

test('findNodes keeps a full prefix tier out of the contains tier', () => {
  const many = ['ab1', 'ab2', 'ab3', 'cab'].map(name => ({ name }))
  expect(names(findNodes(many, 'ab', 2))).toEqual(['ab1', 'ab2'])
})

const usable = (px: number) => (px - FIT_PADDING * 2) * NODE_SHARE

test('frameScale gives the node its share of the tighter axis', () => {
  expect(frameScale({ w: 100, h: 10 }, 1080, 480, false)).toBeCloseTo(
    usable(1080) / 100,
  )
  expect(frameScale({ w: 10, h: 100 }, 1080, 480, false)).toBeCloseTo(
    usable(480) / 100,
  )
})

test('frameScale ignores the height of pixel rows', () => {
  expect(frameScale({ w: 100, h: 1000 }, 1080, 480, true)).toBeCloseTo(
    usable(1080) / 100,
  )
})

test('frameScale caps the zoom for a tiny node', () => {
  expect(frameScale({ w: 0.5, h: 0 }, 1080, 480, false)).toBe(MAX_FIND_ZOOM)
  expect(frameScale({ w: 0, h: 0 }, 1080, 480, false)).toBe(MAX_FIND_ZOOM)
})

test('frameScale never zooms out past the fit', () => {
  expect(frameScale({ w: 1e6, h: 0 }, 1080, 480, true, 0.01)).toBe(0.01)
  expect(frameScale({ w: 0, h: 0 }, 1080, 480, true, 20)).toBe(20)
})

const site = (bp: number): Site => ({
  nodes: [],
  edges: [],
  refName: 'chr',
  start: 0,
  end: 0,
  bp,
  x: 0,
  y: 0,
  count: 1,
  total: 2,
})

test('unfoldScale zooms until each folded node asked for spans its site at SMALL_SITE_PX, and asks nothing for a drawn one', () => {
  const fold = {
    ...NO_FOLD,
    siteOf: new Map([
      ['x', site(2)],
      ['y', site(1)],
    ]),
    pxPerBp: 0.5,
  }
  const x = unfoldScale(['x'], fold, 4)
  expect(2 * fold.pxPerBp * (x / 4)).toBeGreaterThanOrEqual(SMALL_SITE_PX)
  expect(2 * fold.pxPerBp * ((x / 4) * 0.9)).toBeLessThan(SMALL_SITE_PX)
  expect(unfoldScale(['x', 'y'], fold, 4)).toBeCloseTo(2 * x)
  expect(unfoldScale(['r1'], fold, 4)).toBe(0)
  expect(unfoldScale(['x'], NO_FOLD, 4)).toBe(0)
  expect(unfoldScale(['x'], undefined, 4)).toBe(0)
})
