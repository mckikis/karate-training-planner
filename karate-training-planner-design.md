# Karate Training Planner — Design Document

> **Purpose of this document:** implementation spec for an LLM/developer. It fixes every open decision from the acceptance criteria (`SPEC.md`), defines the data model, module interfaces, business rules and UI, and maps each acceptance criterion to a verifiable behaviour. Where this document says MUST, it is a requirement; where it says SHOULD, deviate only with a stated reason. Project conventions and commands are in `CLAUDE.md`.

---

## 0. One-paragraph summary

Karate coaches of the club Katsudo Sabinov plan their trainings on an iPhone. The app keeps a **library of exercises** sorted into **categories**; each exercise has default timing (sets × reps × seconds per rep, or sets × time) and an optional photo, GIF or short video. A coach builds a **training** by ticking exercises, adjusts sets, rests and breaks per exercise, and the app shows the **duration** of each exercise, the **total**, and – from the start time – the **clock schedule** (e.g. 17:17 – 17:20). The app is an installable **PWA** with all data in **IndexedDB on the phone**: no backend, no accounts, works offline. Version 1 adds favourites, hiding instead of deleting, drag-and-drop ordering, "max 7 per category", time-only categories, "training done + coach", starter media from the repository, and the club branding.

---

## 1. Goal and scope

**Goal:** bring the app from the current baseline (§3) to version 1 as specified in `SPEC.md` (functions 1.1–3.5, acceptance criteria K1–K18), with a unit-test suite for all logic that does not need a browser.

**In scope:** everything in §5–§9 and the steps in §12.

**Out of scope (v1):** see §14. Notably no backend, no accounts, no sync, no full-screen timer.

---

## 1a. Decisions fixed by this document

| # | Open point | Decision |
|---|---|---|
| D1 | Native app vs web | **PWA** (React + TypeScript + Vite + vite-plugin-pwa), installed via Safari → "Pridať na plochu". No Mac and no paid Apple account are available. |
| D2 | Storage | **IndexedDB via Dexie 4**, only on the device. No server, no accounts. Media uploaded in the app are stored as `Blob` in the database. |
| D3 | UI language | **Slovak only**, hardcoded in components. Code and comments English. Dates `sk-SK` (`po 19. 10. 2026`), 24-hour times. |
| D4 | Time units | **Integer seconds** for all durations; only `secondsPerRep` may be a decimal (1.5). Durations are typed and shown as `m:ss` (`15:00`); clock times as `HH:MM`, with `:ss` only when seconds ≠ 0. |
| D5 | Exercise inside a training | A training stores a **copy** of name and timing per item (`TrainingItem`) plus `exerciseId`. Editing, hiding or deleting the exercise never changes saved trainings. `exerciseId` is used only to show the picture. |
| D6 | Delete vs hide | Exercises are **hidden** (`hidden = true`), never deleted, except a **user-created exercise that is already hidden** may be deleted permanently. Trainings may be hidden or deleted (with confirmation). |
| D7 | Ordering | Integer `order` field on categories, exercises (per category) and trainings. Drag-and-drop with **dnd-kit** via a ⠿ handle (touch-action none). Saving an order rewrites `order = index` for the whole visible list. |
| D8 | Favourites | `favorite` flag. Lists sort favourites first, then `order` — **except in "Usporiadať" (sort) mode**, which sorts by `order` only so dragging matches what is stored. |
| D9 | Long lists | In the "Všetky" view and in the exercise picker, at most **7 exercises per category**, then a "Zobraziť viac (n)" button. Not applied when searching or when one category is filtered. In the picker, selected exercises are always shown. |
| D10 | Time-only categories | Category flag `timeOnly`. Starter categories **Rozcvička, Dynamický strečing, Statický strečing, Hry** are time-only. Their exercises are stored with `mode = 'time'`; the Reps/Time switch is hidden. Turning the flag on converts existing exercises (`workSeconds = round(reps × secondsPerRep)`, min 1). |
| D11 | Starter data | Defined in `src/starterData.ts`, synced **on every app start** by `syncStarterData()` (§6.4). Keyed by `starterKey`; never deletes, never overwrites user edits. Media files of starter exercises live in `public/exercises/` and are referenced by file name (`mediaFile`). |
| D12 | Done trainings | `done`, `doneAt`, `coach` on the training. Coach is free text, prefilled from the last saved training. |
| D13 | Defaults for a new training | `date` = today, `startTime` and `coach` from the last saved training (by id), otherwise `17:00` and empty; `restAfter` = 60 s per item; new training gets `order = (min order) − 1` (top of the list). |
| D14 | Media limit | Files picked in the app MUST be ≤ 40 MB, else an error is shown and nothing is saved. Service worker precaches files up to 30 MB. |
| D15 | Routing | `HashRouter` (GitHub Pages has no SPA fallback). `base = '/karate-training-planner/'`. |

