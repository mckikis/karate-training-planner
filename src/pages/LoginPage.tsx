import { useState } from 'react'
import { login } from '../cloud'

export default function LoginPage({ error: startError }: { error?: string }) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState(startError ?? '')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await login(name, key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prihlásenie sa nepodarilo.')
      setBusy(false)
    }
  }

  return (
    <div className="page login-page">
      <img className="login-logo" src={`${import.meta.env.BASE_URL}katsudo-logo.png`} alt="Karate klub Katsudo Sabinov" />
      <h1 className="page-title">Karate tréningy</h1>
      <p className="body-text">Prihlás sa svojím krstným menom a prihlasovacím kľúčom, ktorý ti dal správca appky.</p>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="field">
          <span className="field-label">Meno</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Tereza"
            autoComplete="given-name"
            maxLength={40}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Prihlasovací kľúč</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="off"
            required
          />
        </label>
        <p className="hint">S tým istým kľúčom sa prihlásiš aj na inom telefóne a uvidíš svoje cviky a tréningy.</p>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? 'Prihlasujem…' : 'Prihlásiť sa'}
        </button>
      </form>
    </div>
  )
}
