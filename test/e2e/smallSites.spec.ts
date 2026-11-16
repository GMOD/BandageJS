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
