# PRD: MediSave (दवा बचत)

Hackathon problem: **#3 The Prescription You Cannot Read** (Hacktoberfest, with the optional Gemma 4 track).
Status: planning only. No product code exists before the hackathon clock starts.

## 1. Problem

A patient takes a prescription of brand names to a chemist and pays what they are told. For many drugs, a generic with the same molecule and strength is listed by Jan Aushadhi at a fraction of the price. The patient cannot read the handwriting, does not know the molecule, and will not argue at the counter. The price gap is paid in cash by the people least able to afford it.

## 2. Product in one line

Type or photograph a brand name and see the molecule, the strength, and the indicative Jan Aushadhi price next to the brand price. The saving is the headline: **₹240 → ₹28**.

## 3. Users

These are illustrative personas, not research findings.

| Persona | Situation | What they need |
|---|---|---|
| Patient or family member | Cheap Android phone, weak signal, reads Hindi better than English, in a hurry at the chemist | One screen, big numbers, Hindi labels, works offline |
| Caregiver for a long-term patient | Buys the same 3–5 medicines every month | Save a list, see the total saving, print it |
| Helper (ASHA worker, neighbour, shopkeeper's child) | Helps someone else look prices up | Fast search that forgives spelling |

## 4. Goals and non-goals

**Goals**
1. Brand name or molecule in, saving out, in under 10 seconds.
2. Works with the phone in aeroplane mode.
3. Tolerates misspellings and half-read words.
4. Never shows a price or a molecule that is not in the shipped data.

**Non-goals (do not build)**
- Medical advice, dosing, side effects, interactions, or any "you should switch" wording.
- Ordering, delivery, payments, accounts, or a pharmacy marketplace.
- Scraping thousands of drugs. A well-curated set beats a large unreliable one.
- Handwriting OCR. Printed strips and boxes only, and only as a stretch.

## 5. Functional requirements

Priority: P0 = must work for the demo, P1 = if time allows, P2 = stretch.

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| F1 | P0 | Search by brand name or molecule | Typing "paracetamol" or a curated brand returns a result card. |
| F2 | P0 | Result card with saving headline | Shows brand price, Jan Aushadhi price, and saving in rupees, in the largest type on screen. |
| F3 | P0 | Fuzzy matching | "augmentn 625", "pantaprazole", and "metformn 500" each return the right candidate in the top 3. |
| F4 | P0 | Honest "not found" | A name not in the data shows "Not in our list. Ask your pharmacist." Nothing is guessed. |
| F5 | P0 | Disclaimer on every screen | Footer reads: price and molecule information only, not medical advice, confirm with your doctor or pharmacist. |
| F6 | P0 | Offline use | After the first load, search works in aeroplane mode. |
| F7 | P0 | Hindi and English | Every label is bilingual or switchable. No jargon such as "SKU". |
| F8 | P0 | Missing price handling | If the Jan Aushadhi price is not published, show "Price not listed", never ₹0. |
| F9 | P1 | "Did you mean" list | When several candidates are close, the user picks one. Nothing is auto-picked. |
| F10 | P1 | My prescription list | Add several medicines, see the total saving. Stored on the device. |
| F11 | P1 | Printable sheet | One page with names, strengths, prices, and the disclaimer, to hand across the counter. |
| F12 | P1 | Show how the data was matched | Card shows "Same molecule, strength and form" and the data date. |
| F13 | P2 | Photo of strip or box | Gemma reads printed text and returns candidate names, and the user confirms one. |
| F14 | P2 | Nearest Jan Aushadhi Kendra | Link to the official locator. No custom map. |
| F15 | P2 | Voice input in Hindi | Browser speech input into the search box, where supported. |

## 6. Content and safety requirements

- Molecule, strength, form, and prices come only from files shipped in the repo, each with a source and date.
- A language model must never write or fill drug facts. Gemma may only read text off a photo, and a human confirms.
- Wording is "Same molecule listed at this price". Never "switch to", "replace with", or "safe to use instead".
- Show the data date on the result card ("Prices as of 20 Oct 2026").
- A price is indicative. Stock and price at the actual Kendra may differ.

## 7. UX principles

1. One job per screen.
2. The saving is the biggest element on the result screen.
3. Thumb-reachable controls at the bottom, targets at least 48 px.
4. No login, no onboarding carousel, no permission prompts before they are needed.
5. Design for a 360 px wide, low-memory Android phone on a weak signal.

## 8. Success measures (for the demo)

- A judge puts the phone in aeroplane mode, types a misspelt brand, and sees a correct saving in under 10 seconds.
- A name outside the data gives a clear "not found" and no invented answer.
- Repo has an OSI licence, README, CONTRIBUTING.md, credits, and honest small commits.

## 9. Scope cuts (decide in the first 20 minutes)

Smallest usable version: search → fuzzy match → result card with saving → disclaimer → offline. Everything marked P1 or P2 is cut first if time runs short.

## 10. Mapping to the judging criteria

| Criterion | How this product answers it |
|---|---|
| Problem fit | Direct: brand in, generic and saving out |
| Innovation | Typo-tolerant, Hindi-friendly, works offline, Gemma used only for reading text |
| Technical depth | Fuzzy and phonetic matching, build-time data validation, PWA offline |
| Working demo | Aeroplane-mode demo with bundled data |
| Design & UX | Big saving headline, bilingual, one-handed |
| Impact & scale | Anyone paying for branded medicine; other states and languages can be added by data |
| Presentation | One number story: ₹240 → ₹28 |
| Code & commits | Small, honest history, clear README |

## 11. Open questions (resolve on day one)

1. How many brand rows can be filled with a cited source in the first hour? (Decides whether to continue with this problem.)
2. Which Gemma 4 variants exist and does any support image input? Check the model card.
3. Where will the Gemma endpoint run during the demo?
