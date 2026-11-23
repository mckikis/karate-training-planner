import { useState } from 'react'
import { Link } from 'react-router'
import { TopBar } from '../components'
import { logout, rename, useSession } from '../cloud'
import { updateSettings, useSettings } from '../settings'
import { confirmDialog } from '../confirm'

export default function SettingsPage() {
  const settings = useSettings()
  const session = useSession()
  const member = session.status === 'in' ? session.member : undefined
  const [name, setName] = useState(member?.name ?? '')
  const [message, setMessage] = useState('')

  async function saveName() {
    try {
      await rename(name)
      setMessage('Meno je uložené.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Meno sa nepodarilo uložiť.')
    }
  }

  async function signOut() {
    const ok = await confirmDialog('Odhlásiť sa? Kópia dát v tomto telefóne sa vymaže, vo Firebase ostane všetko.', {
      confirmLabel: 'Odhlásiť sa',
    })
    if (!ok) return
    await logout()
  }

  return (
    <div className="page">
      <TopBar title="Nastavenia" />

      <section className="card">
        <h2 className="card-title">Účet</h2>
        <p className="hint">
          Prihlásený ako <strong>{member?.name}</strong>
          {member?.admin && ' · správca'}. Toto meno vidia ostatní tréneri pri tvojich cvikoch a tréningoch.
        </p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            saveName()
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Krstné meno" maxLength={40} />
          <button type="submit" className="button button-small" disabled={!name.trim() || name.trim() === member?.name}>
            Uložiť meno
          </button>
        </form>
        {message && <p className="hint">{message}</p>}
        <button type="button" className="button button-ghost button-wide" onClick={signOut}>
          Odhlásiť sa
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Videá</h2>
        <label className="setting-row">
          <span className="setting-text">
            <span className="setting-title">Automaticky prehrávať videá</span>
            <span className="row-sub">
              Keď je vypnuté, videá v zoznamoch stoja. Spustia sa až po otvorení cviku.
            </span>
          </span>
          <input
            type="checkbox"
            className="toggle"
            checked={settings.autoplayVideos}
            onChange={(e) => updateSettings({ autoplayVideos: e.target.checked })}
          />
        </label>
      </section>

      <section className="card">
        <h2 className="card-title">Kategórie</h2>
        <Link to="/categories" className="button button-ghost button-wide">
          Poradie kategórií a „Len na čas“
        </Link>
      </section>
    </div>
  )
}
