import '../shared/base.css';
import './options.css';
import { BRAND, PRIVACY_URL } from '../shared/brand';

const link = (id: string) => document.getElementById(id) as HTMLAnchorElement;

document.title = `${BRAND.name} settings`;
document.querySelectorAll('[data-brand-name]').forEach((el) => (el.textContent = BRAND.name));
link('privacy').href = PRIVACY_URL;
link('tip').href = BRAND.tipUrl;
link('source').href = BRAND.repoUrl;
document.getElementById('version')!.textContent = `Version ${chrome.runtime.getManifest().version}`;
