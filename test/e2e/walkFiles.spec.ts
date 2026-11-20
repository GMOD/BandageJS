import {
  CHRM_WALKS,
  expect,
  haplotypesMenu,
  menuButton,
  openPage,
  test,
  waitForDrawing,
} from './fixtures'

const CHRM = `walks=${encodeURIComponent(CHRM_WALKS)}&loc=chrM:8,000-8,300&layout=force`

test('a link cuts a window from a gfa-to-tabix walk file', async ({
  page,
  consoleErrors,
}) => {
  await openPage(page, CHRM)
  await waitForDrawing(page, /44 paths/)
  await expect(page.locator('#caption')).toContainText(
    'GRCh38 chrM:8,000-8,300',
  )
  await expect(page.locator('#locate')).toHaveValue('chrM:8,000-8,300')
  expect(consoleErrors).toEqual([])
})

test('a pasted walk file url fills the cut dialog with its reference samples', async ({
  page,
}) => {
  await openPage(page, CHRM)
  await waitForDrawing(page, /44 paths/)
  await menuButton(page, 'File').click()
  await page
    .locator('#menu-popup')
    .getByRole('menuitem', { name: 'Open…' })
    .click()
  await page.locator('#url').fill(CHRM_WALKS)
  await page.locator('#url').press('Enter')
  await expect(page.locator('#gbz-dialog')).toBeVisible()
  await expect(page.locator('#gbz-db')).toHaveValue(CHRM_WALKS)
  await expect(page.locator('#gbz-index')).toBeHidden()
  await expect(page.locator('#gbz-status')).toContainText(
    'Reference samples: GRCh38',
    { timeout: 20_000 },
  )
  await page.locator('#gbz-region').fill('chrM:100-300')
  await page.locator('#gbz-haplotypes').fill('HG00438')
  await page.locator('#gbz-dialog').getByRole('button', { name: 'Cut' }).click()
  await waitForDrawing(page, /2 paths/)
  expect(new URL(page.url()).searchParams.get('haps')).toBe('HG00438')
})

test('Links drawn cuts again with the links any haplotype takes between the nodes shown, and the address keeps the choice', async ({
  page,
}) => {
  const edges = async () =>
    Number(
      /([\d,]+) edges/
        .exec((await page.locator('#stats').textContent()) ?? '')?.[1]
        ?.replaceAll(',', ''),
    )
  const choose = async (name: string) => {
    const popup = await haplotypesMenu(page, 'Links drawn')
    await popup.getByRole('menuitemradio', { name }).click()
  }
  const linksInAddress = () => new URL(page.url()).searchParams.get('links')
  await openPage(
    page,
    `walks=${encodeURIComponent(CHRM_WALKS)}&loc=chrM:1-16,569&haps=HG00438&layout=force`,
  )
  await waitForDrawing(page, /2 paths/)
  const walked = await edges()
  expect(linksInAddress()).toBeNull()
  await choose('Taken by any haplotype between the nodes shown')
  await expect.poll(linksInAddress).toBe('between')
  await expect.poll(edges).toBeGreaterThan(walked)
  await choose('Walked by the haplotypes shown')
  await expect.poll(linksInAddress).toBeNull()
  await expect.poll(edges).toBe(walked)
})