---

## 2. Roles

No authentication. Two roles exist only organisationally:

| Role | Who | Capabilities |
|---|---|---|
| Coach (Tréner) | club coach, on their own phone | everything in the app |
| Content maintainer | the author, in the repository | edits `src/starterData.ts` and `public/exercises/`; changes reach all phones with the next deploy via `syncStarterData()` |

---

## 3. Current codebase (baseline)

Baseline = commit `25fa1db` on `main`. Present and working:

- `src/db.ts` – Dexie DB `karate-training-planner` **version 1** (`categories: '++id, order'`, `exercises: '++id, categoryId, name'`, `trainings: '++id, date'`), types `Timing`, `Category`, `Exercise`, `TrainingItem`, `Training` (with `startTime`), English `TRAINING_TAGS`, Slovak `STARTER` data seeded by `db.on('populate')` (17 categories).
- `src/time.ts` – `workPerSet`, `itemSeconds`, `trainingSeconds`, `schedule`, `clockAt`, `parseDuration`, `formatDuration`, `timingSummary` (says "reps"), `formatDate` (`en-GB`), `todayIso`.
- `src/components.tsx` – `useObjectUrl`, `Media`, `Thumb`, `NumberField`, `DurationField`, `TopBar`, `EmptyState`.
- `src/pages/` – Exercises, ExerciseDetail (hard delete), ExerciseForm, TimingFields, Trainings, TrainingForm (start time, picker), TrainingDetail (schedule, hard delete).
- `src/App.tsx` – routes (§8.1 without `/categories`); PWA config in `vite.config.ts`; deploy workflow.
- **No tests, no `test`/`typecheck` scripts.**

If a later step is already present in the codebase when a run starts (for example because it was applied manually), the agents MUST treat it as done and only verify it.

---

## 4. Data model

### 4.1 ER overview

```
categories 1──* exercises
trainings  1──* items (embedded array, copies of exercise data, weak link exerciseId → exercises)
```

### 4.2 Types (`src/db.ts`) — target, schema version 2

```ts
export type Mode = 'reps' | 'time'

export interface Timing {
  mode: Mode
  sets: number            // ≥ 1
  reps: number            // used when mode = 'reps'
  secondsPerRep: number   // decimal allowed, used when mode = 'reps'
  workSeconds: number     // one set, used when mode = 'time'
  restBetweenSets: number // seconds
}

export interface Category {
  id: number
  name: string
  order: number
  timeOnly?: boolean
  starterKey?: string     // = category name from starterData.ts; absent for user categories
}

export interface Exercise extends Timing {
  id: number
  name: string
  categoryId: number
  description: string
  order: number           // position inside its category
  favorite?: boolean
  hidden?: boolean
  media?: Blob            // uploaded in the app
  mediaType?: 'image' | 'video'
  mediaFile?: string      // file name in public/exercises/ (starter exercises)
  customMedia?: boolean   // user changed or removed media → sync must not touch mediaFile
  starterKey?: string     // `${categoryName}/${exerciseName}` for starter exercises
  isDefault: boolean
  createdAt: number
}

export interface TrainingItem extends Timing {
  exerciseId: number
  name: string            // copy
  restAfter: number       // break before the next exercise, seconds
  timeOnly?: boolean      // copy of the category flag at the time it was added
}

export interface Training {
  id: number
  name: string
  date: string            // YYYY-MM-DD
  startTime?: string      // HH:MM
  tag: string             // one of TRAINING_TAGS (or an older free value)
  coach?: string
  description: string
  items: TrainingItem[]
  order: number
  hidden?: boolean
  done?: boolean
  doneAt?: number
  createdAt: number
  updatedAt: number
}

export const TRAINING_TAGS = ['Údery', 'Kopy', 'Taktika', 'Kondícia', 'Prípravka (deti)', 'Plyometria', 'Zmiešaný']
```

