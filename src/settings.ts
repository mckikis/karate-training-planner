import { useSyncExternalStore } from 'react'

/**
 * Settings of this phone (not part of the training data, so they live in localStorage, not in the database).
 */
export interface Settings {
  autoplayVideos: boolean // videos in lists play by themselves; when off they play only in the detail
  bigTrainingMedia: boolean // large pictures in the training plan
  othersExercises: boolean // also show exercises of other coaches
  othersTrainings: boolean // also show trainings of other coaches
  timerSets: number // own timer (Časomiera)
  timerWork: number // seconds of one set
  timerRest: number // seconds of rest between sets
  timerPrep: number // countdown before the start
  timerSwitchEvery: number // swap roles every N seconds of a set (0 = no swap)
  timerSwitchSeconds: number // time for the swap
  timerAtoshi: boolean // "Atoshi baraku": beep and a different blue 15 s before the end of a set
  timerDefaults: number // version of the timer defaults saved in this phone
}

const KEY = 'karate-training-planner-settings'
const DEFAULTS: Settings = {
  autoplayVideos: true,
  bigTrainingMedia: false,
  othersExercises: false,
  othersTrainings: false,
  timerSets: 4,
  timerWork: 90,
  timerRest: 30,
  timerPrep: 10,
  timerSwitchEvery: 45,
  timerSwitchSeconds: 5,
  timerAtoshi: false,
  timerDefaults: 3,
}

/** Raise when the timer defaults change: phones that saved older values get the new ones once. */
const TIMER_DEFAULTS_VERSION = 3

function load(): Settings {
  try {
    const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } as Settings
    if (saved.timerDefaults !== TIMER_DEFAULTS_VERSION) {
      return {
        ...saved,
        timerSets: DEFAULTS.timerSets,
        timerWork: DEFAULTS.timerWork,
        timerRest: DEFAULTS.timerRest,
        timerPrep: DEFAULTS.timerPrep,
        timerSwitchEvery: DEFAULTS.timerSwitchEvery,
        timerSwitchSeconds: DEFAULTS.timerSwitchSeconds,
        timerDefaults: TIMER_DEFAULTS_VERSION,
      }
    }
    return saved
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

export function updateSettings(change: Partial<Settings>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Private mode or blocked storage: the setting works until the app is closed.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => current)
}
