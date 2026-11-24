import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { byOrder, tagClass, TRAINING_GROUPS, TRAINING_TAGS, type Training } from '../model'
import { isMine, saveOrder, useData } from '../cloud'
import { exerciseCount, formatDate, formatDuration, trainingPlan } from '../time'
import { EmptyState, Footer, PageHeader, SettingsLink } from '../components'
import { updateSettings, useSettings } from '../settings'
import { SortableList } from '../sortable'

type SortBy = 'custom' | 'newest' | 'oldest'

/** Newest date first; on the same day the later start time first. */
function byDateDesc(a: Training, b: Training): number {
  return b.date.localeCompare(a.date) || (b.startTime ?? '').localeCompare(a.startTime ?? '') || b.id.localeCompare(a.id)
}

export default function TrainingsPage() {
  const data = useData()
  const { othersTrainings } = useSettings()
  // By default a coach sees only their own trainings.
  const trainings = data.trainings.filter((t) => othersTrainings || isMine(t))
  const [author, setAuthor] = useState('')
  const [sorting, setSorting] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [group, setGroup] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('custom')
  if (!data.ready) return null

  const query = search.trim().toLowerCase()
  const authorFilter = othersTrainings ? author : ''
  const filtering = !!query || !!tag || !!group || !!authorFilter
  const matches = (t: Training) =>
    (!query || t.name.toLowerCase().includes(query)) &&
    (!tag || t.tag === tag) &&
    (!group || t.group === group) &&
    (!authorFilter || (authorFilter === 'me' ? isMine(t) : !isMine(t) && t.createdByName === authorFilter))
  // Names of the other coaches, for the "Autor" filter.
  const authors = [...new Set(trainings.filter((t) => !isMine(t)).map((t) => t.createdByName))].sort((a, b) =>
    a.localeCompare(b, 'sk'),
  )
  const sortFn =
    sortBy === 'newest' ? byDateDesc : sortBy === 'oldest' ? (a: Training, b: Training) => byDateDesc(b, a) : byOrder

  const allActive = trainings.filter((t) => !t.hidden)
  const active = allActive.filter(matches).sort(sortFn)
  const hidden = trainings.filter((t) => t.hidden && matches(t)).sort(sortFn)
  // Older trainings may have a type that is no longer in the list – offer it in the filter too.
  // Built-in types, types added by coaches, and old types still used by some training.
  const tags = [
    ...new Set([...TRAINING_TAGS, ...data.trainingTypes.map((t) => t.name), ...trainings.map((t) => t.tag).filter(Boolean)]),
  ]
  // Dragging only makes sense in the user's own order with nothing filtered out.
  const canSort = allActive.length > 1 && sortBy === 'custom' && !filtering

  return (
    <div className="page">
      <PageHeader
        title="Tréningy"
        right={
          <>
            {(canSort || sorting) && (
              sorting ? (
                <button type="button" className="text-button sort-done" onClick={() => setSorting(false)}>
                  Hotovo
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-button sort-button"
                  aria-label="Usporiadať tréningy"
                  title="Usporiadať"
                  onClick={() => setSorting(true)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 6h10M4 12h10M4 18h10M18 4v16M15.5 6.5 18 4l2.5 2.5M15.5 17.5 18 20l2.5-2.5" />
                  </svg>
                </button>
              )
            )}
            <SettingsLink />
          </>
        }
      />

      {!sorting && (
        <label className="others-toggle">
          <input
            type="checkbox"
            className="toggle"
            checked={othersTrainings}
            onChange={(e) => updateSettings({ othersTrainings: e.target.checked })}
          />
          Zobraziť aj tréningy iných trénerov
        </label>
      )}

      {allActive.length > 0 && !sorting && (
        <div className="filters">
          <input
            className="search"
            type="search"
            placeholder="Hľadať tréning"
            aria-label="Hľadať tréning podľa názvu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-grid">
            <label className="field">
              <span className="field-label">Typ</span>
              <select value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Všetky</option>
                {tags.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pre koho</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">Všetci</option>
                {TRAINING_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Zoradiť</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="custom">Vlastné poradie</option>
                <option value="newest">Dátum: najnovšie</option>
                <option value="oldest">Dátum: najstaršie</option>
              </select>
            </label>
          </div>
          {othersTrainings && (
            <label className="field author-filter">
              <span className="field-label">Autor tréningu</span>
              <select value={author} onChange={(e) => setAuthor(e.target.value)}>
                <option value="">Všetci tréneri</option>
                <option value="me">Len moje</option>
                {authors.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {allActive.length === 0 ? (
        <EmptyState
          title="Žiadne dostupné tréningy"
          text="Vyber cvičenia, zadaj série a počty opakovaní pre vypočítanie celkovej dĺžky tréningu."
          action={<Link to="/trainings/new" className="button button-primary">Vytvoriť prvý tréning</Link>}
        />
      ) : sorting ? (
        <>
          <p className="hint">Tréning posunieš potiahnutím za ⠿ vpravo.</p>
          <SortableList
            items={active}
            getId={(t) => t.id}
            onReorder={(list) => saveOrder('trainings', list.map((t) => t.id))}
            renderItem={(t, handle) => <TrainingRow training={t} handle={handle} />}
          />
        </>
      ) : active.length === 0 ? (
        <EmptyState title="Nič sa nenašlo" text="Žiadny tréning nezodpovedá filtru." />
      ) : (
        <ul className="list">
          {active.map((t) => (
            <li key={t.id}>
              <TrainingRow training={t} />
            </li>
          ))}
        </ul>
      )}

      {hidden.length > 0 && !sorting && (
        <section className="group hidden-section">
          <button type="button" className="more-button" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? 'Zavrieť skryté tréningy' : `Skryté tréningy (${hidden.length})`}
          </button>
          {showHidden && (
            <ul className="list">
              {hidden.map((t) => (
                <li key={t.id}>
                  <TrainingRow training={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Footer />

      {allActive.length > 0 && !sorting && (
        <Link to="/trainings/new" className="fab">+ Nový tréning</Link>
      )}
    </div>
  )
}

function TrainingRow({ training: t, handle }: { training: Training; handle?: ReactNode }) {
  const tint = tagClass(t.tag)
  const className = `row training-row ${tint ? `tinted ${tint}` : ''}`
  const content = (
    <>
      <span className="row-main">
        <span className="row-title">
          {t.private && <span aria-label="Súkromný">🔒 </span>}
          {t.name}
        </span>
        <span className="row-sub">
          {formatDate(t.date)}
          {t.startTime && ` · ${t.startTime}`} · {exerciseCount(t.items.length)}
          {t.coach && ` · ${t.coach}`}
        </span>
        {t.description && <span className="row-desc">{t.description}</span>}
        <span className="row-sub">Autor: {t.createdByName}</span>
        <span className="tag-row">
          {t.tag && <span className="tag">{t.tag}</span>}
          {t.group && <span className="tag">{t.group}</span>}
          {t.done && <span className="tag tag-done">✓ Odtrénovaný</span>}
        </span>
      </span>
      <span className="row-time">{formatDuration(trainingPlan(t).total)}</span>
    </>
  )
  if (handle) {
    return (
      <div className={className}>
        {content}
        {handle}
      </div>
    )
  }
  return (
    <Link to={`/trainings/${t.id}`} className={`${className} ${t.hidden ? 'row-hidden' : ''}`}>
      {content}
    </Link>
  )
}
