# theme.md — design system

Goal: a person on a cheap phone, in a hurry, reading Hindi, should understand the screen in two seconds. The saving is the hero.

## 1. Principles

1. **One number wins.** On the result screen the saving is the largest element.
2. **High contrast, calm colour.** Colour carries meaning (saving = green, brand price = muted), but meaning is never colour-only.
3. **Big, bottom-weighted controls.** Primary actions sit in the thumb zone.
4. **Plain words.** No "SKU", "MRP" without a Hindi/plain label, no abbreviations a patient would not know.
5. **Light by default, fast always.** No heavy animation, no large images, no custom font downloads beyond the subset below.

## 2. Colour tokens

Starting values. Check contrast (WCAG AA, 4.5:1 for body text) before shipping.

```css
:root {
  /* surfaces */
  --bg:            #F7F9F7;
  --surface:       #FFFFFF;
  --surface-alt:   #EEF3EF;
  --border:        #D5DDD7;

  /* text */
  --text:          #14201A;
  --text-muted:    #4A5A52;
  --text-on-primary: #FFFFFF;

  /* brand */
  --primary:       #0B6B4D;   /* deep green */
  --primary-press: #095640;
  --focus:         #1D4ED8;

  /* meaning */
  --saving:        #0B6B4D;   /* saving amount */
  --brand-price:   #6B4A12;   /* struck-through brand price, muted amber */
  --warning-bg:    #FFF4D6;
  --warning-text:  #5C3D00;
  --danger:        #B42318;
  --info-bg:       #E6F0FF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0F1713;  --surface: #17211C; --surface-alt: #1E2B24; --border: #2C3C33;
    --text: #EAF2ED; --text-muted: #A9BAB1;
    --primary: #4CC38A; --primary-press: #3BAA75; --text-on-primary: #05281A;
    --saving: #6EE0A8; --brand-price: #E5C07B;
    --warning-bg: #3A2E10; --warning-text: #F5DDA0;
  }
}
```

## 3. Typography

| Role | Size | Weight | Notes |
|---|---|---|---|
| Saving headline (₹240 → ₹28) | 40–48 px | 700 | Largest text on the page |
| Saving amount ("You save ₹212") | 24 px | 700 | `--saving` |
| Drug name | 22 px | 600 | |
| Body | 18 px | 400 | Minimum for body text |
| Label / caption | 14–16 px | 500 | Never below 14 px |
| Disclaimer | 14 px | 500 | Always visible, not collapsed |

- Font stack: `"Noto Sans Devanagari", "Noto Sans", system-ui, sans-serif`.
- Self-host a **subset** of Noto Sans / Noto Sans Devanagari so it works offline. Keep it small, with `font-display: swap`, and rely on the system fallback if loading fails.
- Line height 1.4 for Latin, 1.6 for Devanagari (matras need room).
- Use the rupee sign `₹` and Indian digit grouping where numbers exceed 999.

## 4. Spacing, shape, motion

- 4 px base unit. Page padding 16 px. Card padding 16–20 px.
- Radius 12 px for cards and buttons, 999 px for chips.
- Minimum tap target **48 × 48 px**, 8 px gap between targets.
- Motion: 150 ms fades only. Respect `prefers-reduced-motion`.
- Shadows: one subtle card shadow. No blurs or glass effects on low-end phones.

## 5. Layout (360 px baseline)

```
┌──────────────────────────────┐
│ दवा खोजें · Search medicine  │  header, 56 px
├──────────────────────────────┤
│ [ type a medicine name   ] 🔍│  search, 56 px, autofocus
│ [📷 Photo]  (hidden offline) │  optional
│                              │
│  Did you mean:               │  chips / list
│  • Brand A 625               │
│                              │
│  ┌ Result card ───────────┐  │
│  │ Brand A 625            │  │
│  │ Molecule · strength    │  │
│  │   ₹240  →  ₹28         │  │  hero
│  │   You save ₹212        │  │
│  │ Prices as of 20 Oct '26│  │
│  │ [ + Add to my list ]   │  │  bottom, full width
│  └────────────────────────┘  │
├──────────────────────────────┤
│ ⚠ Price info only. Confirm   │  disclaimer footer, always visible
│ with your doctor/pharmacist  │
└──────────────────────────────┘
```

- No horizontal scroll. Primary action never below the fold on a 640 px tall screen.
- Bottom nav (if any): max 3 items (Search · My list · About).

## 6. Components

| Component | Rules |
|---|---|
| Search box | Large, autofocus, clear button, accepts Hindi and English, `inputmode="text"`, `autocomplete="off"` |
| Result card | Brand name, molecule + strength + form, price row, saving, data date, "how matched" line, add button |
| Price row | Brand price struck through in `--brand-price`, arrow, generic price in `--saving`, bold. Add words ("Brand", "Jan Aushadhi"), not colour alone |
| Candidate list | Large rows, whole row tappable, shows strength and form to tell variants apart |
| Chip | Used for Gemma-read names and recent searches |
| Empty / not found | Neutral tone: "Not in our list. Please ask your pharmacist." No red error styling |
| Price not listed | Info style: "Jan Aushadhi price not listed" |
| Disclaimer | Warning surface (`--warning-bg`), fixed in the footer, never dismissible |
| Print sheet | Black on white, one page, names, strengths, prices, data date, disclaimer, no buttons |

## 7. Language and copy

Every user-facing string lives in `src/i18n/hi.json` and `en.json`. Default to the phone language, with a visible toggle (हिं / EN).

| Key | English | Hindi (check wording with a native speaker) |
|---|---|---|
| search.placeholder | Type a medicine name | दवा का नाम लिखें |
| result.brand | Brand price | ब्रांड की कीमत |
| result.generic | Jan Aushadhi price | जन औषधि की कीमत |
| result.save | You save | आपकी बचत |
| result.asOf | Prices as of | कीमतें इस तारीख की |
| notfound | Not in our list. Please ask your pharmacist. | हमारी सूची में नहीं है। कृपया अपने दवा विक्रेता से पूछें। |
| notlisted | Jan Aushadhi price not listed | जन औषधि की कीमत उपलब्ध नहीं |
| disclaimer | Price information only, not medical advice. Please confirm with your doctor or pharmacist. | केवल कीमत की जानकारी, चिकित्सकीय सलाह नहीं। कृपया अपने डॉक्टर या दवा विक्रेता से पुष्टि करें। |
| didyoumean | Did you mean | क्या आप यह खोज रहे थे |
| add | Add to my list | मेरी सूची में जोड़ें |

Wording rules:
- Allowed: "Same molecule listed at this price".
- Forbidden: "switch to", "replace with", "safe alternative", "better", "recommended".
- Hindi strings must be reviewed by a native reader before the demo. Treat the table above as a draft.

## 8. Accessibility checklist

- [ ] Text contrast AA or better in light and dark.
- [ ] Every input has a visible label or `aria-label`.
- [ ] Focus ring visible (`--focus`, 3 px).
- [ ] Works at 200% system font size without clipping.
- [ ] Meaning is not colour-only.
- [ ] `lang="hi"` or `lang="en"` set on changed text.
- [ ] Tap targets ≥ 48 px.

## 9. Performance rules for design

- No web fonts beyond the subset, no icon fonts. Use a few inline SVGs.
- No images on the main flow. The app icon and favicon only.
- No animation libraries.
