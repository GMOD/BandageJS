import {
  CHRM_WALKS,
  expect,
  haplotypesMenu,
  menuButton,
  openMenu,
  openPage,
  test,
  viewMenu,
  waitForDrawing,
} from './fixtures'

import type { Page } from '@playwright/test'

// 4 kb of the HPRC chrM graph, all 44 haplotypes: at the fit its SNPs are
// too small to draw
const CHRM = `walks=${encodeURIComponent(CHRM_WALKS)}&loc=chrM:2,001-6,000&layout=force`

const NOT_DRAWN =
  /^[\d,]+ nodes?( and [\d,]+ skips?)? under [\d,]+ bp not drawn$/

test('the key ends with the nodes and skips the drawing leaves out as too small to draw', async ({
  page,
}) => {
  await openPage(page, CHRM)
  await waitForDrawing(page, /44 paths/)
  await expect(page.locator('#legends > .legend').last()).toHaveText(NOT_DRAWN)
})

async function svgExport(page: Page) {
  await menuButton(page, 'File').click()
  const download = page.waitForEvent('download')
  await page
    .locator('#menu-popup')
    .getByRole('menuitem', { name: /^Export SVG/ })
    .click()
  return (await (await (await download).createReadStream()).toArray()).join('')
}

test('View › Small sites draws every node at any zoom, kept in the address, and the key and the SVG follow', async ({
  page,
}) => {
  await openPage(page, CHRM)
  await waitForDrawing(page, /44 paths/)
  const key = page.locator('#legends > .legend').last()
  await expect(key).toHaveText(NOT_DRAWN)
  const drawing = () =>
    page.locator('#graph').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  const folded = await drawing()
  expect(await svgExport(page)).toMatch(/under [\d,]+ bp not drawn/)
  const popup = await viewMenu(page)
  const item = popup.getByRole('menuitemcheckbox', { name: 'Small sites' })
  await expect(item).toHaveAttribute('aria-checked', 'false')
  await item.click()
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.locator('#legends')).not.toContainText('not drawn')
  await expect(page).toHaveURL(/[?&]smallsites=1(&|$)/)
  expect(await drawing()).not.toBe(folded)
  expect(await svgExport(page)).not.toContain('not drawn')
  await openPage(page, `${CHRM}&smallsites=1`)
  await waitForDrawing(page, /44 paths/)
  await expect(page.locator('#legends > .legend').last()).toBeVisible()
  await expect(page.locator('#legends')).not.toContainText('not drawn')
})

// Every canvas point, at `step` px, the drawing inks: not left white
function inked(page: Page, step: number) {
  return page.locator('#graph').evaluate((c: HTMLCanvasElement, at: number) => {
    const { data, width, height } = c
      .getContext('2d')!
      .getImageData(0, 0, c.width, c.height)
    const dpr = c.width / c.clientWidth
    const points: string[] = []
    for (let y = 0; y < c.clientHeight; y += at) {
      for (let x = 0; x < c.clientWidth; x += at) {
        const i = (Math.round(y * dpr) * width + Math.round(x * dpr)) * 4
        if (
          i < width * height * 4 &&
          data[i]! + data[i + 1]! + data[i + 2]! < 720
        ) {
          points.push(`${x},${y}`)
        }
      }
    }
    return points
  }, step)
}

// What the hover box says at each canvas point
function hoversAt(page: Page, points: { x: number; y: number }[]) {
  return page
    .locator('#graph')
    .evaluate(async (c: HTMLCanvasElement, at: { x: number; y: number }[]) => {
      const rect = c.getBoundingClientRect()
      const info = document.getElementById('info')!
      const said: string[] = []
      for (const p of at) {
        c.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: rect.left + p.x,
            clientY: rect.top + p.y,
            pointerType: 'mouse',
            bubbles: true,
          }),
        )
        await new Promise(r => requestAnimationFrame(r))
        await new Promise(r => requestAnimationFrame(r))
        said.push(info.hidden ? '' : info.textContent)
      }
      c.dispatchEvent(
        new PointerEvent('pointerleave', { pointerType: 'mouse' }),
      )
      return said
    }, points)
}

async function toggleSmallSites(page: Page) {
  const popup = await viewMenu(page)
  await popup.getByRole('menuitemcheckbox', { name: 'Small sites' }).click()
  await page.keyboard.press('Escape')
}

