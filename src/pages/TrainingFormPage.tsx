import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  byFavoriteThenOrder,
  byOrder,
  exerciseMedia,
  sectionLabel,
  timingOf,
  toTimeMode,
  TRAINING_GROUPS,
  TRAINING_TAGS,
  type Category,
  type Exercise,
  type Section,
  type TrainingItem,
} from '../model'
import { addTrainingType, isMine, saveTraining, useData } from '../cloud'
import { clockAt, formatDuration, sectionItems, todayIso, trainingPlan, trainingSeconds } from '../time'
import { DurationField, Thumb, TopBar } from '../components'
import { SortableList } from '../sortable'
import { useSettings } from '../settings'
import { confirmDialog } from '../confirm'
import { TRAINING_TEMPLATE } from '../trainingTemplate'
import { TimingFields } from './TimingFields'

const DEFAULT_REST_AFTER = 60
const DEFAULT_START_TIME = '17:00'
const SHOW_FIRST = 7
const NEW_TYPE = '__new__'

function itemFromExercise(e: Exercise, section: Section, category?: Category): TrainingItem {
  const timeOnly = !!category?.timeOnly
  const timing = timingOf(e)
  return {
    exerciseId: e.id,
    name: e.name,
    restAfter: DEFAULT_REST_AFTER,
    timeOnly,
    section,
    ...(timeOnly ? toTimeMode(timing) : timing),
  }
}

