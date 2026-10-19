# Store listing

Copy-paste text for the Chrome Web Store developer dashboard (and Microsoft Edge Add-ons, which asks for the same things). Upload `release/nope-<version>.zip`, built with `npm run package`.

## Store listing tab

**Name** (comes from the manifest): Nope: Cookie Banner Rejecter

**Summary** (comes from the manifest): Always rejects cookie banners, never accepts. Open source. Nothing you browse leaves your device.

**Description** (don't list consent-tool or company names: the store rejected version 1.0.0 for "keyword spam" when it named eight of them):

```
Nope clicks "Reject all" on cookie banners for you, on every site, automatically. No account, no settings, nothing to set up.

ALWAYS REJECTS, NEVER ACCEPTS
• Nope only ever chooses the option that refuses cookies: "Reject all", "Only necessary", "Continue without accepting".
• When a site offers no way to reject, Nope hides the banner instead.
• A built-in safety check blocks any click on "Accept", "Allow all", "OK" or similar, so Nope can never agree to cookies on your behalf.

WORKS ON THE SITES YOU USE
• Handles the most widely used consent tools, plus about 1,000 site-specific rules.
• For sites without a rule, Nope looks for a reject button itself.

QUICK FIXES
• Banner still showing? Click "Report it" in the popup. You see exactly what is sent (the site's name, never the full address) before you send it.
• Fixes reach everyone within a day, without waiting for a store update.

PRIVATE BY DESIGN
• Nothing you browse leaves your device. No analytics, no tracking, no data sold, ever.
• The only request Nope makes on its own is a daily download of its public rules file.
• Open source: every line of code is public at github.com/malmardi/nope

ALSO
• The toolbar icon shows what happened on each site: green for rejected, blue for hidden, orange if a banner slipped through.
• A counter shows how many banners Nope has rejected and roughly how much clicking it has saved you.
• Turn Nope off on any site with one switch.
• Follows your system's light or dark mode.

Nope is built by Mamoun Mardini, PhD, independent researcher, on top of DuckDuckGo's open-source autoconsent library.
```

**Category:** Privacy & Security (or the closest category the dashboard offers)

**Language:** English

**Graphic assets** (all in this folder):

| Field | File |
| --- | --- |
| Store icon (128 × 128) | `icon-128.png` |
| Screenshots (1280 × 800) | `screenshot-1-rejects.png` to `screenshot-5-pause.png`, in that order |
| Small promo tile (440 × 280) | `promo-small-440x280.png` |
| Marquee promo tile (1400 × 560, optional) | `promo-marquee-1400x560.png` |

**Official URL:** none (needs a verified domain; leave empty)

**Homepage URL:** https://github.com/malmardi/nope

**Support URL:** https://github.com/malmardi/nope/issues

## Privacy tab

**Single purpose:**

```
Nope automatically rejects cookie consent banners on websites, and hides a banner only when it offers no way to reject.
```

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| Host permission (all sites) | Cookie banners can appear on any website, so Nope must run on every page to detect a banner and click its reject option. It reads pages only to find consent banners and sends nothing anywhere. |
| storage | Keeps the banner counter, the list of sites the user paused Nope on, and the latest rules file, locally on the device. |
| alarms | Schedules the once-a-day download of Nope's public rules file, so fixes for sites reach users without a store update. |
| scripting | Some consent tools (for example Didomi) are rejected most reliably by calling their own "reject all" function on the page. Nope runs fixed functions that ship inside the extension package, never downloaded code. |

**Are you using remote code?** No, I am not using remote code.

If asked to explain: Nope downloads a JSON rules file once a day from its public GitHub repository. It is data only (CSS selectors to click or hide, and names of functions already bundled in the extension), is strictly validated before use, and is never executed as code.

**Data usage:** tick none of the data types. Nope collects no user data.

Then certify all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/malmardi/nope/blob/main/PRIVACY.md

## Distribution tab

- **Payments:** Free of charge
- **Visibility:** Public
- **Regions:** All regions

## Test instructions for the reviewer (if asked)

```
No account or setup is needed. After installing, visit a site that shows a cookie banner to visitors in the EU, for example https://www.onetrust.com/ or https://www.spiegel.de/. Nope clicks the reject option, the banner disappears, and the toolbar icon turns green. The popup shows the site's status and the counter. Some sites only show banners to visitors in Europe.
```
