# agents.md — instructions for AI coding agents

Read this file first. It applies to Claude Code, Cursor, Copilot, Gemini, or any other agent working in this repo. Also read `prd.md`, `trd.md`, `theme.md`, and `workflow.md`.

## Project in one paragraph

MediSave (दवा बचत) is an offline-first PWA. A user types or photographs a brand-name medicine and sees the molecule, strength, and indicative Jan Aushadhi price next to the brand price, with the saving as the headline. It is price and molecule information only, not medical advice. Users have cheap phones, weak signals, and read Hindi.

## Non-negotiable rules

1. **Never invent drug data.** No brand prices, generic prices, molecules, strengths, doses, uses, or interactions from model memory. If a value is not in `public/data/*.json` or the source CSVs, the app says it is not available.
2. **No language model writes drug facts into the UI.** The only allowed model use is reading printed text from a photo and returning candidate names, which a human confirms and the matcher then resolves against shipped data.
3. **Never display a price of 0.** A Jan Aushadhi row with no published price is `price_listed: false` and shows "Jan Aushadhi price not listed".
4. **Never give advice.** No "switch to", "replace with", "safe", "better", "recommended". Use "Same molecule listed at this price".
5. **Disclaimer on every screen**, not dismissible: price information only, not medical advice, confirm with your doctor or pharmacist.
6. **Works offline.** Do not add any runtime dependency on a network request for the core flow. No CDN scripts, remote fonts, or remote images.
7. **No tracking.** No analytics, no third-party scripts, no accounts.
8. **Do not auto-pick on low confidence.** If the matcher margin is low, show candidates.
9. **Do not skip the data validator.** Every brand row needs `source_url` and `source_date`.
10. **Do not rewrite git history** or create one huge commit.

## Working method

- Do one small task at a time, matching one commit. Suggest a Conventional Commit message.
- Explain what changed and why in two or three sentences.
- Run the tests and the validator after changes, and report the result honestly. If you could not run them, say so.
- If a request conflicts with the rules above, say so and propose a safe alternative instead of complying.
- If you are unsure about a fact, say you are unsure. Do not fill the gap.
- Prefer deleting code to adding code. Keep the bundle small.

## Stack and layout

- React + Vite (TypeScript), `vite-plugin-pwa`, Dexie (IndexedDB), Vitest.
- Python 3 + pandas for data scripts in `scripts/`.
- Layout is in `trd.md` section 11. Business logic lives in `src/lib/` (`normalise.ts`, `matcher.ts`, `compare.ts`, `db.ts`). Components contain no matching or price logic.
- All user-facing strings go in `src/i18n/hi.json` and `en.json`. No hard-coded UI text.
- Styling uses the CSS variables in `theme.md`.

## Commands

Fill these in when the project is scaffolded, and keep them accurate.

```
npm install
npm run dev          # local dev server
npm run test         # unit tests
npm run build        # production build
npm run preview      # serve the build (test offline here)
python scripts/clean_jan_aushadhi.py data/raw/<file>.csv data/clean/jan_aushadhi_clean.csv
python scripts/build_data.py
python scripts/validate_data.py
```

## Data contracts

- `generics.json` rows come from the Jan Aushadhi list. Fields are in `trd.md` section 4.1. Rows with `parse_ok: false` or `is_consumable: true` are not used for comparison.
- `brands.json` rows come from `data/brands.csv`. Fields are in `trd.md` section 4.2.
- A comparison is allowed only if the brand and the linked generic agree on molecules, strengths, and form, and the generic has `price_listed: true`.
- Same-quantity price: `price_per_unit * brand.pack_count`, rounded, labelled approximate.
- NPPA ceiling prices, if added, are per unit, exclude GST, and are labelled "Government ceiling price (before GST)". They are never shown as a brand's MRP.

## Matcher expectations

- Normalise: lower-case, strip diacritics, remove punctuation, apply alias table (including Devanagari).
- Score with trigram similarity, edit distance, and a phonetic key. Use the strength hint as a filter and a bonus.
- Outcomes: confident match, "did you mean" list, or not found. Test all three.
- Keep thresholds in one config object so they can be tuned against the test list.

## Gemma photo input (optional, P2)

Only build this after the typed flow works offline and is committed.

- Prompt contract: return only the printed medicine names as JSON `{"names": [...]}`. No doses, uses, or advice. Empty array if unreadable.
- Treat the output as untrusted. Parse defensively, cap count and length, never render as HTML.
- Show names as tappable chips. The user confirms one. Then run the normal matcher.
- Hide the photo button when offline or when the endpoint is unreachable.
- Do not store or log images.
- The README must name the Gemma 4 variant, where it runs, what it is asked to do, and what it gets wrong. Do not claim image support until the model card is checked.

## Style

- Readable over clever. Small functions with tests.
- No new dependency without a reason in the commit message and a size check.
- Accessible by default: labels, focus, contrast, 48 px targets.
- Comments explain why, not what.

## When you finish a task

Reply with:
1. What you changed (files).
2. How to check it (command or manual steps, including aeroplane mode if relevant).
3. Anything you were unsure about or did not do.
4. A suggested commit message.
