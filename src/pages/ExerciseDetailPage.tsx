import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { exerciseMedia, timingOf, type Exercise, type Timing } from '../model'
import {
  canDeleteExercise,
  canEditExercise,
  deleteExercise,
  isAdmin,
  isMine,
  setFavorite,
  setHidden,
  setOwnTiming,
  useData,
} from '../cloud'
import { TimingFields } from './TimingFields'
import { formatDuration, timingSummary, variantCount, workPerSet } from '../time'
import { AuthorNote, DetailActions, Media, StarButton, Thumb, TopBar } from '../components'
import { useSettings } from '../settings'
import { confirmDialog } from '../confirm'

export default function ExerciseDetailPage() {
  const id = useParams().id
  const navigate = useNavigate()
  const data = useData()
  const exercise = data.exercises.find((e) => e.id === id)
  const { autoplayVideos, othersExercises } = useSettings()
  // A variant belongs to another exercise and has no times of its own.
  const parent = exercise?.parentId ? data.exercises.find((e) => e.id === exercise.parentId) : undefined
  const category = data.categories.find((c) => c.id === (parent ?? exercise)?.categoryId)
  // Own default times of a coach who may not change the exercise for everybody.
  const [ownTiming, setOwnTimingDraft] = useState<Timing>()

  if (!exercise) return data.ready ? <TopBar title="Cvik sa nenašiel" /> : null

  // The author changes and deletes own exercises; the admin also changes starter exercises
  // (nobody deletes them).
  const canEdit = canEditExercise(exercise)
  const canDelete = canDeleteExercise(exercise)

  // Hiding is per coach – the exercise stays for the others and can be shown again from "Skryté cviky".
  function toggleHidden() {
    setHidden(exercise!.id, !exercise!.hidden)
    if (!exercise!.hidden) navigate(parent ? `/exercises/${parent.id}` : '/exercises', { replace: true })
  }

  async function remove() {
    const ok = await confirmDialog(
      parent
        ? `Natrvalo vymazať variant „${exercise!.name}“? Zmizne aj ostatným trénerom. Tréningy, ktoré ho už obsahujú, ho ponechajú.`
        : `Natrvalo vymazať „${exercise!.name}“${variants.length ? ` aj s jeho variantmi` : ''}? Zmizne aj ostatným trénerom. Tréningy, ktoré ho už obsahujú, ho ponechajú.`,
      { confirmLabel: 'Vymazať', danger: true },
    )
    if (!ok) return
    deleteExercise(exercise!)
    navigate(parent ? `/exercises/${parent.id}` : '/exercises', { replace: true })
  }

  // Variants shown like in the list: starter, admin's and own ones (others' with the switch on).
  const variants = parent
    ? []
    : data.exercises
        .filter((v) => v.parentId === exercise.id && !v.hidden && (othersExercises || v.isDefault || v.byAdmin || isMine(v)))
        .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.order - b.order)

  const setSeconds = workPerSet(exercise)

  return (
    <div className="page">
      <TopBar
        title=""
        right={
          <>
            {!exercise.hidden && (
              <StarButton
                on={!!exercise.favorite}
                label={exercise.name}
                onToggle={() => setFavorite(exercise.id, !exercise.favorite)}
              />
            )}
          </>
        }
      />

      <Media {...exerciseMedia(exercise)} className="hero-media" />

      <p className="eyebrow">
        {category?.name}
        {exercise.hidden && ' · skrytý'}
        {exercise.private && ' · 🔒 súkromný'}
      </p>
      {parent && (
        <Link to={`/exercises/${parent.id}`} className="variant-of">
          ↳ Variant cviku <strong>{parent.name}</strong>
        </Link>
      )}
      <h1 className="page-title">{exercise.name}</h1>
      <AuthorNote name={exercise.createdByName} />
      {exercise.description && <p className="body-text">{exercise.description}</p>}

      {!parent && (
        <section className="card">
          <h2 className="card-title">
            Varianty cviku{variants.length > 0 && <span className="card-count"> · {variantCount(variants.length)}</span>}
          </h2>
          {variants.length === 0 ? (
            <p className="hint">
              Cvik môže mať varianty, napr. na jednej nohe, na oboch nohách, dnu-von. Pri tvorbe tréningu si z nich
              vyberieš, ktoré sa budú cvičiť; čas sa zadáva pre celý cvik.
            </p>
          ) : (
            <ul className="variant-list">
              {variants.map((v) => (
                <VariantRow key={v.id} variant={v} play={autoplayVideos} />
              ))}
            </ul>
          )}
          <Link to={`/exercises/new?parent=${exercise.id}`} className="button button-outline button-wide">
            + Pridať variant
          </Link>
        </section>
      )}

      {!parent && (
      <section className="card">
        <h2 className="card-title">Predvolené časy</h2>
        <dl className="facts">
          <div><dt>Série</dt><dd>{timingSummary(exercise)}</dd></div>
          <div><dt>Jedna séria</dt><dd>{formatDuration(setSeconds)}</dd></div>
          <div><dt>Oddych</dt><dd>{formatDuration(exercise.restBetweenSets)}</dd></div>
        </dl>
        {canEdit ? (
          <p className="hint">
            {isAdmin()
              ? 'Si správca: časy a spôsob (opakovania / čas), ktoré nastavíš v Upraviť, sa použijú všetkým trénerom pri pridaní cviku do tréningu.'
              : 'Tieto časy sa použijú každému trénerovi, keď cvik pridá do tréningu. Zmeníš ich v Upraviť.'}
          </p>
        ) : ownTiming ? (
          <>
            <TimingFields value={ownTiming} onChange={setOwnTimingDraft} timeOnly={!!category?.timeOnly} />
            <div className="button-row">
              <button type="button" className="button button-ghost" onClick={() => setOwnTimingDraft(undefined)}>
                Zrušiť
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setOwnTiming(exercise.id, ownTiming)
                  setOwnTimingDraft(undefined)
                }}
              >
                Uložiť pre mňa
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">
              {exercise.ownTiming
                ? 'Toto sú tvoje vlastné predvolené časy, ostatní tréneri ich nevidia.'
                : 'Použijú sa, keď cvik pridáš do tréningu. Zmeniť ich môžeš v tréningu alebo len pre seba.'}
            </p>
            <button type="button" className="button button-outline button-wide" onClick={() => setOwnTimingDraft(timingOf(exercise))}>
              Zmeniť časy len pre mňa
            </button>
            {exercise.ownTiming && (
              <button type="button" className="button button-ghost button-wide" onClick={() => setOwnTiming(exercise.id, undefined)}>
                Vrátiť predvolené časy
              </button>
            )}
          </>
        )}
      </section>
      )}

      <DetailActions
        editTo={canEdit ? `/exercises/${exercise.id}/edit` : undefined}
        hidden={!!exercise.hidden}
        onToggleHidden={toggleHidden}
        onDelete={canDelete ? remove : undefined}
      />
    </div>
  )
}

/** One variant in the detail of its exercise – indented with an arrow, opens its own detail. */
function VariantRow({ variant, play }: { variant: Exercise; play: boolean }) {
  return (
    <li className="row variant-row">
      <span className="variant-arrow" aria-hidden="true">↳</span>
      <Link to={`/exercises/${variant.id}`} className="row-link">
        <Thumb {...exerciseMedia(variant)} label={variant.name} play={play} />
        <span className="row-main">
          <span className="row-title">
            {variant.private && <span aria-label="Súkromný">🔒 </span>}
            {variant.name}
          </span>
          {variant.description && <span className="row-sub row-desc">{variant.description}</span>}
        </span>
      </Link>
      <StarButton on={!!variant.favorite} label={variant.name} onToggle={() => setFavorite(variant.id, !variant.favorite)} />
    </li>
  )
}