// alt leaves the reference between r1 and r2 for eight 1 bp nodes, a loop
// FMMM draws a few dozen px across, which is drawn at the fit
const CHAIN = Array.from({ length: 8 }, (_, i) => `a${i}`)
const loopOf = (segments: string[]) =>
  [
    `S\tr1\t${'A'.repeat(2000)}`,
    `S\tr2\t${'C'.repeat(2000)}`,
    ...segments,
    'L\tr1\t+\tr2\t+\t0M',
    ...['r1', ...CHAIN].map(
      (from, i) => `L\t${from}\t+\t${[...CHAIN, 'r2'][i]}\t+\t0M`,
    ),
    'W\tref\t0\tchr\t0\t4000\t>r1>r2',
    `W\talt\t1\tchr\t0\t4008\t>r1${CHAIN.map(a => `>${a}`).join('')}>r2`,
  ].join('\n')
const DRAWN_LOOP = loopOf(CHAIN.map(a => `S\t${a}\tG`))

// The same loop with its last 1 bp the cut did not load. A not-loaded
// stretch is drawn at the layout's least length whatever its bp, so a piece
// holding one is measured by its bp at the reference's px a bp as well as
// as drawn, and the smaller counts: the loop's 8 bp come to under
// SMALL_SITE_PX at the fit, and it folds there.
const LOOP = loopOf(
  CHAIN.map(a => (a === 'a7' ? `S\t${a}\t*\tLN:i:1\tnl:i:1` : `S\t${a}\tG`)),
)

// alt leaves the reference for 5 bp the cut did not load, a placeholder
const UNLOADED = [
  `S\tr1\t${'A'.repeat(2000)}`,
  `S\tr2\t${'C'.repeat(2000)}`,
  'S\tp\t*\tLN:i:5\tnl:i:1',
  ...['r1 r2', 'r1 p', 'p r2'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
  'W\tref\t0\tchr\t0\t4000\t>r1>r2',
  'W\talt\t1\tchr\t0\t4005\t>r1>p>r2',
].join('\n')

async function openGfa(page: Page, gfa: string, nodes: string, query = '') {
  const url = `https://gbz.test/${nodes.replace(' ', '-')}.gfa`
  await page.route(url, route =>
    route.fulfill({
      body: gfa,
      headers: { 'access-control-allow-origin': '*' },
    }),
  )
  await openPage(page, `gfa=${encodeURIComponent(url)}&layout=force${query}`)
  await waitForDrawing(page, nodes)
}

const openLoop = (page: Page, query = '') =>
  openGfa(page, LOOP, '10 nodes', query)

const ON_LOOP = /\ba\d\b/

test('a loop the drawing lays a few dozen px across is drawn at the fit, however few its bp', async ({
  page,
}) => {
  await openGfa(page, DRAWN_LOOP, '10 nodes')
  await expect(page.locator('#legends')).toContainText('1 walk')
  await expect(page.locator('#legends')).not.toContainText('not drawn')
})

test('a node or link the drawing folds is neither hovered nor selected, where drawn it would be', async ({
  page,
}) => {
  await openLoop(page)
  const key = page.locator('#legends > .legend').last()
  await expect(key).toHaveText(/^8 nodes under \d+ bp not drawn$/)
  // the view is the user's, so neither key refits it
  await page.keyboard.press('+')
  await page.keyboard.press('-')
  await page.waitForTimeout(500)
  const folded = new Set(await inked(page, 1))
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).not.toContainText('not drawn')
  await page.waitForTimeout(300)
  const loop = (await inked(page, 1))
    .filter(p => !folded.has(p))
    .map(p => {
      const [x, y] = p.split(',').map(Number)
      return { x: x!, y: y! }
    })
  const drawn = await hoversAt(page, loop)
  expect(drawn.some(said => /^a\d — 1 bp/.test(said))).toBe(true)
  expect(
    drawn.some(said => said.startsWith('Edge:') && ON_LOOP.test(said)),
  ).toBe(true)
  await toggleSmallSites(page)
  await expect(key).toHaveText(/^8 nodes under \d+ bp not drawn$/)
  await page.waitForTimeout(300)
  expect(
    (await hoversAt(page, loop)).filter(said => ON_LOOP.test(said)),
  ).toEqual([])
  const onNode = loop[drawn.findIndex(said => /^a\d — 1 bp/.test(said))]!
  const box = (await page.locator('#graph').boundingBox())!
  await page.mouse.click(box.x + onNode.x, box.y + onNode.y)
  await expect(page.locator('#details')).toBeHidden()
  await expect(page.locator('#announce')).toHaveText('')
})

