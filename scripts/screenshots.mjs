// Takes screenshots of the built extension's pages, in light and dark mode, into docs/screenshots/.
//   npm run build && npm run screenshots
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const out = fileURLToPath(new URL('../docs/screenshots', import.meta.url));
const SITE = 'https://www.example-news.com/';
const HOST = new URL(SITE).hostname;
mkdirSync(out, { recursive: true });

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'nope-shots-')), {
  channel: 'chromium',
  headless: true,
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionUrl = `chrome-extension://${new URL(worker.url()).host}`;
for (const p of context.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();

// A stand-in news site, served locally, for the popup to describe.
await context.route(`${SITE}**`, (route) =>
  route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Example News</title><h1>Example News</h1>' }),
);
const site = await context.newPage();
await site.goto(SITE);
await site.waitForTimeout(1000);
const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({ url }))[0].id, SITE);

async function setState(status) {
  await worker.evaluate(
    async ({ tabId, status, host }) => {
      await chrome.storage.local.set({
        stats: { rejected: 1284, hidden: 37, firstInstall: Date.now() },
        pausedSites: status === 'paused' ? [host] : [],
      });
      await chrome.storage.session.set({ [`tabStatus:${tabId}`]: status });
    },
    { tabId, status, host: HOST },
  );
}

async function shoot(name, path, viewport, colorScheme) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme });
  await page.goto(`${extensionUrl}/${path}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const file = join(out, `${name}-${colorScheme}.png`);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`docs/screenshots/${name}-${colorScheme}.png`);
}

for (const colorScheme of ['light', 'dark']) {
  for (const status of ['rejected', 'hidden', 'missed', 'paused']) {
    await setState(status);
    await shoot(`popup-${status}`, `popup/popup.html?tab=${tabId}`, { width: 360, height: 560 }, colorScheme);
  }
  await shoot('welcome', 'welcome/welcome.html', { width: 720, height: 820 }, colorScheme);
  await shoot('settings', 'options/options.html', { width: 720, height: 820 }, colorScheme);
}

await context.close();
