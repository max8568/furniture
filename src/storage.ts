import type { PlacedFurniture } from './types'

const STORAGE_KEY = 'room-fit:layout'
const STORAGE_VERSION = 1

type SavedLayout = { version: number; furniture: PlacedFurniture[] }

export function loadLayout(): PlacedFurniture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw) as SavedLayout
    if (saved.version !== STORAGE_VERSION || !Array.isArray(saved.furniture)) return []
    return saved.furniture.filter(isPlacedFurniture)
  } catch {
    return []
  }
}

export function saveLayout(furniture: PlacedFurniture[]) {
  const payload: SavedLayout = { version: STORAGE_VERSION, furniture }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function isPlacedFurniture(value: unknown): value is PlacedFurniture {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PlacedFurniture>
  return (
    typeof item.id === 'string' &&
    ['bed', 'desk', 'bookcase', 'wardrobe'].includes(item.kind ?? '') &&
    typeof item.x === 'number' && Number.isFinite(item.x) &&
    typeof item.y === 'number' && Number.isFinite(item.y) &&
    [0, 90, 180, 270].includes(item.rotation ?? -1)
  )
}
