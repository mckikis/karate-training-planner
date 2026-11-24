import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMediaBlob } from './cloud'

/** Turns a Blob saved in the database into a URL that <img> or <video> can show. */
export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}

/**
 * Shows a photo, GIF or video of an exercise – uploaded to Firebase (mediaId), a file picked
 * in the form and not saved yet (blob), or a file from public/exercises/ (url).
 * Videos play on repeat without sound, like a GIF. With play = false a video stays stopped
 * on its first frame (setting "Automaticky prehrávať videá" is off). GIFs repeat by themselves.
 */
export function Media({
  mediaId,
  blob,
  url,
  type,
  className,
  play = true,
}: {
  mediaId?: string
  blob?: Blob
  url?: string
  type?: 'image' | 'video'
  className?: string
  play?: boolean
}) {
  const cloudBlob = useMediaBlob(mediaId)
  const blobUrl = useObjectUrl(blob ?? cloudBlob)
  const videoRef = useRef<HTMLVideoElement>(null)
  const src = blobUrl ?? url

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (play) video.play().catch(() => {})
    else video.pause()
  }, [play, src])

  if (!src) return null
  if (type === 'video') {
    return (
      <video
        ref={videoRef}
        className={className}
        src={src}
        // Without autoplay ("Automaticky prehrávať videá" off) the video starts for a moment and
        // stops at once – iPhone draws its first frame only then, so there is a preview, not an empty box.
        autoPlay
        preload="auto"
        muted
        loop
        playsInline
        onPlaying={(e) => {
          if (!play) e.currentTarget.pause()
        }}
        onLoadedData={(e) => {
          if (!play && e.currentTarget.currentTime === 0) e.currentTarget.currentTime = 0.1
        }}
      />
    )
  }
  return <img className={className} src={src} alt="" />
}

/** Square preview used in lists. Without a photo it shows the first letter. */
export function Thumb({
  mediaId,
  blob,
  url,
  type,
  label,
  size = 'medium',
  play = true,
}: {
  mediaId?: string
  blob?: Blob
  url?: string
  type?: 'image' | 'video'
  label: string
  size?: 'medium' | 'large' | 'full'
  play?: boolean
}) {
  const className = `thumb thumb-${size}`
  if (!mediaId && !blob && !url) {
    return <div className={`${className} thumb-letter`} aria-hidden="true">{label.charAt(0).toUpperCase()}</div>
  }
  return <Media mediaId={mediaId} blob={blob} url={url} type={type} className={className} play={play} />
}

/** Gear icon in the page header that opens the settings. */
export function SettingsLink() {
  return (
    <Link to="/settings" className="icon-button" aria-label="Nastavenia">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </Link>
  )
}

