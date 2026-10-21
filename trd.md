# TRD: MediSave (दवा बचत) — technical requirements

Companion to `prd.md`. Everything here is a plan. Code is written during the event.

## 1. Constraints that shape the design

| Constraint | Consequence |
|---|---|
| Must work with no internet | Static PWA, data bundled, state on device, no required backend |
| Demo cannot depend on a live request | All price data is a file in the repo |
| Cheap phone, weak signal | Small JS bundle, system and self-hosted fonts, no heavy animation |
| Wrong drug facts cause harm | Facts only from shipped data; language model never supplies them |
| Commit history is scored | Small commits from the first minute |

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React + Vite (TypeScript preferred) | Fast to build, easy to review |
| Styling | Tailwind or plain CSS with variables from `theme.md` | Small output |
| PWA | `vite-plugin-pwa` (Workbox, precache) | Service worker with little code |
| Local storage | IndexedDB via Dexie | Saved list and settings |
| Matching | Custom normaliser + trigram similarity + edit distance (e.g. `fastest-levenshtein`) | Core logic stays testable |
| Data build | Python script (`pandas`) run at build time | Cleaning is offline work |
| Tests | Vitest for the matcher and data validator | Fast feedback |
| Hosting | GitHub Pages or Netlify (static) | Free, HTTPS (needed for service workers and camera) |

## 3. Architecture

```
            ┌──────────── build time (laptop) ────────────┐
 raw Jan Aushadhi CSV ─┐                                   │
 curated brands.csv  ──┼─► scripts/build_data.py ─► validate ─► public/data/*.json
 NPPA ceilings (opt) ──┘                                   │
            └─────────────────────────────────────────────┘

            ┌──────────────── runtime (phone) ────────────────┐
 Service worker precaches app shell + data JSON + fonts
 UI ─► normalise query ─► matcher ─► result card
   │                          ▲
   │                          └─ generics.json, brands.json (in memory)
   ├─► IndexedDB (saved prescription list, language, last data date)
   └─► (optional, online only) photo ─► Gemma endpoint ─► candidate names ─► same matcher
```

No server is required for the core product.

## 4. Data model

### 4.1 `generics.json` (from the Jan Aushadhi list)

Produced from `jan_aushadhi_clean.csv` (see `scripts/clean_jan_aushadhi.py`).

| Field | Type | Notes |
|---|---|---|
| `ja_code` | int | Official drug code |
| `raw_name` | string | Original text, kept for display and audit |
| `molecules` | string[] | Lower-case, split from the name |
| `strengths` | string[] | e.g. `["500mg","125mg"]` |
| `form` | string | tablet, capsule, syrup, injection, etc. |
| `unit_size` | string | As published, e.g. `10's` |
| `pack_count` | number or null | Parsed from `unit_size` when it is a count |
| `ja_mrp` | number or null | **null when the list shows 0.00** (price not published) |
| `price_listed` | boolean | false means show "Price not listed" |
| `price_per_unit` | number or null | `ja_mrp / pack_count` |
| `group` | string | Therapeutic group from the list |
| `is_consumable` | boolean | Exclude from medicine search |
| `parse_ok` | boolean | Only `parse_ok` rows are eligible for comparison |

Facts from the supplied 20 Oct 2026 file: 2,439 rows, 314 consumables, 344 rows with MRP 0, about 1,626 rows parsed fully. Re-check these numbers after re-running the script.

### 4.2 `brands.json` (hand-curated, cited)

| Field | Type | Notes |
|---|---|---|
| `brand_id` | string | Slug |
| `brand_name` | string | As printed on the pack |
| `manufacturer` | string | Optional |
| `molecules`, `strengths`, `form` | as above | Must equal the linked generic's values |
| `pack_count` | number | Units in the priced pack |
| `brand_mrp` | number | Copied exactly from the cited source |
| `source_url` | string | Required |
| `source_date` | date | Required |
| `ja_code` | int | Link to the equivalent generic row, set by a human |
| `aliases` | string[] | Common spellings and Hindi names (optional) |

Rule: a row without `source_url` and `source_date` fails the build. No estimated prices.

### 4.3 NPPA ceiling prices (optional)

Ceiling prices cover only scheduled drugs, are per unit, and exclude GST. If used, they live in a separate field `ceiling_price_per_unit` with the label "Government ceiling price (before GST)". Never present a ceiling as a brand's MRP.

## 5. Price comparison logic

1. Pick the brand row and its linked generic row.
2. Quantity = the brand's `pack_count` (e.g. 10 tablets).
3. Generic price for the same quantity = `price_per_unit * brand.pack_count`, rounded to the nearest rupee, shown with "approx." If the generic pack has the same count, show `ja_mrp` directly.
4. Saving = `brand_mrp − generic_price_for_same_quantity`. If the saving is ≤ 0, say "No saving found". Do not hide it.
5. If `price_listed` is false, show "Jan Aushadhi price not listed" and no saving.

## 6. Matching algorithm

Input: free text (typed, voice, or Gemma candidate).

