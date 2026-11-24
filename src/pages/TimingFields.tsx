import type { Mode, Timing } from '../model'
import { DurationField, NumberField } from '../components'
import { workPerSet } from '../time'

/**
 * Sets, reps or time, and rest – shared by the exercise form and the training form.
 * timeOnly: the exercise is measured only by time (warm-up, stretching, games) – no "Opakovania" switch.
 */
export function TimingFields<T extends Timing>({
  value,
  onChange,
  timeOnly = false,
}: {
  value: T
  onChange: (value: T) => void
  timeOnly?: boolean
}) {
  const set = (patch: Partial<Timing>) => onChange({ ...value, ...patch })

  return (
    <div className="timing">
      {!timeOnly && (
        <div className="segmented" role="group" aria-label="Merať podľa">
          {(['reps', 'time'] as Mode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={value.mode === mode ? 'segment segment-on' : 'segment'}
              aria-pressed={value.mode === mode}
              onClick={() => set({ mode })}
            >
              {mode === 'reps' ? 'Opakovania' : 'Čas'}
            </button>
          ))}
        </div>
      )}

      <div className="grid-3">
        <NumberField label="Série" value={value.sets} onChange={(sets) => set({ sets: Math.max(1, sets) })} step={1} min={1} />
        {value.mode === 'reps' && !timeOnly ? (
          <>
            <NumberField label="Opakovania" value={value.reps} onChange={(reps) => set({ reps })} step={1} />
            <NumberField
              label="Sekúnd / opak."
              value={value.secondsPerRep}
              onChange={(secondsPerRep) => set({ secondsPerRep })}
              decimal
              suffix="s"
              step={0.5}
            />
          </>
        ) : (
          <DurationField
            label="Jedna séria"
            value={value.workSeconds}
            onChange={(workSeconds) => set({ workSeconds: Math.max(1, workSeconds) })}
            min={1}
          />
        )}
        <DurationField
          label="Oddych medzi sériami"
          value={value.restBetweenSets}
          onChange={(restBetweenSets) => set({ restBetweenSets })}
        />
      </div>

      {/* Partners swap roles during a set, e.g. every 45 s, with 5 s for the swap. */}
      <label className="check-line">
        <input
          type="checkbox"
          checked={(value.switchEvery ?? 0) > 0}
          onChange={(e) =>
            set(
              e.target.checked
                ? { switchEvery: Math.max(1, Math.round(workPerSet(value) / 2)) || 30, switchSeconds: value.switchSeconds || 5 }
                : { switchEvery: 0 },
            )
          }
        />
        Výmena počas série (dvojice si menia úlohy)
      </label>
      {(value.switchEvery ?? 0) > 0 && (
        <div className="grid-3">
          <DurationField label="Výmena po" value={value.switchEvery ?? 0} onChange={(switchEvery) => set({ switchEvery: Math.max(1, switchEvery) })} min={1} />
          <NumberField
            label="Čas na výmenu"
            value={value.switchSeconds ?? 5}
            onChange={(switchSeconds) => set({ switchSeconds })}
            suffix="s"
            step={1}
          />
        </div>
      )}
      <label className="check-line">
        <input type="checkbox" checked={!!value.atoshi} onChange={(e) => set({ atoshi: e.target.checked })} />
        Atoshi baraku
      </label>
    </div>
  )
}
