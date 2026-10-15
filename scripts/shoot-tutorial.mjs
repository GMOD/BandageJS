#!/usr/bin/env node
//
// Reshoots the walk file tutorial's figures in img/tutorial/ by driving the
// Open and cut dialogs against the hosted HPRC walk file.
//
// Usage: node scripts/shoot-tutorial.mjs
//
// CHROME=/path/to/chrome overrides the browser.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

import * as esbuild from 'esbuild'
import puppeteer from 'puppeteer-core'

const TIMEOUT = 120_000
const OUT = 'img/tutorial'
const WALKS =
  'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f2.GRCh38.walks.bed.gz'
const REGION = 'chr6:160,614,798-160,647,758'
const HAPS = 'HG00097,HG00133,HG01123,HG02055'
const SIZE = { width: 1400, height: 800 }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function shoot(page, name, el) {
  const path = `${OUT}/${name}.png`
  if (el) {
    const box = await el.boundingBox()
    const pad = 12
    await page.screenshot({
      path,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + 2 * pad,
        height: box.height + 2 * pad,
      },
    })
  } else {
    await page.screenshot({ path })
  }
  console.log(path)
}

async function drawn(page, before = '') {
  await page.waitForFunction(
    before => {
      const stats = document.querySelector('#stats')?.textContent ?? ''
      return /nodes/.test(stats) && stats !== before
    },
    {},
    before,
  )
  await page.waitForSelector('#loading', { hidden: true })
  await page.waitForNetworkIdle({ idleTime: 500 })
  await sleep(3000)
  await page.mouse.move(0, SIZE.height - 1)
}

async function replaceText(page, selector, text) {
  await page.click(selector, { count: 3 })
  await page.keyboard.press('Backspace')
  await page.type(selector, text)
}

mkdirSync(OUT, { recursive: true })
execFileSync('node', ['build.mjs'], { stdio: 'inherit' })
const ctx = await esbuild.context({})
const { port } = await ctx.serve({ servedir: 'dist', port: 0 })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: true,
})
try {
  const page = await browser.newPage()
  page.setDefaultTimeout(TIMEOUT)
  await page.setViewport({ ...SIZE, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('bandagejs-hint-dismissed', 'true')
  })
  await page.goto(`http://localhost:${port}/`)
  await drawn(page)
  await page.click('#menus ::-p-text(File)')
  const open = await page.waitForSelector('[role="menuitem"] ::-p-text(Open…)')
  await shoot(page, 'file_menu')
  await open.click()
  await page.waitForSelector('#open-dialog', { visible: true })
  await page.type('#url', WALKS)
  await shoot(page, 'open_url', await page.$('#open-dialog'))

  await page.click('#open-dialog button[value="url"]')
  await page.waitForSelector('#gbz-dialog', { visible: true })
  await page.waitForFunction(() =>
    /Reference samples:/.test(
      document.querySelector('#gbz-status')?.textContent ?? '',
    ),
  )
  await replaceText(page, '#gbz-region', REGION)
  await replaceText(page, '#gbz-haplotypes', HAPS)
  await shoot(page, 'cut_dialog', await page.$('#gbz-dialog'))

  const before = await page.$eval('#stats', el => el.textContent)
  await page.click('#gbz-dialog button[value="open"]')
  await drawn(page, before)
  await shoot(page, 'cut_graph')

  const address = new URL(page.url())
  address.searchParams.set('layout', 'walkrows')
  await page.goto(address.href)
  await drawn(page)
  await shoot(page, 'cut_rows')
} finally {
  await browser.close()
  await ctx.dispose()
}