### 4.3 Schema versions

```ts
db.version(1).stores({ categories: '++id, order', exercises: '++id, categoryId, name', trainings: '++id, date' }) // unchanged
db.version(2).stores({
  categories: '++id, order, starterKey',
  exercises: '++id, categoryId, name, order, starterKey',
  trainings: '++id, date, order',
}).upgrade(upgradeToV2)
```

`db.on('populate')` MUST be removed; a fresh database is filled by `syncStarterData()` (§6.4).

**`upgradeToV2` (runs once on phones with v1 data, criterion K18):**
1. For every category whose `name` equals a `STARTER` category: set `starterKey = name` and `timeOnly` from `STARTER`.
2. For every exercise (iterate sorted by name): if it is `isDefault` and its name is in the matching `STARTER` category, set `order` = its index there and `starterKey = "<category>/<name>"`; otherwise `order` = 1001, 1002, … per category. If the category is time-only, apply `toTimeMode`.
3. Trainings sorted by `date` descending get `order = 0, 1, 2…`.
4. Nothing is deleted; all v1 fields are kept.

---

## 5. Starter data (`src/starterData.ts`)

```ts
export const reps: (sets: number, repCount: number, secondsPerRep: number, rest: number) => Timing
export const time: (sets: number, seconds: number, rest: number) => Timing
export type StarterExercise = [name: string, description: string, timing: Timing, mediaFile?: string]
export interface StarterCategory { category: string; timeOnly?: boolean; exercises: StarterExercise[] }
export const STARTER: StarterCategory[]
```

- The **content** of `STARTER` MUST be moved unchanged from the baseline `src/db.ts` (same 17 categories, same exercises, same order); only `timeOnly: true` is added to the four categories of D10.
- A header comment in Slovak explains how to add an exercise and a media file (for the content maintainer).
- `public/exercises/README.md` (Slovak) explains: put `.jpg/.png/.gif/.webp/.mp4` there, names without diacritics and spaces, then add the file name as the 4th tuple element.

---

## 6. Business rules (authoritative list)

### 6.1 Time (`src/time.ts`)
- T1. Work per set: `time` → `workSeconds`; `reps` → `reps × secondsPerRep`.
- T2. Item seconds: `round(sets × work + (sets − 1) × restBetweenSets + (isLast ? 0 : restAfter))`; `sets − 1` never below 0.
- T3. Training seconds = Σ item seconds; the break after the last item is never counted (K11).
- T4. Schedule: `start₀ = 0`; `endᵢ = startᵢ + itemSeconds(i, isLast = true)`; `breakAfterᵢ = isLast ? 0 : restAfterᵢ`; `startᵢ₊₁ = endᵢ + breakAfterᵢ` (K10).
- T5. `clockAt('17:00', s)` wraps at 24 h; prints `HH:MM`, or `HH:MM:SS` when seconds ≠ 0.
- T6. `parseDuration` accepts `"15:00"`, `"2:30"`, `"90"` (seconds), `"1,5"` → rounded seconds; returns `undefined` for invalid or negative input.
- T7. Without a `startTime`, schedules show offsets (`0:00`, `4:00`) via `formatDuration`.
- T8. Slovak formatting: `timingSummary` → `"3 × 10 opak."`, `"2 × 30 s"`, `"1 × 15:00 min"` (≥ 60 s); `formatDate` uses `sk-SK` with weekday short, numeric day/month, year; `exerciseCount(n)` → `1 cvik`, `2–4 cviky`, `0 / ≥ 5 cvikov`.

