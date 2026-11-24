import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { isMine, useData } from '../cloud'
import { DurationField, NumberField, PageHeader, SettingsLink } from '../components'
import { confirmDialog } from '../confirm'
import { atoshiBeep, finishBeep, longBeep, shortBeep, unlockAudio } from '../beep'
import { updateSettings, useSettings } from '../settings'
import {
  customTimerPhases,
  formatDate,
  formatDuration,
  timerTotalSeconds,
  trainingTimerPhases,
  type TimerPhase,
} from '../time'

type Mode = 'custom' | 'training'

/** "Atoshi baraku": the last 15 seconds of a work part. */
const ATOSHI_SECONDS = 15

/**
 * Atoshi baraku is on for this work part (own timer: the checkbox; training: the exercise) and the part
 * is longer than 15 s. With a swap during the set it is in every part – before and after the swap.
 */
function atoshiPart(phases: TimerPhase[], index: number): boolean {
  const phase = phases[index]
  return phase?.kind === 'work' && !!phase.atoshi && phase.seconds > ATOSHI_SECONDS
}

/** The running timer. Times are counted from Date.now(), so a slow phone or a locked screen does not shift them. */
interface Engine {
  phases: TimerPhase[]
  index: number
  endsAt: number | null // when the current part ends; null = paused
  leftMs: number // time left when paused
  finished: boolean
  beeped: string // last "part:second" that beeped, so each second beeps once
}

type WakeLockLike = { release: () => Promise<void> }

