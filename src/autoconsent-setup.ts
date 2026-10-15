// Rules and settings handed to autoconsent in each frame. Background worker only.
import { filterCompactRules, type Config, type IndexedCMPRuleset, type RuleBundle } from '@duckduckgo/autoconsent';
import compactRules from '@duckduckgo/autoconsent/rules/compact-rules.json';
import nopeRules from '../rules/rules.json';

export const AUTOCONSENT_CONFIG: Partial<Config> = {
  enabled: true,
  // Only ever opt out. autoconsent never accepts in this mode.
  autoAction: 'optOut',
  disabledCmps: [],
  // Prehide would inject CSS on every page, including pages with no banner. Nope only touches pages with one.
  enablePrehide: false,
  // Cosmetic rules hide a banner that has no reject option; Nope reports these as "hidden".
  enableCosmeticRules: true,
  enableGeneratedRules: true,
  // The generic fallback for sites no rule covers. 'reject' clicks only a reject button. The other
  // levels ('tier1', 'tier2') click "OK" or "Accept", which Nope never does.
  enableHeuristicDetection: true,
  heuristicMode: 'reject',
  enablePopupMutationObserver: true,
  detectRetries: 20,
  isMainWorld: false,
  visualTest: false,
  logs: {
    lifecycle: false,
    rulesteps: false,
    detectionsteps: false,
    evals: false,
    errors: false,
    messages: false,
    waits: false,
  },
};

/** The rules that can apply to one frame, so each frame receives only a small slice. */
export function rulesFor(url: string, mainFrame: boolean): RuleBundle {
  return {
    autoconsent: nopeRules.autoconsent as RuleBundle['autoconsent'],
    compact: filterCompactRules(compactRules as unknown as IndexedCMPRuleset, { url, mainFrame }),
  };
}
