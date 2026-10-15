import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import upstream from '@duckduckgo/autoconsent/rules/rules.json';
import { parseRulesFile, validateRulesFile } from '../src/rules/rules-file';
import { BUNDLED_RULES, SNIPPET_IDS, activeRules, refreshRules, resetActiveRules } from '../src/rules/store';
import { RULES_URL } from '../src/shared/brand';

const rule = {
  name: 'example-cmp',
  detectCmp: [{ exists: '#cmp' }],
  detectPopup: [{ visible: '#cmp', check: 'any' }],
  optIn: [{ waitForThenClick: '#cmp .accept' }],
  optOut: [
    { if: { exists: '#cmp .reject' }, then: [{ click: '#cmp .reject' }], else: [{ hide: '#cmp' }] },
    { eval: 'EVAL_DIDOMI_OPT_OUT', optional: true },
  ],
  runContext: { main: true, urlPattern: '^https://(www\\.)?example\\.com/' },
};
const file = (overrides: Record<string, unknown> = {}) => ({ format: 1, revision: 2, autoconsent: [rule], disabledCmps: [], ...overrides });
const validate = (data: unknown) => validateRulesFile(data, SNIPPET_IDS);

describe('validateRulesFile', () => {
  it('accepts the bundled rules/rules.json', () => {
    const bundled = JSON.parse(readFileSync(join(process.cwd(), 'rules', 'rules.json'), 'utf8'));
    expect(validate(bundled)).toEqual({ ok: true, rules: bundled });
  });

  it("accepts every one of autoconsent's own rules, so the format check matches the real format", () => {
    const failures = upstream.autoconsent
      .map((r) => [r.name, validate(file({ autoconsent: [r] }))] as const)
      .filter(([, result]) => !result.ok);
    expect(failures).toEqual([]);
  });

  it('accepts a well-formed file', () => {
    expect(validate(file()).ok).toBe(true);
  });

  it.each([
    ['an unsupported format', file({ format: 2 })],
    ['a missing revision', file({ revision: undefined })],
    ['a revision of 0', file({ revision: 0 })],
    ['an unknown top-level field', file({ script: 'alert(1)' })],
    ['disabledCmps that is not a list of names', file({ disabledCmps: [1] })],
    ['a rule without a name', file({ autoconsent: [{ ...rule, name: '' }] })],
    ['a rule missing optOut', file({ autoconsent: [{ ...rule, optOut: undefined }] })],
    ['an unknown rule field', file({ autoconsent: [{ ...rule, onLoad: 'x' }] })],
    ['an eval of code rather than a bundled snippet', file({ autoconsent: [{ ...rule, optOut: [{ eval: 'document.cookie=""' }] }] })],
    ['an unknown step field', file({ autoconsent: [{ ...rule, optOut: [{ click: 'a', script: 'x' }] }] })],
    ['a step with no action', file({ autoconsent: [{ ...rule, optOut: [{ optional: true }] }] })],
    ['a selector of the wrong type', file({ autoconsent: [{ ...rule, optOut: [{ click: 42 }] }] })],
    ['an "if" without "then"', file({ autoconsent: [{ ...rule, optOut: [{ if: { exists: 'a' } }] }] })],
    ['an invalid urlPattern', file({ autoconsent: [{ ...rule, runContext: { urlPattern: '(' } }] })],
    ['two rules with the same name', file({ autoconsent: [rule, rule] })],
    ['a rule needing a newer engine', file({ autoconsent: [{ ...rule, minimumRuleStepVersion: 99 }] })],
  ])('rejects %s', (_, data) => {
    expect(validate(data).ok).toBe(false);
  });

  it('rejects text that is not JSON or is too large', () => {
    expect(parseRulesFile('{not json', SNIPPET_IDS).ok).toBe(false);
    expect(parseRulesFile(' '.repeat(1_000_001), SNIPPET_IDS).ok).toBe(false);
  });
});

describe('refreshRules', () => {
  let data: Record<string, unknown>;
  const storage = {
    get: async (key: string) => ({ [key]: data[key] }),
    set: async (items: Record<string, unknown>) => void Object.assign(data, items),
  } as unknown as chrome.storage.StorageArea;
  const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));

  beforeEach(() => {
    data = {};
    resetActiveRules();
  });

  it('fetches the public rules file with a plain request: no cookies, referrer or query', async () => {
    const fetch = respond(JSON.stringify(file()));
    await refreshRules(storage, fetch);
    expect(fetch).toHaveBeenCalledWith(RULES_URL, expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
    expect(new URL(RULES_URL).search).toBe('');
  });

  it('starts from the bundled rules', async () => {
    expect(await activeRules(storage)).toBe(BUNDLED_RULES);
  });

  it('switches to a newer valid revision and keeps it after a restart', async () => {
    const check = await refreshRules(storage, respond(JSON.stringify(file({ revision: BUNDLED_RULES.revision + 1 }))));
    expect(check.ok).toBe(true);
    expect((await activeRules(storage)).revision).toBe(BUNDLED_RULES.revision + 1);
    resetActiveRules();
    expect((await activeRules(storage)).revision).toBe(BUNDLED_RULES.revision + 1);
  });

  it('ignores a revision that is not newer', async () => {
    await refreshRules(storage, respond(JSON.stringify(file({ revision: BUNDLED_RULES.revision }))));
    expect(await activeRules(storage)).toBe(BUNDLED_RULES);
    expect(data.rules).toBeUndefined();
  });

  it.each([
    ['a server error', respond('Not found', 404)],
    ['an invalid file', respond(JSON.stringify(file({ revision: 99, format: 7 })))],
    ['a network failure', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))],
  ])('keeps the current rules after %s, and records the failure', async (_, fetch) => {
    const check = await refreshRules(storage, fetch as unknown as typeof globalThis.fetch);
    expect(check.ok).toBe(false);
    expect(await activeRules(storage)).toBe(BUNDLED_RULES);
    expect(data.rulesCheck).toEqual(check);
  });
});
