import type {
  DistanceMeasurement,
  FurnitureDefinition,
  FurnitureDimensions,
  PlacedFurniture,
  Point,
  Rect,
  RoomDefinition,
} from './types'

const EPSILON = 0.001

export function getFurnitureSize(
  dimensions: FurnitureDimensions,
  rotation: PlacedFurniture['rotation'],
) {
  return rotation % 180 === 0
    ? { width: dimensions.width, height: dimensions.depth }
    : { width: dimensions.depth, height: dimensions.width }
}

export function furnitureToRect(item: PlacedFurniture): Rect {
  const size = getFurnitureSize(item, item.rotation)
  return {
    x: item.x - size.width / 2,
    y: item.y - size.height / 2,
    ...size,
  }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - EPSILON &&
    a.x + a.width > b.x + EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    a.y + a.height > b.y + EPSILON
  )
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (pointOnSegment(point, a, b)) return true
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

function pointOnSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y)
  if (Math.abs(cross) > EPSILON) return false
  return (
    p.x >= Math.min(a.x, b.x) - EPSILON &&
    p.x <= Math.max(a.x, b.x) + EPSILON &&
    p.y >= Math.min(a.y, b.y) - EPSILON &&
    p.y <= Math.max(a.y, b.y) + EPSILON
  )
}

export function rectInsidePolygon(rect: Rect, polygon: Point[]): boolean {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
  ]
  return corners.every((point) => pointInPolygon(point, polygon))
}

export function applyWallSnap(
  center: Point,
  size: { width: number; height: number },
  room: RoomDefinition,
  threshold: number,
): Point {
  let result = { ...center }
  let bestX = threshold + EPSILON
  let bestY = threshold + EPSILON

  room.walls.forEach((wall) => {
    const vertical = Math.abs(wall.start.x - wall.end.x) < EPSILON
    const horizontal = Math.abs(wall.start.y - wall.end.y) < EPSILON
    if (vertical) {
      const wallY1 = Math.min(wall.start.y, wall.end.y)
      const wallY2 = Math.max(wall.start.y, wall.end.y)
      if (center.y + size.height / 2 < wallY1 || center.y - size.height / 2 > wallY2) return
      const target = wall.interiorSide === 'right'
        ? wall.start.x + size.width / 2
        : wall.start.x - size.width / 2
      const distance = Math.abs(center.x - target)
      if (distance <= threshold && distance < bestX) {
        result.x = target
        bestX = distance
      }
    }
    if (horizontal) {
      const wallX1 = Math.min(wall.start.x, wall.end.x)
      const wallX2 = Math.max(wall.start.x, wall.end.x)
      if (center.x + size.width / 2 < wallX1 || center.x - size.width / 2 > wallX2) return
      const target = wall.interiorSide === 'bottom'
        ? wall.start.y + size.height / 2
        : wall.start.y - size.height / 2
      const distance = Math.abs(center.y - target)
      if (distance <= threshold && distance < bestY) {
        result.y = target
        bestY = distance
      }
    }
  })

  return result
}

function closestPointsBetweenRects(a: Rect, b: Rect): { from: Point; to: Point; value: number } {
  const aRight = a.x + a.width
  const aBottom = a.y + a.height
  const bRight = b.x + b.width
  const bBottom = b.y + b.height

  const fromX = aRight < b.x ? aRight : bRight < a.x ? a.x : Math.max(a.x, b.x)
  const toX = aRight < b.x ? b.x : bRight < a.x ? bRight : fromX
  const fromY = aBottom < b.y ? aBottom : bBottom < a.y ? a.y : Math.max(a.y, b.y)
  const toY = aBottom < b.y ? b.y : bBottom < a.y ? bBottom : fromY
  const value = Math.hypot(toX - fromX, toY - fromY)
  return { from: { x: fromX, y: fromY }, to: { x: toX, y: toY }, value }
}

