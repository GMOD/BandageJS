import { CHRM_WALKS, expect, openPage, test, waitForDrawing } from './fixtures'

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