test('a placeholder the drawing folds carries no length label', async ({
  page,
}) => {
  await openGfa(page, UNLOADED, '3 nodes', '&smallsites=1')
  const labels = page.locator('#overlay-html .size-label')
  await expect(labels.filter({ hasText: /^5 bp$/ })).toHaveCount(1)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText(
    /1 node under \d+ bp not drawn/,
  )
  await expect(labels.filter({ hasText: /^5 bp$/ })).toHaveCount(0)
})

// ref steps m between 1 kb reference nodes, and alt x and then u, 1 bp the
// cut did not load: a bubble whose allele folds at the fit, measured by its
// 3 bp with m at the reference's px a bp, with the reference node m inside
// the site
const NOT_LOADED_U = 'S\tu\t*\tLN:i:1\tnl:i:1'
const SNP = [
  ...['r0', 'r1', 'r2', 'r3'].map(r => `S\t${r}\t${'A'.repeat(1000)}`),
  'S\tm\tA',
  'S\tx\tC',
  NOT_LOADED_U,
  ...['r0 r1', 'r1 m', 'm r2', 'r1 x', 'x u', 'u r2', 'r2 r3'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
  'W\tref\t0\tchr\t0\t4001\t>r0>r1>m>r2>r3',
  'W\talt\t1\tchr\t0\t4002\t>r0>r1>x>u>r2>r3',
].join('\n')

test('no bubble halo or tick lands on a site the drawing folds', async ({
  page,
}) => {
  await openGfa(page, SNP, '7 nodes', '&bubbles=1&smallsites=1')
  const marks = page.locator(
    '#overlay-svg [data-halo], #overlay-svg path[stroke-opacity]',
  )
  await expect(page.locator('#overlay-svg rect.tick')).toHaveCount(1)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText(
    /2 nodes under \d+ bp not drawn/,
  )
  await expect(page.locator('#overlay-svg rect.tick')).toHaveCount(0)
  await expect(marks).toHaveCount(0)
})

// R walks r1, 200 bp, and r2, 3.8 kb; A leaves it after r1 for 400 bp the cut
// did not load. The anchored layout lays the reference at its bp, so the
// placeholder lies at the drawing's left end: zoomed 2.25 times about the
// pane's centre, it is off the pane and still in the drawing built round it.
const LEFT_PLACEHOLDER = [
  `S\tr1\t${'A'.repeat(200)}`,
  `S\tr2\t${'C'.repeat(3800)}`,
  'S\tp\t*\tLN:i:400\tnl:i:1',
  ...['r1 r2', 'r1 p', 'p r2'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
  'W\tref\t0\tchr\t0\t4000\t>r1>r2',
  'W\talt\t1\tchr\t0\t4400\t>r1>p>r2',
].join('\n')

// `gfa` under the anchored layout, which lays the reference at its bp
async function openAnchored(page: Page, gfa: string, nodes: string) {
  const url = `https://gbz.test/anchored-${nodes.replace(' ', '-')}.gfa`
  await page.route(url, route =>
    route.fulfill({
      body: gfa,
      headers: { 'access-control-allow-origin': '*' },
    }),
  )
  await openPage(page, `gfa=${encodeURIComponent(url)}&layout=auto`)
  await waitForDrawing(page, new RegExp(`${nodes}.*Anchored`))
}

test('the key lists the marks the pane shows, read once a zoom has settled', async ({
  page,
}) => {
  await openAnchored(page, LEFT_PLACEHOLDER, '3 nodes')
  const key = page.locator('#legends')
  await expect(key).toContainText('nodes not shown')
  // the view settles at the fit
  await page.waitForTimeout(500)
  const during = await page.evaluate(async () => {
    for (let i = 0; i < 2; i++) {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: '+', bubbles: true }),
      )
    }
    await new Promise(r => requestAnimationFrame(r))
    await new Promise(r => requestAnimationFrame(r))
    return document.getElementById('legends')!.textContent
  })
  expect(during).toContain('nodes not shown')
  await expect(key).not.toContainText('nodes not shown')
  await page.keyboard.press('0')
  await expect(key).toContainText('nodes not shown')
})

