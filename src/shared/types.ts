import type { Config, RuleBundle } from '@duckduckgo/autoconsent';
import type { RulesFile } from '../rules/rules-file';

export type Status ='rejected' | 'hidden' | 'none' | 'missed' | 'paused';

export const STATUS_LABEL: Record<Status, string> = {
  rejected: 'Rejected',
  hidden: 'Hidden',
  none: 'No banner',
  missed: 'Missed one',
  paused: 'Paused',
};

// One-line explanation shown under the site in the popup.
export const STATUS_DETAIL: Record<Status, string> = {
  rejected: 'Clicked "reject all" for you',
  hidden: 'No reject button, so we hid it',
  none: 'Nothing to reject here',
  missed: "Report it below and we'll fix it",
  paused: 'Turned off for this site',
};

// When several frames on one page report, the tab shows the highest-ranked status.
// "missed" outranks the successes because a banner is still on screen and the user may want to report it.
export const STATUS_RANK: Record<Status, number> = {
  none: 0,
  rejected: 1,
  hidden: 2,
  missed: 3,
  paused: 4,
};

export interface StatusMessage {
  type: 'status';
  status: Status;
}

// Content script asks for its rules and settings when a frame starts.
export interface InitRequest {
  type: 'nope:init';
}
export interface InitResponse {
  paused: boolean;
  rules: RuleBundle;
  config: Partial<Config>;
}

// Content script asks the background to run one of autoconsent's bundled snippets in the page.
export interface EvalRequest {
  type: 'nope:eval';
  snippetId: string;
}
export interface EvalResponse {
  result: unknown;
}

export type ToBackgroundMessage = StatusMessage | InitRequest | EvalRequest;

export interface Stats {
  rejected: number;
  hidden: number;
  firstInstall: number;
}

// chrome.storage.local keys
export const KEY_STATS = 'stats';
export const KEY_PAUSED = 'pausedSites';
export const KEY_ONBOARDED = 'onboarded';
export const KEY_RULES = 'rules';
export const KEY_RULES_CHECK = 'rulesCheck';

/** A downloaded rules file, kept until a newer revision arrives. */
export interface StoredRules {
  file: RulesFile;
  fetchedAt: number;
}

/** The outcome of the last daily rules download, shown on the settings page. */
export type RulesCheck =
  | { at: number; ok: true; revision: number }
  | { at: number; ok: false; error: string };

// chrome.storage.session key holding a tab's status for the current page
export const tabStatusKey = (tabId: number) => `tabStatus:${tabId}`;
// chrome.storage.session key set once the current page has been added to the counter
export const tabCountedKey = (tabId: number) => `tabCounted:${tabId}`;
