import { createRequire } from 'node:module'
const requireFromHarness = createRequire('/data/code/deepseek-harness/package.json')
const { chromium } = requireFromHarness('playwright') as typeof import('playwright')
const URL = 'http://127.0.0.1:3080'
const browser = await chromium.launch({ headless: true, executablePath: '/home/gordon/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' })
const page = await browser.newPage()
const errors: string[] = []
page.on('pageerror', e => errors.push(String(e).slice(0, 200)))
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(10000)
// click the most recent session row
const row = page.locator('[class*="session"], [class*="conversation"]').first()
const tabs0 = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).map(el => (el.textContent ?? '').trim()))
console.log('tabs (before opening a session):', JSON.stringify(tabs0))
// open lens tab directly if present
const lensTab = page.locator('[role="tab"]', { hasText: /请求上下文|Request Context/ }).first()
if (await lensTab.isVisible().catch(() => false)) {
  await lensTab.click()
  await page.waitForTimeout(3000)
  const text = await page.evaluate(() => document.body?.innerText ?? '')
  const i = text.indexOf('Session log')
  console.log('--- lens panel on main instance (after Session log) ---')
  console.log(text.slice(i, i + 1500))
} else {
  console.log('lens tab not visible yet; clicking a session row first')
  await page.locator('text=').first().click().catch(() => {})
  await page.waitForTimeout(3000)
  console.log('tabs after session:', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).map(el => (el.textContent ?? '').trim()))))
}
console.log('page errors:', JSON.stringify(errors))
await browser.close()
