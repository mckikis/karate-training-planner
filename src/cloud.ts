/*
 * Shared data in Firebase (Firestore) and login.
 *
 * Login: first name + personal login key. The key is set by the admin in the Firebase console
 * (Firestore → config/access → keys / adminKeys). The same key logs the coach into the same
 * account on any phone. Without a valid key firestore.rules let nobody read or write the data.
 *
 * Collections:
 *   members/{uid}   name, key, admin            (readable only by the user)
 *   prefs/{uid}     favourites, hidden items, own order of one coach
 *   categories, exercises, trainings            shared by all coaches, with createdBy / createdByName;
 *                                               private = true → only the author sees it
 *   trainingTypes                               training types added by coaches
 *   appSettings/global                          club settings of the admin (deleted starter items)
 *
 * The admin (key in adminKeys) changes and deletes everything for everybody: exercises, categories,
 * the order and "Len na čas". Other coaches keep their order and "Len na čas" in prefs/{uid}.
 *   media/{id} + media/{id}/chunks/{n}          uploaded pictures and videos, split into 900 kB pieces
 *
 * Private items: the rules let a coach read only public documents (private == false) and their own,
 * so the app listens to two queries per collection and joins them.
 *
 * Firestore keeps a copy of the data in the phone, so the app works offline and sends changes later.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  arrayUnion,
  Bytes,
  clearIndexedDbPersistence,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  terminate,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
  type Query,
} from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'
import { db as localDb, OLD_TAGS } from './db'
import { STARTER, STARTER_AUTHOR } from './starterData'
import {
  hash,
  normalizeTag,
  STARTER_AUTHOR_ID,
  timingOf,
  toTimeMode,
  type Author,
  type Category,
  type Exercise,
  type Prefs,
  type Timing,
  type Training,
  type TrainingType,
} from './model'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
function startFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  } catch {
    // Dev server hot reload: Firestore is already running.
    return getFirestore(app)
  }
}
const fs = startFirestore()

// ---------- State ----------

export interface Member {
  uid: string
  name: string
  admin: boolean
}

export type Session =
  | { status: 'loading' }
  | { status: 'out'; error?: string }
  | { status: 'in'; member: Member }

export interface Data {
  ready: boolean // first data arrived (from the phone or from the internet)
  categories: Category[]
  exercises: Exercise[]
  trainings: Training[]
  trainingTypes: TrainingType[]
}

const EMPTY_PREFS: Prefs = { favorites: {}, hidden: {}, order: {}, timeOnly: {}, timing: {} }

type Shared = 'categories' | 'exercises' | 'trainings'
const SHARED: Shared[] = ['categories', 'exercises', 'trainings']

/** Documents of one collection: public ones and my own ones (two queries, joined by id). */
interface Part {
  public: Map<string, Record<string, unknown>>
  mine: Map<string, Record<string, unknown>>
  loaded: { public: boolean; mine: boolean }
  fromServer: { public: boolean; mine: boolean }
}

function emptyPart(): Part {
  return {
    public: new Map(),
    mine: new Map(),
    loaded: { public: false, mine: false },
    fromServer: { public: false, mine: false },
  }
}

const raw = {
  parts: { categories: emptyPart(), exercises: emptyPart(), trainings: emptyPart() } as Record<Shared, Part>,
  categories: [] as Category[],
  exercises: [] as Exercise[],
  trainings: [] as Training[],
  trainingTypes: [] as TrainingType[],
  prefs: EMPTY_PREFS,
  removedStarter: new Set<string>(), // starter items the admin deleted – not added again
  starterSeeded: false, // starterData.ts was already written to Firebase once – Firebase is the truth now
  settingsFromServer: false,
}

function joined<T>(part: Part): T[] {
  return [...new Map([...part.public, ...part.mine]).entries()].map(([id, d]) => ({ ...d, id }) as T)
}

function isLoaded(name: Shared) {
  return raw.parts[name].loaded.public && raw.parts[name].loaded.mine
}

function isFromServer(name: Shared) {
  return raw.parts[name].fromServer.public && raw.parts[name].fromServer.mine
}

