import { beforeEach, describe, expect, it } from 'vitest'
import { loadLayout, saveLayout } from './storage'
import type { PlacedFurniture } from './types'

describe('layout persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a valid layout', () => {
    const layout: PlacedFurniture[] = [{ id: 'desk', kind: 'desk', x: 120, y: 80, rotation: 90 }]
    saveLayout(layout)
    expect(loadLayout()).toEqual(layout)
  })

  it('returns an empty room for malformed data', () => {
    localStorage.setItem('room-fit:layout', '{not-json')
    expect(loadLayout()).toEqual([])
  })

  it('filters invalid furniture records', () => {
    localStorage.setItem('room-fit:layout', JSON.stringify({
      version: 1,
      furniture: [
        { id: 'desk', kind: 'desk', x: 20, y: 30, rotation: 0 },
        { id: 'broken', kind: 'sofa', x: 'far', y: 30, rotation: 45 },
      ],
    }))
    expect(loadLayout()).toHaveLength(1)
  })
})
