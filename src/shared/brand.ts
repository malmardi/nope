// Everything that names or styles the product lives here, so a rename is a one-line change.

export const BRAND = {
  name: 'Nope',
  developer: 'Mamoun Mardini, PhD',
  byline: 'Built by Mamoun Mardini, PhD, independent researcher',
  repoUrl: 'https://github.com/malmardi/nope',
  // TODO: replace with the real tip page before release.
  tipUrl: 'https://buymeacoffee.com/YOUR-HANDLE',
} as const;

export const PRIVACY_URL = `${BRAND.repoUrl}/blob/main/PRIVACY.md`;

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
