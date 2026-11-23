import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { byFavoriteThenOrder, byOrder, exerciseMedia, type Exercise } from '../model'
import { addCategory as addCloudCategory, isMine, saveOrder, setFavorite, useData } from '../cloud'
import { timingSummary } from '../time'
import { EmptyState, Footer, PageHeader, SettingsLink, StarButton, Thumb } from '../components'
import { updateSettings, useSettings } from '../settings'
import { SortableList } from '../sortable'

/** How many exercises of each category are shown before "Zobraziť viac". */
const SHOW_FIRST = 7

export default function ExercisesPage() {
  const data = useData()
  const categories = [...data.categories].sort(byOrder)
  const { autoplayVideos, othersExercises } = useSettings()
  // By default a coach sees the starter exercises, the admin's exercises and their own ones.
  const exercises = data.exercises.filter((e) => othersExercises || e.isDefault || e.byAdmin || isMine(e))

  const [filter, setFilter] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryPrivate, setNewCategoryPrivate] = useState(false)
  // Category whose exercises are being reordered (the ⇅ icon above its first exercise).
  const [sortingId, setSortingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(false)

  if (!data.ready) return null
  const sorting = sortingId !== null

  const query = sorting ? '' : search.trim().toLowerCase()
  const active = exercises.filter((e) => !e.hidden)
  const hidden = exercises.filter((e) => e.hidden)
  const visible = active.filter(
    (e) => (filter === 'all' || e.categoryId === filter) && (!query || e.name.toLowerCase().includes(query)),
  )
  const shownCategories = categories.filter((c) => visible.some((e) => e.categoryId === c.id))

  function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    const id = addCloudCategory(name, newCategoryPrivate)
    setNewCategory('')
    setNewCategoryPrivate(false)
    setAddingCategory(false)
    setFilter(id)
  }

  function toggleExpanded(id: string) {
    setExpanded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }

  return (
    <div className="page">
      <PageHeader
        title="Cviky"
        right={
          <>
            <Link to="/categories" className="icon-button" aria-label="Poradie kategórií" title="Poradie kategórií">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h10M4 12h10M4 18h10M18 4v16M15.5 6.5 18 4l2.5 2.5M15.5 17.5 18 20l2.5-2.5" />
              </svg>
            </Link>
            <SettingsLink />
          </>
        }
      />

      {sorting ? (
        <p className="hint">Cvik posunieš potiahnutím za ⠿ vpravo. Keď skončíš, klikni na Hotovo. Obľúbené cviky sú mimo tohto režimu vždy hore.</p>
      ) : (
        <input
          className="search"
          type="search"
          placeholder="Hľadať cvik"
          aria-label="Hľadať cvik"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <label className="others-toggle">
        <input
          type="checkbox"
          className="toggle"
          checked={othersExercises}
          onChange={(e) => updateSettings({ othersExercises: e.target.checked })}
        />
        Zobraziť aj cviky iných trénerov
      </label>

      <div className="chips" role="group" aria-label="Kategórie">
        <button type="button" className={`chip ${filter === 'all' ? 'chip-on' : ''}`} onClick={() => setFilter('all')}>
          Všetky
        </button>
        {categories.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`chip ${filter === c.id ? 'chip-on' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.private && '🔒 '}
            {c.name}
          </button>
        ))}
        <button type="button" className="chip chip-dashed" onClick={() => setAddingCategory(true)}>
          + Kategória
        </button>
        <Link to="/categories" className="chip chip-dashed">⇅ Poradie kategórií</Link>
      </div>

      {addingCategory && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            addCategory()
          }}
        >
          <input
            autoFocus
            placeholder="Názov novej kategórie"
            aria-label="Názov novej kategórie"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button type="submit" className="button button-small">Pridať</button>
          <button type="button" className="button button-small button-ghost" onClick={() => setAddingCategory(false)}>
            Zrušiť
          </button>
        </form>
      )}
      {addingCategory && (
        <label className="check-line">
          <input type="checkbox" checked={newCategoryPrivate} onChange={(e) => setNewCategoryPrivate(e.target.checked)} />
          Súkromná – uvidíš ju len ty (inak ju uvidia všetci tréneri)
        </label>
      )}

      {visible.length === 0 ? (
        <EmptyState title="Zatiaľ žiadne cviky" text="Pridaj prvý cvik do tejto kategórie." />
      ) : (
        shownCategories.map((c) => {
          const inCategory = visible.filter((e) => e.categoryId === c.id)
          const head = (
            <div className="group-head">
              <h2 className="group-title">{c.name}</h2>
              {sortingId === c.id ? (
                <button type="button" className="text-button sort-done" onClick={() => setSortingId(null)}>
                  Hotovo
                </button>
              ) : (
                inCategory.length > 1 && (
                  <button
                    type="button"
                    className="icon-button sort-button"
                    aria-label={`Usporiadať cviky: ${c.name}`}
                    title="Usporiadať"
                    onClick={() => {
                      setSortingId(c.id)
                      setSearch('')
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5" />
                    </svg>
                  </button>
                )
              )}
            </div>
          )
          if (sortingId === c.id) {
            return (
              <section key={c.id} className="group">
                {head}
                <SortableList
                  items={[...inCategory].sort(byOrder)}
                  getId={(e) => e.id}
                  onReorder={(list) => saveOrder(list.map((e) => e.id))}
                  renderItem={(e, handle) => <ExerciseRow exercise={e} handle={handle} play={autoplayVideos} />}
                />
              </section>
            )
          }

          const sorted = [...inCategory].sort(byFavoriteThenOrder)
          // In "Všetky" show only the first 7 of each category (unless searching or opened).
          const limit = filter === 'all' && !query && !expanded.includes(c.id)
          const shown = limit ? sorted.slice(0, SHOW_FIRST) : sorted
          return (
            <section key={c.id} className="group">
              {head}
              <ul className="list">
                {shown.map((e) => (
                  <li key={e.id}>
                    <ExerciseRow exercise={e} play={autoplayVideos} />
                  </li>
                ))}
              </ul>
              {filter === 'all' && !query && sorted.length > SHOW_FIRST && (
                <button type="button" className="more-button" onClick={() => toggleExpanded(c.id)}>
                  {expanded.includes(c.id) ? 'Zobraziť menej' : `Zobraziť viac (${sorted.length - SHOW_FIRST})`}
                </button>
              )}
            </section>
          )
        })
      )}

      {hidden.length > 0 && !sorting && (
        <section className="group hidden-section">
          <button type="button" className="more-button" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? 'Zavrieť skryté cviky' : `Skryté cviky (${hidden.length})`}
          </button>
          {showHidden && (
            <ul className="list">
              {[...hidden].sort(byOrder).map((e) => (
                <li key={e.id}>
                  <ExerciseRow exercise={e} play={autoplayVideos} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Footer />

      {!sorting && (
        <Link to="/exercises/new" className="fab">
          + Nový cvik
        </Link>
      )}
    </div>
  )
}

/** One exercise in the list. With a handle it is in "Usporiadať" mode and does not open. */
function ExerciseRow({ exercise, handle, play }: { exercise: Exercise; handle?: ReactNode; play: boolean }) {
  const media = exerciseMedia(exercise)
  const content = (
    <>
      <Thumb {...media} label={exercise.name} play={play} />
      <span className="row-main">
        <span className="row-title">
          {exercise.private && <span aria-label="Súkromný">🔒 </span>}
          {exercise.name}
        </span>
        <span className="row-sub">
          {timingSummary(exercise)} · {exercise.createdByName}
        </span>
      </span>
    </>
  )

  if (handle) {
    return (
      <div className="row">
        {content}
        {handle}
      </div>
    )
  }

  return (
    <div className={`row ${exercise.hidden ? 'row-hidden' : ''}`}>
      <Link to={`/exercises/${exercise.id}`} className="row-link">
        {content}
      </Link>
      {!exercise.hidden && (
        <StarButton
          on={!!exercise.favorite}
          label={exercise.name}
          onToggle={() => setFavorite(exercise.id, !exercise.favorite)}
        />
      )}
    </div>
  )
}
