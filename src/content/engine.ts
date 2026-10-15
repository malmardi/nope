// Banner detection and rejection, built on DuckDuckGo's autoconsent (MPL-2.0).
// autoconsent detects the consent platform and runs its opt-out steps; Nope configures it to only
// ever opt out, routes its clicks through the safety guard, and turns its progress into a Status.
import AutoConsent, { type ContentScriptMessage } from '@duckduckgo/autoconsent';
import { installClickGuard } from './safety';
import type { EvalRequest, EvalResponse, InitRequest, InitResponse, Status } from '../shared/types';

export function startEngine(report: (status: Status) => void): void {
  let blockedClick = false;
  installClickGuard((el, verdict) => {
    blockedClick = true;
    console.warn(`Nope blocked a click (${verdict}):`, el);
  });

  // autoconsent talks to "the background" through this function. Only init and eval need the
  // background worker; the rest are progress updates we turn into a status right here.
  async function onMessage(message: ContentScriptMessage): Promise<void> {
    switch (message.type) {
      case 'init': {
        const request: InitRequest = { type: 'nope:init' };
        const response: InitResponse = await chrome.runtime.sendMessage(request);
        if (response.paused) {
          report('paused');
          return;
        }
        await consent.receiveMessageCallback({ type: 'initResp', rules: response.rules, config: response.config as never });
        break;
      }
      case 'eval': {
        const request: EvalRequest = { type: 'nope:eval', snippetId: message.snippetId ?? '' };
        const response: EvalResponse = await chrome.runtime.sendMessage(request);
        await consent.receiveMessageCallback({ type: 'evalResp', id: message.id, result: response.result });
        break;
      }
      case 'optOutResult':
        if (!message.result) report('missed');
        break;
      case 'autoconsentDone':
        report(blockedClick ? 'missed' : message.isCosmetic ? 'hidden' : 'rejected');
        break;
    }
  }

  const consent = new AutoConsent((message) =>
    onMessage(message).catch(() => {
      // The extension was reloaded or updated; this old content script has no one to talk to.
    }),
  );
}
