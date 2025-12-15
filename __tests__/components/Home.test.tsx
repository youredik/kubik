import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../../src/app/page'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // Never resolves for products
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // Never resolves for sizes

    render(<Home />)

    expect(screen.getByText('Каталог багетов')).toBeInTheDocument()
  })

  it('should display products after successful fetch', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Test Product 1',
        article: 'ART001',
        images: '["image1.jpg"]',
        available: 1,
      },
      {
        id: 2,
        name: 'Test Product 2',
        article: 'ART002',
        images: '[]',
        available: 0,
      },
    ]

    const mockSizes = [
      { id: '1', label: '10×15', price: 100 },
      { id: '2', label: '15×20', price: 150 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSizes,
    } as Response)

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Артикул: ART001')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText('Артикул: ART002')).toBeInTheDocument()
  })

  it('should display "Временно нет доступных багетов" when no products exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('Временно нет доступных багетов')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('Временно нет доступных багетов')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should display the store header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('Заказ багетов')).toBeInTheDocument()
    })

    expect(screen.getByText('Админ')).toBeInTheDocument()
  })
})