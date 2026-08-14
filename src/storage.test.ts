import { beforeEach, describe, expect, it } from 'vitest'
import { getDefaultDimensions, loadPlannerState, savePlannerState } from './storage'
import type { PlacedFurniture } from './types'

describe('planner persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips furniture and customized dimensions', () => {
    const dimensions = {
      ...getDefaultDimensions(),
      desk: { width: 135, depth: 75 },
    }
    const furniture: PlacedFurniture[] = [{
      id: 'desk',
      kind: 'desk',
      width: 135,
      depth: 75,
      x: 120,
      y: 80,
      rotation: 90,
    }]

    savePlannerState(furniture, dimensions)

    expect(loadPlannerState()).toEqual({ furniture, dimensions })
  })

  it('returns an empty room with default dimensions for malformed data', () => {
    localStorage.setItem('room-fit:layout', '{not-json')
    expect(loadPlannerState()).toEqual({
      furniture: [],
      dimensions: getDefaultDimensions(),
    })
  })

  it('migrates valid version-one furniture and filters invalid records', () => {
    localStorage.setItem('room-fit:layout', JSON.stringify({
      version: 1,
      furniture: [
        { id: 'desk', kind: 'desk', x: 20, y: 30, rotation: 0 },
        { id: 'broken', kind: 'sofa', x: 'far', y: 30, rotation: 45 },
      ],
    }))

    const state = loadPlannerState()
    expect(state.furniture).toEqual([{
      id: 'desk',
      kind: 'desk',
      width: 120,
      depth: 70,
      x: 20,
      y: 30,
      rotation: 0,
    }])
    expect(state.dimensions).toEqual(getDefaultDimensions())
  })
})
