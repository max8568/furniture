import { useEffect, useMemo, useRef, useState } from 'react'
import { FURNITURE, FURNITURE_ORDER, ROOM, SNAP_DISTANCE_CM } from './config'
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
import { loadPlannerState, savePlannerState } from './storage'
import type {
  DistanceMeasurement,
  FurnitureDimensionMap,
  FurnitureKind,
  PlacementWarning,
  PlacedFurniture,
  Point,
  Rotation,
} from './types'

const VIEWBOX = { x: -34, y: -34, width: ROOM.width + 68, height: ROOM.height + 68 }

type DragState = {
  id: string
  pointerId: number
  offset: Point
}

const WARNING_TEXT: Record<PlacementWarning, string> = {
  outside: 'Furniture extends beyond the room boundary',
  overlap: 'Furniture overlaps another item',
  fixture: 'Furniture blocks a fixed room feature',
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'trash') return <svg {...common}><path d="M4 7h16M9 11v6M15 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
  if (name === 'rotate') return <svg {...common}><path d="M20 11a8 8 0 1 0-2.34 5.66" /><path d="M20 4v7h-7" /></svg>
  if (name === 'undo') return <svg {...common}><path d="M9 7 5 11l4 4" /><path d="M5 11h8a6 6 0 1 1-5.2 9" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'info') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  if (name === 'ruler') return <svg {...common}><path d="m4 17 13-13 3 3L7 20 4 17Z" /><path d="m14 7 3 3M11 10l2 2M8 13l3 3" /></svg>
  return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5v14M16 5v14" /></svg>
}

function getWarnings(item: PlacedFurniture, all: PlacedFurniture[]): PlacementWarning[] {
  const rect = furnitureToRect(item)
  const warnings: PlacementWarning[] = []
  if (!rectInsidePolygon(rect, ROOM.polygon)) warnings.push('outside')
  if (all.some((other) => other.id !== item.id && rectsOverlap(rect, furnitureToRect(other)))) {
    warnings.push('overlap')
  }
  if (ROOM.fixtures.some((fixture) => fixture.blocking && rectsOverlap(rect, fixture.rect))) {
    warnings.push('fixture')
  }
  return warnings
}

function FurnitureGlyph({
  kind,
  width,
  depth,
}: {
  kind: FurnitureKind
  width: number
  depth: number
}) {
  const definition = FURNITURE[kind]
  const height = depth
  const x = -width / 2
  const y = -height / 2
  const stroke = definition.accent

  if (kind === 'bed') {
    const head = Math.min(28, height * 0.2)
    return (
      <g opacity=".72" stroke={stroke} fill="none" strokeWidth="2">
        <line x1={x} y1={y + head} x2={x + width} y2={y + head} />
        <rect x={x + 8} y={y + 7} width={width - 16} height={Math.max(10, head - 12)} rx="5" />
        <path d={`M ${x + 8} ${y + head + 13} Q 0 ${y + head + 2} ${x + width - 8} ${y + head + 13}`} opacity=".5" />
      </g>
    )
  }
  if (kind === 'desk') {
    return (
      <g opacity=".66" stroke={stroke} fill="none" strokeWidth="2">
        <line x1={x + 8} y1={y + 11} x2={x + width - 8} y2={y + 11} />
        <circle cx={0} cy={Math.min(10, height / 5)} r={Math.min(15, width / 7)} />
        <path d={`M ${-Math.min(25, width / 4)} ${y + height - 12} H ${Math.min(25, width / 4)}`} />
      </g>
    )
  }
  if (kind === 'bookcase') {
    return (
      <g opacity=".62" stroke={stroke} fill="none" strokeWidth="1.8">
        {[-0.25, 0, 0.25].map((ratio) => <line key={ratio} x1={x + 6} y1={ratio * height} x2={x + width - 6} y2={ratio * height} />)}
      </g>
    )
  }
  return (
    <g opacity=".64" stroke={stroke} fill="none" strokeWidth="1.8">
      <line x1="0" y1={y + 5} x2="0" y2={y + height - 5} />
      <circle cx="-5" cy="0" r="1.8" fill={stroke} />
      <circle cx="5" cy="0" r="1.8" fill={stroke} />
    </g>
  )
}

