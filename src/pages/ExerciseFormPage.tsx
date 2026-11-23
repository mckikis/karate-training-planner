import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { byOrder, exerciseMedia, timingOf, toTimeMode, type Timing } from '../model'
import { isMine, saveExercise, useData, type MediaChange } from '../cloud'
import { Media, TopBar } from '../components'
import { TimingFields } from './TimingFields'

const MAX_MEDIA_MB = 40
const MAX_PHOTO_SIDE = 1600 // big phone photos are made smaller before upload

const DEFAULT_TIMING: Timing = {
  mode: 'reps',
  sets: 3,
  reps: 10,
  secondsPerRep: 2,
  workSeconds: 30,
  restBetweenSets: 30,
}

/** Makes a large photo smaller (JPEG). GIFs and videos stay as they are. */
async function shrinkPhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

export default function ExerciseFormPage() {
  const editingId = useParams().id
  const navigate = useNavigate()
  const data = useData()
  const categories = [...data.categories].sort(byOrder)
  const editing = editingId ? data.exercises.find((e) => e.id === editingId) : undefined

  const [loaded, setLoaded] = useState(!editingId)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [description, setDescription] = useState('')
  const [timing, setTiming] = useState<Timing>(DEFAULT_TIMING)
  const [media, setMedia] = useState<MediaChange>({ kind: 'keep' })
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // When editing, fill the form once the exercise has arrived.
  useEffect(() => {
    if (loaded || !editing) return
    setName(editing.name)
    setCategoryId(editing.categoryId)
    setDescription(editing.description)
    setTiming(timingOf(editing))
    setIsPrivate(!!editing.private)
    setLoaded(true)
  }, [editing, loaded])

  // New exercise: preselect the first category.
  useEffect(() => {
    if (!editingId && categoryId === undefined && categories.length) setCategoryId(categories[0].id)
  }, [categories, categoryId, editingId])

  if (editingId && editing && (!isMine(editing) || editing.isDefault)) {
    return <TopBar title="Tento cvik môže upraviť len jeho autor" />
  }

  const category = categories.find((c) => c.id === categoryId)
  const timeOnly = !!category?.timeOnly
  // An exercise in a private category is private too – others do not see the category.
  const forcedPrivate = !!category?.private

  async function pickFile(file?: File) {
    if (!file) return
    if (file.size > MAX_MEDIA_MB * 1024 * 1024) {
      setError(`Súbor je príliš veľký. Použi obrázok alebo krátke video pod ${MAX_MEDIA_MB} MB.`)
      return
    }
    setError('')
    const type = file.type.startsWith('video') ? 'video' : 'image'
    setMedia({ kind: 'new', file: type === 'image' ? await shrinkPhoto(file) : file, type })
  }

  async function save() {
    if (!name.trim()) {
      setError('Zadaj názov.')
      return
    }
    if (categoryId === undefined) {
      setError('Vyber kategóriu.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const id = await saveExercise(editingId, {
        name: name.trim(),
        categoryId,
        description: description.trim(),
        timing: timeOnly ? toTimeMode(timing) : timing,
        media,
        private: isPrivate || forcedPrivate,
      })
      if (editingId) navigate(-1)
      else navigate(`/exercises/${id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uloženie sa nepodarilo.')
      setSaving(false)
    }
  }

  // What to show in the preview: a newly picked file, or the saved picture.
  const saved = media.kind === 'keep' ? exerciseMedia(editing) : {}
  const preview = media.kind === 'new' ? { blob: media.file, type: media.type } : saved
  const hasMedia = media.kind === 'new' || !!saved.mediaId || !!saved.url

  return (
    <div className="page page-form">
      <TopBar title={editingId ? 'Upraviť cvik' : 'Nový cvik'} />

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className="field">
          <span className="field-label">Názov</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="napr. Gyaku zuki" />
        </label>

        <label className="field">
          <span className="field-label">Kategória</span>
          <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Popis</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krátka poznámka, ako sa cvik robí"
          />
        </label>

        <div className="field">
          <span className="field-label">Obrázok, GIF alebo krátke video</span>
          {hasMedia ? (
            <div className="media-preview">
              <Media {...preview} className="hero-media" />
              <div className="button-row">
                <label className="button button-small upload-inline">
                  <input type="file" accept="image/*,video/*" onChange={(e) => pickFile(e.target.files?.[0])} />
                  Zmeniť
                </label>
                <button type="button" className="button button-small button-ghost" onClick={() => setMedia({ kind: 'remove' })}>
                  Vymazať
                </button>
              </div>
            </div>
          ) : (
            <label className="upload">
              <input type="file" accept="image/*,video/*" onChange={(e) => pickFile(e.target.files?.[0])} />
              <span>+ Nahrať obrázok alebo video</span>
            </label>
          )}
          <p className="hint">Obrázok uvidia aj ostatní tréneri. Na nahratie potrebuješ internet.</p>
        </div>

        <fieldset className="card">
          <legend className="card-title">Predvolené časy</legend>
          <p className="hint">
            Používajú sa, keď pridáš tento cvik do tréningu. Možnosť úpravy priamo v tréningu.
            {timeOnly && ' Cviky v tejto kategórii sa zadávajú len na čas.'}
          </p>
          <TimingFields value={timeOnly ? toTimeMode(timing) : timing} onChange={setTiming} timeOnly={timeOnly} />
        </fieldset>

        <label className="check-line">
          <input
            type="checkbox"
            checked={isPrivate || forcedPrivate}
            disabled={forcedPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          {forcedPrivate
            ? 'Súkromný – kategória je súkromná, cvik uvidíš len ty'
            : 'Súkromný – uvidíš ho len ty (inak ho uvidia aj ostatní tréneri)'}
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? (media.kind === 'new' ? 'Nahrávam…' : 'Ukladám…') : 'Uložiť cvik'}
          </button>
        </div>
      </form>
    </div>
  )
}
