import { BRAND } from './brand';
import { STATUS_LABEL, type Status } from './types';

export interface ReportDetails {
  hostname: string;
  status: Status;
  version: string;
  browser: string;
}

/**
 * A link to a new GitHub issue prefilled from the site-report template. It carries the hostname
 * only, never the full address, and nothing is sent until the user submits it on GitHub.
 */
export function reportUrl({ hostname, status, version, browser }: ReportDetails): string {
  const params = new URLSearchParams({
    template: 'site-report.yml',
    title: `Banner not handled: ${hostname}`,
    site: hostname,
    status: STATUS_LABEL[status],
    version,
    browser,
  });
  return `${BRAND.repoUrl}/issues/new?${params}`;
}

interface Brand {
  brand: string;
  version: string;
}

/** "Google Chrome 141", "Microsoft Edge 141", "Brave 141", and so on. */
export function browserName(nav: Navigator = navigator): string {
  const brands: Brand[] = (nav as Navigator & { userAgentData?: { brands: Brand[] } }).userAgentData?.brands ?? [];
  const named = brands.find((b) => !/not.?a.?brand|chromium/i.test(b.brand)) ?? brands.find((b) => /chromium/i.test(b.brand));
  return named ? `${named.brand} ${named.version}` : 'Unknown browser';
}
