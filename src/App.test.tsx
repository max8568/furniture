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
    expect(screen.getByText('房間還是空的')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '加入單人床' }))

    expect(screen.queryByText('房間還是空的')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /單人床，105 乘 190 公分/ })).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })

  it('rotates, nudges, and removes a selected item', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '加入書桌' }))

    const desk = screen.getByRole('button', { name: /書桌，120 乘 70 公分/ })
    fireEvent.keyDown(desk, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '旋轉 90°' }))
    fireEvent.click(screen.getByTitle('移除家具'))

    expect(screen.queryByRole('button', { name: /書桌，120 乘 70 公分/ })).not.toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
  })

  it('restores a saved layout on load', () => {
    localStorage.setItem('room-fit:layout', JSON.stringify({
      version: 1,
      furniture: [{ id: 'wardrobe', kind: 'wardrobe', x: 100, y: 100, rotation: 90 }],
    }))

    render(<App />)
    expect(screen.getByRole('button', { name: /衣櫃，90 乘 60 公分/ })).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
  })
})
