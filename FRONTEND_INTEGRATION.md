# Frontend Integration Guide for MediSave (दवा बचत)

This guide shows how to wire your Next.js frontend UI components to MediSave's backend services, matching engine, and Supabase database.

---

## 1. Quick Data & Logic API

All core logic is pre-built, strictly typed, and covered by unit tests in `src/lib/`.

### A. Searching & Matching (`src/lib/matcher.ts`)
Zero-hallucination medicine matching against official Jan Aushadhi and cited brand records.

```typescript
import { findMatches, BrandItem, GenericItem } from '@/lib/matcher';
import brandsData from '../../public/data/brands.json';
import genericsData from '../../public/data/generics.json';

const brands = brandsData as BrandItem[];
const generics = genericsData as GenericItem[];

// Call when user types in the search bar:
const decision = findMatches(query, brands, generics);

// decision.outcome can be:
// 1. 'confident': decision.bestMatch has the exact/confident result
// 2. 'did_you_mean': decision.candidates has alternative matches
// 3. 'not_found': no close match in dataset (show neutral message)
```

### B. Price Savings Calculation (`src/lib/compare.ts`)
Calculates the headline savings for identical pack counts:

```typescript
import { comparePrice, BrandItem, GenericItem } from '@/lib/compare';

const comparison = comparePrice(brand, generic);

// Output:
// comparison.brandMrp             -> e.g. 34.15
// comparison.genericEquivalentPrice -> e.g. 15.48
// comparison.savingAmount         -> e.g. 18.67
// comparison.savingPercent        -> e.g. 55%
// comparison.priceListed          -> boolean (true = listed, false = unlisted)
```

### C. Photo / Camera OCR via Gemma (`/api/ocr`)
Extracts medicine names from a photo of a medicine strip/box:

```typescript
// 1. Check availability to show/hide camera icon:
const { available } = await fetch('/api/ocr').then(res => res.json());

// 2. Send captured image base64:
const res = await fetch('/api/ocr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageBase64 }),
});

const data = await res.json();
// data.names -> ['Dolo 650', 'Augmentin 625 Duo']
// Render each name as a clickable chip! When tapped, pass to findMatches().
```

### D. User Authentication & Cloud Sync (`src/lib/supabase.ts`)
Syncs saved medicines and preferences across devices:

```typescript
import { SupabaseAuth, SupabaseDb } from '@/lib/supabase';

// Sign up / Sign in:
await SupabaseAuth.signUp(email, password, fullName);
await SupabaseAuth.signInWithPassword(email, password);

// Fetch saved cloud prescription list:
const list = await SupabaseDb.fetchPrescriptions(session.access_token);

// Save a medicine to cloud:
await SupabaseDb.addPrescription(item, session.access_token);
```

### E. Offline Local Storage (`src/lib/db.ts`)
Works with 0 internet connection (aeroplane mode):

```typescript
import { MedicineListStore } from '@/lib/db';

// Get all offline saved medicines:
const saved = MedicineListStore.getAll();

// Add medicine:
MedicineListStore.add({ brandName, genericName, brandMrp, ... });

// Get total savings:
const { totalBrand, totalGeneric, totalSaved } = MedicineListStore.calculateTotalSavings();
```

### F. Multi-language Strings (`src/i18n/`)
- Hindi: `src/i18n/hi.json`
- English: `src/i18n/en.json`

---

## 2. Design Tokens (Tailwind CSS)

All tokens from `theme.md` are available as utility classes:
- `bg-bg`: Soft surface background (`#F7F9F7`)
- `bg-surface`: Card surface (`#FFFFFF`)
- `text-primary` / `bg-primary`: Jan Aushadhi deep green (`#0B6B4D`)
- `text-saving`: Headline green saving (`#0B6B4D`)
- `text-brandPrice`: Struck-through amber brand price (`#6B4A12`)
- `bg-warning-bg`: Statutory disclaimer footer background (`#FFF4D6`)
