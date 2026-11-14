# 0005: Show the mapping to guests with "sold as"

**Status:** Accepted · **Date:** 2026-11-13

## Context
A guest sees the master room's name, photos and amenities, while the supplier may have sold a differently named room. When the mapping is wrong, the guest has no way to notice.

## Decision
The room details panel shows the master room and, when the supplier's name differs, a "Sold as …" line with the supplier's room name.

## Consequences
- The guest-facing effect of a mapping error becomes visible (for example, a Grand Deluxe panel "sold as" a Deluxe rate).
- Most differences are harmless wording ("1 King Standard" vs "Standard King Room"). A real product would show this to support or QA staff rather than to every guest.
