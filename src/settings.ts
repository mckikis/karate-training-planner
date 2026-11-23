import { useSyncExternalStore } from 'react'

/**
 * Settings of this phone (not part of the training data, so they live in localStorage, not in the database).
 */
export interface Settings {
  autoplayVideos: boolean // videos in lists play by themselves; when off they play only in the detail
  bigTrainingMedia: boolean // large pictures in the training plan
  othersExercises: boolean // also show exercises of other coaches
  othersTrainings: boolean // also show trainings of other coaches
}

const KEY = 'karate-training-planner-settings'
const DEFAULTS: Settings = { autoplayVideos: true, bigTrainingMedia: false, othersExercises: false, othersTrainings: false }

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
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
