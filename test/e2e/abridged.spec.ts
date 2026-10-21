import {
  ABRIDGED_WALKS,
  expect,
  haplotypesMenu,
  openPage,
  test,
  waitForDrawing,
} from './fixtures'

import type { Page } from '@playwright/test'

const CUT = `walks=${encodeURIComponent(ABRIDGED_WALKS)}&loc=K12%231%23chr:1004501-1004961&layout=force`
const IAI39 = 'IAI39: 35 steps, 460 bp off reference'
const SAKAI = 'Sakai: 35 steps, 460 bp off reference'

const expanded = (page: Page) => new URL(page.url()).searchParams.get('expand')

async function blocks(page: Page) {
  return (await haplotypesMenu(page)).getByRole('menuitem', {
    name: /off reference$/,
  })
}

test('an abridged walk shows as a block that loads its steps', async ({
  page,
  consoleErrors,
}) => {
  await openPage(page, CUT)
  await waitForDrawing(page, /5 paths/)
  const items = await blocks(page)
  await expect(items).toHaveText([IAI39, SAKAI])
  await items.filter({ hasText: SAKAI }).click()
  await expect.poll(() => expanded(page)).toBe('Sakai#1#chr')
  await waitForDrawing(page, /5 paths/)
  await expect(await blocks(page)).toHaveText([IAI39])
  expect(consoleErrors).toEqual([])
})

test("a link's lifted walk is read in full, and its expanded walks stay so", async ({
  page,
}) => {
  await openPage(page, `${CUT}&walk=IAI39%231%23chr&expand=Sakai%231%23chr`)
  await waitForDrawing(page, /5 paths/)
  await expect.poll(() => expanded(page)).toBe('IAI39#1#chr,Sakai#1#chr')
  await expect(await blocks(page)).toHaveCount(0)
})

test('lifting an abridged walk reads it in full', async ({ page }) => {
  await openPage(page, CUT)
  await waitForDrawing(page, /5 paths/)
  const popup = await haplotypesMenu(page)
  await popup.getByRole('menuitemcheckbox', { name: 'IAI39' }).click()
  await expect.poll(() => expanded(page)).toBe('IAI39#1#chr')
  await waitForDrawing(page, /5 paths/)
  expect(new URL(page.url()).searchParams.getAll('walk')).toEqual([
    'IAI39#1#chr',
  ])
  await expect(await blocks(page)).toHaveText([SAKAI])
})

test("a selected walk row offers to load an abridged walk's steps", async ({
  page,
}) => {
  await openPage(page, CUT.replace('layout=force', 'layout=walkrows'))
  await waitForDrawing(page, /Walk rows/)
  const sakai = page.locator('#overlay-html .row-label', { hasText: 'Sakai' })
  const label = (await sakai.boundingBox())!
  await page.mouse.click(600, label.y + label.height / 2)
  const info = page.locator('#info')
  await expect(info).toContainText('35 steps, 460 bp off reference not loaded')
  await info.getByRole('button', { name: 'Load its steps' }).click()
  await expect.poll(() => expanded(page)).toBe('Sakai#1#chr')
})
