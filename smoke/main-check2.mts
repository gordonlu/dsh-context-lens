import { createRequire } from 'node:module'
const requireFromHarness = createRequire('/data/code/deepseek-harness/package.json')
const { chromium } = requireFromHarness('playwright') as typeof import('playwright')
const URL = 'http://127.0.0.1:3080'
const browser = await chromium.launch({ headless: true, executablePath: '/home/gordon/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' })
const page = await browser.newPage()
const errors: string[] = []
page.on('pageerror', e => errors.push(String(e).slice(0, 300)))
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)) })
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(15000)
const text = await page.evaluate(() => document.body?.innerText ?? '')
console.log('--- main instance visible text (first 1200) ---')
console.log(text.slice(0, 1200))
const boot = await page.evaluate(() => {
  const b = (window as unknown as { __DSH_BOOT__?: { entries?: { id: string }[] } }).__DSH_BOOT__
  return b?.entries?.map(e => e.id).filter(id => id.includes('context-lens')) ?? []
})
console.log('boot entries with context-lens:', JSON.stringify(boot))
console.log('page errors:', JSON.stringify(errors.slice(0, 4)))
await browser.close()
