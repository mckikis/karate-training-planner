import type { CSSProperties, ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'

/**
 * A list whose items can be moved by dragging the ≡ handle (works with a finger on iPhone).
 * renderItem gets the handle and places it where it wants.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className = 'list',
}: {
  items: T[]
  getId: (item: T) => string | number
  onReorder: (items: T[]) => void
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode
  className?: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // dnd-kit needs ids that are not 0, so we use "s1", "s2", …
  const ids = items.map((item) => `s${getId(item)}`)

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item, index) => (
            <SortableItem key={ids[index]} id={ids[index]}>
              {(handle) => renderItem(item, handle, index)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  }

  const handle = (
    <button
      type="button"
      className="drag-handle"
      ref={setActivatorNodeRef}
      aria-label="Posunúť"
      {...attributes}
      {...listeners}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.7" /><circle cx="15" cy="6" r="1.7" />
        <circle cx="9" cy="12" r="1.7" /><circle cx="15" cy="12" r="1.7" />
        <circle cx="9" cy="18" r="1.7" /><circle cx="15" cy="18" r="1.7" />
      </svg>
    </button>
  )

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'dragging' : undefined}>
      {children(handle)}
    </li>
  )
}
