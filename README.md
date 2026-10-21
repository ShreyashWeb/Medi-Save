# MediSave (दवा बचत)

> Type a medicine name. See what the same molecule costs at a Jan Aushadhi Kendra. **₹240 → ₹28.**


**Price and molecule information only. This is not medical advice. Always confirm with your doctor or pharmacist before any decision about your medicine.**

Built for Hacktoberfest 2026, problem 3: *The Prescription You Cannot Read*, and the optional Gemma 4 track.

Team: `[team name]` — `[name]`, `[name]`

---

## The problem

A patient takes a prescription of brand names to a chemist and pays what they are told. For many drugs a generic with the same molecule and strength is listed by Jan Aushadhi at a fraction of the price, but the patient cannot read the handwriting, does not know the molecule, and will not argue at the counter.

## What it does

- Search by brand name or molecule, in Hindi or English.
- Shows the molecule, strength, form, and a price comparison with the saving as the headline.
- Forgives spelling mistakes and half-read names.
- Says plainly when a medicine is not in its data. It never guesses.
- Works offline after the first load, with the phone in aeroplane mode.
- Saves a personal list on the device and prints a one-page sheet. *(if built)*
- Reads a printed medicine name from a photo using Gemma, with the user confirming the result. *(if built)*

## What it deliberately does not do

- It does not give medical advice, doses, side effects, or interactions.
- It does not tell anyone to change a medicine. It says "same molecule listed at this price".
- It does not use a language model to produce drug facts. Facts come only from the data files in this repo.
- It has no accounts, tracking, or ads.

## Screenshots

`[add 360 px screenshots: search, result card, not-found, Hindi]`

## How it works

```
Jan Aushadhi list (official) ─┐
Brand prices (cited by hand) ─┼─► scripts ─► validate ─► JSON in the app
                              ┘
Phone:  type name ─► normalise ─► fuzzy match ─► result card
        (works offline: service worker + data bundled)
Optional, online only:  photo ─► Gemma reads printed text ─► you confirm ─► same matcher
```

1. **Data**: the Jan Aushadhi product list is cleaned by `scripts/clean_jan_aushadhi.py`. Brand prices are entered by hand from cited sources in `data/brands.csv`.
2. **Validation**: a build step rejects any brand row without a source and date, or where the brand and generic disagree on molecule, strength, or form.
3. **Matching**: text is normalised and matched with trigram similarity, edit distance, and a sound-alike key. If several results are close, the user chooses. If none is close, the app says it does not know.
4. **Comparison**: the generic price is scaled to the same quantity as the brand pack and labelled approximate.

Details are in [`trd.md`](trd.md).

## AI model usage

| | |
|---|---|
| Model | `[Gemma 4 variant — fill in after checking the model card]` |
| Where it runs | `[local Ollama on a laptop / hosted endpoint / not used]` |
| What it is asked to do | Read printed medicine names from a photo and return candidate names as JSON. Nothing else. |
| What it is not allowed to do | Name a generic, state a price, give a dose, or give advice. |
| Human check | The user taps the correct name. The app then looks it up in the shipped data. |
| Offline behaviour | The photo button is hidden when the model cannot be reached. Typing always works. |

**What it gets wrong** *(replace with what you actually observe in testing)*:
- `[blurry or glare-affected photos]`
- `[similar-looking brand names]`
- `[handwriting is not supported]`

Why this is the right job for the model: it reads text off a picture, a task where a wrong answer is caught by the confirmation step and the lookup. It is not used where a wrong answer would cause harm.

## Data sources and credits

| Source | Used for | Link and access date |
|---|---|---|
| Jan Aushadhi (PMBI) product list | Generic names, unit sizes, prices | `[URL]`, accessed `[date]` |
| NPPA ceiling prices *(if used)* | Government ceiling price for scheduled drugs, before GST | `[URL]`, accessed `[date]` |
| Brand prices | Brand MRPs, one cited source per row | see `data/brands.csv` (`source_url`, `source_date`) |

Tools and libraries: `[React, Vite, vite-plugin-pwa / Workbox, Dexie, Vitest, pandas, fastest-levenshtein, Noto Sans fonts — confirm the final list]`.

AI tools used during development: `[tool names]`. All generated code was reviewed by the team.

Data note: Jan Aushadhi lists prices as published. Where the list shows no price, the app says "price not listed". Prices at a given Kendra may differ, and stock varies.

## Run it

Requirements: Node `[version]`, Python 3 with pandas.

```bash
git clone [repo-url]
cd [repo]
npm install
npm run dev            # development
npm run build && npm run preview   # production build, test offline here
npm run test
python scripts/validate_data.py
```

**Offline use:** open the app once with a connection. After that it works without internet. To check, load the page, switch the phone to aeroplane mode, and search.

To rebuild the data:

```bash
python scripts/clean_jan_aushadhi.py data/raw/<downloaded-file>.csv data/clean/jan_aushadhi_clean.csv
python scripts/build_data.py
python scripts/validate_data.py
```

## Project structure

```
data/        raw downloads, cleaned files, curated brand prices
scripts/     data cleaning, build, validation
src/lib/     normaliser, matcher, price comparison, local storage
src/i18n/    Hindi and English strings
public/data/ JSON used by the app
```

Planning documents: [`prd.md`](prd.md), [`trd.md`](trd.md), [`tasks.md`](tasks.md), [`theme.md`](theme.md), [`workflow.md`](workflow.md), [`agents.md`](agents.md).

## Known limits

- The data set is small and curated. It is not a complete drug database.
- Only medicines present in `data/brands.csv` can be compared against a brand price.
- Prices are indicative and change over time. The data date is shown on every result.
- Hindi strings need review by a native speaker. `[update when done]`
- Handwriting is not read.

## Contributing

Contributions are welcome. This is a Hacktoberfest project. See [`CONTRIBUTING.md`](CONTRIBUTING.md). The most valuable contributions are:

- more brand-to-generic rows, **each with a source URL and date**,
- Hindi and other language translations,
- matcher test cases from real prescriptions (with no personal data),
- accessibility fixes.

Never submit prices or drug information that you cannot source. Pull requests that add unsourced data will be closed.

## Licence

`[MIT or Apache-2.0]` — see [`LICENSE`](LICENSE).

## Disclaimer

MediSave provides price and molecule information drawn from published lists. It does not provide medical advice, diagnosis, or treatment, and it does not recommend changing any medicine. Confirm every decision with your doctor or pharmacist.
