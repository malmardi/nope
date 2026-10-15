// Keeps the active rules: the bundled copy, or a newer one fetched from the public repo. Background worker only.
import { evalSnippets } from '@duckduckgo/autoconsent';
import bundled from '../../rules/rules.json';
import { RULES_URL } from '../shared/brand';
import { KEY_RULES, KEY_RULES_CHECK, type RulesCheck, type StoredRules } from '../shared/types';
import { parseRulesFile, validateRulesFile, type RulesFile } from './rules-file';

export const SNIPPET_IDS: ReadonlySet<string> = new Set(Object.keys(evalSnippets));

const bundledCheck = validateRulesFile(bundled, SNIPPET_IDS);
if (!bundledCheck.ok) throw new Error(`Bundled rules are invalid: ${bundledCheck.error}`);
export const BUNDLED_RULES: RulesFile = bundledCheck.rules;

type Storage = Pick<chrome.storage.StorageArea, 'get' | 'set'>;
type Fetch = typeof fetch;

/** The higher revision of the bundled and downloaded rules. A stored copy is re-checked before use. */
export function pickRules(stored: StoredRules | undefined): RulesFile {
  if (!stored || stored.file.revision <= BUNDLED_RULES.revision) return BUNDLED_RULES;
  const check = validateRulesFile(stored.file, SNIPPET_IDS);
  return check.ok ? check.rules : BUNDLED_RULES;
}

let active: Promise<RulesFile> | null = null;

export function activeRules(storage: Storage = chrome.storage.local): Promise<RulesFile> {
  active ??= storage.get(KEY_RULES).then((s) => pickRules(s[KEY_RULES] as StoredRules | undefined));
  return active;
}

/**
 * Downloads rules.json from the public repo: a plain GET, with no cookies, referrer or identifiers.
 * Any failure leaves the current rules in place.
 */
export async function refreshRules(storage: Storage = chrome.storage.local, fetchImpl: Fetch = fetch): Promise<RulesCheck> {
  let check: RulesCheck;
  try {
    const response = await fetchImpl(RULES_URL, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseRulesFile(await response.text(), SNIPPET_IDS);
    if (!parsed.ok) throw new Error(parsed.error);
    const current = await activeRules(storage);
    if (parsed.rules.revision > current.revision) {
      const stored: StoredRules = { file: parsed.rules, fetchedAt: Date.now() };
      await storage.set({ [KEY_RULES]: stored });
      active = Promise.resolve(parsed.rules);
    }
    check = { at: Date.now(), ok: true, revision: parsed.rules.revision };
  } catch (err) {
    check = { at: Date.now(), ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  await storage.set({ [KEY_RULES_CHECK]: check });
  return check;
}

/** For tests: forget the in-memory copy. */
export function resetActiveRules(): void {
  active = null;
}
