import { describe, expect, it } from 'vitest';
import { BRAND } from '../src/shared/brand';
import { browserName, reportUrl } from '../src/shared/report';

describe('reportUrl', () => {
  const url = new URL(
    reportUrl({ hostname: 'www.example-news.com', status: 'missed', version: '0.1.0', browser: 'Google Chrome 141' }),
  );

  it('opens a new issue from the site-report template in the project repo', () => {
    expect(url.href.startsWith(`${BRAND.repoUrl}/issues/new?`)).toBe(true);
    expect(url.searchParams.get('template')).toBe('site-report.yml');
  });

  it('carries exactly the hostname, status, version and browser', () => {
    expect(Object.fromEntries(url.searchParams)).toEqual({
      template: 'site-report.yml',
      title: 'Banner not handled: www.example-news.com',
      site: 'www.example-news.com',
      status: 'Missed one',
      version: '0.1.0',
      browser: 'Google Chrome 141',
    });
  });
});

describe('browserName', () => {
  const withBrands = (brands: { brand: string; version: string }[]) =>
    ({ userAgentData: { brands } }) as unknown as Navigator;

  it('names the browser, skipping placeholder brands', () => {
    expect(
      browserName(withBrands([
        { brand: 'Not)A;Brand', version: '8' },
        { brand: 'Chromium', version: '141' },
        { brand: 'Microsoft Edge', version: '141' },
      ])),
    ).toBe('Microsoft Edge 141');
  });

  it('falls back to Chromium, then to a generic name', () => {
    expect(browserName(withBrands([{ brand: 'Chromium', version: '141' }]))).toBe('Chromium 141');
    expect(browserName({} as Navigator)).toBe('Unknown browser');
  });
});