### 6.2 Exercises and categories
- E1. New user exercise: `order = max(order in its category) + 1`, `isDefault = false`.
- E2. Picking a media file sets `customMedia = true`; removing media clears `media` and `mediaFile` and sets `customMedia = true`. Files > 40 MB → error `Súbor je príliš veľký…`, nothing saved (K3).
- E3. Displayed media: uploaded `media` first, else `mediaFile` (URL `${BASE_URL}exercises/<encoded name>`, video if extension is `mp4|m4v|mov|webm`), else the first letter of the name. Videos: `autoPlay muted loop playsInline`, no controls (1.11).
- E4. Saving an exercise in a time-only category stores `toTimeMode(timing)`.
- E5. Hide: `hidden = true, favorite = false`; unhide: `hidden = false`. Hidden exercises are excluded from lists (except the "Skryté cviky (n)" section) and from the picker.
- E6. Permanent delete only when `hidden && !isDefault`, after `window.confirm`.
- E7. New category: `order = max + 1`, no `starterKey`, not time-only. Categories can't be renamed or deleted in v1.
- E8. Toggling `timeOnly` on converts all exercises of the category with `toTimeMode` in one transaction; toggling off changes nothing else.

### 6.3 Trainings
- R1. Required: non-empty trimmed `name` (else `Zadaj názov tréningu.`). All other fields optional.
- R2. Picking exercises toggles items; new items are appended in tick order, built from the exercise's timing (converted with `toTimeMode` and `timeOnly = true` if the category is time-only) and `restAfter = 60`.
- R3. Items can be reordered by drag (local form state; saved with the training) and removed.
- R4. Defaults per D13. When editing, a tag that is not in `TRAINING_TAGS` is kept and offered in the select.
- R5. Done: `done = true, doneAt = Date.now(), coach = trimmed input`. Undo: `done = false, doneAt = undefined`.
- R6. Hide/unhide as E5 (no favourite). Delete after `window.confirm`.
- R7. Trainings list sorted by `order` (then `id`); hidden ones in a collapsible "Skryté tréningy (n)" section.

### 6.4 Starter sync and reset (`src/db.ts`)
- S1. `syncStarterData()` runs from `main.tsx` on every start, in one `rw` transaction over categories and exercises.
- S2. Missing starter category (by `starterKey`) → add with `order = index` if the DB had no categories, else `max + 1`.
- S3. Missing starter exercise (by `starterKey`) → add with `order = index in its category`, `isDefault = true`, `mediaFile`, timing (time-only converted).
- S4. Existing starter exercise with `!customMedia` and a different `mediaFile` → update `mediaFile` only.
- S5. Idempotent: a second run changes nothing. Never deletes, never changes names, timing, order, favourites or hidden flags.
- S6. `resetAllData()` deletes the database, reopens it and runs `syncStarterData()`; the UI then reloads the page. Guarded by two `window.confirm` (K17).

### 6.5 Sorting helpers
- O1. `byOrder(a, b)` = `a.order − b.order || a.id − b.id`.
- O2. `byFavoriteThenOrder` = favourites first, then O1.
- O3. `saveOrder(table, ids)` writes `order = index` for each id in one transaction.
- O4. `limitPerCategory(sorted, limit, keepIds)` (in `src/lists.ts`) returns `{ shown, moreCount }`: the first `limit` items plus any item whose id is in `keepIds`; `moreCount = sorted.length − shown.length`.

---

## 7. Module interfaces

All new or changed exports. Existing exports not listed stay as they are.

