# 0003: Free hosting on Render

**Status:** Accepted · **Date:** 2026-11-12

## Context
The demo needed a public URL quickly and at no cost. The API provider's sign-up also asks for a website, so the site had to go live before a key existed.

## Decision
Deploy on Render's free plan from GitHub. The server starts without a key and shows a setup message instead of crashing (v0.2.0), so the URL could be created first and the key added later.

## Consequences
- Free, public HTTPS URL, redeployed automatically on every commit.
- The free plan sleeps when idle; the first request can take up to about a minute. Open the site a few minutes before any demo.
