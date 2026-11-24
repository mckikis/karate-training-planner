import { useEffect, useRef, useSyncExternalStore } from 'react'

/*
 * Confirmation dialog inside the app. It replaces window.confirm(), which some browsers
 * (and installed apps) block – then nothing happened after a tap.
 */

interface Request {
  message: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
  resolve: (ok: boolean) => void
}

let current: Request | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function confirmDialog(
  message: string,
  {
    confirmLabel = 'Áno',
    cancelLabel = 'Zrušiť',
    danger = false,
  }: { confirmLabel?: string; cancelLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  current?.resolve(false)
  return new Promise((resolve) => {
    current = { message, confirmLabel, cancelLabel, danger, resolve }
    emit()
  })
}

function answer(ok: boolean) {
  const request = current
  current = null
  emit()
  request?.resolve(ok)
}

/** Put once at the top of the app. */
export function ConfirmHost() {
  const request = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!request) return
    confirmRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') answer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request])

  if (!request) return null
  return (
    <div className="dialog-backdrop" onClick={() => answer(false)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={request.message}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="dialog-text">{request.message}</p>
        <div className="dialog-buttons">
          <button type="button" className="button button-ghost" onClick={() => answer(false)}>
            {request.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button ${request.danger ? 'button-danger' : 'button-primary'}`}
            onClick={() => answer(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