let session: Session = { status: 'loading' }
let data: Data = { ready: false, categories: [], exercises: [], trainings: [], trainingTypes: [] }
let errorMessage = ''
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Shared data with the favourites, hidden items and order of the logged-in coach. */
function computeData() {
  const p = raw.prefs
  const categories = raw.categories.map((c) => ({
    ...c,
    order: p.order[c.id] ?? c.order,
    timeOnly: p.timeOnly[c.id] ?? c.timeOnly,
  }))
  const timeOnlyCategories = new Set(categories.filter((c) => c.timeOnly).map((c) => c.id))
  data = {
    ready: SHARED.every(isLoaded),
    trainingTypes: raw.trainingTypes,
    categories,
    exercises: withParents(raw.exercises).map((e) => {
      const own = p.timing[e.id]
      const merged = {
        ...e,
        // The coach's own default times win over the ones of the author or the admin.
        ...(own ? { ...own, ownTiming: true } : {}),
        order: p.order[e.id] ?? e.order,
        favorite: !!p.favorites[e.id],
        hidden: !!p.hidden[e.id],
      }
      // In a "Len na čas" category the exercise is measured by time (10 × 1.5 s → 15 s).
      return timeOnlyCategories.has(e.categoryId) ? toTimeMode(merged) : merged
    }),
    trainings: raw.trainings.map((t) => ({
      ...t,
      tag: normalizeTag(t.tag ?? ''),
      order: p.order[t.id] ?? t.order,
      hidden: !!p.hidden[t.id],
    })),
  }
  emit()
}

/**
 * Variants whose exercise is gone (deleted, or private of another coach) are left out –
 * nobody could reach them.
 */
function withParents(exercises: Exercise[]): Exercise[] {
  const ids = new Set(exercises.map((e) => e.id))
  return exercises.filter((e) => !e.parentId || ids.has(e.parentId))
}

function setSession(next: Session) {
  session = next
  emit()
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => session)
}

export function useData(): Data {
  return useSyncExternalStore(subscribe, () => data)
}

/** Last error of a save in the background (shown as a banner). */
export function useError(): [string, () => void] {
  const message = useSyncExternalStore(subscribe, () => errorMessage)
  return [message, () => showError('')]
}

export function showError(message: string) {
  errorMessage = message
  emit()
}

export function me(): Member {
  if (session.status !== 'in') throw new Error('Nie si prihlásený.')
  return session.member
}

export function isMine(item: Author): boolean {
  return session.status === 'in' && item.createdBy === session.member.uid
}

/** The logged-in coach is the admin: their changes are for everybody. */
export function isAdmin(): boolean {
  return session.status === 'in' && session.member.admin
}

/**
 * Saves in the background. Firestore shows the change in the app at once and sends it
 * to the internet when the phone is online, so the screens do not wait for it.
 */
function background(promise: Promise<unknown>) {
  promise.catch((error) => showError(describeError(error)))
}

function describeError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  if (code.includes('permission-denied')) return 'Na túto zmenu nemáš oprávnenie alebo tvoj prihlasovací kľúč už neplatí.'
  if (code.includes('unavailable') || code.includes('network')) return 'Bez internetu. Skús to znova, keď budeš online.'
  if (code.includes('too-many-requests')) return 'Priveľa pokusov. Počkaj chvíľu a skús znova.'
  return error instanceof Error ? error.message : 'Niečo sa nepodarilo.'
}

// ---------- Login ----------

let loggingIn = false

// The logged-in coach is remembered in the phone, so the app opens straight away – also offline –
// and the coach stays logged in until they tap "Odhlásiť sa".
const MEMBER_KEY = 'karate-training-planner-member'

function rememberMember(member: Member | null) {
  try {
    if (member) localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
    else localStorage.removeItem(MEMBER_KEY)
  } catch {
    // storage blocked: the login works until the app is closed
  }
}

function rememberedMember(uid: string): Member | undefined {
  try {
    const member = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? 'null') as Member | null
    return member?.uid === uid ? member : undefined
  } catch {
    return undefined
  }
}

onAuthStateChanged(auth, async (user) => {
  if (loggingIn) return
  if (!user) {
    stopListening()
    rememberMember(null)
    if (session.status !== 'out') setSession({ status: 'out' })
    return
  }
  const remembered = rememberedMember(user.uid)
  if (remembered) startSession(remembered)
  try {
    const snap = await getDoc(doc(fs, 'members', user.uid))
    const m = snap.data()
    if (!m?.name) {
      if (!remembered) setSession({ status: 'out' })
      return
    }
    const member = { uid: user.uid, name: m.name as string, admin: !!m.admin }
    if (!remembered) startSession(member)
    else if (member.name !== remembered.name || member.admin !== remembered.admin) {
      rememberMember(member)
      setSession({ status: 'in', member })
    }
  } catch {
    // Offline or a short network problem: keep the remembered login.
    if (!remembered) setSession({ status: 'out' })
  }
})

