# Security

StoneQR is a static site: no server receives user input, there are no accounts, and there is no database. The attack surface is the code that runs in the browser (the SvelteKit site and `@stoneqr/engine`) and the build and deploy pipeline.

## Reporting

Please report vulnerabilities privately through [GitHub's advisory form](https://github.com/malignantz/stoneqr/security/advisories/new) rather than a public issue. Include the page, the steps, and the browser and version. Expect an acknowledgement within a week.

Things that count: anything that lets typed content leave the browser, a way to bypass the decode check so a download does not scan, a content-security-policy hole, or a dependency issue with a reachable path.

Things that do not: reports from automated scanners with no reachable path, and the deliberate absence of rate limiting or authentication (there is nothing to protect).

## Design notes

- Every prerendered page carries a hash-based content-security policy (`svelte.config.js`); inline scripts are limited to one mode-stamping script whose hash sits in that policy.
- Nothing a user types is sent anywhere. The optional "make it editable" hand-off puts the destination in a link the user clicks; StoneQR keeps no copy.
- Dependencies are pinned through `bun.lock` and installed with `--frozen-lockfile` in CI.