// Three haplotypes leave the reference at one point for 300, 500 and 700 bp
// the cut did not load. The anchored layout lays the three on one spot,
// which takes one length, the longest's, and the key counts the other two
const ONE_SPOT = [
  `S\tr1\t${'A'.repeat(2000)}`,
  `S\tr2\t${'C'.repeat(2000)}`,
  'L\tr1\t+\tr2\t+\t0M',
  'W\tref\t0\tchr\t0\t4000\t>r1>r2',
  ...[300, 500, 700].flatMap((bp, i) => [
    `S\tp${i}\t*\tLN:i:${bp}\tnl:i:1`,
    `L\tr1\t+\tp${i}\t+\t0M`,
    `L\tp${i}\t+\tr2\t+\t0M`,
    `W\th${i}\t1\tchr\t0\t${4000 + bp}\t>r1>p${i}>r2`,
  ]),
].join('\n')

test('the row for nodes not shown counts the placeholders the labels leave without a length, in room for all of them, their lengths its title', async ({
  page,
}) => {
  await openAnchored(page, ONE_SPOT, '5 nodes')
  await expect(page.locator('#overlay-html .size-label')).toHaveText(['700 bp'])
  const row = page.locator('#legends .legend-row', {
    hasText: 'nodes not shown',
  })
  await expect(row.locator('.count')).toHaveText('· 2 unlabelled')
  await expect(row).toHaveAttribute(
    'title',
    '2 unlabelled, 500 bp or less each',
  )
  await expect(row.locator('.count-sizer')).toHaveText('· 3 unlabelled')
  const [cell, sizer] = await row
    .locator('.count-cell, .count-sizer')
    .evaluateAll(els => els.map(e => e.getBoundingClientRect().width))
  expect(cell).toBe(sizer)
})

// alt leaves the reference for x, 300 bp the cut loaded, and comes back: the
// force layout draws x long enough to hold its length
const LOADED_LOOP = [
  `S\tr1\t${'A'.repeat(2000)}`,
  `S\tr2\t${'C'.repeat(2000)}`,
  `S\tx\t${'G'.repeat(300)}`,
  'L\tr1\t+\tr2\t+\t0M',
  'L\tr1\t+\tx\t+\t0M',
  'L\tx\t+\tr2\t+\t0M',
  'W\tref\t0\tchr\t0\t4000\t>r1>r2',
  'W\talt\t1\tchr\t0\t4300\t>r1>x>r2',
].join('\n')

test('a loop of loaded nodes writes its length along itself with node lengths off', async ({
  page,
}) => {
  await openGfa(page, LOADED_LOOP, '3 nodes')
  await expect(page.locator('#overlay-html .size-label')).toHaveText(['300 bp'])
})

// The view at the fit, as the address states it once the view is the user's
async function fitView(page: Page) {
  await page.keyboard.press('+')
  await page.keyboard.press('-')
  await expect(page).toHaveURL(/[?&]view=/)
  return new URL(page.url()).searchParams.get('view')!
}

const rings = (page: Page) =>
  page.locator('#overlay-svg g[mask] path[stroke="#2f6fd6"]')

test('a folded node selected, or named in the details, is not ringed', async ({
  page,
}) => {
  await openLoop(page)
  const view = await fitView(page)
  for (const [query, drawn] of [
    ['&smallsites=1', 1],
    ['', 0],
  ] as const) {
    await page.mouse.move(0, 0)
    await openLoop(page, `${query}&node=a3&view=${view}`)
    await expect(page.locator('#details h2')).toHaveText('a3')
    await expect(rings(page)).toHaveCount(drawn)
    await openLoop(page, `${query}&node=r1&view=${view}`)
    await expect(rings(page)).toHaveCount(1)
    await page.locator('#details [data-node^="a0"]').hover()
    await expect(rings(page)).toHaveCount(1 + drawn)
  }
})

