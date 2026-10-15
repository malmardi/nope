// Runs the click guard against saved banner markup. Every clickable element in a fixture is
// marked with data-expect: "safe" (the click must go through), "accept" or "navigates" (it must be blocked).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { installClickGuard } from '../src/content/safety';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');
const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith('.html'));

const CLICKABLE = 'button, a[href], input[type=button], input[type=submit], [role=button], [role=switch], [role=checkbox], [role=tab], input[type=checkbox]';

const blocked: Element[] = [];
beforeAll(() => {
  installClickGuard((el) => blocked.push(el));
  // jsdom would try to navigate on link clicks; the guard decides before that matters.
  document.addEventListener('click', (e) => e.preventDefault());
});

describe.each(fixtures)('%s', (file) => {
  const html = readFileSync(join(fixturesDir, file), 'utf8');

  function load(): Element[] {
    document.body.innerHTML = html;
    return [...document.querySelectorAll(CLICKABLE)];
  }

  it('marks every clickable element with an expectation', () => {
    const unmarked = load().filter((el) => !el.hasAttribute('data-expect'));
    expect(unmarked.map((el) => el.outerHTML)).toEqual([]);
  });

  it('never clicks an accept button or a navigating link, and lets the rest through', () => {
    for (const el of load() as HTMLElement[]) {
      const expectation = el.dataset.expect;
      let clicked = false;
      el.addEventListener('click', () => (clicked = true));
      blocked.length = 0;
      el.click();
      const label = `${expectation}: ${el.outerHTML}`;
      if (expectation === 'safe') expect(clicked, label).toBe(true);
      else expect(clicked || blocked.length === 0, label).toBe(false);
    }
  });
});
