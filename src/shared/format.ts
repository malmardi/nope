import { SECONDS_PER_BANNER } from './brand';

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatTimeSaved(banners: number): string {
  const seconds = banners * SECONDS_PER_BANNER;
  if (banners === 0) return 'Each one saves you a few seconds of clicking';
  if (seconds < 60) return 'Under a minute of clicking saved';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${minutes} minute${minutes === 1 ? '' : 's'} of clicking saved`;
  const hours = Math.round(minutes / 60);
  return `About ${hours} hour${hours === 1 ? '' : 's'} of clicking saved`;
}
