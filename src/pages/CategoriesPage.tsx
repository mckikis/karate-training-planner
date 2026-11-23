import { byOrder, type Category } from '../model'
import { isMine, saveOrder, setCategoryPrivate, setCategoryTimeOnly, useData } from '../cloud'
import { TopBar } from '../components'
import { exerciseCount } from '../time'
import { SortableList } from '../sortable'

export default function CategoriesPage() {
  const data = useData()
  if (!data.ready) return null

  // "Len na čas" can be changed only by the author of the category (starter categories are fixed).
  function toggleTimeOnly(c: Category) {
    setCategoryTimeOnly(c, !c.timeOnly)
  }

  return (
    <div className="page">
      <TopBar title="Kategórie" />
      <p className="hint">
        Kategóriu presunieš potiahnutím za ⠿ (napr. Dynamický strečing pred Rozcvičku). Poradie je len tvoje,
        ostatným trénerom sa nezmení. „Len na čas“ a „Súkromná“ môže meniť len autor kategórie.
      </p>

      <SortableList
        items={[...data.categories].sort(byOrder)}
        getId={(c) => c.id}
        onReorder={(list) => saveOrder(list.map((c) => c.id))}
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
                disabled={!isMine(c)}
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
            {handle}
          </div>
        )}
      />
    </div>
  )
}