function Measurement({ measurement }: { measurement: DistanceMeasurement }) {
  const dx = measurement.to.x - measurement.from.x
  const dy = measurement.to.y - measurement.from.y
  const length = Math.hypot(dx, dy)
  if (length < 0.1 && measurement.label !== 'Overlap') return null
  const midX = (measurement.from.x + measurement.to.x) / 2
  const midY = (measurement.from.y + measurement.to.y) / 2
  const labelWidth = measurement.label.length * 7.1 + 14
  const color = measurement.kind === 'furniture' ? '#c05b46' : '#44766e'

  if (measurement.label === 'Overlap') {
    return (
      <g className="measurement measurement--overlap" pointerEvents="none">
        <rect x={midX - 24} y={midY - 10} width="48" height="20" rx="10" fill="#a84135" />
        <text x={midX} y={midY + 4} textAnchor="middle" fill="white">Overlap</text>
      </g>
    )
  }

  return (
    <g className="measurement" pointerEvents="none" style={{ color }}>
      <line x1={measurement.from.x} y1={measurement.from.y} x2={measurement.to.x} y2={measurement.to.y} />
      <line
        x1={measurement.from.x - (dy === 0 ? 0 : 4)}
        y1={measurement.from.y - (dx === 0 ? 0 : 4)}
        x2={measurement.from.x + (dy === 0 ? 0 : 4)}
        y2={measurement.from.y + (dx === 0 ? 0 : 4)}
      />
      <line
        x1={measurement.to.x - (dy === 0 ? 0 : 4)}
        y1={measurement.to.y - (dx === 0 ? 0 : 4)}
        x2={measurement.to.x + (dy === 0 ? 0 : 4)}
        y2={measurement.to.y + (dx === 0 ? 0 : 4)}
      />
      <rect x={midX - labelWidth / 2} y={midY - 9} width={labelWidth} height="18" rx="9" />
      <text x={midX} y={midY + 3.5} textAnchor="middle">{measurement.label}</text>
    </g>
  )
}