/** Firebase needs an e-mail and a password; both are made from the login key. */
function keyEmail(key: string) {
  return `k${hash(key)}@karatetrener.app`
}

export async function login(name: string, key: string): Promise<void> {
  name = name.trim()
  key = key.trim()
  if (!name) throw new Error('Zadaj svoje krstné meno.')
  if (key.length < 6) throw new Error('Prihlasovací kľúč má aspoň 6 znakov.')

  loggingIn = true
  try {
    const email = keyEmail(key)
    let user
    try {
      user = (await signInWithEmailAndPassword(auth, email, key)).user
    } catch (error) {
      const code = (error as { code?: string }).code ?? ''
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(code)) {
        throw new Error(describeError(error))
      }
      // First login with this key: create the account.
      user = (await createUserWithEmailAndPassword(auth, email, key)).user
    }

    // firestore.rules accept the member only with a valid key (admin = key is in adminKeys).
    const ref = doc(fs, 'members', user.uid)
    for (const admin of [false, true]) {
      try {
        await setDoc(ref, { name, key, admin, lastLogin: Date.now() }, { merge: true })
        startSession({ uid: user.uid, name, admin })
        return
      } catch (error) {
        if (!String((error as { code?: string }).code).includes('permission-denied')) throw new Error(describeError(error))
      }
    }
    await signOut(auth)
    throw new Error('Neplatný prihlasovací kľúč. Kľúč ti dá správca appky.')
  } finally {
    loggingIn = false
  }
}

/** Logs out and deletes the copy of the data in this phone. The login screen appears at once. */
export async function logout() {
  stopListening()
  rememberMember(null)
  loggingIn = true // the auth listener must not start a session again
  setSession({ status: 'out' })
  try {
    await signOut(auth)
  } catch {
    // offline: the account is logged out in this phone anyway
  }
  try {
    await localDb.mediaCache.clear()
    await terminate(fs)
    await clearIndexedDbPersistence(fs)
  } catch {
    // another tab still uses the data – it is deleted next time
  }
  // A fresh start (Firestore cannot be used after terminate); after login the trainings open.
  window.location.hash = '#/trainings'
  window.location.reload()
}

/** Changes the coach's name, also on everything they created. */
export async function rename(name: string) {
  name = name.trim()
  if (!name) throw new Error('Zadaj svoje krstné meno.')
  const member = me()
  await setDoc(doc(fs, 'members', member.uid), { name }, { merge: true })
  rememberMember({ ...member, name })
  setSession({ status: 'in', member: { ...member, name } })
  const own = [
    ...raw.categories.filter(isMine).map((x) => doc(fs, 'categories', x.id)),
    ...raw.exercises.filter((x) => isMine(x) && !x.isDefault).map((x) => doc(fs, 'exercises', x.id)),
    ...raw.trainings.filter(isMine).map((x) => doc(fs, 'trainings', x.id)),
    ...raw.trainingTypes.filter(isMine).map((x) => doc(fs, 'trainingTypes', x.id)),
  ]
  for (let i = 0; i < own.length; i += 400) {
    const batch = writeBatch(fs)
    own.slice(i, i + 400).forEach((ref) => batch.update(ref, { createdByName: name }))
    background(batch.commit())
  }
}

// ---------- Live data ----------

let unsubscribes: (() => void)[] = []
let syncStarted = false

function startSession(member: Member) {
  rememberMember(member)
  setSession({ status: 'in', member })
  startListening(member)
}

function stopListening() {
  unsubscribes.forEach((stop) => stop())
  unsubscribes = []
  syncStarted = false
  raw.parts = { categories: emptyPart(), exercises: emptyPart(), trainings: emptyPart() }
  raw.categories = []
  raw.exercises = []
  raw.trainings = []
  raw.trainingTypes = []
  raw.prefs = EMPTY_PREFS
  raw.removedStarter = new Set()
  raw.starterSeeded = false
  raw.settingsFromServer = false
  computeData()
}

/**
 * The coach's own settings (prefs) need only a valid key – when even they are refused, the key
 * was removed from config/access and the coach is logged out. Other refusals mean the rules in
 * Firebase are older than the app; the coach stays logged in and sees a message.
 */
function onPrefsError(error: FirestoreError) {
  if (error.code === 'permission-denied') {
    stopListening()
    rememberMember(null)
    signOut(auth).catch(() => {})
    setSession({ status: 'out', error: 'Tvoj prihlasovací kľúč už neplatí. Požiadaj správcu o nový.' })
  } else {
    showError(describeError(error))
  }
}

