import { itemTitle, type Section, type Timing, type TrainingItem } from './model'

/** Seconds of work in one set. */
export function workPerSet(t: Timing): number {
  return t.mode === 'time' ? t.workSeconds : t.reps * t.secondsPerRep
}

/** How many times the partners swap roles in one set ("Výmena" every switchEvery seconds of work). */
export function switchCount(t: Timing): number {
  if (!t.switchEvery || t.switchEvery <= 0) return 0
  return Math.max(0, Math.ceil(workPerSet(t) / t.switchEvery - 1e-9) - 1)
}

/** One set including the swaps: 90 s with a swap after 45 s and 5 s for it → 95 s. */
export function setSeconds(t: Timing): number {
  return workPerSet(t) + switchCount(t) * (t.switchSeconds ?? 0)
}

/** Parts of one set for the timer: work, swap, work, … (work split every switchEvery seconds). */
export function setParts(t: Timing): { kind: 'work' | 'switch'; seconds: number }[] {
  const work = Math.max(1, Math.round(workPerSet(t)))
  const swaps = switchCount(t)
  if (swaps === 0) return [{ kind: 'work', seconds: work }]
  const parts: { kind: 'work' | 'switch'; seconds: number }[] = []
  let left = work
  for (let i = 0; i <= swaps; i++) {
    const chunk = Math.min(left, Math.round(t.switchEvery!))
    parts.push({ kind: 'work', seconds: chunk })
    left -= chunk
    if (i < swaps && (t.switchSeconds ?? 0) > 0) parts.push({ kind: 'switch', seconds: Math.round(t.switchSeconds!) })
  }
  return parts
}

/**
 * Time of one exercise in a training:
 * sets × (work + swaps) + rests between sets + rest before the next exercise (not after the last one).
 */
export function itemSeconds(item: TrainingItem, isLast: boolean): number {
  const work = item.sets * setSeconds(item)
  const rests = Math.max(0, item.sets - 1) * item.restBetweenSets
  const after = isLast ? 0 : item.restAfter
  return Math.round(work + rests + after)
}

export function trainingSeconds(items: TrainingItem[]): number {
  return items.reduce((sum, item, i) => sum + itemSeconds(item, i === items.length - 1), 0)
}

export interface ScheduleRow {
  item: TrainingItem
  start: number // seconds from the start of the training
  end: number // when the exercise itself ends (without the break after it)
  breakAfter: number // break before the next exercise (0 after the last one)
}

/** When each exercise starts and ends, counted from the start of the training. */
export function schedule(items: TrainingItem[]): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  let start = 0
  items.forEach((item, i) => {
    const isLast = i === items.length - 1
    const end = start + itemSeconds(item, true)
    const breakAfter = isLast ? 0 : item.restAfter
    rows.push({ item, start, end, breakAfter })
    start = end + breakAfter
  })
  return rows
}

/** Exercises of one part of the training (items without a part belong to the main part). */
export function sectionItems(items: TrainingItem[], section: Section): TrainingItem[] {
  return items.filter((item) => (item.section ?? 'main') === section)
}

export interface PlanPart {
  start: number
  end: number
  items: TrainingItem[]
}

export interface TrainingPlan {
  warmup: PlanPart // one block with a total time (no sets or reps)
  main: ScheduleRow[] // each exercise with its own times, counted from the start of the training
  mainStart: number
  mainEnd: number
  cooldown: PlanPart
  total: number
}

/**
 * Times of the whole training: warm-up (its total time), then the main part exercise by exercise
 * (the break after the last main exercise is not counted), then the cool-down (its total time).
 */
export function trainingPlan(t: { items: TrainingItem[]; warmupSeconds?: number; cooldownSeconds?: number }): TrainingPlan {
  const warmupEnd = Math.max(0, Math.round(t.warmupSeconds ?? 0))
  const mainItems = sectionItems(t.items, 'main')
  const main = schedule(mainItems).map((row) => ({ ...row, start: row.start + warmupEnd, end: row.end + warmupEnd }))
  const mainEnd = warmupEnd + trainingSeconds(mainItems)
  const cooldownEnd = mainEnd + Math.max(0, Math.round(t.cooldownSeconds ?? 0))
  return {
    warmup: { start: 0, end: warmupEnd, items: sectionItems(t.items, 'warmup') },
    main,
    mainStart: warmupEnd,
    mainEnd,
    cooldown: { start: mainEnd, end: cooldownEnd, items: sectionItems(t.items, 'cooldown') },
    total: cooldownEnd,
  }
}

/** "17:00" + 1020 seconds → "17:17". Seconds are shown only when they are not 0. */
export function clockAt(startTime: string, offsetSeconds: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const total = (((h * 3600 + m * 60 + Math.round(offsetSeconds)) % 86400) + 86400) % 86400
  const hh = String(Math.floor(total / 3600)).padStart(2, '0')
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = total % 60
  return ss === 0 ? `${hh}:${mm}` : `${hh}:${mm}:${String(ss).padStart(2, '0')}`
}

/** Reads "15:00", "2:30" or "90" (seconds). Returns undefined if it is not a valid time. */
export function parseDuration(text: string): number | undefined {
  const value = text.trim().replace(',', '.')
  if (value === '') return undefined
  if (value.includes(':')) {
    const [min, sec = '0'] = value.split(':')
    const m = Number(min)
    const s = Number(sec)
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0) return undefined
    return Math.round(m * 60 + s)
  }
  const seconds = Number(value)
  return Number.isNaN(seconds) || seconds < 0 ? undefined : Math.round(seconds)
}

