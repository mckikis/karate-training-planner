import { byOrder, type Category } from '../model'
import {
  canDeleteCategory,
  deleteCategory,
  isAdmin,
  isMine,
  saveOrder,
  setCategoryPrivate,
  setCategoryTimeOnly,
  showError,
  useData,
} from '../cloud'
import { confirmDialog } from '../confirm'
import { TopBar } from '../components'
import { exerciseCount } from '../time'
import { SortableList } from '../sortable'

export default function CategoriesPage() {
  const data = useData()
  if (!data.ready) return null

  // "Len na čas": the admin changes it for everybody, other coaches only for themselves.
  function toggleTimeOnly(c: Category) {
    setCategoryTimeOnly(c, !c.timeOnly)
  }

  async function remove(c: Category) {
    const count = data.exercises.filter((e) => e.categoryId === c.id).length
    const ok = await confirmDialog(
      count > 0
        ? `Natrvalo vymazať kategóriu „${c.name}“ aj s ${count} cvikmi v nej? Zmizne aj ostatným trénerom.`
        : `Natrvalo vymazať kategóriu „${c.name}“?`,
      { confirmLabel: 'Vymazať', danger: true },
    )
    if (!ok) return
    try {
      deleteCategory(c)
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Kategóriu sa nepodarilo vymazať.')
    }
  }

  return (
    <div className="page">
      <TopBar title="Kategórie" />
      <p className="hint">
        Kategóriu presunieš potiahnutím za ⠿.
        {isAdmin()
          ? ' Si správca: poradie, „Len na čas“ aj vymazanie (🗑) sa zmenia všetkým trénerom.'
          : ' Poradie a „Len na čas“ sa zmenia len tebe. „Súkromná“ a vymazanie (🗑) môže len autor kategórie.'}
      </p>

      <SortableList
        items={[...data.categories].sort(byOrder)}
        getId={(c) => c.id}
        onReorder={(list) => saveOrder('categories', list.map((c) => c.id))}
        renderItem={(c, handle) => (
          <div className="row category-row">
            <span className="row-main">
              <span className="row-title">
                {c.private && '🔒 '}
                {c.name}
              </span>
              <span className="row-sub">
                {exerciseCount(data.exercises.filter((e) => e.categoryId === c.id && !e.hidden).length)} · {c.createdByName}
              </span>
            </span>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={!!c.timeOnly}
                onChange={() => toggleTimeOnly(c)}
              />
              Len na čas
            </label>
            {isMine(c) && (
              <label className="switch-label">
                <input type="checkbox" checked={!!c.private} onChange={() => setCategoryPrivate(c, !c.private)} />
                Súkromná
              </label>
            )}
            {canDeleteCategory(c) && (
              <button
                type="button"
                className="icon-button small"
                aria-label={`Vymazať kategóriu ${c.name}`}
                title="Vymazať kategóriu"
                onClick={() => remove(c)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            )}
            {handle}
          </div>
        )}
      />
    </div>
  )
}