function onListenError(what: string) {
  return (error: FirestoreError) => {
    if (error.code === 'permission-denied') {
      showError(`Firebase nepovolil načítať ${what}. Správca má vo Firebase nahrať aktuálne pravidlá (firestore.rules).`)
    } else {
      showError(describeError(error))
    }
  }
}

const WHAT: Record<Shared, string> = { categories: 'kategórie', exercises: 'cviky', trainings: 'tréningy' }

function startListening(member: Member) {
  stopListening()
  for (const name of SHARED) {
    const queries: ['public' | 'mine', Query][] = [
      ['public', query(collection(fs, name), where('private', '==', false))],
      ['mine', query(collection(fs, name), where('createdBy', '==', member.uid))],
    ]
    for (const [which, q] of queries) {
      unsubscribes.push(
        onSnapshot(
          q,
          { includeMetadataChanges: true },
          (snap) => {
            const part = raw.parts[name]
            part[which] = new Map(snap.docs.map((d) => [d.id, d.data()]))
            part.loaded[which] = true
            if (!snap.metadata.fromCache) part.fromServer[which] = true
            if (name === 'categories') raw.categories = joined<Category>(part)
            if (name === 'exercises') raw.exercises = joined<Exercise>(part)
            if (name === 'trainings') raw.trainings = joined<Training>(part)
            computeData()
            maybeSyncStarter(member)
          },
          onListenError(WHAT[name]),
        ),
      )
    }
  }
  unsubscribes.push(
    onSnapshot(
      doc(fs, 'appSettings', 'global'),
      { includeMetadataChanges: true },
      (snap) => {
        raw.removedStarter = new Set((snap.data()?.removedStarter as string[] | undefined) ?? [])
        raw.starterSeeded = snap.data()?.starterSeeded === true
        if (!snap.metadata.fromCache) raw.settingsFromServer = true
        maybeSyncStarter(member)
      },
      onListenError('nastavenia klubu'),
    ),
  )
  unsubscribes.push(
    onSnapshot(
      collection(fs, 'trainingTypes'),
      (snap) => {
        raw.trainingTypes = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as TrainingType)
        computeData()
      },
      onListenError('typy tréningov'),
    ),
  )
  unsubscribes.push(
    onSnapshot(
      doc(fs, 'prefs', member.uid),
      (snap) => {
        raw.prefs = { ...EMPTY_PREFS, ...(snap.data() as Partial<Prefs> | undefined) }
        computeData()
      },
      onPrefsError,
    ),
  )
}

// ---------- Starter data (starterData.ts) ----------

/** Same id on every phone, so the starter data is added only once. */
function starterId(kind: 'c' | 'e', key: string) {
  const slug = key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
  return `s-${kind}-${slug}-${hash(key).slice(0, 6)}`
}

function maybeSyncStarter(member: Member) {
  // Only with fresh data from the internet – the copy in the phone may be old.
  if (syncStarted || !SHARED.every(isFromServer) || !raw.settingsFromServer) return
  syncStarted = true
  syncStarterData()
    .then(() => markOwnAsPublic(member))
    .then(() => migrateLocalData(member))
    .catch((error) => showError(describeError(error)))
}

/**
 * Writes starterData.ts to Firebase – only into an empty project (a new Firebase project).
 * Once the starter data is in Firebase, Firebase is the truth: what the admin changed or deleted in
 * the app stays so for every coach, and the code never adds, changes or re-adds starter items.
 * New exercises for everybody are added by the admin in the app.
 * Starter documents saved before private items existed have no "private" field – the public query
 * does not find them, so they are looked up one by one and marked public.
 */
async function syncStarterData() {
  const alreadySeeded =
    raw.starterSeeded ||
    raw.categories.some((c) => c.createdBy === STARTER_AUTHOR_ID || !!c.starterKey) ||
    raw.exercises.some((e) => e.isDefault)
  if (alreadySeeded) {
    rememberSeeded()
    return
  }

  const batch = writeBatch(fs)
  let changes = 0
  const author = { createdBy: STARTER_AUTHOR_ID, createdByName: STARTER_AUTHOR, createdAt: Date.now(), private: false }

  async function addOrMarkPublic(collectionName: 'categories' | 'exercises', id: string, value: Record<string, unknown>) {
    const ref = doc(fs, collectionName, id)
    const existing = await getDoc(ref).catch(() => undefined)
    if (existing?.exists()) {
      if (existing.data().private === undefined) batch.update(ref, { private: false })
      else return
    } else {
      batch.set(ref, value)
    }
    changes++
  }

  for (const [groupIndex, group] of STARTER.entries()) {
    const categoryId = starterId('c', group.category)
    if (raw.removedStarter.has(categoryId)) continue
    await addOrMarkPublic('categories', categoryId, {
      name: group.category,
      order: groupIndex,
      timeOnly: !!group.timeOnly,
      starterKey: group.category,
      ...author,
    })
    for (const [index, [name, description, timing, mediaFile]] of group.exercises.entries()) {
      const key = `${group.category}/${name}`
      const id = starterId('e', key)
      if (raw.removedStarter.has(id)) continue
      await addOrMarkPublic('exercises', id, {
        name,
        description,
        categoryId,
        order: index,
        isDefault: true,
        byAdmin: false,
        starterKey: key,
        mediaFile,
        ...(group.timeOnly ? toTimeMode(timing) : timing),
        ...author,
      })
    }
  }
  if (changes > 0) await batch.commit()
  rememberSeeded()
}

