import { describe, expect, it } from 'vitest';
import { formatCount, formatTimeSaved } from '../src/shared/format';

describe('formatTimeSaved', () => {
  it.each([
    [0, 'Each one saves you a few seconds of clicking'],
    [5, 'Under a minute of clicking saved'],
    [12, 'About 1 minute of clicking saved'],
    [300, 'About 25 minutes of clicking saved'],
    [720, 'About 1 hour of clicking saved'],
    [1284, 'About 2 hours of clicking saved'],
  ])('%i banners: "%s"', (banners, text) => {
    expect(formatTimeSaved(banners)).toBe(text);
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1284)).toBe('1,284');
  });
});