1. **Normalise**: lower-case, strip diacritics, remove punctuation, collapse spaces, map common Devanagari spellings through an alias table.
2. **Extract strength hints**: numbers with optional unit (`625`, `500 mg`). Remove from the name tokens but keep for filtering.
3. **Candidate generation** over brand names, aliases, and molecule names:
   - trigram Jaccard similarity,
   - Levenshtein distance ratio,
   - simple phonetic key (collapse repeated letters, map ph→f, c/k, z/s, drop vowels except the first) for sound-alike errors.
4. **Score** = weighted blend, with a bonus for exact prefix and a bonus when the strength hint matches a known variant.
5. **Decision**:
   - one candidate far above the rest and score ≥ high threshold → show the result card with "Matched: X. Not right?"
   - several close candidates → "Did you mean…" list. The user picks.
   - best score below the low threshold → "Not in our list."
6. **Strength mismatch**: if the hint matches no variant of the matched brand, list the available variants and do not pick one.

Thresholds are tuned against the test list in section 10.

## 7. Offline strategy

- Precache: HTML, JS, CSS, fonts, `generics.json`, `brands.json`, icons, manifest.
- Strategy: cache-first for static assets, precache versioned by build hash.
- Data update: the data files are versioned with the build, and the app shows the data date. No runtime data fetch is required.
- First load needs a connection (once). Document this in the README.
- Register the service worker early in the build, not at the end.
- Test in aeroplane mode on a real phone, and also with DevTools offline.

## 8. Optional: photo input with Gemma

Status: stretch (P2). Build only after the typed path is finished and committed.

**Job**: read printed text from a photo of a strip or box and return candidate drug names.
**Not the job**: naming a generic, giving a dose, or stating a price.

Contract:

```
Input : one image (user-confirmed upload)
Prompt: "List only the medicine names printed in this image, as JSON:
         {\"names\": [\"...\"]}. Do not add doses, uses, or advice.
         If nothing is readable return {\"names\": []}."
Output: candidate strings, each passed through the normal matcher.
UI    : candidates are shown as chips; the user taps one to confirm.
```

Rules:
- Treat model output as untrusted text. Parse JSON defensively, cap the number and length of names, escape before rendering.
- The camera button is hidden when offline or when the endpoint is unreachable. Typing always works.
- Do not store images. Do not send an image without a tap on the photo button.
- Record in the README which Gemma 4 variant is used, where it runs, and what it gets wrong (blur, glare, handwriting, similar-looking names).
- **Unverified**: this plan assumes a Gemma 4 variant that accepts images. Check the model card first. If no variant does, fall back to on-device OCR followed by an optional text-only Gemma step to tidy the noisy text, with the same confirmation step.
- Where it runs for the demo: local Ollama on a laptop reachable from the phone on the same network (set the allowed origins), or a hosted endpoint if one is available. Decide on day one.

## 9. Non-functional requirements

| Area | Target |
|---|---|
| JS bundle | under about 250 KB gzipped, excluding data |
| Data payload | under about 1 MB gzipped |
| Time to interactive | under 3 s on a mid-range phone after first load |
| Screen width | works at 360 px, no horizontal scroll |
| Tap targets | at least 48 × 48 px |
| Contrast | WCAG AA minimum |
| Accessibility | labels on inputs, visible focus, readable with large system font |
| Privacy | no accounts, no analytics, no third-party scripts, no tracking |

## 10. Testing

**Matcher tests (must pass before demo)**

| Input | Expected |
|---|---|
| exact brand name | exact result |
| one-letter typo | correct result in the top 3 |
| dropped vowels (`pntoprzl`) | correct result in the top 3 |
| missing strength | variant list |
| wrong strength | variant list, nothing auto-picked |
| nonsense (`xyzq`) | "Not in our list" |
| Hindi spelling in alias table | correct result |

Fill the table with real names from your own `brands.json` once it exists.

**Data validator (runs in CI and at build)**
- every brand row has `source_url`, `source_date`, and a valid `ja_code`,
- brand and linked generic agree on molecules, strengths, and form,
- no price ≤ 0 is displayable,
- generic row has `price_listed` true for any comparison.

**Manual checklist**: aeroplane mode, 360 px width, Hindi toggle, disclaimer on every screen, print sheet, empty state, long names.

## 11. Repo layout

```
.
├── public/data/            # generics.json, brands.json (built)
├── data/raw/               # original downloads + SOURCES.md
├── data/clean/             # cleaned CSVs
├── data/brands.csv         # curated, cited brand prices
├── scripts/                # clean_jan_aushadhi.py, build_data.py, validate_data.py
├── src/
│   ├── lib/                # normalise.ts, matcher.ts, compare.ts, db.ts
│   ├── components/
│   ├── i18n/               # hi.json, en.json
│   └── App.tsx
├── tests/
├── prd.md  trd.md  tasks.md  theme.md  workflow.md  agents.md
├── README.md  CONTRIBUTING.md  LICENSE
```

## 12. Risks

| Risk | Mitigation |
|---|---|
| Too few cited brand prices | Decide at the 30-minute data gate. Fall back to another problem. |
| Parsed molecule or strength is wrong for a row | Validator plus manual review of every linked pair |
| Fuzzy match picks the wrong drug | Never auto-pick on low margin. Show candidates. |
| Gemma misreads a name | Human confirmation, matcher, "not found" path |
| Service worker caching bug at the last minute | Build it first, test every hour |
| Stale prices | Show the data date on every result |
