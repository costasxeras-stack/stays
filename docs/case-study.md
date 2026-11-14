# Case study: what room mapping looks like from the outside

**Konstantinos Xeras · November 2026 · KostasTravel v1.4.0**

## The question

A hotel room reaches a booking site through several suppliers, each with its own name for it. A mapping layer has to decide which of a hotel's master rooms every supplier rate belongs to, and the guest then sees that master room's photos, beds and amenities.

I wanted to answer one question with real data: **where does this go wrong, and how would a guest notice?**

## Approach

1. **Built the guest view first.** A complete booking site on the Nuitee LiteAPI, from search to payment and cancellation, so I could see mapping and content quality the way a guest does.
2. **Built an explorer for the machinery.** For each hotel, the explorer joins two views the API already offers:
   - the **content catalogue** (`/data/hotel`): every master room, with photos, beds, size and amenities;
   - the **rates** (`/hotels/rates` with `roomMapping: true`): every supplier rate, with the `mappedRoomId` it was resolved to.

   Putting them side by side shows which supplier names land on which room, which rooms never receive a price, and which rooms look alike.
3. **Scanned a real market.** Kraków, 12–14 December 2026, 2 adults, guest from Poland. I looked in depth at the 40 hotels with the most offers.
4. **Checked every candidate by hand** before calling it a finding: room names, prices, bed lists and the actual photo files.

All data comes from the LiteAPI **sandbox** on 13 November 2026, so the numbers are illustrative, not production figures.

## Headline numbers

| Measure | Result |
|---|---|
| Hotels with rates in Kraków | 92 |
| Hotels analysed in depth | 40 |
| Supplier rates resolved to a master room | 533 of 533 (100%) |
| Rates resolved to a room ID missing from the catalogue | 0 |
| Master rooms in the catalogue / with a live rate | 354 / 181 |
| Hotels with two master rooms under an identical name | 3 |
| Hotels with a confirmed tier swap | 1 |
| Bookable rooms with a one-line description (under 60 characters) | 12 of 181 |

**Coverage was excellent. The problems were in precision and content quality**, and they were rare but expensive when they happened.

## Findings

Hotel names are anonymised. Room names are quoted exactly as the API returned them.

### 1. The same room stored twice, with prices on the empty copy

*Hotel A, a 4-star hotel in Kazimierz.*

The catalogue holds two master rooms called **"Classic Plus Queen"**: same queen bed, same 19 sqm, and the **same six photo files**.

| | Record 1 | Record 2 |
|---|---|---|
| Live rates linked to it | **4** | **0** |
| Amenities | **0** | **41** |
| Description | "The unit has 1 bed." | Full paragraph |

Every price for this room is linked to the empty record, so a guest sees a room with no amenities and a one-line description. The complete record already exists in the catalogue but never receives a price, so no guest ever sees it.

The record IDs suggest how it happened: the empty record sits in the same ID series as the hotel's other rooms, while the complete one uses a different series, which looks like a second content source. The richer content was **added as a new room instead of merged** into the existing one.

**Why it matters:** this isn't missing supplier data. The data is already in the catalogue. It's a missing merge, which is a golden-record and survivorship problem.

### 2. Two room tiers mapped the wrong way round

*Hotel B, a large international chain hotel.*

| Supplier rate | Price (2 nights, room only) | Mapped to master room |
|---|---|---|
| "Deluxe Twin Room Non smoking" | about €423 | **"Grand Deluxe**, Guest room, 2 Twin/Single Bed(s)" |
| "Grand Deluxe Twin Room Non smoking" | about €475 | **"Deluxe**, Guest room, 2 Twin/Single Bed(s)" |

The supplier prices follow their own names, and the mapping crosses them. A guest paying for Deluxe is shown Grand Deluxe, and the other way round.

Photos don't help a reviewer catch it: the two master rooms share three identical photo files. On the booking site, the room panel shows *Grand Deluxe…, sold as "Deluxe Twin Room Non smoking"*.

### 3. Different price tiers, the same pictures

*Hotel C, a hotel in Kazimierz.*

The Standard twin (16 m², about €314–€348) and the Deluxe twin (25 m², about €436–€485) share **8 of the Standard room's 9 photos**. The Deluxe costs about €120 more for two nights, and the content gives a guest no way to see why.

Photo reuse across rooms was common in general (38 of the 40 hotels had at least one shared photo file between rooms, often bathroom or breakfast shots), so shared photos alone are not a problem. They become one when they hide a real difference in tier or price.

### 4. Room content that contradicts itself

- A **"Twin Room"** listing two twin beds, whose description starts "The double room…".
- Two **family rooms** whose bed list shows one king bed while allowing four and five guests. One of them is a connecting-room product, so the second room's beds appear to be missing from the content.

## What my own rules got wrong

I flagged candidates with simple keyword rules before checking them by hand. Some were false positives:

- "Classic" mapped to "Standard": synonyms, not an error.
- "Junior King Suite" mapped to "Junior Suite": correct.

**Lesson:** rules need a synonym layer, and anything rule-based needs a human-review step before it counts as an error. That shaped how I would design the real thing (below).

## What I would do next

1. **Detect duplicate master rooms automatically.** Flag rooms in the same hotel with matching bed type and size, and score them by shared photo files and name similarity. Merge high-confidence pairs automatically and send the middle band to human review.
2. **Define survivorship rules.** When two content sources describe the same room, keep one master record and choose the best source field by field (amenities, description, photos), then point all rates at it.
3. **Watch for tier inversions with a price signal.** Within a hotel, a rate whose supplier name says one tier but which lands on a different tier, and whose price fits the supplier's tier, is a strong candidate for review.
4. **Prioritise by booking value, not by count.** Fix first where rates actually land, weighted by price and booking volume.
5. **Measure quality, not only coverage.** Alongside coverage, track precision through sampled audits, a content-completeness score per bookable room, and the duplicate-room rate.

## What I learned as a PM

- **Coverage can look perfect while quality fails.** 100% of rates resolved, yet the guest still sees the wrong room or an empty one.
- **Look at the product the way the guest does, then go one layer down.** Every finding started from something odd on the booking page and was explained by the catalogue behind it.
- **Check your own output against reality.** Comparing my hotel count with a consumer travel app exposed a result cap in my own code; checking bed widths and photo files stopped me from overstating a "duplicate" that wasn't one.
- **Be explicit about evidence levels.** I label each finding as confirmed or as a strong candidate, and I keep sandbox numbers labelled as sandbox.

## Limits

- Sandbox data from one market on one date range. Production inventory, content and mapping may differ.
- 40 hotels is a small sample. The counts show that each pattern exists, not how common it is.
- Explanations of root causes (for example, a second content source) are hypotheses based on the data I could see.
