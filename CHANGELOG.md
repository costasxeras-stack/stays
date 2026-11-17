# Changelog

All notable changes to KostasTravel. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](docs/versioning.md).

Versions 0.1.0 to 1.3.0 were reconstructed from the build history. Their code was not kept as separate commits, so only 1.4.0 onwards has a tagged release.

## [Unreleased]

## [1.4.2] - 2026-11-17

### Fixed
- Opening a hotel showed only its 10 cheapest rates, so pricier room types disappeared on some dates (for example, a "Classic Plus Queen" room was missing for 14–16 December). A hotel opened on its own now loads up to 200 rates.

## [1.4.1] - 2026-11-16

### Changed
- Documentation wording only: shorter sentences, fewer semicolons and less bold text, so the docs read more plainly. No change to how the app works.

## [1.4.0] - 2026-11-13

### Added
- Room details panel on the booking site: photos, beds, size, max guests, amenities, description and a "Select this room" button for every room.
- "Sold as" line in the room details panel, shown when the supplier's room name differs from the master room it is mapped to. This makes the room mapping visible to guests.
- Search by hotel name in the mapping explorer. Pick a destination and dates, then type part of the hotel's name. Accents are ignored.

### Changed
- Opening a hotel now reloads all of its room types. A destination-wide search can return only some of them.
- Mapping explorer renamed to "Room mapping explorer", with neutral, tool-style wording throughout. "Possible duplicate or look-alike master rooms" is now "Similar rooms in this hotel".

### Fixed
- Typing a hotel name and clicking Inspect hotel straight away could reopen the suggestion list after the hotel loaded.

## [1.3.0] - 2026-11-12

### Added
- Full-screen photo viewer across the site: arrows, counter, thumbnails, keyboard and swipe, closes with Escape or the browser's back button.
- Room photos next to each room in the hotel view, using the room's `mappedRoomId`.
- Compare rooms in the mapping explorer: tick two or more master rooms to see photos, beds, size, guests, live rates, supplier names, amenities and descriptions side by side. Identical photo files are outlined, and amenities that differ are highlighted.
- Similar-room detection: pairs of master rooms with the same bed type and size, with a count of shared photo files and a one-click Compare.

### Changed
- The mapping explorer searches as a guest from Poland, to keep prices consistent with the booking site's default market.
- Room content now returns all photos, the full description and all amenities.

### Fixed
- Escape in the photo viewer closed the hotel window behind it too.
- A photo that failed to load after the viewer had closed caused a script error.

## [1.2.0] - 2026-11-12

### Changed
- Up to 200 hotels per search, up from 40. A check against a live consumer travel app showed my cap was hiding hotels.
- Search timeout raised from 20 to 30 seconds. A first search took 19.5 seconds, close to the old limit.
- Hotel photo and facility lists are no longer cut at 16 and 24 items.

### Fixed
- Check-in and check-out times stayed empty because the code read only one field name. It now tries several.

## [1.1.0] - 2026-11-12

### Added
- The browser's back and forward buttons work on every page: back closes a hotel window, returns from checkout to results, and returns from a hotel to the scan in the mapping explorer.

### Changed
- Rebranded from "Philoxenia" to KostasTravel.

## [1.0.0] - 2026-11-12

Full rebuild to cover most of what the LiteAPI offers.

### Added
- Greek Aegean design: blue and white, Greek key borders, destination cards with real hotel photos.
- AI search: describe the stay in plain words (LiteAPI semantic search).
- Multi-room search with children's ages, currency and guest-nationality pickers.
- Filters and sorting: price, stars, guest score, free cancellation, breakfast, hotel name.
- Hotel page: gallery, description, facilities, reviews with AI sentiment summary, map.
- Checkout: prebook price re-check with warnings for price or policy changes, voucher codes, cancellation timeline.
- Manage booking: look up and cancel a booking with booking ID and email.
- API Lab (`/lab`): 29 endpoints with editable parameters and a live call log, behind a password.
- Room mapping inspector (`/mapping`): mapping coverage per destination and per hotel, supplier names grouped under master rooms, CSV export.

### Security
- Booking lookup and cancellation only work when the email matches the booking.
- The API Lab only allows a fixed list of endpoints, and only with the correct password.

## [0.3.0] - 2026-11-12

### Changed
- First design refresh: full-screen hero, floating search bar, photo cards, skeleton loading, two-column checkout.

## [0.2.0] - 2026-11-12

### Changed
- The server starts without an API key and shows a setup message instead of crashing, so the site can go live before signing up for an API key (the sign-up form asks for a website).
- All files moved to the top level of the repo, so the code can be uploaded through GitHub's web page without folders.

## [0.1.0] - 2026-11-12

### Added
- First working version: destination search, hotel rates, prebook, payment through the Nuitee Payment SDK, and booking.
- Express server that keeps the API key off the browser.

[Unreleased]: https://github.com/[your-username]/kostastravel/compare/v1.4.2...HEAD
[1.4.0]: https://github.com/[your-username]/kostastravel/releases/tag/v1.4.0