### `src/db.ts`
| Export | Signature | Rule |
|---|---|---|
| `db` | Dexie with `categories`, `exercises`, `trainings` | §4 |
| `TRAINING_TAGS` | `string[]` | §4.2 |
| `toTimeMode` | `<T extends Timing>(t: T) => T` | D10 |
| `exerciseFileUrl` | `(file: string) => string` | E3 |
| `mediaTypeOfFile` | `(file: string) => 'image' \| 'video'` | E3 |
| `exerciseMedia` | `(e?: Exercise) => { blob?: Blob; url?: string; type?: 'image' \| 'video' }` | E3 |
| `byOrder`, `byFavoriteThenOrder` | comparators | O1, O2 |
| `saveOrder` | `(table: 'categories' \| 'exercises' \| 'trainings', ids: number[]) => Promise<void>` | O3 |
| `syncStarterData` | `() => Promise<void>` | §6.4 |
| `resetAllData` | `() => Promise<void>` | S6 |

### `src/time.ts`
Existing functions keep their signatures; behaviour per §6.1. New: `exerciseCount(n: number): string`.

### `src/lists.ts` (new)
`SHOW_FIRST = 7`; `limitPerCategory<T extends { id: number }>(sorted: T[], limit: number, keepIds?: number[]): { shown: T[]; moreCount: number }`.

### `src/sortable.tsx` (new)
```ts
export function SortableList<T>(props: {
  items: T[]
  getId: (item: T) => number                // dnd-kit ids are `s${id}` (never 0)
  onReorder: (items: T[]) => void
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode
  className?: string                         // default 'list'
}): JSX.Element
```
PointerSensor (activation distance 4 px) + KeyboardSensor; modifiers `restrictToVerticalAxis`, `restrictToParentElement`. The handle is a `<button className="drag-handle" aria-label="Posunúť">` with six-dot icon and `touch-action: none`.

### `src/components.tsx`
- `Media` and `Thumb` gain an optional `url` prop (E3); `Thumb` gains `size?: 'medium' | 'large'` (72 px / 104 px).
- New `StarButton({ on, onToggle, label })` – 44 px button, `aria-pressed`, stops event propagation.
- New `PageHeader({ title, right? })` – club logo (`${BASE_URL}katsudo-logo.png`, 44 px, round) + title.
- New `Footer()` – `© Kristína Simčíková 2026`.
- `TopBar` back button `aria-label="Späť"`.

### `src/pages/TimingFields.tsx`
New prop `timeOnly?: boolean` – hides the Reps/Time switch and always shows "Jedna séria" (`DurationField`). Labels Slovak: Série, Opakovania, Sekúnd / opak., Jedna séria, Oddych medzi sériami.

---

## 8. UI

### 8.1 Routes (HashRouter)

| Path | Component | Bottom tab bar |
|---|---|---|
| `#/exercises` | ExercisesPage | yes |
| `#/exercises/:id` | ExerciseDetailPage | yes |
| `#/exercises/new`, `#/exercises/:id/edit` | ExerciseFormPage | no |
| `#/categories` | CategoriesPage (new) | yes |
| `#/trainings` | TrainingsPage | yes |
| `#/trainings/:id` | TrainingDetailPage | yes |
| `#/trainings/new`, `#/trainings/:id/edit` | TrainingFormPage | no |
| `*` | redirect → `#/trainings` | – |

### 8.2 Screen behaviour

**ExercisesPage.** `PageHeader("Cviky")` with a text button **Usporiadať / Hotovo**. Search field (hidden in sort mode). Category chips: Všetky, every category, `+ Kategória` (inline form), link `⇅ Poradie kategórií` → `#/categories`. Groups per category: favourites first (O2), max 7 in "Všetky" (O4, D9). Rows: thumbnail, name, `timingSummary`, `StarButton`; tap opens detail. Sort mode: per category a `SortableList` by `order`, saving via `saveOrder('exercises', …)`. Below: "Skryté cviky (n)" toggle. `Footer`. Floating button `+ Nový cvik` (not in sort mode).

**ExerciseDetailPage.** Top bar: star + **Upraviť**. Media large (looped), category name (+ ` · skrytý`), title, description, card "Predvolené časy". Buttons **Skryť cvik / Zobraziť cvik znova**; **Vymazať natrvalo** only per E6.

