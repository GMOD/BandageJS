import { parseRegion as coreParseRegion } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import { gbzFromQuery } from '../../src/query'
import {
  coreRegion,
  formatRegion,
  namesContig,
  parseLocation,
  parseRegion,
  shifted,
  within,
} from '../../src/region'

test('a region reads 1-based and closed, with commas or two dots', () => {
  expect(parseLocation('chr6:160,614,798-160,647,758')).toEqual({
    refName: 'chr6',
    start: 160_614_797,
    end: 160_647_758,
  })
  expect(parseLocation(' GRCh38#0#chr6:101..200 ')).toEqual({
    refName: 'GRCh38#0#chr6',
    start: 100,
    end: 200,
  })
})

test('one position is the single base it names', () => {
  expect(parseLocation('chr6:160,614,798')).toEqual({
    refName: 'chr6',
    start: 160_614_797,
    end: 160_614_798,
  })
  expect(parseLocation('chr6:1')).toEqual({ refName: 'chr6', start: 0, end: 1 })
  expect(parseLocation('chr6:5-5')).toEqual({
    refName: 'chr6',
    start: 4,
    end: 5,
  })
})

test('a region with its end first, base 0 or no contig, is not one', () => {
  expect(parseLocation('chr6:200-100')).toBeUndefined()
  expect(parseLocation('chr6:0-100')).toBeUndefined()
  expect(parseLocation('chr6:0')).toBeUndefined()
  expect(parseLocation('LPA')).toBeUndefined()
  expect(parseLocation(':1-2')).toBeUndefined()
  expect(parseLocation('')).toBeUndefined()
})

test('parseRegion throws on what parseLocation refuses', () => {
  expect(parseRegion('  chr1:101-200\n')).toEqual({
    refName: 'chr1',
    start: 100,
    end: 200,
  })
  expect(() => parseRegion('chr6 160000')).toThrow(/is not a region/)
  expect(() => parseRegion('')).toThrow(/is not a region/)
})

test('a region formats 1-based with grouped digits', () => {
  expect(
    formatRegion({ refName: 'chr6', start: 160614797, end: 160647758 }),
  ).toBe('chr6:160,614,798-160,647,758')
  expect(formatRegion({ refName: 'chr', start: 0, end: 999 })).toBe('chr:1-999')
})

test('formatting and parsing round-trip', () => {
  for (const text of ['chr6:160,614,798-160,647,758', 'chr1:1-1', 'chrM:8-9']) {
    expect(formatRegion(parseRegion(text))).toBe(text)
  }
  for (const r of [
    { refName: 'chr', start: 0, end: 1 },
    { refName: 'GRCh38#0#chr6', start: 999, end: 2000 },
  ]) {
    expect(parseRegion(formatRegion(r))).toEqual(r)
  }
})

test("a loc= link reaches bandage-core's cut as the window it names", () => {
  const src = gbzFromQuery(
    new URLSearchParams('gbz=hprc&loc=chr6:160,614,798-160,647,758'),
  )!
  const region = parseRegion(src.region)
  expect(coreRegion(region)).toBe('chr6:160614797-160647758')
  expect(coreParseRegion(coreRegion(region))).toEqual(region)
  expect(formatRegion(coreParseRegion(coreRegion(region)))).toBe(src.region)
})

test('a bare contig names its PanSN contig', () => {
  expect(namesContig('chr6', 'GRCh38#0#chr6')).toBe(true)
  expect(namesContig('GRCh38#0#chr6', 'GRCh38#0#chr6')).toBe(true)
  expect(namesContig('chr6', 'chr6')).toBe(true)
  expect(namesContig('chr5', 'GRCh38#0#chr6')).toBe(false)
})

test('a step moves half a window and stops at the start', () => {
  const r = { refName: 'chr6', start: 1000, end: 2000 }
  expect(shifted(r, 0.5)).toEqual({ refName: 'chr6', start: 1500, end: 2500 })
  expect(shifted(r, -0.5)).toEqual({ refName: 'chr6', start: 500, end: 1500 })
  expect(shifted({ ...r, start: 200, end: 1200 }, -0.5)).toEqual({
    refName: 'chr6',
    start: 0,
    end: 1000,
  })
})

test('within needs the same contig and the inner span inside the outer', () => {
  const outer = { refName: 'GRCh38#0#chr6', start: 1000, end: 2000 }
  expect(within({ refName: 'chr6', start: 1000, end: 2000 }, outer)).toBe(true)
  expect(within({ refName: 'chr6', start: 1500, end: 2001 }, outer)).toBe(false)
  expect(within({ refName: 'chr5', start: 1500, end: 1600 }, outer)).toBe(false)
})