test('a strip point on a folded node lights no ring in the drawing', async ({
  page,
}) => {
  for (const [query, drawn] of [
    ['&smallsites=1', 2],
    ['', 0],
  ] as const) {
    await openLoop(page, `${query}&bars=1`)
    await expect(page.locator('#walk-strip')).toBeVisible()
    const at = await page.locator('#strip-svg').evaluate(svg => {
      const runs = [
        ...svg.querySelectorAll(
          '#strip-bars [data-testid="graph-walk-row"] > rect',
        ),
      ].toSorted(
        (a, b) => Number(a.getAttribute('x')) - Number(b.getAttribute('x')),
      )
      const chain = runs[1]!
      const box = svg.getBoundingClientRect()
      return {
        x:
          box.x +
          Number(chain.getAttribute('x')) +
          Number(chain.getAttribute('width')) / 2,
        y:
          box.y +
          Number(chain.getAttribute('y')) +
          Number(chain.getAttribute('height')) / 2,
      }
    })
    await page.mouse.move(at.x, at.y)
    await expect(page.locator('#info')).toContainText(/^a\d — 1 bp/)
    await expect(page.locator('#strip-locator circle')).toHaveCount(drawn)
  }
})

test('a reference node inside a folded site is ringed as wide as the stroke the drawing runs through it', async ({
  page,
}) => {
  await openGfa(page, SNP, '7 nodes')
  const view = await fitView(page)
  const ringPx = async (query: string, node: string) => {
    await openGfa(page, SNP, '7 nodes', `${query}&node=${node}&view=${view}`)
    await expect(rings(page)).toHaveCount(1)
    return Number(await rings(page).getAttribute('stroke-width'))
  }
  // drawn, m is as thin as the one walk stepping it
  expect(await ringPx('&smallsites=1', 'm')).toBeLessThan(
    await ringPx('&smallsites=1', 'r1'),
  )
  // folded, the reference runs through m at r1 and r2's thickness
  expect(await ringPx('', 'm')).toBe(await ringPx('', 'r1'))
})

// SNP as rGFA, its allele x on the reference's own sequence at rank 1, so a
// gene there lies over x as well as the reference
const TAGGED = [
  ...[
    ['r0', 0],
    ['r1', 1000],
    ['r2', 2001],
    ['r3', 3001],
  ].map(
    ([r, at]) => `S\t${r}\t${'A'.repeat(1000)}\tSN:Z:chr\tSO:i:${at}\tSR:i:0`,
  ),
  'S\tm\tA\tSN:Z:chr\tSO:i:2000\tSR:i:0',
  'S\tx\tC\tSN:Z:chr\tSO:i:2000\tSR:i:1',
  NOT_LOADED_U,
  ...SNP.split('\n').filter(line => !line.startsWith('S\t')),
].join('\n')

async function openXGene(page: Page) {
  await openMenu(page, 'File')
  const chooser = page.waitForEvent('filechooser')
  await page
    .locator('#menu-popup')
    .getByRole('menuitem', { name: /^Open genes/ })
    .click()
  await (
    await chooser
  ).setFiles({
    name: 'x.bed',
    mimeType: 'text/plain',
    buffer: Buffer.from('chr\t1990\t2010\tXGENE\t0\t+\n'),
  })
}

const exonOutlines = (page: Page) =>
  page.locator('#overlay-svg #exon-outline path[stroke="#000"]')

test('an exon is outlined only on nodes the drawing draws', async ({
  page,
}) => {
  await openGfa(page, TAGGED, '7 nodes', '&smallsites=1')
  await openXGene(page)
  const exons = exonOutlines(page)
  await expect(exons).toHaveCount(4)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText('2 nodes under')
  await expect(exons).toHaveCount(3)
  await expect(page.locator('#overlay-svg .gene')).toContainText('XGENE')
})

// With a walk lifted across the folded site, the reference node m inside it
// is drawn only by the lanes crossing it, and carries no outline of its own
test('an exon is not outlined on a reference node that only the lanes across a folded site draw', async ({
  page,
}) => {
  await openGfa(
    page,
    TAGGED,
    '7 nodes',
    `&smallsites=1&walk=${encodeURIComponent('ref#0#chr')}`,
  )
  await openXGene(page)
  const exons = exonOutlines(page)
  await expect(exons).toHaveCount(4)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText('2 nodes under')
  await expect(exons).toHaveCount(2)
})

