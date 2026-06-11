import type { Category } from '@shared/types'

export type ReorderDir = 'up' | 'down'

/**
 * Pure reorder planning for the sidebar category list.
 *
 * Categories are displayed sorted by their `order` field. To move one entry one
 * step up or down we swap its `order` value with its neighbour's. This returns
 * the two categories that need persisting (each a new object with the swapped
 * `order`), or `null` when the move is a no-op — the target is already at the
 * top/bottom, or the id is unknown. Kept separate from the component so the
 * index math is unit-testable.
 */
export function planReorder(
  categories: Category[],
  id: string,
  dir: ReorderDir
): [Category, Category] | null {
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  const i = sorted.findIndex((c) => c.id === id)
  if (i === -1) return null
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= sorted.length) return null
  const moved = sorted[i]
  const neighbour = sorted[j]
  if (!moved || !neighbour) return null
  return [
    { ...moved, order: neighbour.order },
    { ...neighbour, order: moved.order }
  ]
}

/** True when the category is the first in display order (cannot move up). */
export function isFirst(categories: Category[], id: string): boolean {
  return planReorder(categories, id, 'up') === null
}

/** True when the category is the last in display order (cannot move down). */
export function isLast(categories: Category[], id: string): boolean {
  return planReorder(categories, id, 'down') === null
}
