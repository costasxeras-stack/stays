# 0004: Build a mapping explorer next to the booking site

**Status:** Accepted · **Date:** 2026-11-12

## Context
The booking site shows only rooms that have prices, so mapping and content problems behind it stay invisible. The API exposes both halves separately: the content catalogue (`/data/hotel`) and rates with `roomMapping: true`.

## Decision
Build `/mapping`, an explorer that joins the two: supplier names grouped under each master room, rooms in the catalogue with no live rate, similar rooms, and a side-by-side Compare.

## Consequences
- Problems that a guest can't see (such as the same room stored twice) become visible in one screen.
- Its checks are simple rules (same bed type and size, shared photo files, keyword differences). They pick candidates for a human to review. They don't prove errors. The case study lists the false positives.
- The first scan found a stronger problem than expected only after checking photos by hand, which led to the photo-file comparison in v1.3.0.
