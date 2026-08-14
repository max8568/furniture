import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('RoomFit interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('starts empty and lets the user add one furniture item', () => {
    render(<App />)
    expect(screen.getByText('Your room is empty')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Single Bed' }))

    expect(screen.queryByText('Your room is empty')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Single Bed, 105 by 190 centimeters/ })).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })

  it('rotates, nudges, and removes a selected item', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Desk' }))

    const desk = screen.getByRole('button', { name: /Desk, 120 by 70 centimeters/ })
    fireEvent.keyDown(desk, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }))
    fireEvent.click(screen.getByTitle('Remove furniture'))

    expect(screen.queryByRole('button', { name: /Desk, 120 by 70 centimeters/ })).not.toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
  })

  it('restores a saved layout on load', () => {
    localStorage.setItem('room-fit:layout', JSON.stringify({
      version: 1,
      furniture: [{ id: 'wardrobe', kind: 'wardrobe', x: 100, y: 100, rotation: 90 }],
    }))

    render(<App />)
    expect(screen.getByRole('button', { name: /Wardrobe, 90 by 60 centimeters/ })).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })

  it('renders measurements above the furniture layer', () => {
    const { container } = render(<App />)
    const furnitureLayer = container.querySelector('.furniture-layer')!
    const measurementsLayer = container.querySelector('.measurements-layer')!

    expect(
      furnitureLayer.compareDocumentPosition(measurementsLayer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders the door swing around the left hinge', () => {
    const { container } = render(<App />)
    const swing = container.querySelector('.door-fixture path')

    expect(swing).toHaveAttribute('d', 'M 80 224 A 80 80 0 0 0 0 144')
  })

  it('rotates the furniture details together with the body', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Single Bed' }))
    expect(container.querySelector('.furniture__glyph')).toHaveAttribute('transform', 'rotate(0)')

    fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }))

    expect(container.querySelector('.furniture__glyph')).toHaveAttribute('transform', 'rotate(90)')
  })

  it('updates furniture dimensions from the sidebar controls', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Desk width in centimeters' }), {
      target: { value: '145' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Desk' }))

    expect(screen.getByRole('button', { name: /Desk, 145 by 70 centimeters/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Desk depth in centimeters' }), {
      target: { value: '85' },
    })

    expect(screen.getByRole('button', { name: /Desk, 145 by 85 centimeters/ })).toBeInTheDocument()
  })
})
