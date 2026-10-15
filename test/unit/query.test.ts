import { expect, test } from '@playwright/test'

import { HPRC, HPRC_WALKS } from '../../src/gbz'
import { gbzFromQuery, gbzQuery } from '../../src/query'

import type { GbzSource } from '../../src/gbz'

function roundTrip(src: GbzSource) {
  return gbzFromQuery(new URLSearchParams(gbzQuery(src)))
}

test('the HPRC database goes into the query as the hprc preset', () => {
  const src = { ...HPRC, region: 'chr6:160,614,798-160,647,758' }
  expect(gbzQuery(src)).toEqual({
    gbz: 'hprc',
    loc: 'chr6:160,614,798-160,647,758',
  })
  expect(roundTrip(src)).toEqual({
    ...src,
    referenceSample: undefined,
    haplotypes: undefined,
  })
})

test('another database keeps its index, reference and haplotypes', () => {
  const src = {
    db: 'https://example.org/graph.gbz.db',
    index: 'https://example.org/graph.index.db',
    region: 'chr1:100-200',
    referenceSample: 'CHM13',
    haplotypes: ['HG002', 'HG00097'],
  }
  expect(gbzQuery(src)).toEqual({
    walks: src.db,
    index: src.index,
    loc: src.region,
    ref: 'CHM13',
    haps: 'HG002,HG00097',
  })
  expect(roundTrip(src)).toEqual(src)
})

test("the HPRC database without the preset's index keeps its url", () => {
  const src = { db: HPRC.db, region: 'chr1:100-200' }
  expect(gbzQuery(src).walks).toBe(HPRC.db)
  expect(roundTrip(src)).toEqual({
    ...src,
    index: undefined,
    referenceSample: undefined,
    haplotypes: undefined,
  })
})

test('the HPRC walk file goes into the query as walks=hprc', () => {
  const src = { db: HPRC_WALKS, region: 'chr1:100-200' }
  expect(gbzQuery(src)).toEqual({ walks: 'hprc', loc: src.region })
  expect(roundTrip(src)).toEqual({
    ...src,
    index: undefined,
    referenceSample: undefined,
    haplotypes: undefined,
  })
})

test('an older gbz= link still names its database', () => {
  const db = 'https://example.org/graph.gbz.db'
  expect(
    gbzFromQuery(new URLSearchParams({ gbz: db, loc: 'chr1:100-200' }))?.db,
  ).toBe(db)
})

test('a query without both a source and loc names no cut', () => {
  expect(gbzFromQuery(new URLSearchParams('walks=hprc'))).toBeUndefined()
  expect(gbzFromQuery(new URLSearchParams('gbz=hprc'))).toBeUndefined()
  expect(gbzFromQuery(new URLSearchParams('loc=chr1:1-2'))).toBeUndefined()
})
