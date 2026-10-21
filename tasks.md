
# tasks.md — build plan

Assumes about 6 working hours and two people (A = app/UI, B = data/matcher). Adjust the clock to the real schedule. Tick boxes as you go and commit after each task. Suggested commit messages are in backticks.

**Rule of the day:** nothing is cut from P0 until all of P0 works offline. P1 and P2 are cut first.

## Phase 0 — before the clock starts (allowed: ideas, research, sketches)

- [ ] Read `prd.md`, `trd.md`, `theme.md`, `workflow.md`.
- [ ] Download the Jan Aushadhi product list. Note URL and date in `data/raw/SOURCES.md`.
- [ ] Collect candidate brand prices with a source URL or pack photo and a date for each. Write them down, but **no code**.
- [ ] Check the Gemma 4 model card: variants, image support, licence.
- [ ] Agree who does A and who does B.

## Phase 1 — first 20 minutes: lock the smallest version

- [ ] Confirm the demo path: type name → fuzzy match → saving card → disclaimer → offline.
- [ ] Create the repo, add `LICENSE` (MIT or Apache-2.0), `README.md` stub, `CONTRIBUTING.md` stub. `chore: init repo with licence and docs`
- [ ] Add `prd.md`, `trd.md`, `tasks.md`, `theme.md`, `workflow.md`, `agents.md`. `docs: add planning documents`
- [ ] Add the repo topic `hacktoberfest`.

## Phase 2 — scaffold and offline first (≈ 40 min)

**A**
- [ ] Vite + React scaffold, 360 px layout shell. `feat: scaffold app`
- [ ] PWA plugin, manifest, icons, service worker precache. `feat: add service worker and manifest`
- [ ] Deploy a "hello" page over HTTPS and test install and offline on a real phone. `chore: first deploy`
- [ ] Theme tokens and fonts from `theme.md`. `style: add design tokens`

**B**
- [ ] Put raw files in `data/raw/`, add `scripts/clean_jan_aushadhi.py`. `data: add Jan Aushadhi cleaning script`
- [ ] Generate `public/data/generics.json` from the clean CSV. `data: generate generics.json`

## Phase 3 — data gate (by about the 1-hour mark)

- [ ] Create `data/brands.csv` with the schema in `trd.md`.
- [ ] Fill brand rows only from sources you can cite. Aim for 60–100.
- [ ] Link each brand to a generic `ja_code` by hand and double-check molecule, strength, and form.
- [ ] Write `scripts/validate_data.py`. It must fail on missing source, missing date, mismatched molecule or strength, or a non-positive price. `data: add validator`
- [ ] **Gate decision:** if fewer than about 40 trustworthy rows exist and no quick way to get more, switch to another problem now.

Commit data in batches: `data: add 20 brand prices with sources`.

## Phase 4 — core product (≈ 2 hours) — P0

**B: matcher**
- [ ] `normalise.ts` with tests. `feat: add query normaliser`
- [ ] Trigram + edit distance + phonetic key. `feat: add fuzzy matcher`
- [ ] Decision logic: confident / did-you-mean / not found. `feat: add match decision logic`
- [ ] Strength-mismatch handling. `feat: handle strength variants`
- [ ] Test table from `trd.md` section 10 filled with real names. `test: matcher cases`
- [ ] `compare.ts`: same-quantity price and saving, price-not-listed case. `feat: add price comparison`

**A: UI**
- [ ] Home with search box and disclaimer footer. `feat: add search screen`
- [ ] Result card with the big saving headline. `feat: add result card`
- [ ] Did-you-mean list and not-found state. `feat: add candidate list and empty state`
- [ ] Hindi / English toggle, all strings in `i18n/`. `feat: add Hindi and English strings`
- [ ] Wire UI to matcher. `feat: connect search to matcher`

**Both**
- [ ] Aeroplane-mode test on a real phone. Fix whatever breaks. `fix: offline issues`

## Phase 5 — P1 features (≈ 1.5 hours)

- [ ] IndexedDB "My prescription" list with total saving. `feat: add saved list`
- [ ] Printable sheet (`@media print`). `feat: add print sheet`
- [ ] Data date and "how matched" line on the card. `feat: show data date and match basis`
- [ ] Add more brand rows (cited). `data: add more brand prices`

## Phase 6 — P2 stretch (only if P0 and P1 are solid)

- [ ] Decide the Gemma endpoint (local Ollama or hosted) and the model variant. Record both.
- [ ] `ocrProvider` module with the prompt contract from `trd.md`. `feat: add photo input via Gemma`
- [ ] Hide camera when offline or endpoint unreachable. `fix: hide photo button offline`
- [ ] Write the honest limits in the README (what it gets wrong). `docs: document Gemma usage and limits`
- [ ] Nearest-Kendra link or Hindi voice input, whichever is simpler. `feat: add Kendra link`

## Phase 7 — polish and submission (last hour)

- [ ] Run the manual checklist in `trd.md`.
- [ ] Check contrast, tap sizes, 360 px, print preview.
- [ ] Remove dead code and unused files.
- [ ] README complete: what it is, how to run, data sources, credits (every tool, library, API, model, dataset), model usage, limits, disclaimer. `docs: finalise README`
- [ ] `CONTRIBUTING.md` is real, not a stub.
- [ ] Tag the demo build: `git tag v0.1.0-demo`.
- [ ] Rehearse the demo twice with the phone in aeroplane mode.

## Demo script (2 minutes)

1. Say the problem in one sentence: "For many branded medicines, the same molecule is much cheaper."
2. Aeroplane mode on.
3. Type a misspelt brand. Show the card: ₹X → ₹Y.
4. Type something not in the data. Show the "ask your pharmacist" message.
5. (If built) photograph a strip, confirm a chip.
6. Show the disclaimer, the data date, and the commit history.

## Cut order if time runs out

Voice input → Kendra link → photo input → print sheet → saved list → did-you-mean list. Never cut: offline, disclaimer, not-found, source and date on every price.