export default function TrainingFormPage() {
  const params = useParams()
  const editingId = params.id
  const navigate = useNavigate()
  const data = useData()
  const categories = data.categories
  const editing = editingId ? data.trainings.find((t) => t.id === editingId) : undefined
  const [loaded, setLoaded] = useState(false)

  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso())
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [tag, setTag] = useState(TRAINING_TAGS[0])
  const [coach, setCoach] = useState('')
  const [group, setGroup] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [warmup, setWarmup] = useState<TrainingItem[]>([])
  const [main, setMain] = useState<TrainingItem[]>([])
  const [cooldown, setCooldown] = useState<TrainingItem[]>([])
  const [warmupSeconds, setWarmupSeconds] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [picking, setPicking] = useState<Section | null>(null)
  const [addingType, setAddingType] = useState(false)
  const [newType, setNewType] = useState('')
  const [error, setError] = useState('')

  /** Exercises the coach can use (not hidden; starter, admin's, own – or all with "iní tréneri"). */
  function usableExercise(exerciseName: string): Exercise | undefined {
    const matches = data.exercises.filter((e) => e.name.trim() === exerciseName.trim() && !e.hidden)
    return matches.find((e) => e.isDefault) ?? matches.find(isMine) ?? matches[0]
  }

  /** Fills the three parts from src/trainingTemplate.ts. */
  function generate() {
    const make = (names: string[], section: Section) =>
      names
        .map(usableExercise)
        .filter((e): e is Exercise => !!e)
        .map((e) => itemFromExercise(e, section, categories.find((c) => c.id === e.categoryId)))

    const target = TRAINING_TEMPLATE.mainMinutes * 60
    const mainItems: TrainingItem[] = []
    for (const item of make(TRAINING_TEMPLATE.main, 'main')) {
      if (trainingSeconds(mainItems) >= target) break
      mainItems.push(item)
    }
    setWarmup(make(TRAINING_TEMPLATE.warmup, 'warmup'))
    setMain(mainItems)
    setCooldown(make(TRAINING_TEMPLATE.cooldown, 'cooldown'))
    setWarmupSeconds(TRAINING_TEMPLATE.warmupMinutes * 60)
    setCooldownSeconds(TRAINING_TEMPLATE.cooldownMinutes * 60)
  }

  // Fill the form once: from the edited training, or a generated training with defaults from my last one.
  useEffect(() => {
    if (loaded || !data.ready) return
    if (editing) {
      const t = editing
      setName(t.name)
      setDate(t.date)
      setStartTime(t.startTime ?? '')
      setTag(t.tag)
      setCoach(t.coach ?? '')
      setGroup(t.group ?? '')
      setDescription(t.description)
      setIsPrivate(!!t.private)
      setWarmup(sectionItems(t.items, 'warmup'))
      setMain(sectionItems(t.items, 'main'))
      setCooldown(sectionItems(t.items, 'cooldown'))
      setWarmupSeconds(t.warmupSeconds ?? 0)
      setCooldownSeconds(t.cooldownSeconds ?? 0)
    } else if (!editingId) {
      const last = data.trainings.filter(isMine).sort((a, b) => b.createdAt - a.createdAt)[0]
      if (last?.startTime) setStartTime(last.startTime)
      if (last?.coach) setCoach(last.coach)
      generate()
    } else {
      return
    }
    setLoaded(true)
    // generate() reads data, which is in the dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, editing, editingId, loaded])

  const setters: Record<Section, (update: (list: TrainingItem[]) => TrainingItem[]) => void> = {
    warmup: setWarmup,
    main: setMain,
    cooldown: setCooldown,
  }
  const lists: Record<Section, TrainingItem[]> = { warmup, main, cooldown }

  function toggleExercise(section: Section, e: Exercise) {
    setters[section]((current) =>
      current.some((i) => i.exerciseId === e.id)
        ? current.filter((i) => i.exerciseId !== e.id)
        : [...current, itemFromExercise(e, section, categories.find((c) => c.id === e.categoryId))],
    )
  }

  function updateMainItem(index: number, item: TrainingItem) {
    setMain((current) => current.map((old, i) => (i === index ? item : old)))
  }

  async function regenerate() {
    if (warmup.length + main.length + cooldown.length > 0) {
      const ok = await confirmDialog('Nahradiť cviky vygenerovaným tréningom (20 min rozcvička, 60 min hlavná časť, 10 min záver)?', {
        confirmLabel: 'Vygenerovať',
      })
      if (!ok) return
    }
    generate()
  }

  function addType() {
    const typeName = newType.trim()
    if (!typeName) return
    setTag(addTrainingType(typeName))
    setNewType('')
    setAddingType(false)
  }

  function save() {
    if (!name.trim()) {
      setError('Zadaj názov tréningu.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const items = [
      ...warmup.map((item) => ({ ...item, section: 'warmup' as const })),
      ...main.map((item) => ({ ...item, section: 'main' as const })),
      ...cooldown.map((item) => ({ ...item, section: 'cooldown' as const })),
    ]
    const id = saveTraining(editingId, {
      name: name.trim(),
      date,
      startTime,
      tag,
      coach: coach.trim(),
      group,
      description: description.trim(),
      items,
      warmupSeconds,
      cooldownSeconds,
      private: isPrivate,
      updatedAt: Date.now(),
      done: editing?.done,
      doneAt: editing?.doneAt,
    })
    if (editingId) navigate(-1)
    else navigate(`/trainings/${id}`, { replace: true })
  }

  if (editing && !isMine(editing)) {
    return <TopBar title="Tento tréning môže upraviť len jeho autor" />
  }

  if (picking) {
    return (
      <ExercisePicker
        title={`Cviky: ${sectionLabel(picking)}`}
        selectedIds={lists[picking].map((i) => i.exerciseId)}
        onToggle={(e) => toggleExercise(picking, e)}
        onDone={() => setPicking(null)}
      />
    )
  }

  const plan = trainingPlan({ items: [...warmup, ...main, ...cooldown], warmupSeconds, cooldownSeconds })
  const at = (offset: number) => (startTime ? clockAt(startTime, offset) : formatDuration(offset))
  const typeNames = [...TRAINING_TAGS, ...data.trainingTypes.map((t) => t.name).filter((n) => !TRAINING_TAGS.includes(n))]
  // Show an old tag that is no longer in the list, so it is not lost when editing.
  const tags = typeNames.includes(tag) || !tag ? typeNames : [tag, ...typeNames]

  /** Warm-up and cool-down: a list of exercises and one total time. */
  function simplePart(section: 'warmup' | 'cooldown', seconds: number, setSeconds: (s: number) => void, start: number, end: number) {
    const list = lists[section]
    const setList = setters[section]
    return (
      <Part section={section} clock={`${at(start)} – ${at(end)}`} duration={end - start}>
        <div className="grid-2">
          <DurationField label={`Celkový čas: ${sectionLabel(section).toLowerCase()}`} value={seconds} onChange={setSeconds} />
        </div>
        <SortableList
          className="part-list"
          items={list}
          getId={(item) => item.exerciseId}
          onReorder={(next) => setList(() => next)}
          renderItem={(item, handle) => (
            <div className="row part-row">
              <span className="row-title">{item.name}</span>
              {handle}
              <button
                type="button"
                className="icon-button small"
                aria-label={`Odstrániť ${item.name}`}
                onClick={() => setList((current) => current.filter((i) => i.exerciseId !== item.exerciseId))}
              >
                ✕
              </button>
            </div>
          )}
        />
        <button type="button" className="button button-outline" onClick={() => setPicking(section)}>
          {list.length === 0 ? `+ Vybrať cviky: ${sectionLabel(section).toLowerCase()}` : '+ Pridať alebo odobrať cviky'}
        </button>
      </Part>
    )
  }

  return (
    <div className="page page-form page-with-bar">
      <TopBar title={editingId ? 'Upraviť tréning' : 'Nový tréning'} />

      <div className="form">
        <label className="field">
          <span className="field-label">Názov</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="napr. Prípravka – kopy a hry" />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Dátum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Začiatok</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Typ tréningu</span>
            <select
              value={tag}
              onChange={(e) => {
                if (e.target.value === NEW_TYPE) setAddingType(true)
                else setTag(e.target.value)
              }}
            >
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
              <option value={NEW_TYPE}>+ Nový typ…</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tréner</span>
            <input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Meno trénera" />
          </label>
        </div>

        {addingType && (
          <div className="inline-form">
            <input
              autoFocus
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addType()
                }
              }}
              placeholder="Názov nového typu"
              aria-label="Názov nového typu tréningu"
              maxLength={40}
            />
            <button type="button" className="button button-small" onClick={addType}>Pridať</button>
            <button type="button" className="button button-small button-ghost" onClick={() => setAddingType(false)}>
              Zrušiť
            </button>
          </div>
        )}

        <div className="field">
          <span className="field-label">Pre koho</span>
          <div className="segmented segmented-3" role="group" aria-label="Pre koho">
            {TRAINING_GROUPS.map((g) => (
              <button
                type="button"
                key={g}
                className={`segment ${group === g ? 'segment-on' : ''}`}
                aria-pressed={group === g}
                onClick={() => setGroup(group === g ? '' : g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Popis</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cieľ tréningu" />
        </label>

        <label className="check-line">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Súkromný – uvidíš ho len ty (inak ho uvidia aj ostatní tréneri)
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="section-head">
          <h2 className="section-title">Plán tréningu</h2>
          <button type="button" className="button button-small" onClick={regenerate}>
            ⚡ Vygenerovať tréning
          </button>
        </div>

        {simplePart('warmup', warmupSeconds, setWarmupSeconds, plan.warmup.start, plan.warmup.end)}

        <Part section="main" clock={`${at(plan.mainStart)} – ${at(plan.mainEnd)}`} duration={plan.mainEnd - plan.mainStart}>
          {main.length > 1 && <p className="hint">Poradie cvikov zmeníš potiahnutím za ⠿.</p>}
          <SortableList
            className="item-list"
            items={plan.main}
            getId={(row) => row.item.exerciseId}
            onReorder={(newRows) => setMain(newRows.map((row) => row.item))}
            renderItem={({ item, start, end }, handle, index) => (
              <article className="card item-card">
                <header className="item-head">
                  <span className="item-number">{index + 1}</span>
                  <span className="item-title">
                    <span className="item-name">{item.name}</span>
                    <span className="item-clock">
                      {at(start)} – {at(end)} · {formatDuration(end - start)} min
                    </span>
                  </span>
                  {handle}
                  <button
                    type="button"
                    className="icon-button small"
                    aria-label={`Odstrániť ${item.name}`}
                    onClick={() => setMain(main.filter((_, i) => i !== index))}
                  >
                    ✕
                  </button>
                </header>
                <TimingFields value={item} onChange={(next) => updateMainItem(index, next)} timeOnly={item.timeOnly} />
                {index < main.length - 1 && (
                  <div className="grid-3">
                    <DurationField
                      label="Prestávka pred ďalším"
                      value={item.restAfter}
                      onChange={(restAfter) => updateMainItem(index, { ...item, restAfter })}
                    />
                  </div>
                )}
              </article>
            )}
          />
          <button type="button" className="button button-outline" onClick={() => setPicking('main')}>
            {main.length === 0 ? '+ Vybrať cviky: hlavná časť' : '+ Pridať alebo odobrať cviky'}
          </button>
        </Part>

        {simplePart('cooldown', cooldownSeconds, setCooldownSeconds, plan.cooldown.start, plan.cooldown.end)}
      </div>

      <div className="bottom-bar">
        <div>
          <span className="total-label">
            Celkový čas{startTime && plan.total > 0 && ` · koniec ${clockAt(startTime, plan.total)}`}
          </span>
          <span className="total-value">{formatDuration(plan.total)}</span>
        </div>
        <button type="button" className="button button-primary" onClick={save}>Uložiť</button>
      </div>
    </div>
  )
}

/** One coloured part of the training (Rozcvička, Hlavná časť, Záver). */
function Part({ section, clock, duration, children }: { section: Section; clock: string; duration: number; children: ReactNode }) {
  return (
    <section className={`part part-${section}`}>
      <header className="part-head">
        <h3 className="part-title">{sectionLabel(section)}</h3>
        <span className="part-clock">
          {clock} · {formatDuration(duration)} min
        </span>
      </header>
      {children}
    </section>
  )
}

function ExercisePicker({
  title,
  selectedIds,
  onToggle,
  onDone,
}: {
  title: string
  selectedIds: string[]
  onToggle: (e: Exercise) => void
  onDone: () => void
}) {
  const data = useData()
  const categories = [...data.categories].sort(byOrder)
  const { autoplayVideos, othersExercises } = useSettings()
  // Same exercises as in the library (Cviky), plus the ones already in the training.
  const exercises = data.exercises.filter(
    (e) => othersExercises || e.isDefault || e.byAdmin || isMine(e) || selectedIds.includes(e.id),
  )
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [filter, setFilter] = useState<string | 'all'>('all')
  const query = search.trim().toLowerCase()
  const visible = exercises.filter(
    (e) =>
      !e.hidden &&
      (filter === 'all' || e.categoryId === filter) &&
      (!query || e.name.toLowerCase().includes(query)),
  )
  const withExercises = categories.filter((c) => exercises.some((e) => !e.hidden && e.categoryId === c.id))

  return (
    <div className="page page-form page-with-bar">
      <header className="topbar">
        <span />
        <h1 className="topbar-title">{title}</h1>
        <span />
      </header>

      <input
        className="search"
        type="search"
        placeholder="Hľadať cvik"
        aria-label="Hľadať cvik"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="chips" role="group" aria-label="Filtrovať podľa kategórie">
        <button type="button" className={`chip ${filter === 'all' ? 'chip-on' : ''}`} onClick={() => setFilter('all')}>
          Všetky
        </button>
        {withExercises.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`chip ${filter === c.id ? 'chip-on' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {categories.map((c) => {
        const inCategory = visible.filter((e) => e.categoryId === c.id).sort(byFavoriteThenOrder)
        if (inCategory.length === 0) return null
        const open = !!query || filter !== 'all' || expanded.includes(c.id)
        // Selected exercises stay visible even if they are after the first 7.
        const shown = open
          ? inCategory
          : inCategory.filter((e, i) => i < SHOW_FIRST || selectedIds.includes(e.id))
        return (
          <section key={c.id} className="group">
            <h2 className="group-title">{c.name}</h2>
            <ul className="list">
              {shown.map((e) => {
                const order = selectedIds.indexOf(e.id)
                const checked = order !== -1
                return (
                  <li key={e.id}>
                    <label className={`row check-row ${checked ? 'check-row-on' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => onToggle(e)} />
                      <span className="check-box" aria-hidden="true">{checked ? order + 1 : ''}</span>
                      <Thumb {...exerciseMedia(e)} label={e.name} play={autoplayVideos} />
                      <span className="row-title">{e.name}</span>
                      {e.favorite && <span className="star-mark" aria-label="Obľúbený">★</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
            {!query && filter === 'all' && inCategory.length > SHOW_FIRST && (open || inCategory.length > shown.length) && (
              <button
                type="button"
                className="more-button"
                onClick={() =>
                  setExpanded((list) => (list.includes(c.id) ? list.filter((x) => x !== c.id) : [...list, c.id]))
                }
              >
                {open ? 'Zobraziť menej' : `Zobraziť viac (${inCategory.length - shown.length})`}
              </button>
            )}
          </section>
        )
      })}

      <div className="bottom-bar">
        <span className="total-label">Vybrané: {selectedIds.length}</span>
        <button type="button" className="button button-primary" onClick={onDone}>Hotovo</button>
      </div>
    </div>
  )
}
