#!/usr/bin/env node
//
// Reshoots the README and gallery figures in img/ from a fresh build, cutting
// the HPRC figures live from the hosted HPRC walk file. The figures that key
// walks cut from gbz-base: a walk file cut's graph has no reference path, so
// its walk keys lose their length change and the reference its charcoal.
//
// Usage:
//   node scripts/shoot-readme.mjs              # every figure, into img/
//   node scripts/shoot-readme.mjs cfh_facet    # one figure
//
// CHROME=/path/to/chrome overrides the browser.
import { execFileSync } from 'node:child_process'

import * as esbuild from 'esbuild'
import puppeteer from 'puppeteer-core'

const TIMEOUT = 120_000

const FIGURES = {
  kiv2_force: {
    query: 'gfa=examples/hprc_kiv2.gfa&layout=force',
    size: [1400, 800],
  },
  kiv2_facet: {
    query: [
      'gbz=hprc',
      'loc=chr6:160,614,798-160,647,758',
      'haps=HG00097,HG00133',
      'walk=GRCh38%230%23chr6',
      'walk=HG00097%231%23JBIRDD010000043.1',
      'walk=HG00133%231%23CM090050.1',
      'facet=walk',
      'columns=3',
    ].join('&'),
    size: [1400, 800],
  },
  kiv2_overlay: {
    query: [
      'gbz=hprc',
      'loc=chr6:160,614,798-160,647,758',
      'haps=HG00097,HG00133',
      'walk=GRCh38%230%23chr6',
      'walk=HG00097%231%23JBIRDD010000043.1',
      'walk=HG00133%231%23CM090050.1',
      'layout=force',
    ].join('&'),
    size: [1400, 800],
  },
  amy1_rows: {
    query: [
      'walks=hprc',
      'loc=chr1:103,540,000-103,780,000',
      'haps=HG00097,HG00133,HG01123,HG02055',
      'layout=walkrows',
    ].join('&'),
    size: [1400, 460],
  },
  kiv2_strip: {
    query: [
      'walks=hprc',
      'loc=chr6:160,614,798-160,647,758',
      'haps=HG00097,HG00128,HG01123,HG00099,HG01960,HG02055,HG00133,HG01109',
      'layout=force',
    ].join('&'),
    size: [1400, 900],
    settings: { walkStrip: true },
    strip: { row: 1, along: 0.3 },
  },
  cfh_force: {
    query: [
      'walks=hprc',
      'loc=chr1:196,640,000-196,900,000',
      'haps=HG00097,HG02055,HG01123',
      'layout=force',
    ].join('&'),
    size: [1400, 800],
  },
  cfh_facet: {
    query: [
      'gbz=hprc',
      'loc=chr1:196,640,000-196,900,000',
      'haps=HG00097,HG02055',
      'walk=GRCh38%230%23chr1',
      'walk=HG00097%231%23CM094060.1',
      'walk=HG02055%231%23CM092205.1',
      'facet=walk',
      'columns=3',
    ].join('&'),
    size: [1400, 300],
  },
  mhc_stress: {
    query: 'gfa=examples/hprc_mhc_class2.gfa&layout=force&engine=stress',
    size: [1400, 800],
  },
  ecoli_genes: {
    query: 'gfa=examples/ecoli_rgfa_slice.gfa&layout=force',
    size: [1400, 800],
  },
  assembly_graph: {
    query: 'gfa=examples/assembly_graph.gfa&layout=force',
    size: [1400, 900],
    settings: { colorScheme: 'random' },
  },
  tube_map: {
    query: 'gfa=examples/ecoli_pggb_subgraph.gfa&layout=tubemap',
    size: [1400, 520],
  },
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const names = process.argv.slice(2)
for (const name of names) {
  if (!(name in FIGURES)) {
    throw new Error(`no figure ${name}; one of ${Object.keys(FIGURES)}`)
  }
}

execFileSync('node', ['build.mjs'], { stdio: 'inherit' })
const ctx = await esbuild.context({})
const { port } = await ctx.serve({ servedir: 'dist', port: 0 })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: true,
})
try {
  for (const [name, { query, size, settings, strip }] of Object.entries(
    FIGURES,
  )) {
    if (names.length && !names.includes(name)) {
      continue
    }
    const page = await browser.newPage()
    page.setDefaultTimeout(TIMEOUT)
    await page.setViewport({
      width: size[0],
      height: size[1],
      deviceScaleFactor: 1,
    })
    await page.evaluateOnNewDocument(stored => {
      localStorage.setItem('bandagejs-hint-dismissed', 'true')
      if (stored) {
        localStorage.setItem('bandagejs-settings', JSON.stringify(stored))
      }
    }, settings)
    await page.goto(`http://localhost:${port}/?${query}`)
    await page.waitForFunction(() =>
      /nodes/.test(document.querySelector('#stats')?.textContent ?? ''),
    )
    await page.waitForSelector('#loading', { hidden: true })
    // genes arrive after the drawing
    await page.waitForNetworkIdle({ idleTime: 500 })
    // the force layout settles over a few frames after the worker returns
    await sleep(3000)
    await page.mouse.move(0, size[1] - 1)
    if (strip) {
      const box = await (await page.$('#strip-svg')).boundingBox()
      const rows = await page.$$eval(
        '#strip-bars [data-testid^="graph-walk-r"] > rect',
        rects =>
          [
            ...new Set(
              rects.map(r => r.y.baseVal.value + r.height.baseVal.value / 2),
            ),
          ].sort((a, b) => a - b),
      )
      await page.mouse.move(
        box.x + box.width * strip.along,
        box.y + rows[strip.row],
      )
      await sleep(300)
    }
    await page.screenshot({ path: `img/${name}.png` })
    console.log(`img/${name}.png`)
    await page.close()
  }
} finally {
  await browser.close()
  await ctx.dispose()
}
