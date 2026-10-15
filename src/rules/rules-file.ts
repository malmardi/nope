// Nope's own rules file (rules/rules.json): extra autoconsent rules, plus autoconsent rules to switch off.
// The bundled copy ships with the extension; a newer copy is fetched daily from the public repo.
// Rules are data only. Anything that doesn't match the format exactly is rejected as a whole.
import type { AutoConsentCMPRule } from '@duckduckgo/autoconsent';

export const RULES_FORMAT = 1;
export const MAX_RULES_BYTES = 1_000_000;

export interface RulesFile {
  format: typeof RULES_FORMAT;
  /** Increases with every published change. The highest revision available wins. */
  revision: number;
  /** Extra rules in autoconsent's JSON rule format. */
  autoconsent: AutoConsentCMPRule[];
  /** Names of autoconsent rules to switch off, for when one misbehaves before a library update. */
  disabledCmps: string[];
}

export type Validation = { ok: true; rules: RulesFile } | { ok: false; error: string };

const RULE_KEYS = new Set([
  'name', 'vendorUrl', 'prehideSelectors', 'runContext', 'intermediate', 'cosmetic', 'detectCmp', 'detectPopup',
  'optOut', 'optIn', 'openCmp', 'test', 'comment', 'minimumRuleStepVersion', '_metadata',
]);
const STEP_LISTS = ['detectCmp', 'detectPopup', 'optOut', 'optIn', 'openCmp', 'test'] as const;
const REQUIRED_STEP_LISTS = ['detectCmp', 'detectPopup', 'optOut', 'optIn'] as const;
const SUPPORTED_RULE_STEP_VERSION = 3;

type Check = (value: unknown) => boolean;
const isString: Check = (v) => typeof v === 'string';
const isBool: Check = (v) => typeof v === 'boolean';
const isNumber: Check = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isSelector: Check = (v) => isString(v) || (Array.isArray(v) && v.length > 0 && v.every(isString));
const isVisibilityCheck: Check = (v) => v === 'any' || v === 'all' || v === 'none';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Every key a rule step may carry, with the check its value must pass.
// Steps that say what to do (the "actions") are listed separately: each step needs at least one.
const STEP_FIELDS: Record<string, Check> = {
  optional: isBool,
  comment: isString,
  // The button's wording when the rule was written; a note, not used for matching.
  text: isString,
  negated: isBool,
  exists: isSelector,
  visible: isSelector,
  check: isVisibilityCheck,
  waitFor: isSelector,
  waitForVisible: isSelector,
  timeout: isNumber,
  click: isSelector,
  all: isBool,
  waitForThenClick: isSelector,
  retry: isNumber,
  retryInterval: isNumber,
  wait: isNumber,
  hide: isSelector,
  method: (v) => v === 'display' || v === 'opacity',
  cookieContains: isString,
  removeClass: isString,
  setStyle: isString,
  addStyle: isString,
  selector: isSelector,
  stylesheet: isString,
  stylesheetId: isString,
};
const STEP_ACTIONS = [
  'exists', 'visible', 'waitFor', 'waitForVisible', 'click', 'waitForThenClick', 'wait', 'hide', 'cookieContains',
  'removeClass', 'setStyle', 'addStyle', 'stylesheet', 'eval', 'if', 'any',
];

function checkSteps(steps: unknown, path: string, snippetIds: ReadonlySet<string>): string | null {
  if (!Array.isArray(steps)) return `${path} must be a list of steps`;
  for (const [i, step] of steps.entries()) {
    const at = `${path}[${i}]`;
    if (!isObject(step)) return `${at} must be an object`;
    if (!STEP_ACTIONS.some((action) => action in step)) return `${at} has no action`;
    for (const [key, value] of Object.entries(step)) {
      if (key === 'eval') {
        // Only names of snippets bundled with the extension. Never code.
        if (!isString(value) || !snippetIds.has(value as string)) return `${at}.eval names an unknown snippet`;
      } else if (key === 'if') {
        if (!isObject(value) || !('exists' in value || 'visible' in value)) return `${at}.if needs exists or visible`;
        const condition = checkSteps([value], `${at}.if`, snippetIds);
        if (condition) return condition;
      } else if (key === 'then' || key === 'else' || key === 'any') {
        const nested = checkSteps(value, `${at}.${key}`, snippetIds);
        if (nested) return nested;
      } else if (!(key in STEP_FIELDS)) {
        return `${at} has an unknown field "${key}"`;
      } else if (!STEP_FIELDS[key](value)) {
        return `${at}.${key} has the wrong type`;
      }
    }
    if ('if' in step && !('then' in step)) return `${at} has "if" without "then"`;
  }
  return null;
}

