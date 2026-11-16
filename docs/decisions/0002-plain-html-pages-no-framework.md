# 0002: Plain HTML pages, no front-end framework

**Status:** Accepted · **Date:** 2026-11-12

## Context
The app was built and changed in short sessions, deployed through GitHub's web upload, and needed to be readable by someone reviewing a portfolio.

## Decision
Each page (`index.html`, `mapping.html`, `lab.html`) is one self-contained HTML file with its own styles and script. No build step, no framework.

## Consequences
- Any change is one file. There is nothing to compile, and the repo is easy to read.
- Files are long, and shared pieces (such as the photo viewer) are copied into each page rather than imported.
- If the app grows beyond a demo, a component framework would pay off.