/** The admin marks the club data as seeded, so no phone ever writes starterData.ts again. */
function rememberSeeded() {
  if (raw.starterSeeded || !isAdmin()) return
  raw.starterSeeded = true
  background(setDoc(doc(fs, 'appSettings', 'global'), { starterSeeded: true }, { merge: true }))
}

/** Own documents from before private items existed get private = false, so others see them again. */
async function markOwnAsPublic(member: Member) {
  const batch = writeBatch(fs)
  let changes = 0
  for (const name of SHARED) {
    for (const [id, d] of raw.parts[name].mine) {
      if (d.private === undefined && d.createdBy === member.uid) {
        batch.update(doc(fs, name, id), { private: false })
        changes++
      }
    }
  }
  if (changes > 0) await batch.commit()
}

/**
 * Moves the data of the older app version (only in this phone) to Firebase – once per phone.
 * Own exercises (with their pictures) and trainings are added under the logged-in coach;
 * favourites, hidden items and order become the coach's own settings.
 */
async function migrateLocalData(member: Member) {
  const FLAG = 'karate-training-planner-moved-to-firebase'
  try {
    if (localStorage.getItem(FLAG)) return
  } catch {
    return
  }
  const [categories, exercises, trainings] = await Promise.all([
    localDb.categories.toArray(),
    localDb.exercises.toArray(),
    localDb.trainings.toArray(),
  ])
  const prefs: Prefs = { favorites: {}, hidden: {}, order: {}, timeOnly: {}, timing: {} }
  const author = () => ({ createdBy: member.uid, createdByName: member.name, createdAt: Date.now() })

  // Old starter exercises (isDefault, e.g. the English ones of the first version) are not moved –
  // the current starter data is already in Firebase. Only the coach's own exercises are moved.
  const ownExercises = exercises.filter((e) => !e.starterKey && !e.isDefault)
  const neededCategories = new Set(ownExercises.map((e) => e.categoryId))

  const categoryIds = new Map<number, string>()
  for (const c of categories) {
    if (!c.starterKey && !neededCategories.has(c.id)) continue
    let id = c.starterKey
      ? starterId('c', c.starterKey)
      : raw.categories.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())?.id
    if (!id) {
      const ref = doc(collection(fs, 'categories'))
      await setDoc(ref, { name: c.name, order: Date.now(), timeOnly: !!c.timeOnly, private: false, ...author() })
      id = ref.id
    }
    categoryIds.set(c.id, id)
    prefs.order[id] = c.order
  }

  const exerciseIds = new Map<number, string>()
  for (const e of exercises) {
    if (!e.starterKey && e.isDefault) continue
    let id: string
    if (e.starterKey) {
      id = starterId('e', e.starterKey)
    } else {
      const categoryId = categoryIds.get(e.categoryId)
      if (!categoryId) continue
      // Already in Firebase (moved from another phone or browser before) – not added twice.
      const same = raw.exercises.find(
        (x) => x.categoryId === categoryId && x.name.trim().toLowerCase() === e.name.trim().toLowerCase(),
      )
      if (same) {
        exerciseIds.set(e.id, same.id)
        continue
      }
      const ref = doc(collection(fs, 'exercises'))
      id = ref.id
      const mediaId = e.media ? await uploadMedia(e.media, e.mediaType ?? 'image') : undefined
      await setDoc(ref, {
        name: e.name,
        description: e.description,
        categoryId,
        order: e.order ?? Date.now(),
        isDefault: false,
        byAdmin: member.admin,
        private: false,
        mediaId,
        mediaType: mediaId ? e.mediaType : undefined,
        ...timingOf(e),
        ...author(),
      })
    }
    exerciseIds.set(e.id, id)
    if (e.favorite) prefs.favorites[id] = true
    if (e.hidden) prefs.hidden[id] = true
    if (typeof e.order === 'number') prefs.order[id] = e.order
  }

  for (const t of trainings) {
    const same = raw.trainings.some((x) => x.createdBy === member.uid && x.name === t.name && x.date === t.date)
    if (same) continue
    const ref = doc(collection(fs, 'trainings'))
    await setDoc(ref, {
      name: t.name,
      date: t.date,
      startTime: t.startTime,
      tag: normalizeTag(OLD_TAGS[t.tag] ?? t.tag),
      private: false,
      description: t.description ?? '',
      items: t.items.map((item) => ({ ...item, exerciseId: exerciseIds.get(item.exerciseId) ?? '' })),
      order: t.order ?? 0,
      done: t.done,
      doneAt: t.doneAt,
      coach: t.coach,
      group: t.group,
      updatedAt: t.updatedAt ?? Date.now(),
      ...author(),
      createdAt: t.createdAt ?? Date.now(),
    })
    if (t.hidden) prefs.hidden[ref.id] = true
    if (typeof t.order === 'number') prefs.order[ref.id] = t.order
  }

  await setDoc(doc(fs, 'prefs', member.uid), prefs, { merge: true })
  try {
    localStorage.setItem(FLAG, String(Date.now()))
  } catch {
    // ignore
  }
}

