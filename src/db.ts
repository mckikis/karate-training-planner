import Dexie, { type EntityTable } from 'dexie'
import { STARTER } from './starterData'
import { toTimeMode, type Timing } from './model'

/*
 * Local database in the phone (IndexedDB, Dexie).
 * Since the Firebase version the shared data (exercises, trainings) live in Firestore (src/cloud.ts).
 * This database keeps:
 *   - the data of older app versions, which are moved to Firebase once after the first login,
 *   - a cache of downloaded pictures and videos (table mediaCache), so each file is downloaded only once.
 */

// ---------- Data types ----------

// Format of the data saved by older versions of the app (before Firebase).

interface Category {
  id: number
  name: string
  order: number
  timeOnly?: boolean // exercises are measured only by time (warm-up, stretching, games)
  starterKey?: string // set for categories that come from starterData.ts
}

interface Exercise extends Timing {
  id: number
  name: string
  categoryId: number
  description: string
  order: number // position inside its category
  favorite?: boolean
  hidden?: boolean
  media?: Blob // photo/video the user uploaded in the app
  mediaType?: 'image' | 'video'
  mediaFile?: string // file in public/exercises/ (for exercises from starterData.ts)
  customMedia?: boolean // the user changed the media in the app → do not replace it from starterData.ts
  starterKey?: string // "Category/Name" for exercises from starterData.ts
  isDefault: boolean
  createdAt: number
}

/** An exercise inside a training. It keeps a copy of the name and timing. */
interface TrainingItem extends Timing {
  exerciseId: number
  name: string
  restAfter: number
  timeOnly?: boolean
}

interface Training {
  id: number
  name: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:MM, e.g. "17:00"
  tag: string
  description: string
  items: TrainingItem[]
  order: number // position in the list of trainings
  hidden?: boolean
  done?: boolean // the training already took place
  doneAt?: number
  coach?: string
  group?: string // who the training is for: one of TRAINING_GROUPS, or '' / missing
  createdAt: number
  updatedAt: number
}

/** English training types saved by older versions of the app → Slovak names. */
export const OLD_TAGS: Record<string, string> = {
  Punches: 'Údery',
  Kicks: 'Kopy',
  Tactics: 'Taktika',
  Conditioning: 'Kondícia',
  'Kids (beginners)': 'Prípravka (deti)',
  Plyometrics: 'Plyometria',
  Mixed: 'Zmiešaný',
}

export type { Category as LocalCategory, Exercise as LocalExercise, Training as LocalTraining }

/** A downloaded picture or video of an exercise (id = Firestore media id). */
export interface CachedMedia {
  id: string
  blob: Blob
}

// ---------- Database (IndexedDB on the phone) ----------

export const db = new Dexie('karate-training-planner') as Dexie & {
  categories: EntityTable<Category, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  trainings: EntityTable<Training, 'id'>
  mediaCache: EntityTable<CachedMedia, 'id'>
}

db.version(1).stores({
  categories: '++id, order',
  exercises: '++id, categoryId, name',
  trainings: '++id, date',
})

// Version 2: order, favorites, hiding, done trainings, media files, time-only categories.
// The upgrade runs once on phones that already have data from version 1.
db.version(2)
  .stores({
    categories: '++id, order, starterKey',
    exercises: '++id, categoryId, name, order, starterKey',
    trainings: '++id, date, order',
  })
  .upgrade(async (tx) => {
    const starterByName = new Map(STARTER.map((group) => [group.category, group]))

    const categories = (await tx.table('categories').toArray()) as Category[]
    for (const c of categories) {
      const group = starterByName.get(c.name)
      if (group) {
        await tx.table('categories').update(c.id, { starterKey: group.category, timeOnly: !!group.timeOnly })
      }
    }

    const categoryById = new Map(categories.map((c) => [c.id, c]))
    const exercises = (await tx.table('exercises').toArray()) as Exercise[]
    exercises.sort((a, b) => a.name.localeCompare(b.name))
    const counters = new Map<number, number>()
    for (const e of exercises) {
      const category = categoryById.get(e.categoryId)
      const group = category ? starterByName.get(category.name) : undefined
      const starterIndex = group && e.isDefault ? group.exercises.findIndex(([name]) => name === e.name) : -1
      const next = (counters.get(e.categoryId) ?? 1000) + 1
      counters.set(e.categoryId, next)
      const changes: Partial<Exercise> = { order: starterIndex >= 0 ? starterIndex : next }
      if (starterIndex >= 0) changes.starterKey = `${group!.category}/${e.name}`
      if (group?.timeOnly) Object.assign(changes, toTimeMode(e))
      await tx.table('exercises').update(e.id, changes)
    }

    const trainings = (await tx.table('trainings').toArray()) as Training[]
    trainings.sort((a, b) => b.date.localeCompare(a.date))
    for (const [index, t] of trainings.entries()) {
      await tx.table('trainings').update(t.id, { order: index })
    }
  })

// Version 3: training types saved in English (Punches, Kicks, …) are renamed to Slovak.
db.version(3)
  .stores({
    categories: '++id, order, starterKey',
    exercises: '++id, categoryId, name, order, starterKey',
    trainings: '++id, date, order',
  })
  .upgrade(async (tx) => {
    await tx
      .table('trainings')
      .toCollection()
      .modify((t: Training) => {
        if (OLD_TAGS[t.tag]) t.tag = OLD_TAGS[t.tag]
      })
  })

// Version 4: cache of pictures and videos downloaded from Firebase.
db.version(4).stores({
  categories: '++id, order, starterKey',
  exercises: '++id, categoryId, name, order, starterKey',
  trainings: '++id, date, order',
  mediaCache: 'id',
})
