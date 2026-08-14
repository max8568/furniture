import { FURNITURE, FURNITURE_ORDER } from './config'
import type {
  FurnitureDimensionMap,
  FurnitureDimensions,
  FurnitureKind,
  PlacedFurniture,
} from './types'

const STORAGE_KEY = 'room-fit:layout'
const STORAGE_VERSION = 2

type SavedLayout = {
  version: number
  furniture: unknown[]
  dimensions?: Partial<Record<FurnitureKind, FurnitureDimensions>>
}

export type PlannerState = {
  furniture: PlacedFurniture[]
  dimensions: FurnitureDimensionMap
}

export function getDefaultDimensions(): FurnitureDimensionMap {
  return Object.fromEntries(
    FURNITURE_ORDER.map((kind) => [kind, {
      width: FURNITURE[kind].width,
      depth: FURNITURE[kind].depth,
    }]),
  ) as FurnitureDimensionMap
}

export function loadPlannerState(): PlannerState {
  const defaults = getDefaultDimensions()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { furniture: [], dimensions: defaults }
    const saved = JSON.parse(raw) as SavedLayout
    if (![1, STORAGE_VERSION].includes(saved.version) || !Array.isArray(saved.furniture)) {
      return { furniture: [], dimensions: defaults }
    }

    const dimensions = FURNITURE_ORDER.reduce((result, kind) => {
      const candidate = saved.dimensions?.[kind]
      result[kind] = isValidDimensions(candidate) ? candidate : defaults[kind]
      return result
    }, { ...defaults })

    const furniture = saved.furniture.flatMap((value) => {
      const item = normalizePlacedFurniture(value, dimensions)
      return item ? [item] : []
    })
    return { furniture, dimensions }
  } catch {
    return { furniture: [], dimensions: defaults }
  }
}

export function savePlannerState(
  furniture: PlacedFurniture[],
  dimensions: FurnitureDimensionMap,
) {
  const payload = { version: STORAGE_VERSION, furniture, dimensions }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function normalizePlacedFurniture(
  value: unknown,
  dimensions: FurnitureDimensionMap,
): PlacedFurniture | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<PlacedFurniture>
  if (
    typeof item.id !== 'string' ||
    !isFurnitureKind(item.kind) ||
    typeof item.x !== 'number' || !Number.isFinite(item.x) ||
    typeof item.y !== 'number' || !Number.isFinite(item.y) ||
    ![0, 90, 180, 270].includes(item.rotation ?? -1)
  ) return null

  const fallback = dimensions[item.kind]
  return {
    id: item.id,
    kind: item.kind,
    width: isValidDimension(item.width) ? item.width : fallback.width,
    depth: isValidDimension(item.depth) ? item.depth : fallback.depth,
    x: item.x,
    y: item.y,
    rotation: item.rotation!,
  }
}

function isFurnitureKind(value: unknown): value is FurnitureKind {
  return typeof value === 'string' && FURNITURE_ORDER.includes(value as FurnitureKind)
}

function isValidDimensions(value: unknown): value is FurnitureDimensions {
  if (!value || typeof value !== 'object') return false
  const dimensions = value as Partial<FurnitureDimensions>
  return isValidDimension(dimensions.width) && isValidDimension(dimensions.depth)
}

function isValidDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 400
}
