// Composes the Chrome Web Store images into store/ from the screenshots in docs/screenshots/.
//   npm run build && npm run screenshots && npm run store-images
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'store');
mkdirSync(out, { recursive: true });

const dataUri = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`;
const shot = (name) => dataUri(`docs/screenshots/${name}.png`, 'image/png');
const font = dataUri('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'font/woff2');

const MARK = (size, radius) => `
  <div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:#1F7A4D;display:flex;align-items:center;justify-content:center">
    <svg width="${size * 0.56}" height="${size * 0.56}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>
  </div>`;

const BASE_CSS = `
  @font-face { font-family: Manrope; src: url(${font}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Manrope, sans-serif; color: #16201B; -webkit-font-smoothing: antialiased; }
  .shot { border-radius: 18px; box-shadow: 0 1px 2px rgba(22,32,27,.08), 0 24px 60px rgba(22,32,27,.16); display: block; }
`;

function slide({ title, text, image, imageHeight = 620 }) {
  return `
    <div style="width:1280px;height:800px;background:#F4F7F5;display:flex;align-items:center;gap:72px;padding:0 96px">
      <div style="flex:1;display:flex;flex-direction:column;gap:24px">
        <div style="display:flex;align-items:center;gap:14px">${MARK(48, 15)}<span style="font-size:28px;font-weight:800;letter-spacing:-.02em">Nope</span></div>
        <h1 style="font-size:54px;font-weight:800;letter-spacing:-.035em;line-height:1.08">${title}</h1>
        <p style="font-size:23px;line-height:1.5;color:#3E4A44">${text}</p>
      </div>
      <img class="shot" src="${image}" style="height:${imageHeight}px">
    </div>`;
}

const SLIDES = [
  {
    file: 'screenshot-1-rejects.png',
    title: 'Rejects cookie banners for you',
    text: 'Nope clicks “Reject all” on every site, automatically. No account, no settings.',
    image: shot('popup-rejected-light'),
  },
  {
    file: 'screenshot-2-never-accepts.png',
    title: 'Never accepts. Ever.',
    text: 'When a site offers no way to reject, Nope hides the banner. It never clicks Accept, Allow all or OK for you.',
    image: shot('popup-hidden-light'),
  },
  {
    file: 'screenshot-3-report.png',
    title: 'Missed one? Report it in one click',
    text: 'Fixes reach everyone within a day, with no update to install.',
    image: shot('popup-missed-light'),
  },
  {
    file: 'screenshot-4-privacy.png',
    title: 'Open source. No data collected.',
    text: 'Nothing you browse leaves your device. Every line of code is public on GitHub.',
    image: shot('settings-light'),
    imageHeight: 600,
  },
  {
    file: 'screenshot-5-pause.png',
    title: 'Pause it on any site',
    text: 'One switch turns Nope off where you want to choose for yourself. Light and dark mode included.',
    image: shot('popup-paused-dark'),
  },
];

const PROMO_SMALL = `
  <div style="width:440px;height:280px;background:#1F7A4D;color:#fff;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:0 40px">
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:56px;height:56px;border-radius:17px;background:#fff;display:flex;align-items:center;justify-content:center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1F7A4D" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>
      </div>
      <span style="font-size:44px;font-weight:800;letter-spacing:-.03em">Nope</span>
    </div>
    <p style="font-size:21px;font-weight:600;line-height:1.35">Rejects cookie banners for you.<br>Never accepts.</p>
  </div>`;

const MARQUEE = `
  <div style="width:1400px;height:560px;background:#1F7A4D;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 110px;overflow:hidden">
    <div style="display:flex;flex-direction:column;gap:22px;max-width:640px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:64px;height:64px;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1F7A4D" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>
        </div>
        <span style="font-size:52px;font-weight:800;letter-spacing:-.03em">Nope</span>
      </div>
      <h1 style="font-size:50px;font-weight:800;letter-spacing:-.03em;line-height:1.1">Always rejects cookie banners. Never accepts.</h1>
      <p style="font-size:22px;line-height:1.5;opacity:.9">Open source. Nothing you browse leaves your device.</p>
    </div>
    <img class="shot" src="${shot('popup-rejected-light')}" style="height:480px;margin-top:140px">
  </div>`;

// The store icon: 96 px of artwork centred in 128 px, as the store guidelines ask.
const STORE_ICON = `<div style="width:128px;height:128px;display:flex;align-items:center;justify-content:center">${MARK(96, 27)}</div>`;

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(file, html, width, height, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>${BASE_CSS}</style><body>${html}</body>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, file), omitBackground: transparent });
  console.log(`store/${file}`);
}

for (const s of SLIDES) await render(s.file, slide(s), 1280, 800);
await render('promo-small-440x280.png', PROMO_SMALL, 440, 280);
await render('promo-marquee-1400x560.png', MARQUEE, 1400, 560);
await render('icon-128.png', STORE_ICON, 128, 128, true);

await browser.close();
