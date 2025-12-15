import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminPage from '../../src/app/admin/page'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('AdminPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display admin header', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<AdminPage />)

    expect(screen.getByText('Админ-панель - Управление багетами')).toBeInTheDocument()
  })

  it('should display tab buttons', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<AdminPage />)

    expect(screen.getByText('Багеты')).toBeInTheDocument()
    expect(screen.getByText('Размеры')).toBeInTheDocument()
    expect(screen.getByText('Заказы')).toBeInTheDocument()
  })

  it('should display products tab by default', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Test Product',
        article: 'ART001',
        images: [],
        available: true,
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await act(async () => {
      render(<AdminPage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Управление багетами')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Артикул: ART001')).toBeInTheDocument()
  })

  it('should switch to sizes tab', async () => {
    const mockSizes = [
      { id: '1', label: '10×15', price: 100 },
      { id: '2', label: '15×20', price: 150 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSizes,
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await act(async () => {
      render(<AdminPage />)
    })

    const sizesTab = screen.getByText('Размеры')
    fireEvent.click(sizesTab)

    await waitFor(() => {
      expect(screen.getByText('Управление размерами')).toBeInTheDocument()
    })

    expect(screen.getByText('10×15 - 100 ₽')).toBeInTheDocument()
    expect(screen.getByText('15×20 - 150 ₽')).toBeInTheDocument()
  })

  it('should switch to orders tab', async () => {
    const mockOrders = [
      {
        id: 1,
        orderNumber: '0001',
        customerName: 'John Doe',
        phone: '+1234567890',
        totalAmount: 250,
        createdAt: '2023-01-01',
        items: [],
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders,
    } as Response)

    await act(async () => {
      render(<AdminPage />)
    })

    const ordersTab = screen.getByText('Заказы')
    fireEvent.click(ordersTab)

    await waitFor(() => {
      expect(screen.getByText('Заказы')).toBeInTheDocument()
    })

    expect(screen.getByText('Заказ #0001')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should open product modal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await act(async () => {
      render(<AdminPage />)
    })

    const addButton = screen.getByText('Добавить багет')
    fireEvent.click(addButton)

    expect(screen.getByText('Добавить багет')).toBeInTheDocument()
    expect(screen.getByText('Название:')).toBeInTheDocument()
    expect(screen.getByText('Артикул:')).toBeInTheDocument()
  })
})