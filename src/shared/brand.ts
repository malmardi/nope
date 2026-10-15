// Everything that names or styles the product lives here, so a rename is a one-line change.

export const BRAND = {
  name: 'Nope',
  // Full name on the Chrome Web Store and in chrome://extensions.
  storeName: 'Nope: Cookie Banner Rejecter',
  developer: 'Mamoun Mardini, PhD',
  byline: 'Built by Mamoun Mardini, PhD, independent researcher',
  repoUrl: 'https://github.com/malmardi/nope',
  tipUrl: 'https://www.buymeacoffee.com/malmardi',
} as const;

export const PRIVACY_URL = `${BRAND.repoUrl}/blob/main/PRIVACY.md`;
// The only address the extension contacts on its own, once a day.
export const RULES_URL = `${BRAND.repoUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/main/rules/rules.json`;

export const COLORS = {
  accent: '#1F7A4D',
  accentText: '#1F6B45',
  ink: '#16201B',
  secondary: '#5B6761',
  surface: '#F4F7F5',
  border: '#E8ECE9',
  hidden: '#2457C5',
  missed: '#C2410C',
  neutralTile: '#E4E8E6',
} as const;

// Used for the "time saved" estimate.
export const SECONDS_PER_BANNER = 5;
