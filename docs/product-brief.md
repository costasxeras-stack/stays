# Product brief: KostasTravel

## Problem

Hotel supply reaches booking sites from many suppliers, each describing the same room differently. If the mapping from supplier rates to the hotel's master rooms is wrong, or the room content is thin, guests see the wrong room, the wrong photos or an empty room page. That costs conversion and creates complaints at check-in.

## Who it is for

| User | Need |
|---|---|
| Traveller | Find a hotel, understand exactly which room they are paying for, book and manage it. |
| Mapping and content analyst | See how supplier names resolve to master rooms, spot rooms without prices and rooms that look alike, and compare them quickly. |
| Developer evaluating the API | Call any endpoint, see the raw response and the timing. |

## Goals

1. Cover the full booking journey on a real travel API: search, details, price re-check, payment, confirmation, cancellation.
2. Make room mapping visible: to guests ("sold as") and to analysts (explorer).
3. Find real mapping and content problems in live data, and explain each one at the level a product team can act on.

## Scope

| In scope | Out of scope |
|---|---|
| One-page booking flow with the Payment SDK | User accounts and saved trips |
| Destination and AI search, filters, sorting | Loyalty and guest profiles in the UI (available in the API Lab) |
| Hotel and room content, reviews, sentiment | Production traffic, monitoring and scaling |
| Room-mapping explorer with CSV export | Fixing or editing the mapping itself |
| API Lab for raw endpoint access | Mobile apps |

## Success measures

For a portfolio project, success is learning and evidence rather than usage:

- The full booking journey works end to end in sandbox.
- At least three mapping or content problems found in live data, each verified by hand and explained with its guest impact.
- Each version documented with what changed and why.

## Constraints

- Free hosting (Render free plan) and the LiteAPI sandbox.
- Built and changed in short sessions, so the code stays simple: one HTML file per page and one small server.
