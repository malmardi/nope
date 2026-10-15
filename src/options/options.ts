import '../shared/base.css';
import './options.css';
import bundledRules from '../../rules/rules.json';
import { BRAND, PRIVACY_URL } from '../shared/brand';
import { KEY_RULES, KEY_RULES_CHECK, type RulesCheck, type StoredRules } from '../shared/types';

const link = (id: string) => document.getElementById(id) as HTMLAnchorElement;

document.title = `${BRAND.name} settings`;
document.querySelectorAll('[data-brand-name]').forEach((el) => (el.textContent = BRAND.name));
link('privacy').href = PRIVACY_URL;
link('tip').href = BRAND.tipUrl;
link('source').href = BRAND.repoUrl;
document.getElementById('version')!.textContent = `Version ${chrome.runtime.getManifest().version}`;

const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

chrome.storage.local.get([KEY_RULES, KEY_RULES_CHECK]).then((stored) => {
  const downloaded = stored[KEY_RULES] as StoredRules | undefined;
  const check = stored[KEY_RULES_CHECK] as RulesCheck | undefined;
  const revision = Math.max(bundledRules.revision, downloaded?.file.revision ?? 0);
  const status = !check
    ? 'not checked for updates yet'
    : check.ok
      ? `checked ${date(check.at)}`
      : `update check failed ${date(check.at)}`;
  document.getElementById('rules')!.textContent = `Rules revision ${revision}, ${status}`;
});
