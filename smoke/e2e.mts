/**
 * e2e.mts — full GUI E2E smoke for dsh-context-lens (HANDOVER §5.2).
 *
 * Drives the SECOND web instance (isolated DSH_HOME, mock LLM route) in a
 * real headless browser and asserts the whole client-side surface:
 *
 *   1. the plugin bundle is served at /plugins/dsh-context-lens/client.js
 *      and the boot manifest carries the entry,
 *   2. the plugin CSS tag lands in <head>,
 *   3. the conversation.view slot renders the context-lens tab and the
 *      projection panel shows the overview strip, the record list, and the
 *      inspector (usage buckets, unavailable semantics),
 *   4. a second real turn produces a second record,
 *   5. switching the UI language toggles the tab label and panel copy
 *      (请求上下文 ↔ Request Context), then switches back.
 *
 * Prereqs (see smoke/README.md): mock LLM on :8900, second web instance on
 * :3081 with the plugin mounted. Exits non-zero on any failed assertion.
 */

import { createRequire } from 'node:module'
const requireFromHarness = createRequire('/data/code/deepseek-harness/package.json')
const { chromium } = requireFromHarness('playwright') as typeof import('playwright')

const URL = process.env.E2E_URL ?? 'http://127.0.0.1:3081'
const CHROMIUM = process.env.E2E_CHROMIUM
  ?? '/home/gordon/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'

