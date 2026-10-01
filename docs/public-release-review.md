# Public release review — local edition

Reviewed October 1, 2026 for the planned Ontario, Canada publisher. Command is intended as a downloaded app run on each person's computer. This review covers the current source-based local edition; it does not certify legal compliance, complete WCAG conformance or readiness for hosted multi-user use.

## What applies now

| Item               | Implementation and decision                                                                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy            | `/legal/privacy`: actual local storage, calendar provider requests, private feed URLs, retention, safeguards, exports and deletion limits.                                                                                                                        |
| Terms              | `/legal/terms`: local use, unofficial grade/date estimates, data ownership, no paid features and no waiver of mandatory consumer rights.                                                                                                                          |
| Cookies            | `/legal/cookies`: no application cookies, localStorage, sessionStorage, tracking pixels or ad IDs. No banner because there is no optional tracking to accept/reject.                                                                                              |
| Form consent       | Explain provider requests before Preview, and stored links/periodic requests before Connect and import. Store the connection notice version and timestamp. Existing connections keep null historical consent fields; no invented consent.                         |
| Data minimization  | No account, email, birthday, student ID or payment fields. Nickname optional. No additional identity data to export/delete local records.                                                                                                                         |
| Access and erasure | Settings → Your data exports JSON without private feed URLs/provider IDs. Typed confirmation erases active workspace records and resets preferences. Export is not an automatic restore backup. External backups/files/provider records require separate removal. |
| Withdrawal         | Disconnect pauses requests but retains the URL and mapping. Paused links remain visible. Forget link deletes URL/mapping but preserves academic entries and warns about duplicate reimports.                                                                      |
| Accessibility      | Visible labels, required indicators, linked field hints, keyboard dialogs/tabs, skip link, stronger text/control contrast in both themes, non-colour status labels, reduced motion, named buddy and decorative SVG treatment. Known limits documented.            |
| Fonts/images       | Device fonts; no font downloads. Lucide ISC icons, Radix MIT primitives and project-created code/vector graphics. No stock images/purchased sprites. No trademark clearance or exclusive AI-output copyright claim.                                               |
| Licence notices    | `npm run licenses` inventories production packages and Next's bundled notices. Unmodified MPL-2.0 ical.js source provided under `/licenses/`. Builds regenerate these artifacts.                                                                                  |
| Local safeguards   | UI/database bind to loopback. Non-local/cross-site workspace requests rejected. Public policies separated from database-loaded layout. Same-origin mutation checks, cache-control, nosniff, frame/permissions/referrer policies and CSP.                          |
| Logging            | App and database helper omit raw errors potentially containing notes, SQL or credentials. Test traces/screenshots can contain workspace data; never distribute them.                                                                                              |
| Installation       | New bundled installations generate independent random database passwords. Existing credentials preserved. Next CLI telemetry disabled by the project wrapper.                                                                                                     |

## Intentionally not added

- **Refund workflow / fee disclosures:** no checkout, payment processor, subscription, renewal or in-app fees. Terms state this. Reassess pricing, taxes, cancellation and refunds before charging.
- **Marketing consent / unsubscribe:** the app sends no email and has no mailing-list SDK. Reassess CASL before commercial electronic messages.
- **Age or parental-consent form:** not child-directed; no hosted profiles or age collection. Do not collect birthdays merely to add a checkbox. A child-directed or hosted version needs a separate assessment of meaningful consent and applicable children's privacy laws.
- **Review moderation / fake endorsements:** no reviews, testimonials or rating system exists. No fabricated endorsements added.
- **Forced policy checkbox:** privacy information is provided where relevant; connecting a calendar is affirmative consent to that feature. No bundled marketing consent or prechecked optional tracking.
- **Deletion request inbox:** records are on the user's installation; self-service erasure avoids additional identity data. Future support submissions need a contact and retention/deletion process.

## Dependencies and data flows

Application dependencies are Next/React, Prisma/PostgreSQL client, calendar parser, UI primitives/icons and local helpers. No advertising, analytics, replay, social login, payment, hosted crash-reporting or remote-font SDK found. Client feature requests go to the local API. Calendar-provider requests happen on preview, connect and enabled sync. Private URLs are excluded from workspace/list/export responses.

`npm audit --omit=dev` reported zero known vulnerabilities during this review. This checks published advisories, not unknown vulnerabilities. Playwright/axe are development tools, not runtime tracking SDKs. npm/download/update hosts have their own data practices. Re-audit new services and dependencies.

The CSP restricts origins but permits inline scripts/styles needed by current Next hydration/styles. It is not a complete XSS defence. React escaping, plain-text feed rendering, validation, same-origin checks and private-network fetch protection remain necessary. Host/loopback checks are defence in depth, not authentication against local users, malware or deliberately misconfigured reverse proxies. Do not expose this edition through a public tunnel.

## Before public distribution

1. Add real operator/publisher identity and monitored privacy/security/accessibility contact, explicitly deferred by the owner. No address, registration or email was invented. Review the final policies and required business disclosures for the actual distribution/business model.
2. Package and test the download, uninstall/update process and supported platforms. Source setup is available; a signed installer/automatic updater is not implemented. Explain local startup, database persistence, backups and recovery.
3. Build from a clean checkout using an explicit release file allowlist. **Never bundle `.env`, `.postgres`, user exports, private ICS/feed links, artifacts, traces/screenshots, logs or browser profiles.** `.gitignore` does not protect a manually zipped working directory. `.env.example`/Docker credentials are development examples; bundled new installations generate unique credentials.
4. Preserve licences for everything packaged, including Node/PostgreSQL/Prisma/tools if bundled. npm production notices do not cover every possible installer payload. Keep MPL source/notices reachable. Decide Command's own source licence separately; no blanket open-source licence was invented.
5. Manually test screen readers, keyboard navigation, mobile reflow and high zoom on supported platforms. Automated checks cover main pages, policies and representative dialogs in both themes; they do not prove complete WCAG compliance.
6. Establish a security-update channel and private reporting contact. Re-audit before hosted sync, accounts, payments, analytics, email, child-directed features or support forms.

Keeping a personal app local does not itself require accounts. Hosting it for other people would require authentication, per-user authorization/data isolation, transport security and revised privacy/retention arrangements.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e` and `npm run test:privacy-db`. The privacy database test creates a uniquely named disposable database, verifies its identity before writes, tests export/secret exclusion/all-record erasure/stale-sync suppression and removes only that database. Never test valid erasure against the owner's workspace.

## Official references

- [OPC meaningful consent](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/) and [limiting use, disclosure and retention](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_use/).
- [OPC retention/disposal guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_rd_201406/).
- [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm) for future commercial messaging.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) for accessibility targets.
- [ICO cookies guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) as a reference for future tracking; not a claim that UK rules govern every local installation.
