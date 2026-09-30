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

The bundled database uses port **54329** and a local development password. If you prefer Docker, run `docker compose up -d` in place of `db:local` and wait for its database healthcheck to pass before running setup. For an existing PostgreSQL server, set `DATABASE_URL` in `.env` and skip `db:local`. Do not run the bundled and Docker database on the same port simultaneously.

If your package manager blocks install scripts, approve the installed Prisma engine and embedded-postgres platform packages before setup. On npm 12, use `npm install-scripts ls` to inspect the project approvals. The lockfile and approved build packages are included.

## Using your workspace

- Set your name, theme, time format, and active semester in Settings.
- Create courses, add their weekly sessions, then add assessments and weights.
- Enter assessment scores to update the gradebook and target-grade calculator.
- Add tasks, optionally attach a course/assessment, and break work into subtasks.
- Use the combined month/week calendar for deadlines, classes, tasks, and personal events.
- Press **Ctrl+K** on Windows or **Cmd+K** on macOS for navigation and quick add.

Dates and recurring classes use your device's local time zone. An all-day event's “Last day” is inclusive in the editor; its database end is exclusive. Recurring classes stop at the semester boundary. Archived courses and their linked entries are hidden from the default calendar; their tasks remain accessible in Tasks.

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
npm run test:e2e
npm run build
```

Database and browser checks require PostgreSQL to be running and setup to have completed. The browser suite creates temporary records and removes them afterward. It uses installed Google Chrome by default; set `PLAYWRIGHT_CHANNEL=chromium` and install Playwright Chromium if Chrome is unavailable. It can reuse a running app on port 3000 or start the development server itself.

For production locally, run `npm run build`, then `npm start`. Keep PostgreSQL running. Back up your database before changing database infrastructure; `.postgres/` is your persistent data, not a disposable build folder.

The best next addition is a simple backup/export and restore workflow, so using Command daily comes with an easy way to keep an extra copy of your semester.
