import { startEngine } from './engine';
import type { Status, StatusMessage } from '../shared/types';

const isTopFrame = window === window.top;

function report(status: Status): void {
  // Only the top frame reports "nothing here"; iframes speak up only when something happened.
  if (status === 'none' && !isTopFrame) return;
  const message: StatusMessage = { type: 'status', status };
  chrome.runtime.sendMessage(message).catch(() => {
    // The extension was reloaded or updated; this old content script has no one to talk to.
  });
}

startEngine(report);
