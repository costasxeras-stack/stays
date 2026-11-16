# 0006: Search hotels by name, not ID, in the explorer

**Status:** Accepted · **Date:** 2026-11-13

## Context
The explorer first opened a hotel by its LiteAPI ID (such as `lp1a2b3`). Nobody remembers IDs, and typing one during a live demo is slow and error-prone.

## Decision
Pick a destination and dates, then type part of the hotel's name. Suggestions come from the hotels with live rates for that search. Accents are ignored, and an ID still works.

## Consequences
- Faster and more natural for analysts and demos.
- Only hotels with live rates on the chosen dates can be found by name. A hotel with no availability needs its ID.