**ExerciseFormPage.** Fields Názov, Kategória, Popis, media (upload / Zmeniť / Vymazať), card "Predvolené časy" with `TimingFields timeOnly`. Save **Uložiť cvik**.

**CategoriesPage.** `TopBar("Kategórie")`, hint, `SortableList` of categories (name, `exerciseCount` of visible exercises, checkbox **Len na čas**, handle). Card "Dáta" with **Vymazať všetky dáta a začať odznova** (S6).

**TrainingsPage.** `PageHeader("Tréningy")` + Usporiadať (only with ≥ 2 trainings). Rows: name; `date · startTime · exerciseCount · coach`; tags (type, `✓ Odtrénovaný`); total duration. Empty state with **Vytvoriť prvý tréning**. Sort mode `SortableList`. "Skryté tréningy (n)". `Footer`. Floating `+ Nový tréning`.

**TrainingFormPage.** Názov; Dátum + Začiatok; Typ tréningu + Tréner; Popis. "Cviky (n)" as a `SortableList` of item cards: number, name, `startClock – endClock · duration min`, handle, remove ✕, `TimingFields` (timeOnly from item), `DurationField` "Prestávka pred ďalším" except on the last item. Button **+ Výber cvikov** opens the picker (full screen: search, categories in order, favourites first with ★, thumbnails, checkbox showing tick order, max 7 per category + Zobraziť viac, selected always visible, bottom bar "Vybrané: n" + **Hotovo**). Bottom bar: "Celkový čas · koniec HH:MM" and **Uložiť**.

**TrainingDetailPage.** Eyebrow `date · startTime (· skrytý)`, title, large tag + `✓ Odtrénovaný`, `Tréner: X`, description. Plan rows: large thumbnail, `start – end` (accent colour), name, `timingSummary · oddych n s · m:ss min`; between rows "Prestávka m:ss min". Small total at the end: `Celkový čas m:ss · 17:00 – 17:23`. Card "done": either coach input + **✓ Označiť ako odtrénovaný**, or `✓ Odtrénované <date> · tréner X` + **Zrušiť označenie**. Buttons **Skryť tréning / Zobraziť tréning znova**, **Vymazať tréning**.

### 8.3 Branding and PWA
- `public/katsudo-logo.png` (256 px, provided) in `PageHeader`.
- `index.html` `lang="sk"`; manifest `lang: 'sk'`, Slovak description.
- Workbox `globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,webp,svg,mp4,mov,webm}']`, `maximumFileSizeToCacheInBytes: 30 MB`.
- `main.tsx`: `navigator.storage.persist()` (existing) and `syncStarterData()` with errors logged to console.

### 8.4 Slovak UI vocabulary

| Concept | Slovak |
|---|---|
| Exercise / exercises | Cvik / Cviky |
| Training | Tréning |
| Category | Kategória |
| Sets / reps / rest / break | Série / Opakovania / Oddych / Prestávka |
| Start / end / total time | Začiatok / koniec / Celkový čas |
| Favourite | Obľúbený |
| Hide / show again | Skryť / Zobraziť znova |
| Reorder / done | Usporiadať / Hotovo |
| Show more / less | Zobraziť viac / Zobraziť menej |
| Training done | Odtrénovaný |
| Coach | Tréner |
| Time only | Len na čas |

---

## 9. Affected files

| File | Change | Step |
|---|---|---|
| `package.json`, `package-lock.json` | scripts `test`, `typecheck`; devDeps `vitest`, `fake-indexeddb` | 1 |
| `src/time.test.ts` | new | 1, 2 |
| `src/time.ts` | Slovak formatting, `exerciseCount` | 2 |
| `src/db.ts` | Slovak `TRAINING_TAGS` (step 2); schema v2, helpers, sync, reset (step 3) | 2, 3 |
| `src/starterData.ts`, `public/exercises/README.md` | new | 3 |
| `src/db.test.ts`, `src/lists.ts`, `src/lists.test.ts` | new | 3 |
| `src/main.tsx` | call `syncStarterData()` | 3 |
| `package.json` | deps `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers` | 4 |
| `src/sortable.tsx`, `src/components.tsx`, `src/index.css`, `public/katsudo-logo.png`, `index.html`, `vite.config.ts` | shared UI, branding, PWA | 4 |
| `src/pages/Exercises*.tsx`, `src/pages/TimingFields.tsx`, `src/pages/CategoriesPage.tsx`, `src/App.tsx` | exercise library | 5 |
| `src/pages/Training*.tsx` | trainings | 6 |