// ---------- Coach's own settings ----------

function prefsRef() {
  return doc(fs, 'prefs', me().uid)
}

export function setFavorite(id: string, on: boolean) {
  background(setDoc(prefsRef(), { favorites: { [id]: on ? true : deleteField() } }, { merge: true }))
}

export function setHidden(id: string, on: boolean) {
  const change: Record<string, unknown> = { hidden: { [id]: on ? true : deleteField() } }
  // A hidden exercise is not a favourite any more.
  if (on) change.favorites = { [id]: deleteField() }
  background(setDoc(prefsRef(), change, { merge: true }))
}

/**
 * Own default times of an exercise – only for the logged-in coach (undefined = back to the
 * default times set by the author or the admin).
 */
export function setOwnTiming(id: string, timing: Timing | undefined) {
  background(setDoc(prefsRef(), { timing: { [id]: timing ? timingOf(timing) : deleteField() } }, { merge: true }))
}

/**
 * Saves a new order after dragging: the first item gets 0, the second 1, …
 * The admin's order is saved for everybody; other coaches keep their own order.
 */
export function saveOrder(collectionName: Shared, ids: string[]) {
  if (isAdmin()) {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(fs)
      ids.slice(i, i + 400).forEach((id, j) => batch.update(doc(fs, collectionName, id), { order: i + j }))
      background(batch.commit())
    }
    // The admin then sees the shared order, not an older own one.
    background(setDoc(prefsRef(), { order: Object.fromEntries(ids.map((id) => [id, deleteField()])) }, { merge: true }))
    return
  }
  background(setDoc(prefsRef(), { order: Object.fromEntries(ids.map((id, index) => [id, index])) }, { merge: true }))
}

/** Remembers that the admin deleted starter items, so syncStarterData() does not add them again. */
function rememberRemovedStarter(ids: string[]) {
  if (ids.length === 0) return
  background(setDoc(doc(fs, 'appSettings', 'global'), { removedStarter: arrayUnion(...ids) }, { merge: true }))
}

// ---------- Categories ----------

/** New category – for everybody, or private (only the author sees it). */
export function addCategory(name: string, isPrivate = false): string {
  const member = me()
  const ref = doc(collection(fs, 'categories'))
  background(
    setDoc(ref, {
      name,
      order: Date.now(), // at the end
      timeOnly: false,
      private: isPrivate,
      createdBy: member.uid,
      createdByName: member.name,
      createdAt: Date.now(),
    }),
  )
  return ref.id
}

export function canDeleteCategory(category: Category): boolean {
  return isAdmin() || (isMine(category) && !category.starterKey)
}

/**
 * Deletes a category together with its exercises (from Firestore, with their pictures).
 * A coach deletes only an own category with own exercises; the admin deletes any category.
 */
