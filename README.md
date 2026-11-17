# KostasTravel

**A hotel booking site and a room-mapping explorer, built on the Nuitee LiteAPI.**

Live demo: **https://kostastravel.onrender.com** · Mapping explorer: **/mapping** · Current version: **v1.4.2** ([changelog](CHANGELOG.md))

> Built by Konstantinos Xeras, product manager (data, search and AI products). This repo is part of my product portfolio: each app documents the problem, the decisions and what I learned, along with the code.

## Why this exists

Hotel distribution runs on supplier data that disagrees with itself. The same physical room arrives under many names ("Deluxe Twin Room Non smoking", "Deluxe 2 Twin Beds Guestroom", "Deluxe room, Guest room, 2 Twin, City or Atrium view"), and a mapping layer has to resolve each one to a single master room with the right photos, beds and amenities.

I wanted to understand that problem hands-on, so I built two things on the same API:

1. A guest-facing booking site, to see what mapping and content quality look like to the person paying.
2. A room-mapping explorer, to see the machinery behind it: which supplier names resolve to which master room, which rooms in the catalogue never receive a price, and where room records look alike.

What I found is written up in the [case study](docs/case-study.md).

## What's inside

| Page | What it does |
|---|---|
| / Booking site | Destination search and AI "describe your stay" search, multi-room with children's ages, filters and sorting, hotel page with gallery, reviews, AI review sentiment and map, per-room details (photos, beds, size, amenities, "sold as" supplier name), prebook price re-check, vouchers and cancellation timeline, payment through Nuitee's Payment SDK, booking confirmation, lookup and cancellation |
| /mapping Room mapping explorer | Destination scan of mapping coverage per hotel, hotel inspector grouping supplier room names under each master room, rooms with no live rate, similar-room detection with shared-photo check, side-by-side room comparison, CSV export |
| /lab API Lab (password-protected) | One-click access to 29 LiteAPI endpoints with editable parameters, and a live log of every API call |

## Screenshots

See [docs/screenshots](docs/screenshots/README.md).

## How it works

```
Browser (index.html, mapping.html, lab.html)
        │  fetch /api/...
        ▼
server.js  (Node + Express proxy, keeps the API key server-side)
        │  X-API-Key
        ▼
Nuitee LiteAPI v3: api.liteapi.travel · book.liteapi.travel · da.liteapi.travel
```

- No front-end framework. Each page is one self-contained HTML file, which keeps the app easy to read, change and deploy.
- The API key never reaches the browser. All LiteAPI calls go through the Express server.
- Booking flow: search rates, prebook (which locks the price and returns a payment intent), pay through the Nuitee Payment SDK, then book.
- Room mapping: rate searches send `roomMapping: true`, so each rate carries a `mappedRoomId` that is joined with the hotel's room content from `/data/hotel`.

## Run it locally

Requires Node 18 or newer and a LiteAPI key (a sandbox key starts with `sand_`).

```bash
npm install
cp .env.example .env      # then paste your key into .env
npm start                 # http://localhost:3000
```

Optional: set `LAB_PASSWORD` in `.env` to enable `/lab`.

Sandbox test card: `4242 4242 4242 4242`, any future expiry date, any CVC.

## Deploy

The live demo runs on Render's free plan:

- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `LITEAPI_KEY` (required) and `LAB_PASSWORD` (optional)

The free plan sleeps when idle, so the first request after a quiet period can take up to about a minute.

## Product documentation

| Document | What it covers |
|---|---|
| [Product brief](docs/product-brief.md) | Users, goals, scope and non-goals |
| [Case study](docs/case-study.md) | What I explored, what I found and what I would do next |
| [Decision records](docs/decisions/) | The main product and technical decisions, with the trade-offs |
| [Changelog](CHANGELOG.md) | Every version, what changed and why |
| [Versioning](docs/versioning.md) | How versions are numbered, tagged and released |

## Status and limits

- Runs against the LiteAPI sandbox. Inventory, prices and content differ from production.
- Built in about a day for exploration and demonstration, not for production traffic.
- The similar-room check and the name-mismatch flag are simple rules of my own, meant to pick cases for a human to review. They are not Nuitee's mapping logic.

## Credits

Hotel data, rates, booking and payment by [Nuitee LiteAPI](https://www.liteapi.travel/). Maps by OpenStreetMap contributors. Not affiliated with or endorsed by Nuitee.
