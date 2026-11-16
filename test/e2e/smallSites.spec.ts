import {
  CHRM_WALKS,
  expect,
  menuButton,
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