export function deleteCategory(category: Category): { deleted: number } {
  if (!canDeleteCategory(category)) throw new Error('Vymazať môžeš len kategóriu, ktorú si vytvoril/a ty.')
  const inCategory = raw.exercises.filter((e) => e.categoryId === category.id)
  if (!isAdmin()) {
    const foreign = inCategory.filter((e) => !isMine(e) || e.isDefault)
    if (foreign.length > 0) {
      throw new Error(`V kategórii sú cviky iných trénerov (${foreign.length}). Kategóriu nie je možné vymazať.`)
    }
  }
  for (let i = 0; i < inCategory.length; i += 400) {
    const batch = writeBatch(fs)
    inCategory.slice(i, i + 400).forEach((e) => batch.delete(doc(fs, 'exercises', e.id)))
    background(batch.commit())
  }
  background(deleteDoc(doc(fs, 'categories', category.id)))
  inCategory.forEach((e) => {
    if (e.mediaId) deleteMedia(e.mediaId).catch(() => {})
  })
  rememberRemovedStarter([
    ...(category.starterKey ? [category.id] : []),
    ...inCategory.filter((e) => e.isDefault).map((e) => e.id),
  ])
  return { deleted: inCategory.length }
}

/** Changes whether an own category is private. */
export function setCategoryPrivate(category: Category, isPrivate: boolean) {
  background(updateDoc(doc(fs, 'categories', category.id), { private: isPrivate }))
}

// ---------- Training types ----------

/** A new training type, everybody can use it. Returns its name. */
export function addTrainingType(name: string): string {
  const member = me()
  name = name.trim()
  if (raw.trainingTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) return name
  background(
    setDoc(doc(collection(fs, 'trainingTypes')), {
      name,
      createdBy: member.uid,
      createdByName: member.name,
      createdAt: Date.now(),
    }),
  )
  return name
}

/**
 * "Len na čas": the admin changes it for everybody, every other coach only for themselves.
 * The exercises of such a category are then shown and added to trainings by time.
 */
export function setCategoryTimeOnly(category: Category, timeOnly: boolean) {
  if (isAdmin()) {
    background(updateDoc(doc(fs, 'categories', category.id), { timeOnly }))
    background(setDoc(prefsRef(), { timeOnly: { [category.id]: deleteField() } }, { merge: true }))
  } else {
    background(setDoc(prefsRef(), { timeOnly: { [category.id]: timeOnly } }, { merge: true }))
  }
}

// ---------- Exercises ----------

export type MediaChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; file: Blob; type: 'image' | 'video' }

export interface ExerciseInput {
  name: string
  categoryId: string
  description: string
  timing: Timing
  media: MediaChange
  private: boolean
  /** New variant of this exercise (set only when creating). */
  parentId?: string
}

/** Creates or changes an own exercise. Uploading a picture needs the internet. Returns the id. */
export async function saveExercise(id: string | undefined, input: ExerciseInput): Promise<string> {
  const member = me()
  const old = id ? raw.exercises.find((e) => e.id === id) : undefined
  const fields: Record<string, unknown> = {
    name: input.name,
    categoryId: input.categoryId,
    description: input.description,
    ...input.timing,
    private: input.private,
    updatedAt: Date.now(),
  }
  if (input.media.kind === 'new') {
    fields.mediaId = await uploadMedia(input.media.file, input.media.type)
    fields.mediaType = input.media.type
  } else if (input.media.kind === 'remove') {
    fields.mediaId = deleteField()
    fields.mediaType = deleteField()
  }
  // The old picture is deleted when it is mine (a picture uploaded by another admin stays in Firebase).
  if (input.media.kind !== 'keep' && old?.mediaId) deleteMedia(old.mediaId).catch(() => {})

  if (id) {
    background(updateDoc(doc(fs, 'exercises', id), fields))
    return id
  }
  const ref = doc(collection(fs, 'exercises'))
  background(
    setDoc(ref, {
      ...fields,
      order: Date.now(), // at the end of its category
      ...(input.parentId ? { parentId: input.parentId } : {}),
      isDefault: false,
      byAdmin: member.admin,
      createdBy: member.uid,
      createdByName: member.name,
      createdAt: Date.now(),
    }),
  )
  return ref.id
}

/** Deletes the exercise from Firestore (with its picture). Saved trainings keep their copy. */
export function deleteExercise(exercise: Exercise) {
  background(deleteDoc(doc(fs, 'exercises', exercise.id)))
  if (exercise.mediaId) deleteMedia(exercise.mediaId).catch(() => {})
  if (exercise.isDefault) rememberRemovedStarter([exercise.id])
  // Its variants go too – those the coach may delete; the others are no longer shown (withParents).
  raw.exercises
    .filter((v) => v.parentId === exercise.id && canDeleteExercise(v))
    .forEach((v) => {
      background(deleteDoc(doc(fs, 'exercises', v.id)))
      if (v.mediaId) deleteMedia(v.mediaId).catch(() => {})
    })
}