/** Star button for favorite exercises. */
export function StarButton({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`star-button ${on ? 'star-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Odobrať z obľúbených: ${label}` : `Pridať do obľúbených: ${label}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/** Small club logo next to the page title. */
export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="page-header">
      <img className="club-logo" src={`${import.meta.env.BASE_URL}katsudo-logo.png`} alt="Karate klub Katsudo Sabinov" />
      <h1 className="page-title">{title}</h1>
      {right && <div className="page-header-right">{right}</div>}
    </header>
  )
}

/** Signature at the bottom of the main screens. */
export function Footer() {
  return <footer className="footer">© Kristína Šimčíková 2026</footer>
}

/**
 * Selects the whole value when the field is tapped, so typing replaces it. The mouse-up after the
 * tap would otherwise cancel the selection and new digits would be added to the old ones.
 */
const selectOnFocus = {
  onFocus: (e: FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select()
    e.currentTarget.dataset.justFocused = '1'
  },
  onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
    if (e.currentTarget.dataset.justFocused) {
      e.preventDefault()
      delete e.currentTarget.dataset.justFocused
    }
  },
}

/** Small ▲ / ▼ buttons inside a field – a tap changes the value by one step. */
function SpinButtons({ onUp, onDown, upLabel, downLabel }: { onUp: () => void; onDown: () => void; upLabel: string; downLabel: string }) {
  return (
    <span className="spin-buttons">
      {/* tabIndex -1 + preventDefault: a tap does not take the focus away from the typed value */}
      <button type="button" tabIndex={-1} aria-label={upLabel} onMouseDown={(e) => e.preventDefault()} onClick={onUp}>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 7l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" tabIndex={-1} aria-label={downLabel} onMouseDown={(e) => e.preventDefault()} onClick={onDown}>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </span>
  )
}

/**
 * Number input that works well on iPhone (numeric keyboard, accepts "1,5" and "1.5").
 * With step, small ▲ / ▼ buttons add or subtract the step.
 */
export function NumberField({
  label,
  value,
  onChange,
  decimal = false,
  suffix,
  step,
  min = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  decimal?: boolean
  suffix?: string
  step?: number
  min?: number
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    const parsed = Number(text.replace(',', '.'))
    if (parsed !== value) setText(String(value))
  }, [value])

  const stepBy = (delta: number) => onChange(Math.max(min, Math.round((value + delta) * 100) / 100))

  return (
    <label className="field number-field">
      <span className="field-label">{label}</span>
      <span className="spin">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          value={text}
          {...selectOnFocus}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          onChange={(e) => {
            setText(e.target.value)
            const parsed = Number(e.target.value.replace(',', '.'))
            if (!Number.isNaN(parsed) && parsed >= 0) onChange(decimal ? parsed : Math.round(parsed))
          }}
        />
        {suffix && <span className="spin-unit">{suffix}</span>}
        {step !== undefined && (
          <SpinButtons
            onUp={() => stepBy(step)}
            onDown={() => stepBy(-step)}
            upLabel={`${label}: pridať ${String(step).replace('.', ',')}`}
            downLabel={`${label}: ubrať ${String(step).replace('.', ',')}`}
          />
        )}
      </span>
    </label>
  )
}

const onlyDigits = (text: string) => text.replace(/\D/g, '')
const twoDigits = (n: number) => String(n).padStart(2, '0')

/**
 * Time input as minutes : seconds with the numeric keyboard. The minutes come first; after two
 * digits or Enter the cursor jumps to the seconds. ▲ / ▼ add or subtract step seconds (15 s).
 * Seconds over 59 are allowed while typing ("0:90" = 1:30) and tidied up when leaving the field.
 */
export function DurationField({
  label,
  value,
  onChange,
  step = 15,
  min = 0,
}: {
  label: string
  value: number
  onChange: (seconds: number) => void
  step?: number
  min?: number
}) {
  const [minutes, setMinutes] = useState(String(Math.floor(value / 60)))
  const [seconds, setSeconds] = useState(twoDigits(value % 60))
  const minutesRef = useRef<HTMLInputElement>(null)
  const secondsRef = useRef<HTMLInputElement>(null)
  const total = (m: string, s: string) => Number(onlyDigits(m) || 0) * 60 + Number(onlyDigits(s) || 0)

  function tidy() {
    setMinutes(String(Math.floor(value / 60)))
    setSeconds(twoDigits(value % 60))
  }

  useEffect(() => {
    if (total(minutes, seconds) !== value) tidy()
  }, [value])

  // Leaving the field (not just moving between minutes and seconds) shows the value as m:ss.
  function onBlur(e: FocusEvent<HTMLInputElement>) {
    if (e.relatedTarget !== minutesRef.current && e.relatedTarget !== secondsRef.current) tidy()
  }

  const stepBy = (delta: number) => onChange(Math.max(min, value + delta))

  return (
    <label className="field number-field">
      <span className="field-label">{label}</span>
      <span className="spin">
        <span className="duration-inputs">
          <input
            ref={minutesRef}
            className="duration-minutes"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="next"
            aria-label={`${label} – minúty`}
            maxLength={3}
            value={minutes}
            {...selectOnFocus}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                secondsRef.current?.focus()
              }
            }}
            onChange={(e) => {
              const next = onlyDigits(e.target.value)
              setMinutes(next)
              onChange(total(next, seconds))
              if (next.length >= 2) secondsRef.current?.focus()
            }}
          />
          <span className="duration-colon" aria-hidden="true">:</span>
          <input
            ref={secondsRef}
            className="duration-seconds"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            aria-label={`${label} – sekundy`}
            maxLength={2}
            value={seconds}
            {...selectOnFocus}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
              // Backspace in empty seconds goes back to the minutes.
              if (e.key === 'Backspace' && e.currentTarget.value === '') minutesRef.current?.focus()
            }}
            onChange={(e) => {
              const next = onlyDigits(e.target.value)
              setSeconds(next)
              onChange(total(minutes, next))
            }}
          />
        </span>
        <SpinButtons
          onUp={() => stepBy(step)}
          onDown={() => stepBy(-step)}
          upLabel={`${label}: pridať ${step} s`}
          downLabel={`${label}: ubrať ${step} s`}
        />
      </span>
    </label>
  )
}

/** Header for detail and form screens. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="Späť">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-text">{text}</p>
      {action}
    </div>
  )
}

/** "Autor: Kristína" – who created an exercise or training. */
export function AuthorNote({ name }: { name: string }) {
  return <span className="author">Autor: {name}</span>
}

/** Icons of the buttons at the bottom of a detail (Upraviť, Skryť, Vymazať). */
export function ActionIcon({ name }: { name: 'edit' | 'hide' | 'show' | 'delete' | 'timer' }) {
  const paths = {
    edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
    hide: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3.2 4.3M6.6 6.6C4.4 8 2.8 10 2 12c1 2.5 5 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
    show: 'M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    delete: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    timer: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  }
  return (
    <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

/**
 * Buttons at the bottom of an exercise or training detail: Upraviť (wide), then Skryť and
 * Vymazať next to each other – all with white icons.
 */
export function DetailActions({
  editTo,
  hidden,
  onToggleHidden,
  onDelete,
}: {
  editTo?: string
  hidden: boolean
  onToggleHidden: () => void
  onDelete?: () => void
}) {
  return (
    <div className="detail-actions">
      {editTo && (
        <Link to={editTo} className="button button-primary button-wide with-icon">
          <ActionIcon name="edit" />
          Upraviť
        </Link>
      )}
      <div className="action-row">
        <button type="button" className="button button-ghost with-icon" onClick={onToggleHidden}>
          <ActionIcon name={hidden ? 'show' : 'hide'} />
          {hidden ? 'Zobraziť' : 'Skryť'}
        </button>
        {onDelete && (
          <button type="button" className="button button-danger-ghost with-icon" onClick={onDelete}>
            <ActionIcon name="delete" />
            Vymazať
          </button>
        )}
      </div>
    </div>
  )
}

/** Variants picked for an exercise of a training – indented under it with an arrow. */
export function ItemVariants({ name, variants }: { name: string; variants?: { exerciseId: string; name: string }[] }) {
  if (!variants?.length) return null
  return (
    <ul className="item-variants" aria-label={`Varianty: ${name}`}>
      {variants.map((v) => (
        <li key={v.exerciseId}>
          <span className="variant-arrow" aria-hidden="true">↳</span>
          {v.name}
        </li>
      ))}
    </ul>
  )
}