function checkRule(rule: unknown, path: string, snippetIds: ReadonlySet<string>): string | null {
  if (!isObject(rule)) return `${path} must be an object`;
  for (const key of Object.keys(rule)) {
    if (!RULE_KEYS.has(key)) return `${path} has an unknown field "${key}"`;
  }
  if (!isString(rule.name) || !(rule.name as string).trim()) return `${path}.name is missing`;
  const at = `${path} (${rule.name})`;
  for (const list of REQUIRED_STEP_LISTS) {
    if (!(list in rule)) return `${at}.${list} is missing`;
  }
  for (const list of STEP_LISTS) {
    if (list in rule) {
      const error = checkSteps(rule[list], `${at}.${list}`, snippetIds);
      if (error) return error;
    }
  }
  if ('prehideSelectors' in rule && !(Array.isArray(rule.prehideSelectors) && rule.prehideSelectors.every(isString))) {
    return `${at}.prehideSelectors must be a list of selectors`;
  }
  for (const flag of ['intermediate', 'cosmetic'] as const) {
    if (flag in rule && !isBool(rule[flag])) return `${at}.${flag} must be true or false`;
  }
  for (const text of ['vendorUrl', 'comment'] as const) {
    if (text in rule && !isString(rule[text])) return `${at}.${text} must be text`;
  }
  if ('minimumRuleStepVersion' in rule) {
    const v = rule.minimumRuleStepVersion;
    if (!isNumber(v) || (v as number) > SUPPORTED_RULE_STEP_VERSION) return `${at} needs a newer rule engine`;
  }
  if ('_metadata' in rule && !isObject(rule._metadata)) return `${at}._metadata must be an object`;
  if ('runContext' in rule) {
    const ctx = rule.runContext;
    if (!isObject(ctx)) return `${at}.runContext must be an object`;
    for (const [key, value] of Object.entries(ctx)) {
      if (key === 'main' || key === 'frame') {
        if (!isBool(value)) return `${at}.runContext.${key} must be true or false`;
      } else if (key === 'urlPattern') {
        if (!isString(value)) return `${at}.runContext.urlPattern must be text`;
        try {
          new RegExp(value as string);
        } catch {
          return `${at}.runContext.urlPattern is not a valid pattern`;
        }
      } else {
        return `${at}.runContext has an unknown field "${key}"`;
      }
    }
  }
  return null;
}

/** Checks a parsed rules file. `snippetIds` are the eval snippets bundled with the extension. */
export function validateRulesFile(data: unknown, snippetIds: ReadonlySet<string>): Validation {
  const fail = (error: string): Validation => ({ ok: false, error });
  if (!isObject(data)) return fail('not an object');
  for (const key of Object.keys(data)) {
    if (!['format', 'revision', 'autoconsent', 'disabledCmps'].includes(key)) return fail(`unknown field "${key}"`);
  }
  if (data.format !== RULES_FORMAT) return fail(`format ${String(data.format)} is not supported`);
  if (!Number.isInteger(data.revision) || (data.revision as number) < 1) return fail('revision must be a whole number from 1');
  if (!Array.isArray(data.autoconsent)) return fail('autoconsent must be a list of rules');
  if (!Array.isArray(data.disabledCmps) || !data.disabledCmps.every(isString)) return fail('disabledCmps must be a list of names');
  const names = new Set<string>();
  for (const [i, rule] of data.autoconsent.entries()) {
    const error = checkRule(rule, `autoconsent[${i}]`, snippetIds);
    if (error) return fail(error);
    const name = (rule as { name: string }).name;
    if (names.has(name)) return fail(`two rules are named "${name}"`);
    names.add(name);
  }
  return { ok: true, rules: data as unknown as RulesFile };
}

/** Parses and checks downloaded text. */
export function parseRulesFile(text: string, snippetIds: ReadonlySet<string>): Validation {
  if (text.length > MAX_RULES_BYTES) return { ok: false, error: 'file is too large' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  return validateRulesFile(data, snippetIds);
}
