import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { byOrder, exerciseMedia, timingOf, toTimeMode, type Timing } from '../model'
import { canEditExercise, describeError, isMine, saveExercise, useData, type MediaChange } from '../cloud'
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

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|3gp)$/i

/** Picture or video – also for files without a type (some Android pickers send none). */
function mediaKind(file: File): 'image' | 'video' {
  if (file.type.startsWith('video')) return 'video'
  if (!file.type && VIDEO_EXTENSIONS.test(file.name)) return 'video'
  return 'image'
}

/** Decodes a photo – createImageBitmap, or an <img> where it cannot read the format (e.g. HEIC). */
async function decodePhoto(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { source: img, width: img.naturalWidth, height: img.naturalHeight }
    } finally {
      // the canvas has the picture after drawImage; the URL can go a moment later
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
  }
}

/**
 * Makes a large photo smaller (JPEG) – less to upload on mobile data. A HEIC photo of an iPhone is
 * always turned into JPEG, so Android phones can show it too. GIFs and videos stay as they are.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (!heic && !/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const { source, width, height } = await decodePhoto(file)
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height))
    if (!heic && scale === 1 && file.size < 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob && (heic || blob.size < file.size) ? blob : file
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
  // A variant (e.g. "na jednej nohe" of "Frekvenčný rebrík"): name, description and picture only.
  const [searchParams] = useSearchParams()
  const parentId = editing?.parentId ?? searchParams.get('parent') ?? undefined
  const parent = parentId ? data.exercises.find((e) => e.id === parentId) : undefined

  const [loaded, setLoaded] = useState(!editingId)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [description, setDescription] = useState('')
  const [timing, setTiming] = useState<Timing>(DEFAULT_TIMING)
  const [media, setMedia] = useState<MediaChange>({ kind: 'keep' })
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Upload progress 0…1 (undefined = nothing is uploading).
  const [progress, setProgress] = useState<number>()

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

  if (editingId && editing && !canEditExercise(editing)) {
    return <TopBar title="Tento cvik môže upraviť len jeho autor alebo správca" />
  }

  // A variant is always in the category of its exercise.
  const effectiveCategoryId = parent?.categoryId ?? categoryId
  const category = categories.find((c) => c.id === effectiveCategoryId)
  const timeOnly = !!category?.timeOnly
  // An exercise in a private category is private too – others do not see the category.
  // A variant of a private exercise is private as well.
  const forcedPrivate = !!category?.private || !!parent?.private
  // Only the author decides whether an own exercise is private; starter and other admins' exercises stay as they are.
  const ownsPrivacy = !editing || (isMine(editing) && !editing.isDefault)

  async function pickFile(file?: File) {
    if (!file) return
    if (file.size > MAX_MEDIA_MB * 1024 * 1024) {
      setError(`Súbor je príliš veľký. Použi obrázok alebo krátke video pod ${MAX_MEDIA_MB} MB.`)
      return
    }
    if (file.size === 0) {
      setError('Súbor je prázdny. Vyber ho znova.')
      return
    }
    setError('')
    const type = mediaKind(file)
    setMedia({ kind: 'new', file: type === 'image' ? await shrinkPhoto(file) : file, type })
  }

  async function save() {
    if (!name.trim()) {
      setError('Zadaj názov.')
      return
    }
    if (effectiveCategoryId === undefined) {
      setError('Vyber kategóriu.')
      return
    }
    setSaving(true)
    setError('')
    setProgress(undefined)
    try {
      const id = await saveExercise(editingId, {
        name: name.trim(),
        categoryId: effectiveCategoryId,
        description: description.trim(),
        timing: timeOnly ? toTimeMode(timing) : timing,
        media,
        private: ownsPrivacy ? isPrivate || forcedPrivate : !!editing?.private,
        parentId: editing ? undefined : parent?.id,
      }, setProgress)
      if (editingId) navigate(-1)
      // A new variant: back to its exercise, where it is listed.
      else if (parent) navigate(`/exercises/${parent.id}`, { replace: true })
      else navigate(`/exercises/${id}`, { replace: true })
    } catch (e) {
      setError(
        media.kind === 'new'
          ? `Obrázok alebo video sa nepodarilo nahrať, cvik nie je uložený. ${describeError(e)}`
          : `Cvik sa nepodarilo uložiť. ${describeError(e)}`,
      )
      setSaving(false)
      setProgress(undefined)
    }
  }

  // What to show in the preview: a newly picked file, or the saved picture.
  const saved = media.kind === 'keep' ? exerciseMedia(editing) : {}
  const preview = media.kind === 'new' ? { blob: media.file, type: media.type } : saved
  const hasMedia = media.kind === 'new' || !!saved.mediaId || !!saved.url

  return (
    <div className="page page-form">
      <TopBar title={parent ? (editingId ? 'Upraviť variant' : 'Nový variant') : editingId ? 'Upraviť cvik' : 'Nový cvik'} />
      {parent && (
        <p className="variant-of">
          ↳ Variant cviku <strong>{parent.name}</strong> · čas sa zadáva pre celý cvik pri tvorbe tréningu
        </p>
      )}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className="field">
          <span className="field-label">Názov</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parent ? 'napr. Na jednej nohe' : 'napr. Gyaku zuki'}
          />
        </label>

        {!parent && (
          <label className="field">
            <span className="field-label">Kategória</span>
            <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}

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

        {!parent && (
        <fieldset className="card">
          <legend className="card-title">Predvolené časy</legend>
          <p className="hint">
            Takto sa cvik nastaví každému trénerovi, keď ho pridá do tréningu: na opakovania alebo na čas, série
            a oddych. Tréner si ich môže zmeniť v tréningu alebo len pre seba v detaile cviku.
            {timeOnly && ' Cviky v tejto kategórii sa zadávajú len na čas.'}
          </p>
          <TimingFields value={timeOnly ? toTimeMode(timing) : timing} onChange={setTiming} timeOnly={timeOnly} />
        </fieldset>
        )}

        {ownsPrivacy && (
          <label className="check-line">
            <input
              type="checkbox"
              checked={isPrivate || forcedPrivate}
              disabled={forcedPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            {parent?.private
              ? 'Súkromný – cvik je súkromný, variant uvidíš len ty'
              : forcedPrivate
                ? 'Súkromný – kategória je súkromná, cvik uvidíš len ty'
                : 'Súkromný – uvidíš ho len ty (inak ho uvidia aj ostatní tréneri)'}
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {saving && media.kind === 'new' && (
          <p className="hint">Nahrávam súbor. Nezatváraj appku, kým sa neuloží – na mobilných dátach to môže chvíľu trvať.</p>
        )}

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving
              ? media.kind === 'new'
                ? `Nahrávam… ${Math.round((progress ?? 0) * 100)} %`
                : 'Ukladám…'
              : parent
                ? 'Uložiť variant'
                : 'Uložiť cvik'}
          </button>
        </div>
      </form>
    </div>
  )
}