/** 95 → "1:35", 3725 → "1:02:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** "3 × 10 opak." alebo "2 × 30 s" (+ " · výmena po 45 s") */
export function timingSummary(t: Timing): string {
  const base =
    t.mode === 'reps'
      ? `${t.sets} × ${t.reps} opak.`
      : t.workSeconds >= 60
        ? `${t.sets} × ${formatDuration(t.workSeconds)} min`
        : `${t.sets} × ${t.workSeconds} s`
  const swap = switchCount(t) > 0 ? ` · výmena po ${t.switchEvery} s` : ''
  return `${base}${swap}${t.atoshi ? ' · atoshi' : ''}`
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('sk-SK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function todayIso(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** 1 cvik, 2 cviky, 5 cvikov */
export function exerciseCount(n: number): string {
  return `${n} ${n === 1 ? 'cvik' : n >= 2 && n <= 4 ? 'cviky' : 'cvikov'}`
}

/** "1 variant", "3 varianty", "5 variantov" */
export function variantCount(n: number): string {
  return `${n} ${n === 1 ? 'variant' : n >= 2 && n <= 4 ? 'varianty' : 'variantov'}`
}

// ---------- Timer (Časomiera) ----------

/** One step of the timer: work (blue), rest or the countdown before the start (grey). */
export interface TimerPhase {
  kind: 'prep' | 'work' | 'switch' | 'rest'
  seconds: number
  exercise: string // shown small in the top left corner
  set: number // "Séria 2 / 5" in the top right corner
  sets: number
  next: string // next exercise, shown in the bottom right corner
  atoshi?: boolean // "Atoshi baraku" 15 s before the end of this work part
}

/** Fills in "next" – the next exercise (after the countdown the first one; '' at the end). */
function withNext(phases: Omit<TimerPhase, 'next'>[]): TimerPhase[] {
  return phases.map((phase, i) => {
    const following = phases
      .slice(i + 1)
      .find((p) => p.kind === 'work' && (phase.kind === 'prep' || p.exercise !== phase.exercise))
    return { ...phase, next: following?.exercise ?? '' }
  })
}

/** Own timer: countdown, then sets × work with a rest between the sets. */
export function customTimerPhases(
  t: {
    sets: number
    workSeconds: number
    restSeconds: number
    prepSeconds: number
    switchEvery?: number
    switchSeconds?: number
    atoshi?: boolean
  },
  name = 'Časomiera',
): TimerPhase[] {
  const sets = Math.max(1, Math.round(t.sets))
  const phases: Omit<TimerPhase, 'next'>[] = []
  const parts = setParts({
    mode: 'time',
    sets,
    reps: 0,
    secondsPerRep: 0,
    workSeconds: t.workSeconds,
    restBetweenSets: t.restSeconds,
    switchEvery: t.switchEvery,
    switchSeconds: t.switchSeconds,
  })
  if (t.prepSeconds > 0) phases.push({ kind: 'prep', seconds: Math.round(t.prepSeconds), exercise: name, set: 1, sets })
  for (let set = 1; set <= sets; set++) {
    parts.forEach((part) => phases.push({ ...part, exercise: name, set, sets, atoshi: part.kind === 'work' && !!t.atoshi }))
    if (set < sets && t.restSeconds > 0) phases.push({ kind: 'rest', seconds: Math.round(t.restSeconds), exercise: name, set, sets })
  }
  return withNext(phases)
}

/**
 * Timer of a whole training: countdown, warm-up (one block), every exercise of the main part
 * set by set with the rests between sets and the breaks after it, cool-down (one block).
 */
export function trainingTimerPhases(
  t: { items: TrainingItem[]; warmupSeconds?: number; cooldownSeconds?: number },
  prepSeconds: number,
): TimerPhase[] {
  const plan = trainingPlan(t)
  const phases: Omit<TimerPhase, 'next'>[] = []
  const blockName = (label: string, items: TrainingItem[]) => (items.length ? `${label}: ${items.map((i) => i.name).join(', ')}` : label)
  const warmup = blockName('Rozcvička', plan.warmup.items)

  if (prepSeconds > 0) phases.push({ kind: 'prep', seconds: Math.round(prepSeconds), exercise: 'Príprava', set: 1, sets: 1 })
  if (plan.warmup.end > 0) phases.push({ kind: 'work', seconds: plan.warmup.end, exercise: warmup, set: 1, sets: 1 })
  plan.main.forEach(({ item, breakAfter }) => {
    const sets = Math.max(1, item.sets)
    for (let set = 1; set <= sets; set++) {
      setParts(item).forEach((part) =>
        phases.push({ ...part, exercise: itemTitle(item), set, sets, atoshi: part.kind === 'work' && !!item.atoshi }),
      )
      if (set < sets && item.restBetweenSets > 0) {
        phases.push({ kind: 'rest', seconds: Math.round(item.restBetweenSets), exercise: itemTitle(item), set, sets })
      }
    }
    if (breakAfter > 0) phases.push({ kind: 'rest', seconds: Math.round(breakAfter), exercise: 'Prestávka', set: sets, sets })
  })
  const cooldownSeconds = plan.cooldown.end - plan.cooldown.start
  if (cooldownSeconds > 0) {
    phases.push({ kind: 'work', seconds: cooldownSeconds, exercise: blockName('Záver', plan.cooldown.items), set: 1, sets: 1 })
  }
  return withNext(phases)
}

/** Number of sets (a set split by swaps counts once). */
export function timerSetCount(phases: TimerPhase[]): number {
  return phases.filter((p, i) => p.kind === 'work' && phases[i - 1]?.kind !== 'switch').length
}

export function timerTotalSeconds(phases: TimerPhase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0)
}