export function nearestFurnitureMeasurement(
  selected: PlacedFurniture,
  others: PlacedFurniture[],
): DistanceMeasurement | null {
  const selectedRect = furnitureToRect(selected)
  let nearest: DistanceMeasurement | null = null

  others.forEach((other) => {
    if (other.id === selected.id) return
    const result = closestPointsBetweenRects(selectedRect, furnitureToRect(other))
    if (!nearest || result.value < nearest.value) {
      nearest = {
        key: `furniture-${other.id}`,
        ...result,
        label: result.value < EPSILON ? 'Overlap' : `${Math.round(result.value)} cm`,
        kind: 'furniture',
      }
    }
  })
  return nearest
}

type Direction = 'top' | 'right' | 'bottom' | 'left'

function rayDistanceToPolygon(origin: Point, direction: Direction, polygon: Point[]): number | null {
  const hits: number[] = []
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    if (direction === 'top' || direction === 'bottom') {
      if (origin.x < Math.min(a.x, b.x) - EPSILON || origin.x > Math.max(a.x, b.x) + EPSILON) continue
      if (Math.abs(a.x - b.x) < EPSILON) continue
      const t = (origin.x - a.x) / (b.x - a.x)
      if (t < -EPSILON || t > 1 + EPSILON) continue
      const y = a.y + t * (b.y - a.y)
      const distance = direction === 'top' ? origin.y - y : y - origin.y
      if (distance >= -EPSILON) hits.push(Math.max(0, distance))
    } else {
      if (origin.y < Math.min(a.y, b.y) - EPSILON || origin.y > Math.max(a.y, b.y) + EPSILON) continue
      if (Math.abs(a.y - b.y) < EPSILON) continue
      const t = (origin.y - a.y) / (b.y - a.y)
      if (t < -EPSILON || t > 1 + EPSILON) continue
      const x = a.x + t * (b.x - a.x)
      const distance = direction === 'left' ? origin.x - x : x - origin.x
      if (distance >= -EPSILON) hits.push(Math.max(0, distance))
    }
  }
  return hits.length ? Math.min(...hits) : null
}

export function wallMeasurements(
  selected: PlacedFurniture,
  room: RoomDefinition,
): DistanceMeasurement[] {
  const rect = furnitureToRect(selected)
  const origins: Record<Direction, Point> = {
    top: { x: rect.x + rect.width / 2, y: rect.y },
    right: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
    left: { x: rect.x, y: rect.y + rect.height / 2 },
  }
  const vectors: Record<Direction, Point> = {
    top: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  }

  return (Object.keys(origins) as Direction[]).flatMap((direction) => {
    const value = rayDistanceToPolygon(origins[direction], direction, room.polygon)
    if (value === null) return []
    const vector = vectors[direction]
    return [{
      key: `wall-${direction}`,
      from: origins[direction],
      to: {
        x: origins[direction].x + vector.x * value,
        y: origins[direction].y + vector.y * value,
      },
      value,
      label: `${Math.round(value)} cm`,
      kind: 'wall' as const,
    }]
  })
}

export function findAvailablePosition(
  definition: FurnitureDefinition,
  placed: PlacedFurniture[],
  room: RoomDefinition,
): Point {
  const size = getFurnitureSize(definition, 0)
  for (let y = size.height / 2 + 10; y <= room.height - size.height / 2; y += 10) {
    for (let x = size.width / 2 + 10; x <= room.width - size.width / 2; x += 10) {
      const candidate: Rect = { x: x - size.width / 2, y: y - size.height / 2, ...size }
      const blocked = room.fixtures.some((fixture) => fixture.blocking && rectsOverlap(candidate, fixture.rect))
      const occupied = placed.some((item) => rectsOverlap(candidate, furnitureToRect(item)))
      if (rectInsidePolygon(candidate, room.polygon) && !blocked && !occupied) return { x, y }
    }
  }
  return { x: room.width / 2, y: room.height / 2 }
}
