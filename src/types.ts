export type Point = { x: number; y: number }

export type Rect = Point & { width: number; height: number }

export type Rotation = 0 | 90 | 180 | 270

export type FurnitureKind = 'bed' | 'desk' | 'bookcase' | 'wardrobe'

export type FurnitureDefinition = {
  kind: FurnitureKind
  name: string
  width: number
  depth: number
  color: string
  accent: string
  icon: string
}

export type PlacedFurniture = {
  id: string
  kind: FurnitureKind
  x: number
  y: number
  rotation: Rotation
}

export type Wall = {
  id: string
  start: Point
  end: Point
  interiorSide: 'top' | 'right' | 'bottom' | 'left'
}

export type RoomFixture = {
  id: string
  type: 'door' | 'column' | 'window'
  label: string
  rect: Rect
  blocking: boolean
  hinge?: 'left' | 'right'
}

export type RoomDefinition = {
  name: string
  width: number
  height: number
  polygon: Point[]
  walls: Wall[]
  fixtures: RoomFixture[]
  backgroundImage?: string
}

export type PlacementWarning = 'outside' | 'overlap' | 'fixture'

export type DistanceMeasurement = {
  key: string
  from: Point
  to: Point
  value: number
  label: string
  kind: 'wall' | 'furniture'
}
