# Contributing to MediSave

Thanks for helping. MediSave is a Hacktoberfest project that shows the price of a branded medicine next to the Jan Aushadhi price for the same molecule. It gives price information only, not medical advice. Please read `agents.md` and `prd.md` first.

## The one rule that matters most

**Never add a price, molecule, strength, or any drug fact that you cannot source.** Every brand row in `data/brands.csv` needs a `source_url` and a `source_date`. Do not copy from a language model's memory. Pull requests with unsourced data will be closed.

## Good first contributions

- More brand-to-generic rows, each with a source and date.
- Hindi (and other language) strings in `src/i18n/`. Please have a native reader check them.
- Matcher test cases from real spellings (no personal data, no photos of real prescriptions).
- Accessibility fixes: contrast, focus, tap targets, large-font support.
- Docs fixes.

## Getting started

```bash
git clone [repo-url]
cd [repo]
npm install
npm run dev
npm run test
python scripts/validate_data.py
```

Update these commands if the project setup changes.

## Workflow

1. Open an issue, or comment on an existing one, before big changes.
2. Branch from `main`: `feat/...`, `fix/...`, `data/...`, `docs/...`.
3. Keep pull requests small and focused.
4. Use Conventional Commits: `feat:`, `fix:`, `data:`, `docs:`, `test:`, `style:`, `chore:`.
5. Run the tests and the data validator before opening a pull request.
6. Add screenshots (360 px wide) for UI changes.

## Data rules

- Raw downloads go in `data/raw/` with an entry in `data/raw/SOURCES.md`.
- A brand and its linked generic must agree on molecule, strength, and form.
- Prices are indicative. Show the data date. Never show a price of 0. Use "price not listed".
- NPPA ceiling prices are per unit and before GST. Do not present them as a brand's MRP.

## Wording rules

Allowed: "Same molecule listed at this price."
Not allowed: "switch to", "replace with", "safe", "better", "recommended".

## Using AI tools

AI-assisted contributions are welcome if you have read and understood every line. Never use AI output as a source for drug data. Say in the pull request if AI tools were used.

## Be kind

Be respectful and patient. Many contributors are new to open source.

## Licence

By contributing you agree your work is released under the project's MIT licence.
