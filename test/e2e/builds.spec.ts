import {
  CHRM_WALKS,
  expect,
  openMenu,
  openPage,
  test,
  waitForDrawing,
} from './fixtures'

import type { Page } from '@playwright/test'

// a window whose key gains a row for what the build folds, which widens
// the key and so moves the fit
const CUT = `walks=${encodeURIComponent(CHRM_WALKS)}&loc=chrM:1-4,000`

const builds = (page: Page) =>
  page.evaluate(() => performance.getEntriesByName('geometry').length)

// past the key's debounce, so a build it would have asked for has run
const settled = (page: Page) => page.waitForTimeout(600)

for (const [layout, engine, drawn] of [
  ['force', 'stress', /Force-directed/],
  ['force', 'fmmm', /Force-directed/],
  ['ordered', 'fmmm', /Ordered/],
] as const) {
  test(`a first ${layout} ${engine} drawing builds its geometry once`, async ({
    page,
  }) => {
    await openPage(page, `${CUT}&layout=${layout}&engine=${engine}`)
    await waitForDrawing(page, drawn)
    await settled(page)
    expect(await builds(page)).toBe(1)
  })
}

test('a layout switch builds the geometry once', async ({ page }) => {
  await openPage(page, `${CUT}&layout=ordered`)
  await waitForDrawing(page, /Ordered/)
  await settled(page)
  const before = await builds(page)
  await (
    await openMenu(page, 'Layout')
  )
    .getByRole('menuitemradio', { name: 'Force-directed (stress)' })
    .click()
  await page.keyboard.press('Escape')
  await waitForDrawing(page, /Force-directed/)
  await settled(page)
  expect((await builds(page)) - before).toBe(1)
})
