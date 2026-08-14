import { describe, expect, it } from 'vitest'
import { FURNITURE, ROOM } from './config'
import {
  applyWallSnap,
  findAvailablePosition,
  furnitureToRect,
  getFurnitureSize,
  nearestFurnitureMeasurement,
  rectInsidePolygon,
  rectsOverlap,
  wallMeasurements,
} from './geometry'
import type { PlacedFurniture, Rect } from './types'

const makeItem = (overrides: Partial<PlacedFurniture> = {}): PlacedFurniture => ({
  id: 'desk',
  kind: 'desk',
  x: 200,
  y: 150,
  rotation: 0,
  ...overrides,
})

describe('furniture geometry', () => {
  it('swaps width and depth after a quarter turn', () => {
    expect(getFurnitureSize(FURNITURE.desk, 0)).toEqual({ width: 120, height: 70 })
    expect(getFurnitureSize(FURNITURE.desk, 90)).toEqual({ width: 70, height: 120 })
  })

  it('converts a centered furniture item to a top-left rectangle', () => {
    expect(furnitureToRect(makeItem())).toEqual({ x: 140, y: 115, width: 120, height: 70 })
  })

  it('detects overlap but allows edges to touch', () => {
    const a: Rect = { x: 0, y: 0, width: 20, height: 20 }
    expect(rectsOverlap(a, { x: 19, y: 0, width: 20, height: 20 })).toBe(true)
    expect(rectsOverlap(a, { x: 20, y: 0, width: 20, height: 20 })).toBe(false)
  })

  it('checks whether the whole rectangle is inside the room polygon', () => {
    expect(rectInsidePolygon({ x: 110, y: 10, width: 100, height: 50 }, ROOM.polygon)).toBe(true)
    expect(rectInsidePolygon({ x: -1, y: 10, width: 100, height: 50 }, ROOM.polygon)).toBe(false)
  })
})

describe('wall snapping', () => {
  const deskSize = { width: 120, height: 70 }

  it('snaps to a wall from within the ten-centimeter threshold', () => {
    expect(applyWallSnap({ x: 67, y: 150 }, deskSize, ROOM, 10)).toEqual({ x: 60, y: 150 })
  })

  it('does not snap beyond the threshold', () => {
    expect(applyWallSnap({ x: 71, y: 150 }, deskSize, ROOM, 10)).toEqual({ x: 71, y: 150 })
  })

  it('can snap to two walls at a corner', () => {
    expect(applyWallSnap({ x: 65, y: 40 }, deskSize, ROOM, 10)).toEqual({ x: 60, y: 35 })
  })
})

describe('distance measurements', () => {
  it('returns four directional wall distances', () => {
    const measurements = wallMeasurements(makeItem(), ROOM)
    expect(Object.fromEntries(measurements.map((measurement) => [measurement.key, measurement.value]))).toEqual({
      'wall-top': 115,
      'wall-right': 141,
      'wall-bottom': 39,
      'wall-left': 140,
    })
  })

  it('returns the nearest furniture edge-to-edge distance', () => {
    const selected = makeItem()
    const nearby = makeItem({ id: 'bookcase', kind: 'bookcase', x: 310, y: 150 })
    const far = makeItem({ id: 'wardrobe', kind: 'wardrobe', x: 200, y: 270 })
    const measurement = nearestFurnitureMeasurement(selected, [selected, nearby, far])
    expect(measurement?.value).toBe(10)
    expect(measurement?.label).toBe('10 cm')
  })

  it('labels overlapping furniture without a negative distance', () => {
    const selected = makeItem()
    const overlap = makeItem({ id: 'bed', kind: 'bed', x: 200, y: 150 })
    expect(nearestFurnitureMeasurement(selected, [selected, overlap])?.label).toBe('重疊')
  })
})

describe('automatic placement', () => {
  it('chooses a legal position that avoids the door swing and existing furniture', () => {
    const existing = makeItem({ x: 200, y: 150 })
    const result = findAvailablePosition(FURNITURE.bookcase, [existing], ROOM)
    const candidate = makeItem({ id: 'bookcase', kind: 'bookcase', ...result })
    expect(rectInsidePolygon(furnitureToRect(candidate), ROOM.polygon)).toBe(true)
    expect(rectsOverlap(furnitureToRect(candidate), furnitureToRect(existing))).toBe(false)
    expect(ROOM.fixtures.some((fixture) => fixture.blocking && rectsOverlap(furnitureToRect(candidate), fixture.rect))).toBe(false)
  })
})
