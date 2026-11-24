import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { exerciseMedia, sectionLabel, tagClass, type Exercise, type Section, type TrainingItem } from '../model'
import { canEditTraining, deleteTraining, setHidden, updateTraining, useData } from '../cloud'
import { clockAt, formatDate, formatDuration, timingSummary, trainingPlan } from '../time'
import { ActionIcon, AuthorNote, DetailActions, ItemVariants, Media, Thumb, TopBar } from '../components'
import { updateSettings, useSettings } from '../settings'
import { confirmDialog } from '../confirm'

export default function TrainingDetailPage() {
  const id = useParams().id ?? ''
  const navigate = useNavigate()
  const data = useData()
  const training = data.trainings.find((t) => t.id === id)
  const [coach, setCoach] = useState<string>()
  // Index of the exercise opened in the detail sheet.
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { autoplayVideos, bigTrainingMedia } = useSettings()

  if (!training) return data.ready ? <TopBar title="Tréning sa nenašiel" /> : null

  // Only the author can change, mark or delete the training. Anybody can hide it for themselves.
  const mine = canEditTraining(training)

  async function remove() {
    const ok = await confirmDialog(`Natrvalo vymazať „${training!.name}“? Zmizne aj ostatným trénerom.`, {
      confirmLabel: 'Vymazať',
      danger: true,
    })
    if (!ok) return
    deleteTraining(id)
    navigate('/trainings', { replace: true })
  }

  function toggleHidden() {
    setHidden(id, !training!.hidden)
    if (!training!.hidden) navigate('/trainings', { replace: true })
  }

  function markDone() {
    updateTraining(id, { done: true, doneAt: Date.now(), coach: (coach ?? training!.coach ?? '').trim() })
  }

  function markNotDone() {
    updateTraining(id, { done: false, doneAt: undefined })
  }

  const plan = trainingPlan(training)
  const total = plan.total
  const exerciseOf = (item: TrainingItem) => data.exercises.find((e) => e.id === item.exerciseId)
  // All exercises in the order of the training: warm-up, main part, cool-down.
  const entries: Entry[] = [
    ...plan.warmup.items.map((item) => ({ item, section: 'warmup' as const, start: plan.warmup.start, end: plan.warmup.end, breakAfter: 0 })),
    ...plan.main.map((row) => ({ ...row, section: 'main' as const })),
    ...plan.cooldown.items.map((item) => ({ item, section: 'cooldown' as const, start: plan.cooldown.start, end: plan.cooldown.end, breakAfter: 0 })),
  ]
  // With a start time we show the clock (17:17), without it the time from the start (0:00).
  const at = (offset: number) => (training.startTime ? clockAt(training.startTime, offset) : formatDuration(offset))

  const parts: { section: Section; start: number; end: number }[] = [
    { section: 'warmup', start: plan.warmup.start, end: plan.warmup.end },
    { section: 'main', start: plan.mainStart, end: plan.mainEnd },
    { section: 'cooldown', start: plan.cooldown.start, end: plan.cooldown.end },
  ]
  // Older trainings have only the main part – then no part headers are shown.
  const hasParts = plan.warmup.items.length > 0 || plan.cooldown.items.length > 0 || plan.mainStart > 0 || plan.cooldown.end > plan.mainEnd

  return (
    <div className="page">
      <TopBar title="" />

      <p className="eyebrow">
        {formatDate(training.date)}
        {training.startTime && ` · ${training.startTime}`}
        {training.hidden && ' · skrytý'}
      </p>
      <h1 className="page-title">{training.name}</h1>
      <div className="tag-row">
        {training.tag && <span className={`tag tag-large tinted ${tagClass(training.tag)}`}>{training.tag}</span>}
        {training.group && <span className="tag tag-large">{training.group}</span>}
        {training.done && <span className="tag tag-large tag-done">✓ Odtrénovaný</span>}
      </div>
      <AuthorNote name={training.createdByName} />
      {training.coach && <p className="body-text">Tréner: <strong>{training.coach}</strong></p>}
      {training.description && <p className="body-text">{training.description}</p>}

      {entries.length > 0 && (
        <Link to={`/timer?training=${id}`} className="button button-primary button-wide with-icon">
          <ActionIcon name="timer" />
          Spustiť časomieru
        </Link>
      )}

      {entries.length > 0 && (
        <div className="plan-tools">
          <span className="hint">Klikni na cvik pre detail.</span>
          <button
            type="button"
            className="text-button size-toggle"
            aria-pressed={bigTrainingMedia}
            onClick={() => updateSettings({ bigTrainingMedia: !bigTrainingMedia })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {bigTrainingMedia ? (
                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
              ) : (
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              )}
            </svg>
            {bigTrainingMedia ? 'Menšie obrázky' : 'Väčšie obrázky'}
          </button>
        </div>
      )}

      {parts.map(({ section, start, end }) => {
        const inPart = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.section === section)
        if (inPart.length === 0 && end === start) return null
        const simple = section !== 'main'
        return (
          <section key={section} className={hasParts ? `part part-${section}` : undefined}>
            {hasParts && (
              <header className="part-head">
                <h2 className="part-title">{sectionLabel(section)}</h2>
                <span className="part-clock">
                  {at(start)} – {at(end)} · {formatDuration(end - start)} min
                </span>
              </header>
            )}
            <ol className={`plan ${bigTrainingMedia ? 'plan-big' : ''}`}>
              {inPart.map(({ entry: { item, start: itemStart, end: itemEnd, breakAfter }, index }) => {
                const media = exerciseMedia(exerciseOf(item))
                const hasMedia = !!(media.mediaId || media.url)
                return (
                  <li key={index}>
                    <button type="button" className="plan-row" onClick={() => setOpenIndex(index)}>
                      <Thumb
                        {...media}
                        label={item.name}
                        size={bigTrainingMedia && hasMedia ? 'full' : simple ? 'medium' : 'large'}
                        play={autoplayVideos}
                      />
                      <div className="row-main">
                        {!simple && (
                          <span className="plan-clock">
                            {at(itemStart)} – {at(itemEnd)}
                          </span>
                        )}
                        <span className="row-title">{item.name}</span>
                        <ItemVariants name={item.name} variants={item.variants} />
                        {!simple && (
                          <span className="row-sub">
                            {timingSummary(item)}
                            {item.sets > 1 && ` · oddych ${item.restBetweenSets} s`}
                            {` · ${formatDuration(itemEnd - itemStart)} min`}
                          </span>
                        )}
                      </div>
                    </button>
                    {breakAfter > 0 && <p className="plan-break">Prestávka {formatDuration(breakAfter)} min</p>}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      <p className="total-small">
        Celkový čas <strong>{formatDuration(total)}</strong>
        {training.startTime && ` · ${training.startTime} – ${clockAt(training.startTime, total)}`}
      </p>

      {/* Done: who coached it, so later (when trainings are shared) we know who did what */}
      <section className="card done-card">
        {training.done ? (
          <>
            <p className="done-text">
              ✓ Odtrénované {training.doneAt && new Date(training.doneAt).toLocaleDateString('sk-SK')}
              {training.coach && ` · tréner ${training.coach}`}
            </p>
            {mine && (
              <button type="button" className="button button-small button-ghost" onClick={markNotDone}>
                Zrušiť označenie
              </button>
            )}
          </>
        ) : mine ? (
          <>
            <label className="field">
              <span className="field-label">Tréner</span>
              <input
                value={coach ?? training.coach ?? ''}
                onChange={(e) => setCoach(e.target.value)}
                placeholder="Kto viedol tréning"
              />
            </label>
            <button type="button" className="button button-primary button-wide" onClick={markDone}>
              ✓ Označiť ako odtrénovaný
            </button>
          </>
        ) : (
          <p className="hint">Ako odtrénovaný ho môže označiť len autor ({training.createdByName}).</p>
        )}
      </section>

      {openIndex !== null && entries[openIndex] && (
        <ItemSheet
          entry={entries[openIndex]}
          exercise={exerciseOf(entries[openIndex].item)}
          variants={data.exercises}
          clock={`${at(entries[openIndex].start)} – ${at(entries[openIndex].end)}`}
          position={openIndex + 1}
          count={entries.length}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < entries.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
          onClose={() => setOpenIndex(null)}
        />
      )}

      <DetailActions
        editTo={mine ? `/trainings/${id}/edit` : undefined}
        hidden={!!training.hidden}
        onToggleHidden={toggleHidden}
        onDelete={mine ? remove : undefined}
      />
    </div>
  )
}

/** One exercise in the plan, with the part it belongs to and its times. */
interface Entry {
  item: TrainingItem
  section: Section
  start: number
  end: number
  breakAfter: number
}

/** Full-screen detail of one exercise of the training: big picture/video (always plays) and its timing. */
function ItemSheet({
  entry,
  exercise,
  variants,
  clock,
  position,
  count,
  onPrev,
  onNext,
  onClose,
}: {
  entry: Entry
  exercise?: Exercise
  variants: Exercise[]
  clock: string
  position: number
  count: number
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // The page under the sheet should not scroll.
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const media = exerciseMedia(exercise)
  const { item, section } = entry
  const duration = entry.end - entry.start

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="sheet-inner">
        <header className="topbar">
          <button type="button" className="icon-button" onClick={onClose} aria-label="Zavrieť">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="topbar-title">
            Cvik {position} / {count}
          </span>
          <span />
        </header>

        {/* key: a new video element for each exercise, so it starts from the beginning */}
        <Media key={position} {...media} className="hero-media" play />

        <p className="plan-clock sheet-clock">
          {sectionLabel(section)} · {clock}
        </p>
        <h1 className="page-title">{item.name}</h1>
        {exercise?.description && <p className="body-text">{exercise.description}</p>}
        {!!item.variants?.length && (
          <section className="card">
            <h2 className="card-title">Varianty v tomto tréningu</h2>
            <ul className="variant-list">
              {item.variants.map((v) => {
                const variant = variants.find((e) => e.id === v.exerciseId)
                return (
                  <li key={v.exerciseId} className="row variant-row">
                    <span className="variant-arrow" aria-hidden="true">↳</span>
                    <Thumb {...exerciseMedia(variant)} label={v.name} play />
                    <span className="row-main">
                      <span className="row-title">{v.name}</span>
                      {variant?.description && <span className="row-sub">{variant.description}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="card">
          <h2 className="card-title">V tomto tréningu</h2>
          {section === 'main' ? (
            <dl className="facts">
              <div><dt>Série</dt><dd>{timingSummary(item)}</dd></div>
              {item.sets > 1 && <div><dt>Oddych medzi sériami</dt><dd>{item.restBetweenSets} s</dd></div>}
              <div><dt>Spolu</dt><dd>{formatDuration(duration)} min</dd></div>
            </dl>
          ) : (
            <dl className="facts">
              <div><dt>Časť</dt><dd>{sectionLabel(section)}</dd></div>
              <div><dt>Celá časť spolu</dt><dd>{formatDuration(duration)} min</dd></div>
            </dl>
          )}
        </section>

        <div className="button-row sheet-nav">
          <button type="button" className="button button-ghost" onClick={onPrev} disabled={!onPrev}>
            ‹ Predošlý
          </button>
          <button type="button" className="button button-ghost" onClick={onNext} disabled={!onNext}>
            Ďalší ›
          </button>
        </div>
      </div>
    </div>
  )
}
