import '../shared/base.css';
import './welcome.css';
import { BRAND, PRIVACY_URL } from '../shared/brand';

document.title = `Welcome to ${BRAND.name}`;
document.querySelectorAll('[data-brand-name]').forEach((el) => (el.textContent = BRAND.name));
document.getElementById('byline')!.textContent = BRAND.byline;
(document.getElementById('privacy') as HTMLAnchorElement).href = PRIVACY_URL;

document.getElementById('start')!.addEventListener('click', async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id !== undefined) await chrome.tabs.remove(tab.id);
  else window.close();
});
