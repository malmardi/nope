# Nope privacy promise

Nope rejects cookie banners for you. It does that entirely inside your browser. Nothing you browse leaves your device.

## What Nope collects

Nothing. Nope has no analytics, no telemetry, no crash reporting, no advertising and no third-party scripts. There is no Nope server, and no account.

## What Nope stores on your device

Nope keeps a few things in your browser's local extension storage, so it can work and show you its counter. None of it is sent anywhere.

| What | Why |
| --- | --- |
| How many banners it rejected and hid, and the date you installed it | For the counter and "time saved" in the popup |
| Sites you paused Nope on (hostnames only, such as `example.com`) | So Nope stays off there |
| A copy of the latest rules file | So fixes keep working between updates |
| Whether you've seen the welcome page | So it only opens once |
| What happened on each open tab | For the popup and toolbar icon; cleared when the tab closes or the browser quits |

Removing the extension deletes all of it.

## The one request Nope makes on its own

Once a day, Nope downloads its public rules file from GitHub:

`https://raw.githubusercontent.com/malmardi/nope/main/rules/rules.json`

This is a plain download, the same for every user. It carries no cookies, no identifiers, no list of sites you visited and nothing about you. As with any download, GitHub can see the IP address the request comes from; [GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) covers that.

Fonts and icons are bundled inside the extension, so no other downloads happen.

## Reporting a site

When a banner slips through, you can click "Banner still showing? Report it" in the popup. That opens a new GitHub issue in your browser, filled in with:

- the site's hostname only (such as `example.com`, never the full address or page)
- what Nope showed (for example "Missed one")
- the Nope version
- your browser's name and version

Nothing is sent until you review it and submit it yourself on GitHub, under your GitHub account. Issues on GitHub are public.

## Links

The "Buy me a coffee" and "Source code" links on the settings page simply open those websites when you click them. Nope sends them nothing.

## What Nope does on the pages you visit

Nope reads each page only to find a cookie banner. When it finds one, it clicks the option to reject, or hides the banner if there is no way to reject. It never clicks "Accept", "Allow all", "OK" or similar, and it never follows a link that leaves the page. Pages without a banner are left untouched.

## Permissions

| Permission | Why Nope needs it |
| --- | --- |
| Read and change data on all websites | Cookie banners can appear on any site, so Nope needs to look at every page to find and reject them |
| Storage | To keep the counter, paused sites and rules on your device |
| Alarms | To check for updated rules once a day |
| Scripting | Some consent tools are rejected most reliably by calling their own "reject" function on the page. These are fixed functions shipped inside the extension, never code downloaded from anywhere |

## Open source

Every line of Nope's code is public at [github.com/malmardi/nope](https://github.com/malmardi/nope), so anyone can check these promises. Nope builds on [autoconsent](https://github.com/duckduckgo/autoconsent), DuckDuckGo's open-source cookie banner library.

## Changes and contact

If this promise ever changes, the change will be visible in this file's history on GitHub. Questions are welcome as a [GitHub issue](https://github.com/malmardi/nope/issues).

Nope is built by Mamoun Mardini, PhD, independent researcher.