test('the fit leaves the key a column of its own down the right edge', async ({
  page,
}) => {
  await openLoop(page)
  const key = page.locator('#legends')
  await expect(key.locator('.legend').last()).toHaveText(
    /^8 nodes under \d+ bp not drawn$/,
  )
  await page.waitForTimeout(500)
  const column = await key.evaluate(k => {
    const pane = k.parentElement!.getBoundingClientRect()
    return pane.right - k.getBoundingClientRect().left
  })
  const rightmost = await page
    .locator('#graph')
    .evaluate((c: HTMLCanvasElement) => {
      const { data, width, height } = c
        .getContext('2d')!
        .getImageData(0, 0, c.width, c.height)
      let right = 0
      for (let y = 0; y < height; y++) {
        for (let x = right; x < width; x++) {
          const i = (y * width + x) * 4
          if (data[i]! + data[i + 1]! + data[i + 2]! < 720) {
            right = x
          }
        }
      }
      return { right: right / (c.width / c.clientWidth), width: c.clientWidth }
    })
  expect(column).toBeGreaterThan(100)
  expect(rightmost.right).toBeLessThan(rightmost.width - column)
  expect(rightmost.right).toBeGreaterThan(rightmost.width - column - 60)
})

// the loop between two 20 kb reference nodes, folded at any zoom the
// framing of a 1 bp node reaches
const LONG_LOOP = LOOP.replace(/\tA+\n/, '\t*\tLN:i:20000\n').replace(
  /(S\tr2)\tC+\n/,
  '$1\t*\tLN:i:20000\n',
)

test('Find zooms until the folded node it names is drawn, and so does a link naming one', async ({
  page,
}) => {
  await openGfa(page, LONG_LOOP, '10 nodes')
  const key = page.locator('#legends')
  await expect(key).toContainText('8 nodes under')
  await page.locator('#find').fill('a3')
  await page.locator('#find').press('Enter')
  await expect(page.locator('#details h2')).toHaveText('a3')
  await expect(key).not.toContainText('not drawn')
  await expect(rings(page)).toHaveCount(1)
  await openGfa(page, LONG_LOOP, '10 nodes', '&node=a5')
  await expect(page.locator('#details h2')).toHaveText('a5')
  await expect(key).not.toContainText('not drawn')
  await expect(rings(page)).toHaveCount(1)
})

// the reference steps n against its id, between r1 and r2
const BACKWARDS = [
  ...['r1', 'n', 'r2'].map(id => `S\t${id}\t${'A'.repeat(1000)}`),
  'L\tr1\t+\tn\t-\t0M',
  'L\tn\t-\tr2\t+\t0M',
  'W\tref\t0\tchr\t0\t3000\t>r1<n>r2',
].join('\n')

test("an exon on a node the reference steps backwards is outlined at the reference's end of it", async ({
  page,
}) => {
  await openGfa(page, BACKWARDS, '3 nodes')
  await openMenu(page, 'File')
  const chooser = page.waitForEvent('filechooser')
  await page
    .locator('#menu-popup')
    .getByRole('menuitem', { name: /^Open genes/ })
    .click()
  await (
    await chooser
  ).setFiles({
    name: 'ends.bed',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      [
        'chr\t950\t1000\tR1END\t0\t+',
        'chr\t1000\t1050\tNSTART\t0\t+',
        'chr\t1950\t2000\tNEND\t0\t+',
      ].join('\n'),
    ),
  })
  const exons = page.locator('#overlay-svg #exon-outline path[stroke="#000"]')
  await expect(exons).toHaveCount(3)
  const [r1End, nStart, nEnd] = (
    await exons.evaluateAll(paths =>
      paths.map(p =>
        p
          .getAttribute('d')!
          .match(/-?[\d.]+/g)!
          .map(Number),
      ),
    )
  ).map(([x, y]) => ({ x: x!, y: y! }))
  const apart = (a: typeof r1End, b: typeof r1End) =>
    Math.hypot(a!.x - b!.x, a!.y - b!.y)
  expect(apart(nStart, r1End)).toBeLessThan(apart(nEnd, r1End))
})