/** Who may change an exercise: the admin every exercise, other coaches their own ones. */
export function canEditExercise(exercise: Exercise): boolean {
  return isAdmin() || (isMine(exercise) && !exercise.isDefault)
}

export function canDeleteExercise(exercise: Exercise): boolean {
  return canEditExercise(exercise)
}

/** Who may change, mark as done or delete a training: its author and the admin. */
export function canEditTraining(training: Training): boolean {
  return isAdmin() || isMine(training)
}

// ---------- Trainings ----------

export type TrainingInput = Omit<Training, keyof Author | 'id' | 'order' | 'hidden' | 'private'> & { private: boolean }

export function saveTraining(id: string | undefined, input: TrainingInput): string {
  const member = me()
  if (id) {
    background(updateDoc(doc(fs, 'trainings', id), { ...input }))
    return id
  }
  const ref = doc(collection(fs, 'trainings'))
  const now = Date.now()
  // A new training goes to the top of the list.
  background(setDoc(ref, { ...input, order: -now, createdBy: member.uid, createdByName: member.name, createdAt: now }))
  return ref.id
}

export function updateTraining(id: string, change: Partial<TrainingInput>) {
  const fields: Record<string, unknown> = { ...change, updatedAt: Date.now() }
  for (const key of Object.keys(fields)) if (fields[key] === undefined) fields[key] = deleteField()
  background(updateDoc(doc(fs, 'trainings', id), fields))
}

export function deleteTraining(id: string) {
  background(deleteDoc(doc(fs, 'trainings', id)))
}

// ---------- Pictures and videos ----------

const CHUNK_BYTES = 900 * 1024 // a Firestore document can hold at most 1 MB
const CHUNKS_PER_BATCH = 8

async function uploadMedia(blob: Blob, type: 'image' | 'video'): Promise<string> {
  if (!navigator.onLine) throw new Error('Na nahratie obrázka alebo videa potrebuješ internet.')
  const ref = doc(collection(fs, 'media'))
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const count = Math.max(1, Math.ceil(bytes.length / CHUNK_BYTES))
  await setDoc(ref, { type, mime: blob.type, size: bytes.length, chunks: count, createdBy: me().uid, createdAt: Date.now() })
  for (let start = 0; start < count; start += CHUNKS_PER_BATCH) {
    const batch = writeBatch(fs)
    for (let i = start; i < Math.min(start + CHUNKS_PER_BATCH, count); i++) {
      const part = bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)
      batch.set(doc(fs, 'media', ref.id, 'chunks', String(i).padStart(4, '0')), { i, data: Bytes.fromUint8Array(part) })
    }
    await batch.commit()
  }
  await localDb.mediaCache.put({ id: ref.id, blob })
  return ref.id
}

async function deleteMedia(id: string) {
  const chunks = await getDocs(collection(fs, 'media', id, 'chunks'))
  const batch = writeBatch(fs)
  chunks.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  await deleteDoc(doc(fs, 'media', id))
  memory.delete(id)
  await localDb.mediaCache.delete(id)
}

const memory = new Map<string, Promise<Blob | undefined>>()

/** Picture or video from Firebase; downloaded once, then kept in the phone. */
function loadMedia(id: string): Promise<Blob | undefined> {
  let promise = memory.get(id)
  if (!promise) {
    promise = (async () => {
      const cached = await localDb.mediaCache.get(id)
      if (cached) return cached.blob
      const meta = (await getDoc(doc(fs, 'media', id))).data()
      if (!meta) return undefined
      const chunks = await getDocs(collection(fs, 'media', id, 'chunks'))
      if (chunks.size < meta.chunks) throw new Error('incomplete')
      const parts = chunks.docs
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((d) => (d.data().data as Bytes).toUint8Array() as Uint8Array<ArrayBuffer>)
      const blob = new Blob(parts, { type: meta.mime })
      await localDb.mediaCache.put({ id, blob })
      return blob
    })().catch(() => {
      memory.delete(id) // try again next time
      return undefined
    })
    memory.set(id, promise)
  }
  return promise
}

export function useMediaBlob(id?: string): Blob | undefined {
  const [loaded, setLoaded] = useState<{ id: string; blob?: Blob }>()
  useEffect(() => {
    if (!id) return
    let active = true
    loadMedia(id).then((blob) => {
      if (active) setLoaded({ id, blob })
    })
    return () => {
      active = false
    }
  }, [id])
  return id && loaded?.id === id ? loaded.blob : undefined
}
