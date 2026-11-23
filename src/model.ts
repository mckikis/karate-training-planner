// ---------- Data types (shared data in Firebase, see src/cloud.ts) ----------

export type Mode = 'reps' | 'time'

/** How long one exercise takes: sets × (reps × seconds per rep, or seconds) + rests. */
export interface Timing {
  mode: Mode
  sets: number
  reps: number
  secondsPerRep: number
  workSeconds: number
  restBetweenSets: number
}

/** Who created a category, exercise or training. */
export interface Author {
  createdBy: string // Firebase user id, or STARTER_AUTHOR_ID for starter data
  createdByName: string // first name shown in the app
  createdAt: number
}

export interface Category extends Author {
  id: string
  name: string
  order: number // default position; each coach can have their own (Prefs.order)
  timeOnly?: boolean // exercises are measured only by time (warm-up, stretching, games)
  starterKey?: string // set for categories that come from starterData.ts
  private?: boolean // only the author sees it
}

export interface Exercise extends Timing, Author {
  id: string
  name: string
  categoryId: string
  description: string
  order: number // default position inside its category; each coach can have their own
  favorite?: boolean // of the logged-in coach (from Prefs)
  hidden?: boolean // of the logged-in coach (from Prefs)
  mediaId?: string // photo/video uploaded in the app (Firestore collection media)
  mediaType?: 'image' | 'video'
  mediaFile?: string // file in public/exercises/ (for exercises from starterData.ts)
  starterKey?: string // "Category/Name" for exercises from starterData.ts
  isDefault: boolean // starter exercise – nobody can delete it
  byAdmin?: boolean // created by the club admin – everybody sees it
  private?: boolean // only the author sees it
  updatedAt?: number
}

/** Parts of a training. Older trainings have no parts – all their exercises are in the main part. */
export type Section = 'warmup' | 'main' | 'cooldown'

export const SECTIONS: { key: Section; label: string }[] = [
  { key: 'warmup', label: 'Rozcvička' },
  { key: 'main', label: 'Hlavná časť' },
  { key: 'cooldown', label: 'Záver' },
]

export function sectionLabel(section: Section): string {
  return SECTIONS.find((s) => s.key === section)!.label
}

/** An exercise inside a training. It keeps a copy of the name and timing. */
export interface TrainingItem extends Timing {
  exerciseId: string
  name: string
  restAfter: number
  timeOnly?: boolean
  section?: Section // missing = 'main'
}

export interface Training extends Author {
  id: string
  name: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:MM, e.g. "17:00"
  tag: string
  description: string
  items: TrainingItem[]
  order: number // default position; each coach can have their own
  hidden?: boolean // of the logged-in coach (from Prefs)
  done?: boolean // the training already took place
  doneAt?: number
  coach?: string
  group?: string // who the training is for: one of TRAINING_GROUPS, or '' / missing
  warmupSeconds?: number // total time of the warm-up (its exercises have no sets or reps)
  cooldownSeconds?: number // total time of the cool-down
  private?: boolean // only the author sees it
  updatedAt: number
}

/** A training type added by a coach (in addition to TRAINING_TAGS). Everybody can use it. */
export interface TrainingType extends Author {
  id: string
  name: string
}

/** Settings of one coach that are not shared: favourites, hidden items and own order. */
export interface Prefs {
  favorites: Record<string, true>
  hidden: Record<string, true>
  order: Record<string, number>
}

export const STARTER_AUTHOR_ID = 'starter'

/** Who the training is for. */
export const TRAINING_GROUPS = ['Prípravka', 'Starší', 'Ja']

/** Training types. Each has its colour in index.css (--tag-…). Coaches can add their own types. */
export const TRAINING_TAGS = [
  'Kumite - údery',
  'Kumite - kopy',
  'Kumite - zmiešaný',
  'Kumite - taktika',
  'Kata',
  'Kondícia',
  'Silový',
  'Plyometria',
  'Prípravka',
]

const TAG_CLASSES: Record<string, string> = {
  'Kumite - údery': 'tint-kumite-udery',
  'Kumite - kopy': 'tint-kumite-kopy',
  'Kumite - zmiešaný': 'tint-kumite-zmiesany',
  'Kumite - taktika': 'tint-kumite-taktika',
  'Kata': 'tint-kata',
  'Kondícia': 'tint-kondicia',
  'Silový': 'tint-silovy',
  'Plyometria': 'tint-plyometria',
  'Prípravka': 'tint-pripravka',
}

/** Types of older app versions → the current names. */
const RENAMED_TAGS: Record<string, string> = {
  'Údery': 'Kumite - údery',
  'Kopy': 'Kumite - kopy',
  'Taktika': 'Kumite - taktika',
  'Zmiešaný': 'Kumite - zmiešaný',
  'Prípravka (deti)': 'Prípravka',
  Punches: 'Kumite - údery',
  Kicks: 'Kumite - kopy',
  Tactics: 'Kumite - taktika',
  Mixed: 'Kumite - zmiešaný',
  Conditioning: 'Kondícia',
  Plyometrics: 'Plyometria',
  'Kids (beginners)': 'Prípravka',
}

export function normalizeTag(tag: string): string {
  return RENAMED_TAGS[tag] ?? tag
}

/** Number of colours for types added by coaches (tint-custom-0 … in index.css). */
const CUSTOM_COLOURS = 6

/** CSS class that gives a training of this type its colour. */
export function tagClass(tag: string): string {
  if (!tag) return ''
  return TAG_CLASSES[tag] ?? `tint-custom-${parseInt(hash(tag).slice(0, 4), 16) % CUSTOM_COLOURS}`
}

// ---------- Helpers ----------

/** Converts reps to time: 10 reps × 1.5 s = 15 s. Used for time-only categories. */
export function toTimeMode<T extends Timing>(t: T): T {
  if (t.mode === 'time') return t
  return { ...t, mode: 'time', workSeconds: Math.max(1, Math.round(t.reps * t.secondsPerRep)) }
}

export function timingOf(t: Timing): Timing {
  return {
    mode: t.mode,
    sets: t.sets,
    reps: t.reps,
    secondsPerRep: t.secondsPerRep,
    workSeconds: t.workSeconds,
    restBetweenSets: t.restBetweenSets,
  }
}

/** Address of a file in public/exercises/ */
export function exerciseFileUrl(file: string): string {
  return `${import.meta.env.BASE_URL}exercises/${encodeURIComponent(file)}`
}

export function mediaTypeOfFile(file: string): 'image' | 'video' {
  return /\.(mp4|m4v|mov|webm)$/i.test(file) ? 'video' : 'image'
}

/** What to show as the picture of an exercise: own upload first, then the file from public/exercises/. */
export function exerciseMedia(e?: Exercise): { mediaId?: string; url?: string; type?: 'image' | 'video' } {
  if (!e) return {}
  if (e.mediaId) return { mediaId: e.mediaId, type: e.mediaType }
  if (e.mediaFile) return { url: exerciseFileUrl(e.mediaFile), type: mediaTypeOfFile(e.mediaFile) }
  return {}
}

export function byOrder(a: { order: number; id: string }, b: { order: number; id: string }): number {
  return a.order - b.order || a.id.localeCompare(b.id)
}

/** Favorites first, then the order the user set. */
export function byFavoriteThenOrder(a: Exercise, b: Exercise): number {
  return Number(!!b.favorite) - Number(!!a.favorite) || byOrder(a, b)
}

/** Short, stable hash (FNV-1a, two rounds) – used for ids and login e-mails. Works without HTTPS. */
export function hash(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}