export default function TimerPage() {
  const data = useData()
  const settings = useSettings()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('training') ? 'training' : 'custom')
  const [trainingId, setTrainingId] = useState(params.get('training') ?? '')
  const [running, setRunning] = useState(false)
  const engine = useRef<Engine | null>(null)
  const [, setTick] = useState(0)
  const [editing, setEditing] = useState(false)
  const wakeLock = useRef<WakeLockLike | null>(null)

  const trainings = data.trainings
    .filter((t) => !t.hidden && (isMine(t) || settings.othersTrainings))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.startTime ?? '').localeCompare(a.startTime ?? ''))
  const training = data.trainings.find((t) => t.id === trainingId) ?? trainings[0]

  const custom = {
    sets: settings.timerSets,
    workSeconds: settings.timerWork,
    restSeconds: settings.timerRest,
    prepSeconds: settings.timerPrep,
    switchEvery: settings.timerSwitchEvery,
    switchSeconds: settings.timerSwitchSeconds,
    atoshi: settings.timerAtoshi,
  }
  const phases =
    mode === 'custom'
      ? customTimerPhases(custom)
      : training
        ? trainingTimerPhases(training, settings.timerPrep)
        : []

  const rerender = () => setTick((n) => n + 1)

  async function keepScreenOn(on: boolean) {
    try {
      if (on && !wakeLock.current) {
        const nav = navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }
        wakeLock.current = (await nav.wakeLock?.request('screen')) ?? null
      } else if (!on && wakeLock.current) {
        await wakeLock.current.release()
        wakeLock.current = null
      }
    } catch {
      // not supported – the screen may turn off
    }
  }

  function start(list: TimerPhase[]) {
    if (list.length === 0) return
    unlockAudio()
    engine.current = {
      phases: list,
      index: 0,
      endsAt: Date.now() + list[0].seconds * 1000,
      leftMs: 0,
      finished: false,
      beeped: '',
    }
    setRunning(true)
    keepScreenOn(true)
    rerender()
  }

  // The clock: checks the time 10× a second.
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      const e = engine.current
      if (!e || e.finished || e.endsAt === null) return
      const now = Date.now()
      // A part has ended – go on to the next one (more than one when the phone was asleep).
      while (e.endsAt !== null && now >= e.endsAt) {
        if (e.index >= e.phases.length - 1) {
          e.finished = true
          e.endsAt = null
          e.leftMs = 0
          finishBeep()
          keepScreenOn(false)
          break
        }
        e.index++
        e.endsAt += e.phases[e.index].seconds * 1000
        longBeep()
      }
      if (e.endsAt !== null) {
        const secondsLeft = Math.ceil((e.endsAt - now) / 1000)
        const key = `${e.index}:${secondsLeft}`
        // 3, 2, 1 before the end of a part – not during a swap, which has only the long beeps.
        if (secondsLeft <= 3 && secondsLeft >= 1 && e.beeped !== key && e.phases[e.index].kind !== 'switch') {
          e.beeped = key
          shortBeep()
        }
        // Atoshi baraku: 15 seconds before the end of the work part.
        const atoshiKey = `${e.index}:atoshi`
        if (atoshiPart(e.phases, e.index) && secondsLeft <= ATOSHI_SECONDS && e.beeped !== atoshiKey && secondsLeft > 3) {
          e.beeped = atoshiKey
          atoshiBeep()
        }
      }
      rerender()
    }, 100)
    return () => window.clearInterval(timer)
  }, [running])

  // Release the screen when leaving the page.
  useEffect(() => () => void keepScreenOn(false), [])

  function leftMs(e: Engine) {
    return e.endsAt === null ? e.leftMs : Math.max(0, e.endsAt - Date.now())
  }

  function pause() {
    const e = engine.current
    if (!e || e.endsAt === null) return
    e.leftMs = leftMs(e)
    e.endsAt = null
    keepScreenOn(false)
    rerender()
  }

  function resume() {
    const e = engine.current
    if (!e || e.endsAt !== null || e.finished) return
    unlockAudio()
    e.endsAt = Date.now() + e.leftMs
    keepScreenOn(true)
    rerender()
  }

  function goTo(index: number) {
    const e = engine.current
    if (!e) return
    const target = Math.max(0, Math.min(e.phases.length - 1, index))
    const paused = e.endsAt === null
    e.index = target
    e.finished = false
    e.beeped = ''
    const ms = e.phases[target].seconds * 1000
    if (paused) e.leftMs = ms
    else e.endsAt = Date.now() + ms
    rerender()
  }

  function addSeconds(seconds: number) {
    const e = engine.current
    if (!e || e.finished) return
    if (e.endsAt === null) e.leftMs = Math.max(1000, e.leftMs + seconds * 1000)
    else e.endsAt = Math.max(Date.now() + 1000, e.endsAt + seconds * 1000)
    rerender()
  }

  async function cancel() {
    const e = engine.current
    if (e && !e.finished) {
      const wasRunning = e.endsAt !== null
      pause()
      const ok = await confirmDialog('Ukončiť časomieru?', {
        confirmLabel: 'Ukončiť',
        cancelLabel: 'Pokračovať',
        danger: true,
      })
      if (!ok) {
        if (wasRunning) resume()
        return
      }
    }
    engine.current = null
    setRunning(false)
    setEditing(false)
    keepScreenOn(false)
  }

  /** Custom timer changed while running: continue from the current set with the new values. */
  function applyEdit() {
    const e = engine.current
    if (!e) return
    const currentSet = e.phases[e.index]?.set ?? 1
    const rest = customTimerPhases({ ...custom, prepSeconds: 0 }).filter((p) => p.set >= Math.min(currentSet, custom.sets))
    e.phases = rest
    e.index = 0
    e.finished = false
    e.endsAt = null
    e.leftMs = rest[0].seconds * 1000
    setEditing(false)
    resume()
  }

  // ---------- Running ----------
  const e = engine.current
  if (running && e) {
    const phase = e.phases[e.index]
    const left = e.finished ? 0 : leftMs(e)
    const paused = e.endsAt === null && !e.finished
    const showSet = phase.kind !== 'prep' && phase.exercise !== 'Prestávka'
    const inAtoshi = !e.finished && atoshiPart(e.phases, e.index) && Math.ceil(left / 1000) <= ATOSHI_SECONDS
    const LABELS = { work: 'Cvič', switch: 'Výmena', prep: 'Príprava', rest: 'Pauza' }
    const label = e.finished ? 'Koniec' : inAtoshi ? 'Atoshi baraku' : LABELS[phase.kind]
    // Colour of the screen: blue = time runs, another blue = atoshi baraku, grey = rest,
    // orange = swap, dark grey = paused.
    const look = e.finished ? 'done' : paused ? 'paused' : inAtoshi ? 'atoshi' : phase.kind

    return (
      <div className={`timer-run timer-${look}`} role="timer" aria-live="off">
        <div className="timer-top">
          <div className="timer-icons">
            <button type="button" className="timer-icon" onClick={cancel} aria-label={e.finished ? 'Zavrieť časomieru' : 'Ukončiť časomieru'} title="Ukončiť">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {mode === 'custom' && !e.finished && (
              <button
                type="button"
                className="timer-icon"
                aria-label="Upraviť časomieru"
                title="Upraviť"
                onClick={() => {
                  pause()
                  setEditing(true)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                </svg>
              </button>
            )}
          </div>
          {showSet && (
            <span className="timer-set">
              Séria {phase.set} / {phase.sets}
            </span>
          )}
        </div>

        <div className="timer-center">
          <span className="timer-label">{paused ? 'Pozastavené' : label}</span>
          <span className="timer-time">{formatDuration(Math.ceil(left / 1000))}</span>
        </div>

        <div className="timer-controls">
            <button type="button" className="timer-button" onClick={() => goTo(e.index - 1)} aria-label="Predošlá časť">⏮</button>
            <button type="button" className="timer-button" onClick={() => addSeconds(-10)} aria-label="Ubrať 10 sekúnd">−10</button>
            {e.finished ? (
              <button type="button" className="timer-button timer-main" onClick={() => start(e.phases)} aria-label="Znova od začiatku">↻</button>
            ) : paused ? (
              <button type="button" className="timer-button timer-main" onClick={resume} aria-label="Pokračovať">▶</button>
            ) : (
              <button type="button" className="timer-button timer-main" onClick={pause} aria-label="Pozastaviť">⏸</button>
            )}
            <button type="button" className="timer-button" onClick={() => addSeconds(10)} aria-label="Pridať 10 sekúnd">+10</button>
            <button type="button" className="timer-button" onClick={() => goTo(e.index + 1)} aria-label="Ďalšia časť">⏭</button>
        </div>

        {/* Training: current exercise on the left, next one on the right, in a darker strip */}
        {mode === 'training' && (
          <div className="timer-strip">
            <span className="timer-now">{e.finished ? 'Tréning je hotový' : phase.exercise}</span>
            {phase.next && !e.finished && <span className="timer-next">Ďalej: {phase.next}</span>}
          </div>
        )}

        {editing && (
          <div className="dialog-backdrop">
            <div className="dialog timer-edit">
              <p className="dialog-text">Upraviť</p>
              <CustomFields />
              <div className="dialog-buttons">
                <button type="button" className="button button-ghost" onClick={() => setEditing(false)}>Späť</button>
                <button type="button" className="button button-primary" onClick={applyEdit}>Pokračovať</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- Setup ----------
  const total = timerTotalSeconds(phases)

  return (
    <div className="page">
      <PageHeader title="Časomiera" right={<SettingsLink />} />

      <div className="segmented" role="group" aria-label="Druh časomiery">
        <button type="button" className={`segment ${mode === 'custom' ? 'segment-on' : ''}`} aria-pressed={mode === 'custom'} onClick={() => setMode('custom')}>
          Vlastná
        </button>
        <button type="button" className={`segment ${mode === 'training' ? 'segment-on' : ''}`} aria-pressed={mode === 'training'} onClick={() => setMode('training')}>
          Podľa tréningu
        </button>
      </div>

      <section className="card form">
        {mode === 'custom' ? (
          <CustomFields />
        ) : trainings.length === 0 ? (
          <p className="hint">Zatiaľ nemáš žiadny tréning.</p>
        ) : (
          <>
            <label className="field">
              <span className="field-label">Tréning</span>
              <select value={training?.id ?? ''} onChange={(ev) => setTrainingId(ev.target.value)}>
                {trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {formatDate(t.date)}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              Časomiera ide podľa cvikov tréningu.
            </p>
            <div className="grid-2">
              <DurationField label="Odpočet pred začiatkom" value={settings.timerPrep} onChange={(timerPrep) => updateSettings({ timerPrep })} step={5} />
            </div>
          </>
        )}
      </section>

      <p className="total-small">
        Spolu <strong>{formatDuration(total)}</strong> minút.
      </p>

      <button type="button" className="button button-primary button-wide timer-start" disabled={phases.length === 0} onClick={() => start(phases)}>
        ▶ Spustiť
      </button>
      <p className="hint timer-hint">
        Pre zvuky z časomiery vypni na mobile tichý režim.
      </p>
    </div>
  )
}

/** Sets, time of one set, rest, swap and countdown of the own timer (saved in the phone). */
function CustomFields() {
  const settings = useSettings()
  const swap = settings.timerSwitchEvery > 0
  return (
    <>
      <div className="grid-2">
        <NumberField label="Počet sérií" value={settings.timerSets} onChange={(timerSets) => updateSettings({ timerSets: Math.max(1, timerSets) })} step={1} min={1} />
        <DurationField label="Čas série" value={settings.timerWork} onChange={(timerWork) => updateSettings({ timerWork: Math.max(1, timerWork) })} min={1} />
        <DurationField label="Pauza medzi sériami" value={settings.timerRest} onChange={(timerRest) => updateSettings({ timerRest })} />
        <DurationField label="Odpočet pred začiatkom" value={settings.timerPrep} onChange={(timerPrep) => updateSettings({ timerPrep })} step={5} />
      </div>
      <label className="check-line">
        <input
          type="checkbox"
          checked={swap}
          onChange={(ev) =>
            updateSettings({ timerSwitchEvery: ev.target.checked ? Math.max(1, Math.round(settings.timerWork / 2)) : 0 })
          }
        />
        Výmena počas série (dvojice si menia úlohy)
      </label>
      {swap && (
        <div className="grid-2">
          <DurationField
            label="Výmena po"
            value={settings.timerSwitchEvery}
            onChange={(timerSwitchEvery) => updateSettings({ timerSwitchEvery: Math.max(1, timerSwitchEvery) })}
            min={1}
          />
          <DurationField
            label="Čas na výmenu"
            value={settings.timerSwitchSeconds}
            onChange={(timerSwitchSeconds) => updateSettings({ timerSwitchSeconds })}
            step={1}
          />
        </div>
      )}
      <AtoshiField />
    </>
  )
}

/** "Atoshi baraku" – beep and a slightly different blue 15 s before the end of each work part. */
function AtoshiField() {
  const settings = useSettings()
  return (
    <label className="check-line">
      <input type="checkbox" checked={settings.timerAtoshi} onChange={(ev) => updateSettings({ timerAtoshi: ev.target.checked })} />
      Atoshi baraku
    </label>
  )
}
