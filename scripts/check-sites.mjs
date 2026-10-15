// Loads the built extension (dist/) in Playwright's Chromium, opens each site and prints the status
// Nope reached, with a screenshot per site in test-results/sites/.
//   npm run build && node scripts/check-sites.mjs https://www.onetrust.com/ https://example.com/
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const shots = fileURLToPath(new URL('../test-results/sites', import.meta.url));
const urls = process.argv.slice(2);
const SETTLE_MS = 10_000;

if (urls.length === 0) {
  console.error('Usage: node scripts/check-sites.mjs <url> [<url> ...]');
  process.exit(1);
}
mkdirSync(shots, { recursive: true });

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'nope-')), {
  channel: 'chromium',
  headless: true,
  locale: 'en-GB',
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
// Close the onboarding tab so it doesn't count.
for (const p of context.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();

for (const url of urls) {
  const page = await context.newPage();
  const blocked = [];
  page.on('console', (msg) => msg.text().startsWith('Nope blocked') && blocked.push(msg.text()));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(SETTLE_MS);
    const status = await worker.evaluate(async (pageUrl) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url === pageUrl) ?? tabs.find((t) => t.active);
      const key = `tabStatus:${tab?.id}`;
      return (await chrome.storage.session.get(key))[key] ?? 'none';
    }, page.url());
    const shot = join(shots, `${new URL(url).hostname}.png`);
    await page.screenshot({ path: shot });
    console.log(`${status.padEnd(9)} ${url}${blocked.length ? `  (${blocked.length} click(s) blocked)` : ''}`);
  } catch (err) {
    console.log(`error     ${url}  ${err.message.split('\n')[0]}`);
  }
  await page.close();
}

const stats = await worker.evaluate(async () => (await chrome.storage.local.get('stats')).stats);
console.log(`Counter: ${stats?.rejected ?? 0} rejected, ${stats?.hidden ?? 0} hidden`);

await context.close();
