import { Link, useNavigate, useParams } from 'react-router'
import { exerciseMedia } from '../model'
import { canDeleteExercise, canEditExercise, deleteExercise, setFavorite, setHidden, useData } from '../cloud'
import { formatDuration, timingSummary, workPerSet } from '../time'
import { AuthorNote, Media, StarButton, TopBar } from '../components'
import { confirmDialog } from '../confirm'

export default function ExerciseDetailPage() {
  const id = useParams().id
  const navigate = useNavigate()
  const data = useData()
  const exercise = data.exercises.find((e) => e.id === id)
  const category = data.categories.find((c) => c.id === exercise?.categoryId)

  if (!exercise) return data.ready ? <TopBar title="Cvik sa nenašiel" /> : null

  // The author changes and deletes own exercises; the admin also changes starter exercises
  // (nobody deletes them).
  const canEdit = canEditExercise(exercise)
  const canDelete = canDeleteExercise(exercise)

  // Hiding is per coach – the exercise stays for the others and can be shown again from "Skryté cviky".
  function toggleHidden() {
    setHidden(exercise!.id, !exercise!.hidden)
    if (!exercise!.hidden) navigate('/exercises', { replace: true })
  }

  async function remove() {
    const ok = await confirmDialog(
      `Natrvalo vymazať „${exercise!.name}“? Zmizne aj ostatným trénerom. Tréningy, ktoré ho už obsahujú, ho ponechajú.`,
      { confirmLabel: 'Vymazať', danger: true },
    )
    if (!ok) return
    deleteExercise(exercise!)
    navigate('/exercises', { replace: true })
  }

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
            {canEdit && <Link to={`/exercises/${exercise.id}/edit`} className="text-button">Upraviť</Link>}
          </>
        }
      />

      <Media {...exerciseMedia(exercise)} className="hero-media" />

      <p className="eyebrow">
        {category?.name}
        {exercise.hidden && ' · skrytý'}
        {exercise.private && ' · 🔒 súkromný'}
      </p>
      <h1 className="page-title">{exercise.name}</h1>
      <AuthorNote name={exercise.createdByName} />
      {exercise.description && <p className="body-text">{exercise.description}</p>}

      <section className="card">
        <h2 className="card-title">Predvolené časy</h2>
        <dl className="facts">
          <div><dt>Série</dt><dd>{timingSummary(exercise)}</dd></div>
          <div><dt>Jedna séria</dt><dd>{formatDuration(setSeconds)}</dd></div>
          <div><dt>Oddych</dt><dd>{exercise.restBetweenSets} s</dd></div>
        </dl>
        <p className="hint">Je možné zmeniť pri každom tréningu.</p>
      </section>

      {canEdit && (
        <Link to={`/exercises/${exercise.id}/edit`} className="button button-primary button-wide">
          Upraviť cvik
        </Link>
      )}
      <button type="button" className="button button-ghost button-wide" onClick={toggleHidden}>
        {exercise.hidden ? 'Zobraziť cvik znova' : 'Skryť cvik'}
      </button>
      {canDelete && (
        <button type="button" className="button button-danger-ghost" onClick={remove}>
          Vymazať cvik
        </button>
      )}
    </div>
  )
}
