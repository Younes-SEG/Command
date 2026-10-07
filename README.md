# Command

A single-user university command center built with Next.js, TypeScript, Tailwind CSS, shadcn/ui components, Prisma, and PostgreSQL.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended). From this directory:

```sh
npm install
npm run db:local
```

Keep the database terminal open. In another terminal:

```sh
npm run setup
npm run dev
```

Open **http://127.0.0.1:3000**. Setup creates `.env` if needed, generates Prisma, applies migrations, and adds sample university data. PostgreSQL data lives in `.postgres/` and persists between runs. Stop each terminal with Ctrl+C; start `db:local` and `dev` again next time.

For an empty workspace, use `npm run setup:empty` on a new database. Remove the seeded fixtures later with `npm run db:clear-demo`. Demo removal preserves courses that have user-created linked entries; you can then remove retained courses using the app. Rerunning the seed restores missing fixture IDs and never overwrites existing records.

The bundled database uses port **54329**. New installations automatically generate a random database password in `.env`; existing installations keep their credentials. Protect this file and exclude it from releases. `.env.example` and Docker use development-only example credentials. If you prefer Docker, configure its connection in `.env`, run `docker compose up -d` in place of `db:local`, and wait for its healthcheck before setup. For an existing PostgreSQL server, set `DATABASE_URL` in `.env` and skip `db:local`. Do not run the bundled and Docker database on the same port simultaneously.

If your package manager blocks install scripts, approve the installed Prisma engine and embedded-postgres platform packages before setup. On npm 12, use `npm install-scripts ls` to inspect the project approvals. The lockfile and approved build packages are included.

## Using your workspace

- Set your name, theme, time format, and active semester in Settings.
- Pick Mochi, Sprout, or Nimbus under **Settings → Appearance → Your study buddy** and save preferences. The buddy quietly wanders along the screen edges, follows the mouse, and hops along on navigation. Turn off **Gentle movement** for a still companion, or choose **Off**. Reduced motion is respected; the buddy never intercepts clicks or plays sounds.
- In **Settings → Connect your calendar**, paste a Brightspace subscription URL, preview the current term, then choose **Connect and import**. Adjust import dates before connecting if needed.
- Create courses, add their weekly sessions, then add assessments and weights.
- Choose **Import syllabus** on Courses or a course page, select a course and upload a PDF/TXT. AI reading starts automatically and opens the review list; there is no separate AI button. PDFs are sent as original files so the model sees page images and text, including scanned pages. Review dates, weights, source excerpts/pages and existing matches before saving. Pasted text uses the same AI reader. Imports are snapshots, not live syllabus connections.
- Enter assessment scores to update the gradebook and target-grade calculator.
- Open **Grades** in the sidebar (or **Enter grades** on Home) to enter scores across courses. Mark an assessment **Completed** in its editor to keep it on the **Awaiting grades** list until its score arrives.
- Open **User guide** in the sidebar for setup steps, calendar troubleshooting, completion/grade entry and data controls.
- Add tasks, optionally attach a course/assessment, and break work into subtasks.
- Use the combined month/week calendar for deadlines, classes, tasks, and personal events.
- Press **Ctrl+K** on Windows or **Cmd+K** on macOS for navigation and quick add.

Dates and recurring classes use your device's local time zone. An all-day event's “Last day” is inclusive in the editor; its database end is exclusive. Recurring classes stop at the semester boundary. Archived courses and their linked entries are hidden from the default calendar; their tasks remain accessible in Tasks.

## Shared syllabus reading

Users do not configure AI accounts, API keys or model downloads. The local planner sends only the chosen syllabus and course/semester context to Command’s shared reader. It returns suggestions for review; only confirmed assessments are saved locally. There is no additional AI button, no paid retry on refresh, and no local-key fallback.

The separately deployable service and owner instructions are in [services/syllabus/README.md](services/syllabus/README.md). It includes HTTPS client integration, a persistent atomic quota store, upload limits, cancellation, provider error handling and a deployment Dockerfile. Deploy only this service: the planner must remain bound to loopback with its existing local-access guard.

**Deployment pending:** no owner provider account or live service URL is connected in this checkout. The release URL in `src/lib/syllabus-service-config.ts` is intentionally empty. Until the owner deploys the service and bundles its public URL, the app shows an availability notice with Retry instead of asking users for keys. `COMMAND_SYLLABUS_SERVICE_URL` is an optional developer override, not an end-user setup step.

The owner funds hosting and provider usage. Daily network and global daily/monthly quotas persist across service restarts; these are request counts, not exact monetary caps. Add provider spending controls and verify the reverse-proxy configuration. The anonymous endpoint does not establish per-user identity; host abuse controls are needed before broad public promotion. See the deployment guide for limits and release checks.

