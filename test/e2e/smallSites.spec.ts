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
// FMMM draws a few dozen px across, folded at the fit as 8 bp
const CHAIN = Array.from({ length: 8 }, (_, i) => `a${i}`)
const LOOP = [
  `S\tr1\t${'A'.repeat(2000)}`,
  `S\tr2\t${'C'.repeat(2000)}`,
  ...CHAIN.map(a => `S\t${a}\tG`),
  'L\tr1\t+\tr2\t+\t0M',
  ...['r1', ...CHAIN].map(
    (from, i) => `L\t${from}\t+\t${[...CHAIN, 'r2'][i]}\t+\t0M`,
  ),
  'W\tref\t0\tchr\t0\t4000\t>r1>r2',
  `W\talt\t1\tchr\t0\t4008\t>r1${CHAIN.map(a => `>${a}`).join('')}>r2`,
].join('\n')

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

// ref steps m and alt x between 1 kb reference nodes, both 1 bp: a bubble
// whose allele x folds at the fit, with the reference node m inside the site
const SNP = [
  ...['r0', 'r1', 'r2', 'r3'].map(r => `S\t${r}\t${'A'.repeat(1000)}`),
  'S\tm\tA',
  'S\tx\tC',
  ...['r0 r1', 'r1 m', 'm r2', 'r1 x', 'x r2', 'r2 r3'].map(pair => {
    const [from, to] = pair.split(' ')
    return `L\t${from}\t+\t${to}\t+\t0M`
  }),
  'W\tref\t0\tchr\t0\t4001\t>r0>r1>m>r2>r3',
  'W\talt\t1\tchr\t0\t4001\t>r0>r1>x>r2>r3',
].join('\n')

test('no bubble halo or tick lands on a site the drawing folds', async ({
  page,
}) => {
  await openGfa(page, SNP, '6 nodes', '&bubbles=1&smallsites=1')
  const marks = page.locator(
    '#overlay-svg [data-halo], #overlay-svg path[stroke-opacity]',
  )
  await expect(page.locator('#overlay-svg rect.tick')).toHaveCount(1)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText(
    /1 node under \d+ bp not drawn/,
  )
  await expect(page.locator('#overlay-svg rect.tick')).toHaveCount(0)
  await expect(marks).toHaveCount(0)
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
  await openGfa(page, SNP, '6 nodes')
  const view = await fitView(page)
  const ringPx = async (query: string, node: string) => {
    await openGfa(page, SNP, '6 nodes', `${query}&node=${node}&view=${view}`)
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
  ...SNP.split('\n').filter(line => !line.startsWith('S\t')),
].join('\n')

test('an exon is outlined only on nodes the drawing draws', async ({
  page,
}) => {
  await openGfa(page, TAGGED, '6 nodes', '&smallsites=1')
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
  const exons = page.locator('#overlay-svg #exon-outline path[stroke="#000"]')
  await expect(exons).toHaveCount(4)
  await toggleSmallSites(page)
  await expect(page.locator('#legends')).toContainText('1 node under')
  await expect(exons).toHaveCount(3)
  await expect(page.locator('#overlay-svg .gene')).toContainText('XGENE')
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
