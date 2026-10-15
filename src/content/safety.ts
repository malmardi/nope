// Nope's own guarantee, independent of any rule: never click something that accepts cookies,
// and never click a link that leaves the page. Every click the engine makes goes through here.

export type ClickVerdict = 'accept' | 'navigates';

// Words are matched as whole tokens; a trailing * matches any word starting with the stem.
// Checked in order: a label that clearly rejects is safe even if it also says "accept"
// ("Accept only necessary", "Continue without accepting").
const REJECT = [
  'reject*', 'decline*', 'deny', 'refuse*', 'do not', 'don t', 'dont', 'no thanks',
  'without accept*', 'without agree*', 'without consent*', 'without allow*',
  'opt out', 'object*', 'disagree*', 'not agree',
  'ablehn*', 'verweiger*', 'nicht zustimm*', 'ohne zustimm*', 'widersprech*',
  'refus*', 'sans accept*', 'continuer sans', 'je refuse',
  'rechaz*', 'sin acept*', 'no acept*',
  'rifiut*', 'senza accett*', 'non accett*',
  'weiger*', 'niet akkoord', 'zonder accept*',
];

// Accepting everything, worded so it can't be mistaken for a choice-saving button.
const ACCEPT_ALL = [
  'accept all', 'accept cookies', 'allow all', 'allow cookies', 'agree to all', 'agree all', 'enable all',
  'select all', 'activate all', 'consent to all', 'stay opted in', 'opt in', 'opted in',
  'alle akzeptieren', 'alle zulassen', 'alle erlauben', 'alle auswählen', 'alle aktivieren', 'allen zustimmen',
  'tout accepter', 'tout autoriser', 'tout activer', 'tout sélectionner',
  'aceptar todo', 'aceptar todas', 'aceptar cookies', 'permitir todo', 'permitir todas',
  'accetta tutti', 'accetta tutto', 'accetto tutti', 'consenti tutti',
  'alles accepteren', 'alle accepteren', 'alles toestaan', 'alle toestaan',
];

// Buttons that save the user's current choices or open settings. Safe once the label is not an accept-all.
const SAFE = [
  'save*', 'confirm*', 'submit*', 'selection', 'selected', 'my choices',
  'settings', 'preferences', 'options', 'manage*', 'customi*', 'personali*', 'configur*', 'more info*', 'learn more',
  'speicher*', 'bestätig*', 'auswahl*', 'einstellungen', 'anpassen',
  'enregistrer', 'valider', 'sélection', 'paramètres', 'paramétrer',
  'guardar', 'selección', 'ajustes',
  'salva*', 'conferm*', 'selezion*', 'impostazioni', 'gestisci',
  'opslaan', 'bevestig*', 'selectie', 'instellingen',
];

// Plain accept wording.
const ACCEPT = [
  'accept*', 'akzept*', 'acept*', 'accett*', 'agree*', 'allow*', 'consent', 'ok', 'okay', 'got it', 'i understand',
  'understood', 'yes', 'sure', 'zustimm*', 'einverstanden', 'erlauben', 'zulassen', 'accord', 'j accepte',
  'autoriser', 'permitir', 'consenti*', 'akkoord', 'toestaan',
];

// "Accept necessary cookies" style labels: a necessity word and no "all" word means essential-only.
const NECESSITY = ['necessary', 'essential*', 'required', 'strictly', 'notwendig*', 'essenziell*', 'erforderlich*', 'nécessaire*', 'necesari*', 'esencial*', 'necessar*', 'essenzial*', 'noodzakelijk*'];
const ALL = ['all', 'alle', 'allen', 'alles', 'tout', 'tous', 'toutes', 'todo', 'todas', 'todos', 'tutti', 'tutto', 'everything'];

function tokenize(label: string): string[] {
  return label
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function matches(tokens: string[], phrases: string[]): boolean {
  return phrases.some((phrase) => {
    const words = phrase.split(' ');
    for (let i = 0; i + words.length <= tokens.length; i++) {
      const hit = words.every((word, j) => {
        const token = tokens[i + j];
        return word.endsWith('*') ? token.startsWith(word.slice(0, -1)) : token === word;
      });
      if (hit) return true;
    }
    return false;
  });
}

/** Whether a button with this label would accept cookies. */
export function isAcceptLabel(label: string): boolean {
  const tokens = tokenize(label);
  if (tokens.length === 0) return false;
  if (matches(tokens, REJECT)) return false;
  if (matches(tokens, ACCEPT_ALL)) return true;
  if (matches(tokens, NECESSITY) && !matches(tokens, ALL)) return false;
  if (matches(tokens, SAFE)) return false;
  return matches(tokens, ACCEPT);
}

function labelOf(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return el.value || el.getAttribute('aria-label') || '';
  const text = (el.innerText ?? el.textContent ?? '').trim();
  return [el.getAttribute('aria-label'), text, el.getAttribute('title')].filter(Boolean).join(' ');
}

// Toggles are labelled with category names ("Analytics"), not actions, so they are judged by the rules, not here.
function isToggle(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return true;
  const role = el.getAttribute('role');
  return role === 'switch' || role === 'checkbox' || role === 'radio';
}

function navigatesAway(el: HTMLElement): boolean {
  const link = el.closest('a[href]') as HTMLAnchorElement | null;
  if (!link) return false;
  const href = link.getAttribute('href')!.trim();
  if (href === '' || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) return false;
  if (link.target && link.target !== '_self') return true;
  try {
    const to = new URL(href, location.href);
    return to.origin + to.pathname + to.search !== location.origin + location.pathname + location.search;
  } catch {
    return true;
  }
}

/** Returns why a click on this element must not happen, or null if it is safe. */
export function checkClick(el: HTMLElement): ClickVerdict | null {
  if (navigatesAway(el)) return 'navigates';
  if (isToggle(el)) return null;
  return isAcceptLabel(labelOf(el)) ? 'accept' : null;
}

/**
 * Routes every programmatic click made from this content script through checkClick.
 * Content scripts run in their own JavaScript world, so this does not affect the page's own scripts.
 */
export function installClickGuard(onBlocked: (el: HTMLElement, verdict: ClickVerdict) => void): void {
  const originalClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function (this: HTMLElement) {
    const verdict = checkClick(this);
    if (verdict) {
      onBlocked(this, verdict);
      return;
    }
    originalClick.call(this);
  };
}