Uploads are bounded to 8 MB, 60 PDF pages or 100,000 text characters. Documents are processed in memory and sent inline to OpenAI with `store:false`; provider retention still applies. No grades, other courses, notes or calendar credentials are sent. The reader may miss or misinterpret content, so compare suggestions and source references with the original. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Tests use simulated provider responses without charges or uploading personal data. A live smoke test still requires the deployed service and owner billing configuration.

## Calendar subscriptions

Calendar subscriptions create missing courses from Brightspace's course labels, reuse matching course codes in an overlapping semester, and import recognized deadlines as assessments. Other entries appear as calendar events. Grades and weights are not supplied by calendar feeds; imported assessments start with no score and 0% weight.

The local Node server checks connected feeds every 15 minutes and on startup when due, including while the browser is closed. The open app refreshes its display every minute and on focus. **Sync now** requests an immediate check (limited to once per minute). Stop the server and syncing stops; the next startup catches up. This timer requires a persistent Node process; serverless deployment needs a separate scheduled job.

The server needs outbound HTTPS access. Starting it inside a network-restricted development tool can leave the local app working while every calendar request fails with `EACCES`. Start Command normally from your terminal or the tool's approved network-capable mode; retain loopback binding and TLS/feed validation. The app now distinguishes network-permission, DNS and certificate failures without exposing the private URL.

Each subscription retains its selected date range. Reconnect with new dates for a new term. Stable event IDs prevent duplicates across refreshes and reconnection to the same URL. Sync updates source titles/dates/locations while preserving locally entered grades, weights, progress and notes. Manually deleted imported items stay deleted. Explicit cancellations are labelled; cancelled assessments lose their due date but retain grades. Missing feed entries are kept because a provider can shorten its feed without cancelling work.

Disconnecting stops updates and keeps imported entries plus the private connection record for later reconnection. Subscription URLs are stored in PostgreSQL, excluded from API responses and never written to source files. HTTPS requests reject internal/private addresses and revalidate redirects. Import supports bounded recurrence, exceptions, all-day dates and time zones; oversized or unsupported feeds fail without partially importing records.

Disconnected connections remain visible. **Forget link** deletes the private connection and import mapping while keeping academic entries; importing the same feed after forgetting it can create duplicates. Preview and Connect explain provider access and storage before acting.

## Privacy and public release

**Settings → Your data** downloads a readable JSON copy without private feed URLs, or erases the active workspace after typed confirmation. Erasure does not remove independent backups, exported files or provider calendars. The export has no automatic restore tool yet.

Footer links open Privacy, Terms, Cookies, Accessibility, Credits and About. This edition has no accounts, fees, marketing emails, tracking cookies or analytics. Policy pages do not load private workspace data. Non-local workspace requests are rejected; this is still a personal local app, not a hosted multi-user service.

See [the public-release review](docs/public-release-review.md) for implemented protections, deliberately omitted features, dependency/licence findings and remaining distribution work. Ontario is configured; operator identity and contact details are intentionally pending. New public services require a fresh review. `npm run licenses` regenerates notices and the unmodified ical.js source included for redistribution.

## Architecture and decisions

- PostgreSQL is the source of truth for all academic data and preferences. There is no browser-storage fallback for saved data.
- A server-rendered layout loads a consistent workspace snapshot. Client components manage interaction; validated route handlers persist changes and refresh the shared snapshot.
- `src/lib/grades.ts`, `tasks.ts`, `dates.ts`, and `calendar.ts` hold reusable business logic. Presentation components do not implement grade formulas.
- Current grade is a weighted average of **graded work only**. Course weight graded and points earned toward the final grade are separate values. Targets assume a final weight of 100%; missing weights and unattainable targets are explained.
- Mutations validate relationships and use serializable transactions to prevent concurrent assessment weights exceeding 100%. Deleting a course removes its assessments/schedule while keeping linked tasks and events without that course.
- This is a local personal application with no login. Development and production commands bind to loopback. Add access control before exposing it on a network.
- The CLI dependency overrides in `package.json` select patched versions of `deepmerge-ts` and `mysql2`; the application itself uses PostgreSQL.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
npm run test:calendar-db
npm run test:privacy-db
npm run test:e2e
npm run build
```

Database and browser checks require PostgreSQL to be running and setup to have completed. The browser suite creates temporary records and removes them afterward. It uses installed Google Chrome by default; set `PLAYWRIGHT_CHANNEL=chromium` and install Playwright Chromium if Chrome is unavailable. It can reuse a running app on port 3000 or start the development server itself.

For production locally, run `npm run build`, then `npm start`. Keep PostgreSQL running. Back up your database before changing database infrastructure; `.postgres/` is your persistent data, not a disposable build folder.

The privacy database check uses a separate disposable database and verifies its identity before testing erasure. Do not test the valid erase endpoint against your personal workspace. A full backup/restore workflow and packaged installer remain future work.
