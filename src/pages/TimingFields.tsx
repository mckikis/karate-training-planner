import type { Mode, Timing } from '../model'
import { DurationField, NumberField } from '../components'

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
        <NumberField label="Série" value={value.sets} onChange={(sets) => set({ sets })} />
        {value.mode === 'reps' && !timeOnly ? (
          <>
            <NumberField label="Opakovania" value={value.reps} onChange={(reps) => set({ reps })} />
            <NumberField
              label="Sekúnd / opak."
              value={value.secondsPerRep}
              onChange={(secondsPerRep) => set({ secondsPerRep })}
              decimal
              suffix="s"
            />
          </>
        ) : (
          <DurationField
            label="Jedna séria"
            value={value.workSeconds}
            onChange={(workSeconds) => set({ workSeconds })}
          />
        )}
        <NumberField
          label="Oddych medzi sériami"
          value={value.restBetweenSets}
          onChange={(restBetweenSets) => set({ restBetweenSets })}
          suffix="s"
        />
      </div>
    </div>
  )
}
