import { describe, it, expect } from 'vitest'
import { planReorder, isFirst, isLast } from './categoryOrder.js'
import type { Category } from '../../../shared/types.js'

const cat = (id: string, order: number): Category => ({
  id,
  name: id.toUpperCase(),
  colorTag: null,
  order
})

// Deliberately out of array order to prove the helper sorts by `order` first.
const cats = (): Category[] => [cat('b', 1), cat('a', 0), cat('c', 2)]

describe('planReorder', () => {
  it('swaps order values to move an item up', () => {
    const plan = planReorder(cats(), 'b', 'up')
    expect(plan).not.toBeNull()
    const byId = Object.fromEntries(plan!.map((c) => [c.id, c.order]))
    // b (1) and a (0) swap
    expect(byId).toEqual({ b: 0, a: 1 })
  })

  it('swaps order values to move an item down', () => {
    const plan = planReorder(cats(), 'b', 'down')
    const byId = Object.fromEntries(plan!.map((c) => [c.id, c.order]))
    // b (1) and c (2) swap
    expect(byId).toEqual({ b: 2, c: 1 })
  })

  it('returns null when moving the first item up', () => {
    expect(planReorder(cats(), 'a', 'up')).toBeNull()
  })

  it('returns null when moving the last item down', () => {
    expect(planReorder(cats(), 'c', 'down')).toBeNull()
  })

  it('returns null for an unknown id', () => {
    expect(planReorder(cats(), 'zzz', 'up')).toBeNull()
  })

  it('does not mutate the input categories', () => {
    const input = cats()
    const snapshot = input.map((c) => ({ ...c }))
    planReorder(input, 'b', 'up')
    expect(input).toEqual(snapshot)
  })

  it('produces new objects, leaving untouched categories shared', () => {
    const input = cats()
    const plan = planReorder(input, 'b', 'down')!
    for (const updated of plan) {
      const original = input.find((c) => c.id === updated.id)!
      expect(updated).not.toBe(original)
    }
  })
})

describe('isFirst / isLast', () => {
  it('identifies the boundary items by display order, not array order', () => {
    const list = cats()
    expect(isFirst(list, 'a')).toBe(true)
    expect(isFirst(list, 'b')).toBe(false)
    expect(isLast(list, 'c')).toBe(true)
    expect(isLast(list, 'b')).toBe(false)
  })

  it('treats a single category as both first and last', () => {
    const one = [cat('solo', 0)]
    expect(isFirst(one, 'solo')).toBe(true)
    expect(isLast(one, 'solo')).toBe(true)
  })
})