let failures = 0
function check(label: string, condition: boolean, detail?: unknown): void {
  const mark = condition ? 'PASS' : 'FAIL'
  if (!condition) failures += 1
  console.log(`  [${mark}] ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
}

const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM })
const page = await browser.newPage()
const consoleErrors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
})
page.on('pageerror', err => consoleErrors.push(String(err).slice(0, 200)))

/** Current conversation-view tab labels (in any locale). */
const tabs = (): Promise<string[]> =>
  page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).map(el => (el.textContent ?? '').trim()))

/** Wait for the lens tab in either language, then click it and return panel text. */
async function openLensPanel(): Promise<string> {
  const tab = page.locator('[role="tab"]', { hasText: /Request Context|请求上下文/ }).first()
  await tab.waitFor({ state: 'visible', timeout: 30000 })
  await tab.click()
  await page.waitForTimeout(2500)
  return page.evaluate(() => document.body?.innerText ?? '')
}

/** Switch the UI language through Settings. Returns the new tab labels. */
async function switchLanguage(target: 'zh' | 'en'): Promise<string[]> {
  const wantEn = target === 'en'
  await page.getByRole('button', { name: /设置|Settings/ }).first().click()
  await page.waitForTimeout(2500)
  console.log(`  (switch to ${target}: settings page = ${JSON.stringify(await page.evaluate(() => (document.body?.innerText ?? '').slice(0, 60)))})`)
  const picked = await page.evaluate((wanted) => {
    const titles = Array.from(document.querySelectorAll('*'))
      .filter(el => (el.textContent ?? '').trim() === wanted)
    for (const t of titles) {
      let node: HTMLElement | null = t.parentElement
      for (let i = 0; i < 4 && node; i++) {
        const button = node.querySelector('button')
        if (button) { (button as HTMLButtonElement).click(); return true }
        node = node.parentElement
      }
    }
    return false
  }, wantEn ? '语言' : 'Language')
  console.log(`  (switch to ${target}: language row picked = ${picked})`)
  await page.waitForTimeout(1500)
  const pickedOption = await page.evaluate((label) => {
    const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'))
      .filter(el => (el.textContent ?? '').trim() === label)
    if (options.length === 0) return false
    ;(options[0] as HTMLElement).click()
    return true
  }, wantEn ? 'English' : '中文')
  console.log(`  (switch to ${target}: option clicked = ${pickedOption})`)
  await page.waitForTimeout(4000)
  // Back to the conversation surface (click a session row).
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)
  const anySession = page.locator('text=E2E mock reply from llm-mock-server').first()
  if (await anySession.isVisible().catch(() => false)) {
    await anySession.click()
    await page.waitForTimeout(3000)
  }
  return tabs()
}

async function main(): Promise<number> {
  console.log('=== dsh-context-lens GUI E2E (real browser, mock LLM) ===')
  console.log(`target: ${URL}`)

  // 0. Boot manifest + bundle serving.
  const response = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  check('index loads', response?.status() === 200, response?.status())
  const bundleResp = await page.request.get(`${URL}/plugins/dsh-context-lens/client.js`)
  check('plugin bundle served at /plugins/dsh-context-lens/client.js', bundleResp.ok(), bundleResp.status())
  const bundleText = await bundleResp.text()
  check('bundle hands off through the loader', bundleText.includes('__ModuleLoader__.load({') && bundleText.includes('dsh-context-lens'))
  const bootJson = await page.evaluate(() =>
    JSON.stringify((window as unknown as { __DSH_BOOT__?: unknown }).__DSH_BOOT__ ?? ''))
  check('boot manifest carries the entry', bootJson.includes('dsh-context-lens'))
  await page.waitForTimeout(6000)

  // Onboarding gate.
  const cont = page.getByRole('button', { name: '继续' }).first()
  if (await cont.isVisible().catch(() => false)) {
    await cont.click()
    await page.waitForTimeout(6000)
  }

  // 1. Plugin CSS in the live page.
  check('plugin CSS tag injected', await page.evaluate(() =>
    document.querySelectorAll('style[data-plugin="dsh-context-lens"]').length) > 0)

  // 2. Baseline language: force Chinese so assertions are deterministic
  //    (the E2E home persists the language across runs).
  const firstTabs = await tabs()
  if (firstTabs.includes('Request Context')) {
    console.log('  (instance was English — switching to Chinese baseline)')
    await switchLanguage('zh')
  }

  // 3. New session: pick the workspace, send a real turn through the mock.
  await page.locator('text=/新会话|New Session/').first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const wsBox = page.locator('textarea[readonly]').first()
  if (await wsBox.isVisible().catch(() => false)) {
    await wsBox.click()
    await page.waitForTimeout(1200)
    const firstOption = page.locator('[role="option"], [role="menuitem"]').first()
    if (await firstOption.isVisible().catch(() => false)) await firstOption.click()
    await page.waitForTimeout(2500)
  }
  const input = page.locator('textarea:not([readonly]), [contenteditable="true"]').first()
  await input.click()
  await input.fill('E2E turn one')
  await input.press('Enter')
  await page.waitForTimeout(12000)

  // 4. Lens tab + panel (Chinese baseline).
  let panel = await openLensPanel()
  check('lens tab label is 请求上下文 (zh)', (await tabs()).includes('请求上下文'), await tabs())
  // Session status strip: healthy marks + analyzed count, no raw placeholders.
  check('no raw {count}/{percent} literals', !panel.includes('{count}') && !panel.includes('{percent}'))
  check('status strip shows cache stable + structure stable', panel.includes('✓ 缓存稳定') && panel.includes('✓ 结构稳定'), panel.includes('✓ 缓存稳定'))
  check('status strip shows the analyzed count', /(\d+) 次请求/.test(panel), panel.match(/(\d+) 次请求/)?.[0])
  check('no doubled percent sign (100%% regression)', !panel.includes('%%'), panel.includes('%%') ? '%% found' : 'ok')

  // The only request so far is stable → hidden by default; untick to see it.
  check('unchanged requests hidden by default', panel.includes('均无变化'), panel.includes('均无变化') ? 'ok' : panel.slice(0, 300).replace(/\n+/g, ' '))
  await page.locator('label', { hasText: /隐藏无变化请求/ }).first().click()
  await page.waitForTimeout(1200)
  panel = await page.evaluate(() => document.body?.innerText ?? '')
  check('list shows #1 stable after unticking', panel.includes('#1') && panel.includes('稳定'), panel.includes('#1'))
  check('cache readout is 用量 n/a for the mock', panel.includes('用量 n/a'))

  // Inspector: primary readout without usage buckets.
  check('inspector shows cache reuse as - (mock reports no cache)', /缓存复用[\s\S]{0,20}-/.test(panel))
  check('inspector shows the new-input readout', panel.includes('新增输入'))
  check('inspector shows the context surface readout', panel.includes('估算请求上下文'))
  // The comparison panel compares against the previous request (#0 does not exist for the first record).
  check('first record has no comparison panel', !panel.includes('对比'))

  // Technical details fold: usage buckets and header hashes live behind it.
  await page.locator('button', { hasText: /查看技术细节/ }).first().click()
  await page.waitForTimeout(1200)
  panel = await page.evaluate(() => document.body?.innerText ?? '')
  check('primary readout shows new input 3 tok (mock prompt_tokens)', /新增输入[\s\S]{0,20}3 tok/.test(panel))
  check('tech fold shows cache read as -, never 0', /缓存读取[\s\S]{0,20}-/.test(panel))
  check('tech fold shows header hashes', panel.includes('系统提示') && /[0-9a-f]{8}/.test(panel))
  check('tool list folded behind its own toggle', !panel.includes('ask_user_question'), panel.includes('ask_user_question'))

  // 5. Second real turn → second record; the comparison panel appears.
  const input2 = page.locator('textarea:not([readonly]), [contenteditable="true"]').first()
  await input2.click()
  await input2.fill('E2E turn two')
  await input2.press('Enter')
  await page.waitForTimeout(12000)
  panel = await openLensPanel()
  check('list shows #2 after the second turn', panel.includes('#2'), panel.includes('#2') ? 'ok' : panel.slice(0, 500).replace(/\n+/g, ' '))
  // The list renders newest first: #2's card must appear before #1's.
  const first2 = panel.indexOf('#2')
  const first1 = panel.indexOf('#1')
  check('list renders newest request first', first2 !== -1 && first1 !== -1 && first2 < first1, { first2, first1 })
  check('comparison panel appears for the second record', panel.includes('对比 #1'), panel.includes('对比 #1') ? 'ok' : 'missing')
  check('comparison shows no-change verdicts', /系统提示[\s\S]{0,20}无变化/.test(panel) && /工具[\s\S]{0,20}无变化/.test(panel))

  // 6. Language switch zh → en and back.
  const enTabs = await switchLanguage('en')
  check('tab label follows locale to Request Context', enTabs.includes('Request Context'), enTabs)
  panel = await openLensPanel()
  check('panel copy switches to English', panel.includes('requests') || panel.includes('No change'), panel.includes('No change'))
  const zhTabs = await switchLanguage('zh')
  check('tab label returns to 请求上下文', zhTabs.includes('请求上下文'), zhTabs)

  const realErrors = consoleErrors.filter(e => !e.includes('favicon'))
  check('no page errors during the run', realErrors.length === 0, realErrors.slice(0, 3))
  return failures
}

main()
  .then(code => {
    console.log(code === 0 ? '\nE2E PASS' : `\nE2E FAIL (${code} check(s) failed)`)
    process.exit(code === 0 ? 0 : 1)
  })
  .catch(error => {
    console.error('\nE2E ERROR:', error)
    process.exit(2)
  })
