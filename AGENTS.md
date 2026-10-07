<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Launching Command locally

Calendar sync makes outbound HTTPS requests from the Next.js server. When launching through an execution tool with restricted networking, start the server with the approved network-capable execution mode. A loopback HTTP 200 alone does not verify calendar connectivity. Keep the app bound to 127.0.0.1, preserve feed URL validation and TLS verification, and never print private feed URLs. Do not seed or reset the user's database when restarting it.
