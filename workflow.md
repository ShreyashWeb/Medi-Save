# workflow.md — how we work

## 1. Ground rules from the event

- **Everything is written on the day.** Ideas, sketches, research, and these planning documents are fine beforehand. Application code is not.
- **Commit history is checked.** Small, honest, frequent commits. No single giant commit, no rewritten history, no backdated commits.
- **Open source properly:** OSI licence, README someone can follow, a real `CONTRIBUTING.md`, credits for every tool, library, API, model, and dataset.
- **Working beats ambitious.** Smallest usable version first.

## 2. Git workflow

- Default branch: `main`. It must always run.
- Short-lived branches: `feat/<thing>`, `fix/<thing>`, `data/<thing>`, `docs/<thing>`. Merge by pull request, or fast-forward for tiny changes, within the hour.
- Commit every 10–20 minutes of real progress. Never `git push --force` on `main`.
- Do not squash the whole day into one commit.
- Commit format (Conventional Commits):

```
feat: add fuzzy matcher
fix: hide photo button when offline
data: add 20 brand prices with sources
docs: document Gemma usage and limits
test: matcher typo cases
style: add design tokens
chore: update dependencies
```

- One logical change per commit. A data commit contains data only. A code commit contains code only.
- Both people commit under their own identity. Use `Co-authored-by:` when pairing.
- Add the `hacktoberfest` topic to the GitHub repo.

## 3. Roles (two people)

| | Person A | Person B |
|---|---|---|
| Focus | App shell, PWA, UI, i18n, print sheet | Data cleaning, brand data, matcher, tests |
| Files owned | `src/components`, `src/i18n`, `public/` | `scripts/`, `data/`, `src/lib` |
| Meets at | Result card wiring, offline test, README | |

Sync at the start of each phase in `tasks.md`. Pull before starting, push before leaving a task.

## 4. Working with AI coding tools

AI is allowed and expected. These rules keep the work honest and safe.

1. Give the tool `agents.md`, `prd.md`, `trd.md`, and `theme.md` as context.
2. Ask for one small task at a time, matching one commit.
3. **Read the diff before committing.** You must be able to explain every file in the demo and in questions.
4. **Never let AI supply data.** No prices, molecules, strengths, or doses from a model's memory. Data comes from cited sources only.
5. Run the tests and the data validator after every AI change.
6. Do not paste secrets, API keys, or personal data into an AI tool.
7. Credit AI tools and models used in the README.
8. If a generated change breaks offline mode, revert it instead of patching around it.

## 5. Data workflow

1. Download raw files into `data/raw/`. Never edit raw files by hand.
2. Record URL, access date, and filename in `data/raw/SOURCES.md`.
3. Clean with scripts in `scripts/`, so a reviewer can re-run them.
4. Add brand prices to `data/brands.csv` only with `source_url` and `source_date`.
5. Link each brand row to a generic `ja_code` by hand and check molecule, strength, and form.
6. Run `python scripts/validate_data.py`. It must pass before any data commit is pushed.
7. Review in pairs: the second person checks a sample of rows against the source.
8. Rebuild `public/data/*.json` and commit it with a message saying which source it came from.

## 6. Definition of done (per feature)

- [ ] Works at 360 px width.
- [ ] Works in aeroplane mode.
- [ ] Hindi and English strings present.
- [ ] Disclaimer visible where required.
- [ ] Tests or a manual check recorded in the commit or PR.
- [ ] No data without source and date.
- [ ] Copy follows the wording rules in `theme.md`.

## 7. Testing routine

Every hour:
1. `npm run test`
2. `python scripts/validate_data.py`
3. Build, serve, install on a real phone, switch to aeroplane mode, run the search flow.

## 8. Deploy

- Static hosting over HTTPS (GitHub Pages or Netlify). Service workers and camera access need HTTPS.
- Deploy a "hello world" in the first hour, then deploy after every phase.
- Keep a build tagged for the demo (`git tag v0.1.0-demo`) and do not change it in the last 20 minutes except to fix a blocker.
- Keep a backup: the built `dist/` folder copied to a USB drive or a second device, in case venue Wi-Fi fails.

## 9. Pull request checklist

- [ ] Small and focused.
- [ ] Description says what changed and why.
- [ ] Tests and validator pass.
- [ ] Screenshots for UI changes (360 px).
- [ ] No unrelated formatting changes.
- [ ] README or docs updated if behaviour changed.

## 10. Safety review (before the demo)

- [ ] Search the code for any place where a language model output reaches the screen. Only names read from a photo may, and only as tappable candidates.
- [ ] Search the strings for forbidden wording ("switch to", "replace with", "safe", "recommended").
- [ ] Confirm "not found" and "price not listed" states look neutral and are reachable.
- [ ] Confirm the data date shows on every result.
- [ ] Confirm no analytics or third-party scripts load.

## 11. Communication

- One shared task list: `tasks.md` in the repo.
- Raise blockers within 10 minutes. If stuck for 20 minutes, cut scope with the cut order in `tasks.md`.
- Keep a short `NOTES.md` of decisions (for example, the gate decision and the Gemma endpoint choice). Commit it.

## 12. Presentation prep

- One-line problem, one-line solution, one number (₹240 → ₹28 with a real, cited example).
- Be ready to say what the app does **not** do, how data is sourced, and what Gemma gets wrong.
- Show the commit history. Show the validator failing on a bad row, then passing.