function App() {
  const [initialState] = useState(loadPlannerState)
  const [placed, setPlaced] = useState<PlacedFurniture[]>(initialState.furniture)
  const [dimensions, setDimensions] = useState<FurnitureDimensionMap>(initialState.dimensions)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('Room planner ready')
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => savePlannerState(placed, dimensions), [placed, dimensions])

  const selected = placed.find((item) => item.id === selectedId) ?? null
  const warningMap = useMemo(
    () => new Map(placed.map((item) => [item.id, getWarnings(item, placed)])),
    [placed],
  )
  const selectedWarnings = selected ? warningMap.get(selected.id) ?? [] : []
  const measurements = useMemo(() => {
    if (!selected) return []
    const nearest = nearestFurnitureMeasurement(selected, placed)
    return [...wallMeasurements(selected, ROOM), ...(nearest ? [nearest] : [])]
  }, [selected, placed])

  function addFurniture(kind: FurnitureKind) {
    if (placed.some((item) => item.kind === kind)) return
    const definition = FURNITURE[kind]
    const currentDimensions = dimensions[kind]
    const point = findAvailablePosition({ ...definition, ...currentDimensions }, placed, ROOM)
    const next: PlacedFurniture = {
      id: kind,
      kind,
      ...currentDimensions,
      ...point,
      rotation: 0,
    }
    setPlaced((current) => [...current, next])
    setSelectedId(next.id)
    setAnnouncement(`${definition.name} added`)
  }

  function removeFurniture(id: string) {
    const item = placed.find((candidate) => candidate.id === id)
    setPlaced((current) => current.filter((candidate) => candidate.id !== id))
    if (selectedId === id) setSelectedId(null)
    if (item) setAnnouncement(`${FURNITURE[item.kind].name} removed`)
  }

  function rotateFurniture(id: string) {
    setPlaced((current) => current.map((item) => {
      if (item.id !== id) return item
      const rotation = ((item.rotation + 90) % 360) as Rotation
      const size = getFurnitureSize(item, rotation)
      const snapped = applyWallSnap({ x: item.x, y: item.y }, size, ROOM, SNAP_DISTANCE_CM)
      return { ...item, ...snapped, rotation }
    }))
    const item = placed.find((candidate) => candidate.id === id)
    if (item) setAnnouncement(`${FURNITURE[item.kind].name} rotated 90 degrees`)
  }

  function updateFurnitureDimension(
    kind: FurnitureKind,
    field: 'width' | 'depth',
    value: number,
  ) {
    if (!Number.isFinite(value)) return
    const normalized = Math.max(20, Math.min(400, Math.round(value)))
    setDimensions((current) => ({
      ...current,
      [kind]: { ...current[kind], [field]: normalized },
    }))
    setPlaced((current) => current.map((item) => item.kind === kind
      ? { ...item, [field]: normalized }
      : item))
    setAnnouncement(`${FURNITURE[kind].name} ${field} updated to ${normalized} centimeters`)
  }

  function resetFurnitureDimensions(kind: FurnitureKind) {
    const defaults = {
      width: FURNITURE[kind].width,
      depth: FURNITURE[kind].depth,
    }
    setDimensions((current) => ({ ...current, [kind]: defaults }))
    setPlaced((current) => current.map((item) => item.kind === kind
      ? { ...item, ...defaults }
      : item))
    setAnnouncement(`${FURNITURE[kind].name} dimensions reset to default`)
  }

  function clientToRoom(clientX: number, clientY: number): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const matrix = svg.getScreenCTM()?.inverse()
    return matrix ? point.matrixTransform(matrix) : { x: 0, y: 0 }
  }

  function beginDrag(event: React.PointerEvent<SVGGElement>, item: PlacedFurniture) {
    event.preventDefault()
    event.stopPropagation()
    const pointer = clientToRoom(event.clientX, event.clientY)
    dragRef.current = {
      id: item.id,
      pointerId: event.pointerId,
      offset: { x: pointer.x - item.x, y: pointer.y - item.y },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(item.id)
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const pointer = clientToRoom(event.clientX, event.clientY)
    setPlaced((current) => current.map((item) => {
      if (item.id !== drag.id) return item
      const size = getFurnitureSize(item, item.rotation)
      const raw = {
        x: Math.max(0, Math.min(ROOM.width, pointer.x - drag.offset.x)),
        y: Math.max(0, Math.min(ROOM.height, pointer.y - drag.offset.y)),
      }
      return { ...item, ...applyWallSnap(raw, size, ROOM, SNAP_DISTANCE_CM) }
    }))
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const item = placed.find((candidate) => candidate.id === drag.id)
    dragRef.current = null
    if (item) setAnnouncement(`${FURNITURE[item.kind].name} position updated`)
  }

  function nudgeSelected(event: React.KeyboardEvent<SVGGElement>, item: PlacedFurniture) {
    const delta = event.shiftKey ? 1 : 5
    const movement: Partial<Point> = {}
    if (event.key === 'ArrowLeft') movement.x = item.x - delta
    if (event.key === 'ArrowRight') movement.x = item.x + delta
    if (event.key === 'ArrowUp') movement.y = item.y - delta
    if (event.key === 'ArrowDown') movement.y = item.y + delta
    if (movement.x === undefined && movement.y === undefined) return
    event.preventDefault()
    setPlaced((current) => current.map((candidate) => candidate.id === item.id
      ? {
          ...candidate,
          x: Math.max(0, Math.min(ROOM.width, movement.x ?? candidate.x)),
          y: Math.max(0, Math.min(ROOM.height, movement.y ?? candidate.y)),
        }
      : candidate))
  }

  function clearLayout() {
    if (!placed.length || window.confirm('Remove all furniture from the room?')) {
      setPlaced([])
      setSelectedId(null)
      setAnnouncement('Layout cleared')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true"><span /></span>
          <div>
            <strong>RoomFit</strong>
            <span>Furniture Planner</span>
          </div>
        </div>
        <div className="topbar__room">
          <span className="status-dot" />
          {ROOM.name}
          <span className="topbar__dimensions">{ROOM.width} × {ROOM.height} cm</span>
        </div>
        <button className="button button--quiet" type="button" onClick={clearLayout} disabled={!placed.length}>
          <Icon name="trash" size={17} />
          Clear Layout
        </button>
      </header>

      <main className="workspace">
        <section className="canvas-panel" aria-label="Room planning canvas">
          <div className="canvas-panel__head">
            <div>
              <p className="eyebrow">Planning Canvas</p>
              <h1>Design your ideal flow</h1>
              <p>Drag furniture to reposition it, then select an item to view exact clearances.</p>
            </div>
            {selected ? (
              <div className="selection-tools" aria-label={`${FURNITURE[selected.kind].name} controls`}>
                <span><i style={{ backgroundColor: FURNITURE[selected.kind].color }} />{FURNITURE[selected.kind].name}</span>
                <button type="button" onClick={() => rotateFurniture(selected.id)} title="Rotate clockwise 90 degrees">
                  <Icon name="rotate" size={18} />Rotate 90°
                </button>
                <button className="selection-tools__delete" type="button" onClick={() => removeFurniture(selected.id)} title="Remove furniture">
                  <Icon name="trash" size={18} /><span className="sr-only">Remove furniture</span>
                </button>
              </div>
            ) : (
              <div className="selection-hint"><Icon name="info" size={17} />Select furniture to edit</div>
            )}
          </div>

          <div className="canvas-wrap">
            <svg
              ref={svgRef}
              className="room-canvas"
              viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
              role="application"
              aria-label={`${ROOM.width} by ${ROOM.height} centimeter room floor plan`}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null)
              }}
            >
              <defs>
                <pattern id="small-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d6d1c6" strokeWidth=".7" />
                </pattern>
                <pattern id="large-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#small-grid)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c4beb2" strokeWidth="1" />
                </pattern>
                <filter id="furniture-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#372f28" floodOpacity=".18" />
                </filter>
                <clipPath id="room-clip">
                  <polygon points={ROOM.polygon.map((point) => `${point.x},${point.y}`).join(' ')} />
                </clipPath>
              </defs>

              <g className="room-layer">
                <polygon className="room-floor" points={ROOM.polygon.map((point) => `${point.x},${point.y}`).join(' ')} />
                <polygon className="room-grid" points={ROOM.polygon.map((point) => `${point.x},${point.y}`).join(' ')} />
                {ROOM.backgroundImage && (
                  <image href={ROOM.backgroundImage} x="0" y="0" width={ROOM.width} height={ROOM.height} clipPath="url(#room-clip)" />
                )}
                {ROOM.walls.map((wall) => (
                  <line key={wall.id} className="room-wall" x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} />
                ))}

                {ROOM.fixtures.map((fixture) => {
                  const { x, y, width, height } = fixture.rect
                  if (fixture.type === 'door') {
                    const hingeOnLeft = fixture.hinge === 'left'
                    const hingeX = hingeOnLeft ? x : x + width
                    const closedX = hingeOnLeft ? x + width : x
                    const sweep = hingeOnLeft ? 0 : 1
                    return (
                      <g key={fixture.id} className="door-fixture" aria-label={fixture.label}>
                        <path d={`M ${closedX} ${y + height} A ${width} ${height} 0 0 ${sweep} ${hingeX} ${y}`} />
                        <line x1={hingeX} y1={y + height} x2={hingeX} y2={y} />
                        <line x1={hingeX} y1={y + height} x2={closedX} y2={y + height} />
                        <text x={x + width * .38} y={y + height * .72}>Door</text>
                      </g>
                    )
                  }
                  if (fixture.type === 'column') {
                    return <rect key={fixture.id} className="column-fixture" x={x} y={y} width={width} height={height} aria-label={fixture.label} />
                  }
                  return (
                    <g key={fixture.id} className="window-fixture" aria-label={fixture.label}>
                      <line x1={x} y1={y} x2={x + width} y2={y + height} />
                    </g>
                  )
                })}
              </g>

              <g className="furniture-layer">
                {placed.map((item) => {
                  const definition = FURNITURE[item.kind]
                  const size = getFurnitureSize(item, item.rotation)
                  const isSelected = item.id === selectedId
                  const warnings = warningMap.get(item.id) ?? []
                  const hasWarning = warnings.length > 0
                  return (
                    <g
                      key={item.id}
                      className={`furniture ${isSelected ? 'furniture--selected' : ''} ${hasWarning ? 'furniture--warning' : ''}`}
                      transform={`translate(${item.x} ${item.y})`}
                      tabIndex={0}
                      role="button"
                      aria-label={`${definition.name}, ${item.width} by ${item.depth} centimeters${hasWarning ? `, ${warnings.map((warning) => WARNING_TEXT[warning]).join(', ')}` : ''}`}
                      onPointerDown={(event) => beginDrag(event, item)}
                      onKeyDown={(event) => nudgeSelected(event, item)}
                      onFocus={() => setSelectedId(item.id)}
                    >
                      <rect
                        className="furniture__body"
                        x={-size.width / 2}
                        y={-size.height / 2}
                        width={size.width}
                        height={size.height}
                        rx="4"
                        fill={definition.color}
                        stroke={definition.accent}
                        filter="url(#furniture-shadow)"
                      />
                      <g className="furniture__glyph" transform={`rotate(${item.rotation})`}>
                        <FurnitureGlyph kind={item.kind} width={item.width} depth={item.depth} />
                      </g>
                      <text className="furniture__name" y="4" textAnchor="middle">{definition.name}</text>
                      <text className="furniture__size" y="18" textAnchor="middle">{item.width} × {item.depth}</text>
                      {hasWarning && (
                        <g className="furniture__alert" transform={`translate(${size.width / 2 - 2} ${-size.height / 2 + 2})`}>
                          <circle r="9" />
                          <text y="4" textAnchor="middle">!</text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </g>

              <g className="measurements-layer">
                {measurements.map((measurement) => <Measurement key={measurement.key} measurement={measurement} />)}
              </g>

              <g className="room-dimension room-dimension--width">
                <line x1="0" y1="-20" x2={ROOM.width} y2="-20" />
                <line x1="0" y1="-25" x2="0" y2="-15" />
                <line x1={ROOM.width} y1="-25" x2={ROOM.width} y2="-15" />
                <rect x={ROOM.width / 2 - 29} y="-29" width="58" height="18" rx="9" />
                <text x={ROOM.width / 2} y="-16" textAnchor="middle">{ROOM.width} cm</text>
              </g>
              <g className="room-dimension room-dimension--height">
                <line x1={ROOM.width + 20} y1="0" x2={ROOM.width + 20} y2={ROOM.height} />
                <line x1={ROOM.width + 15} y1="0" x2={ROOM.width + 25} y2="0" />
                <line x1={ROOM.width + 15} y1={ROOM.height} x2={ROOM.width + 25} y2={ROOM.height} />
                <g transform={`translate(${ROOM.width + 20} ${ROOM.height / 2}) rotate(90)`}>
                  <rect x="-29" y="-9" width="58" height="18" rx="9" />
                  <text y="4" textAnchor="middle">{ROOM.height} cm</text>
                </g>
              </g>
            </svg>

            {!placed.length && (
              <div className="empty-state" aria-hidden="true">
                <span><Icon name="plus" size={24} /></span>
                <strong>Your room is empty</strong>
                <p>Add your first item from the furniture list</p>
              </div>
            )}

            <div className="canvas-legend">
              <span><i className="legend-grid" />Each small square is 20 cm</span>
              <span><i className="legend-snap" />Wall snap within 10 cm</span>
            </div>
          </div>

          <div className={`warning-bar ${selectedWarnings.length ? 'warning-bar--active' : ''}`}>
            {selectedWarnings.length ? (
              <><span className="warning-bar__icon">!</span><strong>Placement warning</strong><span>{selectedWarnings.map((warning) => WARNING_TEXT[warning]).join(', ')}</span></>
            ) : (
              <><Icon name="check" size={18} /><span>{selected ? 'No placement issues detected' : 'Select furniture to view placement checks'}</span></>
            )}
          </div>
        </section>

        <aside className="sidebar" aria-label="Furniture list">
          <div className="sidebar__head">
            <div>
              <p className="eyebrow">Furniture List</p>
              <h2>Choose furniture</h2>
            </div>
            <span className="sidebar__count">{placed.length} / {FURNITURE_ORDER.length}</span>
          </div>
          <p className="sidebar__intro">Add one of each furniture type to the room.</p>

          <div className="furniture-list">
            {FURNITURE_ORDER.map((kind) => {
              const definition = FURNITURE[kind]
              const itemDimensions = dimensions[kind]
              const usesDefaultDimensions =
                itemDimensions.width === definition.width &&
                itemDimensions.depth === definition.depth
              const item = placed.find((candidate) => candidate.kind === kind)
              const isAdded = Boolean(item)
              return (
                <article className={`furniture-card ${isAdded ? 'furniture-card--added' : ''}`} key={kind}>
                  <button
                    type="button"
                    className="furniture-card__preview"
                    style={{ '--item-color': definition.color, '--item-accent': definition.accent } as React.CSSProperties}
                    onClick={() => item ? setSelectedId(item.id) : addFurniture(kind)}
                    aria-label={isAdded ? `Select ${definition.name}` : `Add ${definition.name}`}
                  >
                    <span className={`mini-furniture mini-furniture--${kind}`}><i /></span>
                  </button>
                  <div className="furniture-card__details">
                    <div className="furniture-card__title">
                      <h3>{definition.name}</h3>
                      {isAdded && <span><Icon name="check" size={12} />Added</span>}
                    </div>
                    <div className="dimension-inputs">
                      <label htmlFor={`${kind}-width`}>
                        <span>Width</span>
                        <span className="dimension-input">
                          <input
                            id={`${kind}-width`}
                            type="number"
                            min="20"
                            max="400"
                            step="1"
                            value={itemDimensions.width}
                            aria-label={`${definition.name} width in centimeters`}
                            onChange={(event) => updateFurnitureDimension(kind, 'width', event.currentTarget.valueAsNumber)}
                          />
                          <em>cm</em>
                        </span>
                      </label>
                      <label htmlFor={`${kind}-depth`}>
                        <span>Depth</span>
                        <span className="dimension-input">
                          <input
                            id={`${kind}-depth`}
                            type="number"
                            min="20"
                            max="400"
                            step="1"
                            value={itemDimensions.depth}
                            aria-label={`${definition.name} depth in centimeters`}
                            onChange={(event) => updateFurnitureDimension(kind, 'depth', event.currentTarget.valueAsNumber)}
                          />
                          <em>cm</em>
                        </span>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="dimension-reset"
                      disabled={usesDefaultDimensions}
                      aria-label={`Reset ${definition.name} dimensions`}
                      onClick={() => resetFurnitureDimensions(kind)}
                    >
                      <Icon name="undo" size={13} />Reset size
                    </button>
                    {isAdded ? (
                      <div className="furniture-card__actions">
                        <button type="button" onClick={() => item && rotateFurniture(item.id)}><Icon name="rotate" size={16} />Rotate</button>
                        <button type="button" className="remove" onClick={() => item && removeFurniture(item.id)}><Icon name="trash" size={16} />Remove</button>
                      </div>
                    ) : (
                      <button type="button" className="add-button" onClick={() => addFurniture(kind)}><Icon name="plus" size={17} />Add to room</button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="sidebar-tip">
            <Icon name="ruler" size={20} />
            <div><strong>How do clearances work?</strong><p>Select furniture on the canvas to see its clearance from each wall and the nearest item.</p></div>
          </div>
          <div className="save-status"><span /><p><strong>Automatically saved</strong><small>Your layout stays on this device</small></p></div>
        </aside>
      </main>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  )
}

export default App