---

## 10. Acceptance criteria → verification matrix

Criteria K1–K18 are defined in `SPEC.md` §4.

| AC | How it is satisfied | Test |
|---|---|---|
| K1 | S1–S3 | Unit (db): fresh DB + `syncStarterData()` → 17 categories in `STARTER` order; "Údery - karate" has 13 exercises; second sync adds nothing (S5). |
| K2 | E2, E3 | Manual: add exercise with GIF and with MP4 → plays in a loop without sound. |
| K3 | E2 | Manual: pick a file > 40 MB → error, nothing saved. |
| K4 | D9, O4 | Unit (lists): 13 items, limit 7 → 7 shown, `moreCount` 6; with `keepIds` of item 12 → 8 shown. Manual: button "Zobraziť viac (6)". |
| K5 | O2 | Unit: favourite with `order` 12 sorts first. Manual: same in the picker. |
| K6 | E5, D5 | Unit (db): hide exercise used in a training → training items unchanged. Manual: hidden section, restore. |
| K7 | O3 | Unit (db): `saveOrder` → reading back sorted by `order` gives the new id order. Manual: survives app restart. |
| K8 | D10, E8 | Unit: `toTimeMode` (10 × 1.5 s → 15 s). Manual: no Reps/Time switch in Rozcvička. |
| K9 | T1, T2 | Unit: 3 × 10 × 2 s, rest 30, restAfter 60 → 120 s as last item, 180 s otherwise. |
| K10 | T4, T5 | Unit: 17:00, item 1 = 1 × 900 s + break 120, item 2 = 1 × 180 → item 2 `17:17`–`17:20`. |
| K11 | T3 | Unit: restAfter of the last item does not change `trainingSeconds`. |
| K12 | T4 | Unit: schedule of reordered items recomputes starts/ends. Manual: drag in the form. |
| K13 | R5 | Manual: mark done with coach → badge in detail and list; undo. |
| K14 | R6 | Manual: delete asks for confirmation. |
| K15 | D1 | Manual on iPhone: add to home screen → standalone. |
| K16 | §8.3 | Manual on iPhone: airplane mode → app, pictures and saving work. |
| K17 | S6 | Unit (db): `resetAllData()` → trainings empty, starter categories present. |
| K18 | §4.3 | Unit (db): create a v1 database with one English category, one exercise and one training → open v2 → training kept with `order` 0, exercise has `order`, nothing deleted; starter categories get `starterKey` / `timeOnly`. |

---

## 11. Test strategy and commands (authoritative)

- **Unit tests:** Vitest, Node environment, files `src/**/*.test.ts`. Database tests import `fake-indexeddb/auto` first and start each test with `await db.delete(); await db.open()`. The v1 fixture for K18 is created with a separate `new Dexie('karate-training-planner')` declaring only `version(1)`, closed before the app `db` is opened.
- **What is unit-tested:** everything in `src/time.ts`, `src/lists.ts`, and the data functions of `src/db.ts` (sync, reset, upgrade, ordering, helpers). React components are not unit-tested in v1.
- **Manual acceptance:** the "Manual" rows of §10 on an iPhone with the installed app before each release. Agents do not run them.

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Type check | `npm run typecheck` (`tsc -b`) |
| Unit tests | `npm test` (`vitest run`) |
| Lint | `npm run lint` (oxlint) |
| Build | `npm run build` (`tsc -b && vite build`) |

