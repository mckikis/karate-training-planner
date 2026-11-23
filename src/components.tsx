import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatDuration, parseDuration } from './time'
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
        // #t=0.1 makes iPhone show the first frame of a stopped video instead of an empty box
        src={play ? src : `${src}#t=0.1`}
        autoPlay={play}
        preload={play ? 'auto' : 'metadata'}
        muted
        loop
        playsInline
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
  return <footer className="footer">© Kristína Simčíková 2026</footer>
}

/**
 * Number input that works well on iPhone (numeric keyboard, accepts "1,5" and "1.5").
 */
export function NumberField({
  label,
  value,
  onChange,
  decimal = false,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  decimal?: boolean
  suffix?: string
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    const parsed = Number(text.replace(',', '.'))
    if (parsed !== value) setText(String(value))
  }, [value])

  return (
    <label className="field number-field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setText(e.target.value)
            const parsed = Number(e.target.value.replace(',', '.'))
            if (!Number.isNaN(parsed) && parsed >= 0) onChange(decimal ? parsed : Math.round(parsed))
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
    </label>
  )
}

/**
 * Time input in minutes:seconds. "15:00" = 15 minutes, "2:30" = 2.5 minutes, "90" = 90 seconds.
 */
export function DurationField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (seconds: number) => void
}) {
  const [text, setText] = useState(formatDuration(value))

  useEffect(() => {
    if (parseDuration(text) !== value) setText(formatDuration(value))
  }, [value])

  return (
    <label className="field number-field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="text"
          inputMode="decimal"
          placeholder="min:s"
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setText(e.target.value)
            const seconds = parseDuration(e.target.value)
            if (seconds !== undefined) onChange(seconds)
          }}
          onBlur={() => setText(formatDuration(value))}
        />
        <span className="suffix">min</span>
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
