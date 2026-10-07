# Hosted Command: Vercel + Neon

The hosted edition gives each verified account its own workspace. Vercel automatically enables hosted mode. Missing authentication configuration fails closed. Existing records migrate into the `local` workspace and are never claimed by the first person to sign up.

## Configure once as the owner

1. In your Neon project, enable **Auth** on the database branch used by Command. Enable email/password signup, email verification and password reset. Copy the **Auth URL** from its connection/setup panel.
2. Add the exact production website origin (for example `https://your-command.vercel.app`) to Neon Auth's trusted domains. Configure and test verification/reset email delivery in Neon. Do not add a wildcard for unrelated sites.
3. In Vercel **Project → Settings → Environment Variables**, add these server-only variables to **Production**:

| Variable                  | Value                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon's pooled PostgreSQL connection string, with its supplied SSL settings                |
| `DATABASE_URL_UNPOOLED`   | Optional direct connection string for migrations; otherwise migrations use `DATABASE_URL` |
| `NEON_AUTH_BASE_URL`      | The Auth URL from the same Neon branch                                                    |
| `NEON_AUTH_COOKIE_SECRET` | A new random secret with at least 32 characters                                           |

Generate the cookie secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Paste it only into the environment setting. Never commit it, put it in a `NEXT_PUBLIC_` variable, or send it in chat. Rotating it signs users out.

4. Redeploy the latest commit. `vercel.json` runs `npm run vercel-build`, which applies committed Prisma migrations and builds the app. It never seeds sample data. Do not use `prisma migrate reset`, `setup`, or `db:seed` on the production database.
5. Open the site, create an account, verify its email, and sign in. A new account starts empty. Create a semester in Settings, then add courses or connect a calendar.

Use separate Neon database/Auth branches and secrets for Preview deployments. Avoid connecting untrusted preview code to production data. Custom domains must also be added to the corresponding Auth trusted domains.

## Before inviting people

- Verify signup, email verification, sign-in, sign-out and password reset on the real domain. Test a second account and confirm its workspace starts empty.
- Missing credentials show “Sign-in is being set up.” A working database URL alone does not enable accounts. Check the Auth URL, cookie secret, trusted domain and provider email settings if account flows fail.
- Workspace export and erasure are account-scoped. Erasure currently leaves the Neon Auth login account intact. Provide a support contact and account-deletion process before broad public release; operator/contact details are still pending in the policy pages.
- The hosted syllabus reader is a **separate deployment**. Follow [its owner guide](../services/syllabus/README.md), connect its HTTPS URL, and configure provider billing/usage limits once. Authentication does not provision AI reading. Vercel's request size limit also applies to syllabus uploads (use smaller files than its 4.5 MB function payload limit).
- Hosted calendar checks run after authenticated workspace refreshes, at most every 15 minutes per feed; up to three due feeds are checked per refresh. Users can also choose **Sync now**. No scheduled background updates are promised while everyone is signed out.

## Development and verification

Without Vercel or `COMMAND_HOSTED=true`, the app keeps its loopback-only local edition and needs no account. To exercise hosted mode locally, use `COMMAND_HOSTED=true` with a separate Auth test branch and its approved localhost domain.

`npm test` covers the session boundary and application logic. `npm run test:tenancy` requires the local PostgreSQL service and creates an isolated temporary database. It checks independent active semesters, workspace reads/exports, guessed IDs, cross-account links, syllabus imports, calendar operations and erasure. The active database is not erased or seeded. Live Neon email/session behavior still needs the deployment smoke test above.
