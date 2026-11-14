# 0001: Keep the API key behind a small Express server

**Status:** Accepted · **Date:** 2026-11-12

## Context
LiteAPI calls need a secret key. A site that calls the API straight from the browser would expose that key to every visitor.

## Decision
All API calls go through `server.js`, a small Node and Express proxy. The browser only calls `/api/...` on the same site. The key lives in an environment variable on the host.

## Consequences
- The key never reaches the browser, and the server can validate requests (for example, booking lookup only works with the matching email).
- The site needs a server, so it can't be hosted as static files.
- The proxy is a natural place for a call log, which later powered the API Lab.
