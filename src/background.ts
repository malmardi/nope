import { evalSnippets } from '@duckduckgo/autoconsent';
import { configFor, rulesFor } from './autoconsent-setup';
import { activeRules, refreshRules } from './rules/store';
import { BRAND } from './shared/brand';
import {
  KEY_ONBOARDED,
  KEY_PAUSED,
  KEY_STATS,
  STATUS_LABEL,
  STATUS_RANK,
  tabCountedKey,
  tabStatusKey,
  type EvalRequest,
  type EvalResponse,
  type InitResponse,
  type Stats,
  type Status,
  type ToBackgroundMessage,
} from './shared/types';

// Status writes are async and frames report concurrently, so apply them one at a time.
let queue: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task).catch((err) => console.error(`${BRAND.name}:`, err));
}

async function showStatus(tabId: number, status: Status): Promise<void> {
  try {
    await chrome.action.setIcon({
      tabId,
      path: { 16: `/icons/${status}-16.png`, 32: `/icons/${status}-32.png` },
    });
    await chrome.action.setTitle({ tabId, title: `${BRAND.name}: ${STATUS_LABEL[status]}` });
  } catch {
    // The tab closed before we got here.
  }
}

// Adds one to the counter the first time a page gets a banner rejected or hidden,
// however many frames report it.
async function countBanner(tabId: number, status: Status): Promise<void> {
  if (status !== 'rejected' && status !== 'hidden') return;
  const countedKey = tabCountedKey(tabId);
  if ((await chrome.storage.session.get(countedKey))[countedKey]) return;
  await chrome.storage.session.set({ [countedKey]: true });
  const stored = (await chrome.storage.local.get(KEY_STATS))[KEY_STATS] as Stats | undefined;
  const stats: Stats = stored ?? { rejected: 0, hidden: 0, firstInstall: Date.now() };
  stats[status] += 1;
  await chrome.storage.local.set({ [KEY_STATS]: stats });
}

async function recordStatus(tabId: number, status: Status): Promise<void> {
  await countBanner(tabId, status);
  const key = tabStatusKey(tabId);
  const current = (await chrome.storage.session.get(key))[key] as Status | undefined;
  if (current && STATUS_RANK[current] >= STATUS_RANK[status]) return;
  await chrome.storage.session.set({ [key]: status });
  await showStatus(tabId, status);
}

async function clearStatus(tabId: number): Promise<void> {
  await chrome.storage.session.remove([tabStatusKey(tabId), tabCountedKey(tabId)]);
  await showStatus(tabId, 'none');
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== chrome.runtime.OnInstalledReason.INSTALL) return;
  enqueue(async () => {
    const stored = await chrome.storage.local.get([KEY_STATS, KEY_ONBOARDED]);
    if (!stored[KEY_STATS]) {
      const stats: Stats = { rejected: 0, hidden: 0, firstInstall: Date.now() };
      await chrome.storage.local.set({ [KEY_STATS]: stats });
    }
    if (!stored[KEY_ONBOARDED]) {
      await chrome.storage.local.set({ [KEY_ONBOARDED]: true });
      await chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
    }
  });
});

async function handleInit(sender: chrome.runtime.MessageSender): Promise<InitResponse> {
  const tabId = sender.tab?.id;
  const frameUrl = sender.url ?? '';
  const isTopFrame = sender.frameId === 0;
  // A top frame starting means a new page in this tab.
  if (isTopFrame && tabId !== undefined) enqueue(() => clearStatus(tabId));

  // Pausing applies to the site in the address bar, including any consent iframes it embeds.
  const siteUrl = sender.tab?.url ?? frameUrl;
  const hostname = URL.canParse(siteUrl) ? new URL(siteUrl).hostname : '';
  const paused = ((await chrome.storage.local.get(KEY_PAUSED))[KEY_PAUSED] as string[] | undefined) ?? [];
  if (paused.includes(hostname)) {
    return { paused: true, rules: { autoconsent: [] }, config: { enabled: false } };
  }
  const rules = await activeRules();
  return { paused: false, rules: rulesFor(frameUrl, isTopFrame, rules), config: configFor(rules) };
}

// Daily rules refresh. The alarm survives browser restarts, but is re-created here if it is ever missing.
const RULES_ALARM = 'rules-refresh';
chrome.alarms.get(RULES_ALARM).then((alarm) => {
  if (!alarm) chrome.alarms.create(RULES_ALARM, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RULES_ALARM) void refreshRules();
});

// Runs one of autoconsent's bundled snippets in the page's own JavaScript world. Snippets are
// fixed functions shipped inside the extension, never code received from elsewhere.
async function handleEval(request: EvalRequest, sender: chrome.runtime.MessageSender): Promise<EvalResponse> {
  const snippet = evalSnippets[request.snippetId as keyof typeof evalSnippets];
  const tabId = sender.tab?.id;
  if (!snippet || tabId === undefined || sender.frameId === undefined) return { result: false };
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [sender.frameId] },
      world: 'MAIN',
      func: snippet as () => unknown,
    });
    return { result: injection?.result ?? false };
  } catch {
    return { result: false };
  }
}

chrome.runtime.onMessage.addListener((message: ToBackgroundMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  switch (message?.type) {
    case 'status':
      if (tabId !== undefined && message.status in STATUS_RANK) {
        enqueue(() => recordStatus(tabId, message.status));
      }
      return false;
    case 'nope:init':
      handleInit(sender).then(sendResponse);
      return true;
    case 'nope:eval':
      handleEval(message, sender).then(sendResponse);
      return true;
  }
  return false;
});

// A new page load starts from a clean status.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') enqueue(() => clearStatus(tabId));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(() => chrome.storage.session.remove([tabStatusKey(tabId), tabCountedKey(tabId)]));
});

// Development helper: from the service worker console, run
//   nopeDebug.setStatus('hidden')
// to preview an icon state on the active tab.
// and nopeDebug.refreshRules() to download the rules now instead of waiting for the daily alarm.
Object.assign(globalThis, {
  nopeDebug: {
    refreshRules: () => refreshRules(),
    async setStatus(status: Status) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id === undefined) return;
      await chrome.storage.session.set({ [tabStatusKey(tab.id)]: status });
      await showStatus(tab.id, status);
    },
  },
});
