import type { FurnitureDefinition, FurnitureKind, RoomDefinition } from './types'

export const SNAP_DISTANCE_CM = 10

export const FURNITURE: Record<FurnitureKind, FurnitureDefinition> = {
  bed: {
    kind: 'bed',
    name: '單人床',
    width: 105,
    depth: 190,
    color: '#ef907f',
    accent: '#9f493f',
    icon: 'bed',
  },
  desk: {
    kind: 'desk',
    name: '書桌',
    width: 120,
    depth: 70,
    color: '#e9b85f',
    accent: '#8c6221',
    icon: 'desk',
  },
  bookcase: {
    kind: 'bookcase',
    name: '書櫃',
    width: 80,
    depth: 60,
    color: '#70b5a0',
    accent: '#286e5c',
    icon: 'bookcase',
  },
  wardrobe: {
    kind: 'wardrobe',
    name: '衣櫃',
    width: 90,
    depth: 60,
    color: '#819fce',
    accent: '#385b91',
    icon: 'wardrobe',
  },
}

export const FURNITURE_ORDER: FurnitureKind[] = ['bed', 'desk', 'bookcase', 'wardrobe']

export const ROOM: RoomDefinition = {
  name: '臥室',
  width: 401,
  height: 224,
  polygon: [
    { x: 96, y: 0 },
    { x: 401, y: 0 },
    { x: 401, y: 224 },
    { x: 0, y: 224 },
    { x: 0, y: 73 },
    { x: 96, y: 73 },
  ],
  walls: [
    { id: 'top', start: { x: 96, y: 0 }, end: { x: 401, y: 0 }, interiorSide: 'bottom' },
    { id: 'right', start: { x: 401, y: 0 }, end: { x: 401, y: 224 }, interiorSide: 'left' },
    { id: 'bottom', start: { x: 401, y: 224 }, end: { x: 80, y: 224 }, interiorSide: 'top' },
    { id: 'left', start: { x: 0, y: 224 }, end: { x: 0, y: 73 }, interiorSide: 'right' },
    { id: 'notch-bottom', start: { x: 0, y: 73 }, end: { x: 96, y: 73 }, interiorSide: 'bottom' },
    { id: 'notch-right', start: { x: 96, y: 73 }, end: { x: 96, y: 0 }, interiorSide: 'right' },
  ],
  fixtures: [
    {
      id: 'door-swing',
      type: 'door',
      label: '門扇開啟區',
      rect: { x: 0, y: 144, width: 80, height: 80 },
      blocking: true,
      hinge: 'left',
    },
  ],
}