// alt goes round the reference's a b c d three times
const REPEAT = [
  ...['r1', 'r2'].map(id => `S\t${id}\t${'A'.repeat(1000)}`),
  ...['a', 'b', 'c', 'd'].map(id => `S\t${id}\t${'C'.repeat(200)}`),
  ...['r1 a', 'a b', 'b c', 'c d', 'd a', 'd r2'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
  'W\tref\t0\tchr\t0\t2800\t>r1>a>b>c>d>r2',
  `W\talt\t1\tchr\t0\t4400\t>r1${'>a>b>c>d'.repeat(3)}>r2`,
].join('\n')

async function liftByPass(page: Page, query = '') {
  await openGfa(page, REPEAT, '6 nodes', `&walk=alt%231%23chr${query}`)
  await (
    await haplotypesMenu(page)
  )
    .getByRole('menuitem', { name: 'Colour highlighted…' })
    .click()
  const dialog = page.locator('#highlight-dialog')
  await dialog
    .getByRole('combobox', { name: /^Colour alt/ })
    .selectOption('pass')
  await dialog.getByRole('button', { name: 'Done' }).click()
}

test('each pass of a walk lifted by pass is named on the graph beside its thread, in its colour', async ({
  page,
}) => {
  await liftByPass(page)
  const passes = page.locator('#overlay-svg g.pass')
  await expect(passes).toHaveCount(3)
  await expect(passes.locator('text')).toHaveText([
    'pass 1',
    'pass 2',
    'pass 3',
  ])
  const inks = await passes.evaluateAll(gs =>
    gs.map(g => [
      g.querySelector('line')!.getAttribute('stroke'),
      g.querySelector('circle')!.getAttribute('fill'),
      g.querySelector('text')!.getAttribute('fill'),
    ]),
  )
  expect(inks.every(([a, b, c]) => a === b && b === c)).toBe(true)
  expect(new Set(inks.map(([a]) => a)).size).toBe(3)
  await (
    await haplotypesMenu(page)
  )
    .getByRole('menuitem', { name: 'Colour highlighted…' })
    .click()
  const dialog = page.locator('#highlight-dialog')
  await dialog
    .getByRole('combobox', { name: /^Colour alt/ })
    .selectOption('walk')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(passes).toHaveCount(0)
})

test("a walk lifted by pass gets bandage-core's pass bar under the drawing, its passes along its own length", async ({
  page,
}) => {
  await liftByPass(page)
  const bars = page.locator('#pass-bars svg')
  await expect(bars).toHaveCount(1)
  await expect(bars).toContainText(/along its length/)
  for (const name of ['pass 1', 'pass 2', 'pass 3']) {
    await expect(bars.getByText(name, { exact: false }).first()).toBeVisible()
  }
  const drawing = await page.locator('#pane').boundingBox()
  const bar = await bars.boundingBox()
  expect(bar!.y).toBeGreaterThanOrEqual(drawing!.y + drawing!.height - 1)
  await (
    await haplotypesMenu(page)
  )
    .getByRole('menuitem', { name: 'Colour highlighted…' })
    .click()
  const dialog = page.locator('#highlight-dialog')
  await dialog
    .getByRole('combobox', { name: /^Colour alt/ })
    .selectOption('walk')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('#pass-bars')).toBeHidden()
  await expect(bars).toHaveCount(0)
})

test('side by side, the key line under the panels ends with what the panels leave undrawn', async ({
  page,
}) => {
  const both = `&walk=${encodeURIComponent('ref#0#chr')}&walk=${encodeURIComponent('alt#1#chr')}`
  await openLoop(page, `&facet=walk${both}`)
  await expect(page.locator('#facets .facet')).toHaveCount(2)
  const key = page.locator('#facets .facet-key')
  await expect(key.locator('.legend').last()).toHaveText(
    /^8 nodes under \d+ bp not drawn$/,
  )
  await toggleSmallSites(page)
  await expect(key).not.toContainText('not drawn')
  // six panels of the loop down a wide pane fill its height, and leave the
  // line its room
  await page.setViewportSize({ width: 3000, height: 720 })
  const samples = Array.from({ length: 4 }, (_, i) => `s${i}`)
  const many = [
    LOOP,
    ...samples.map(
      sample =>
        `W\t${sample}\t1\tchr\t0\t4008\t>r1${CHAIN.map(a => `>${a}`).join('')}>r2`,
    ),
  ].join('\n')
  await openGfa(
    page,
    many,
    '10 nodes',
    `&facet=walk&columns=1${both}${samples.map(sample => `&walk=${encodeURIComponent(`${sample}#1#chr`)}`).join('')}`,
  )
  await expect(page.locator('#facets .facet')).toHaveCount(6)
  const pane = (await page.locator('#pane').boundingBox())!
  const panel = (await page.locator('#facets .facet').last().boundingBox())!
  const line = (await key.boundingBox())!
  expect(panel.y + panel.height).toBeGreaterThan(pane.y + pane.height - 40)
  expect(line.y).toBeGreaterThanOrEqual(panel.y + panel.height)
  expect(line.y + line.height).toBeLessThanOrEqual(pane.y + pane.height)
})