Both pipeline agents MUST run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` (whichever exist at that point) before reporting. Lint warnings are allowed, errors are not.

---

## 12. Implementation order

Each step is **one run of the pipeline**: `/implement karate-training-planner-design.md <step>`. A run implements only its step, treats earlier steps as present and must leave tests and build green.

| Step | Content | Done when |
|---|---|---|
| **1. Test infrastructure** | Add devDeps `vitest`, `fake-indexeddb`; scripts `"test": "vitest run"`, `"typecheck": "tsc -b"`. Add `src/time.test.ts` covering the **current** behaviour of `workPerSet`, `itemSeconds`, `trainingSeconds`, `schedule`, `clockAt`, `parseDuration`, `formatDuration` (K9, K10, K11, K12). No production code changes. | `npm test` green with ≥ 10 tests; build green. |
| **2. Slovak formatting** | §6.1 T8 in `src/time.ts`; `exerciseCount`; Slovak `TRAINING_TAGS` in `src/db.ts`; update/add tests. | Tests for T8 and `exerciseCount` green. |
| **3. Data layer v2** | `src/starterData.ts` (moved content + `timeOnly`), `public/exercises/README.md`, schema v2 + `upgradeToV2`, remove `populate`, all helpers of §7 `db.ts`, `syncStarterData`, `resetAllData`, `src/lists.ts`; call sync in `main.tsx`. Existing pages must still compile (adapt only what the type changes require, e.g. `order` when adding exercises/trainings). Tests for K1, K4, K5, K6, K7, K8, K17, K18. | All db/lists tests green; app still starts. |
| **4. Shared UI and branding** | Install `@dnd-kit/*`; `src/sortable.tsx`; component changes of §7; CSS for new elements; logo in `public/`; `index.html` lang; Workbox config. | Build green; no page uses the new parts yet except where the old `Media`/`Thumb` calls keep working. |
| **5. Exercise library screens** | ExercisesPage, ExerciseDetailPage, ExerciseFormPage, TimingFields (`timeOnly`), new CategoriesPage + route, per §8.2. | Build green; manual K2–K8 possible in `npm run dev`. |
| **6. Training screens** | TrainingsPage, TrainingFormPage (+ picker), TrainingDetailPage per §8.2. | Build green; manual K12–K14 possible. |

After step 6 the human runs the manual rows of §10 on the iPhone, then pushes to `main`.

---

## 13. Known risks and accepted trade-offs

| # | Risk | Mitigation / decision |
|---|---|---|
| R1 | A bug in `upgradeToV2` runs once on real phones and cannot be undone. | K18 unit test with a v1 fixture; upgrade never deletes. |
| R2 | Coach deletes the home-screen icon → all data on that phone is lost. | Accepted for v1; export/backup is in the next version. `navigator.storage.persist()` reduces automatic eviction. |
| R3 | Phones that ran older versions have English starter data → duplicates with the Slovak starter set. | Accepted; "Vymazať všetky dáta a začať odznova" (S6). |
| R4 | Large videos fill the phone and slow the first load. | 40 MB per upload, 30 MB precache limit; README recommends short clips. |
| R5 | Drag-and-drop on iOS conflicts with scrolling. | Drag only from the ⠿ handle with `touch-action: none`; keyboard sensor for accessibility. |
| R6 | `npm ci` fails on the author's network with a certificate error. | `NODE_OPTIONS=--use-system-ca` (see `CLAUDE.md`); GitHub Actions is unaffected. |
| R7 | iOS changes PWA storage or offline behaviour. | Re-run K15–K16 after iOS updates. |
| R8 | One pipeline run over the whole document is too large to review. | §12: one run per step. |

---

## 14. Out of scope (v1)

- Full-screen timer during the training (next version, Epic 6 in `project.md`).
- Accounts, server, synchronisation, sharing trainings between coaches.
- Export, backup, import.
- Statistics, attendance of children.
- Renaming or deleting categories.
- App Store publishing, Android-specific testing.

## 15. Open questions (do not block v1)

- How will coaches share trainings later: file export or a shared server database?
- Should the coach be chosen from a list of club coaches instead of free text?
- Should starter exercises be permanently deletable?
