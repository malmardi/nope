import '../shared/base.css';
import './popup.css';
import { BRAND } from '../shared/brand';
import { formatCount, formatTimeSaved } from '../shared/format';
import { browserName, reportUrl } from '../shared/report';
import {
  KEY_PAUSED,
  KEY_STATS,
  STATUS_DETAIL,
  STATUS_LABEL,
  tabStatusKey,
  type Stats,
  type Status,
} from '../shared/types';

const PILL_ICONS: Record<Status, string> = {
  rejected: '<path d="M5 12.5l4.5 4.5L19 7.5"></path>',
  hidden: '<path d="M3 3l18 18"></path><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.7 3.2M6.6 7.6C4.4 9.1 3 12 3 12s4 6 9 6a9 9 0 0 0 4.4-1.2"></path>',
  none: '<path d="M6 12h12"></path>',
  missed: '<path d="M12 7v6"></path><path d="M12 17v.01"></path>',
  paused: '<path d="M9 6v12"></path><path d="M15 6v12"></path>',
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let isWebPage = false;
let currentStatus: Status = 'none';

function renderStatus(status: Status): void {
  currentStatus = status;
  $('detail').textContent = isWebPage ? STATUS_DETAIL[status] : `${BRAND.name} doesn't run on browser pages`;
  const pill = $('pill');
  pill.dataset.status = status;
  pill.innerHTML =
    `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${PILL_ICONS[status]}</svg>`;
  pill.append(STATUS_LABEL[status]);
}

function renderStats(stats: Stats | undefined): void {
  const rejected = stats?.rejected ?? 0;
  $('count').textContent = formatCount(rejected);
  $('count-label').textContent = rejected === 1 ? 'banner rejected' : 'banners rejected';
  // Hidden banners also spared the user a click, so they count toward time saved.
  $('saved').textContent = formatTimeSaved(rejected + (stats?.hidden ?? 0));
}

async function main(): Promise<void> {
  document.title = BRAND.name;
  document.querySelectorAll('[data-brand-name]').forEach((el) => (el.textContent = BRAND.name));

  $('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('pro-allow').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#pro') });
  });
  // popup.html?tab=<id> describes a given tab; scripts/screenshots.mjs opens the popup this way.
  const tabParam = Number(new URLSearchParams(location.search).get('tab'));
  const [tab] = tabParam
    ? [await chrome.tabs.get(tabParam)]
    : await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : undefined;
  isWebPage = url?.protocol === 'http:' || url?.protocol === 'https:';
  const hostname = isWebPage ? url!.hostname : '';
  const toggle = $<HTMLInputElement>('active');

  $('host').textContent = isWebPage ? hostname.replace(/^www\./, '') : 'Browser page';

  const report = $<HTMLAnchorElement>('report');
  report.hidden = !isWebPage;
  report.addEventListener('click', (event) => {
    event.preventDefault();
    const href = reportUrl({
      hostname,
      status: currentStatus,
      version: chrome.runtime.getManifest().version,
      browser: browserName(),
    });
    chrome.tabs.create({ url: href });
    window.close();
  });

  const statusKey = tab?.id !== undefined ? tabStatusKey(tab.id) : '';
  const [session, local] = await Promise.all([
    statusKey ? chrome.storage.session.get(statusKey) : Promise.resolve({} as Record<string, unknown>),
    chrome.storage.local.get([KEY_STATS, KEY_PAUSED]),
  ]);
  const pausedSites: string[] = (local[KEY_PAUSED] as string[] | undefined) ?? [];

  renderStatus((session[statusKey] as Status | undefined) ?? 'none');
  renderStats(local[KEY_STATS] as Stats | undefined);

  toggle.checked = !pausedSites.includes(hostname);
  toggle.disabled = !isWebPage;

  toggle.addEventListener('change', async () => {
    const stored = await chrome.storage.local.get(KEY_PAUSED);
    const paused = new Set<string>((stored[KEY_PAUSED] as string[] | undefined) ?? []);
    if (toggle.checked) paused.delete(hostname);
    else paused.add(hostname);
    await chrome.storage.local.set({ [KEY_PAUSED]: [...paused] });
    if (tab?.id !== undefined) await chrome.tabs.reload(tab.id);
  });

  // Keep the popup current while it is open, e.g. after the reload above.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && statusKey in changes) {
      renderStatus((changes[statusKey].newValue as Status | undefined) ?? 'none');
    }
    if (area === 'local' && KEY_STATS in changes) {
      renderStats(changes[KEY_STATS].newValue as Stats | undefined);
    }
  });
}

void main();
