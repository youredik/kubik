import { NextRequest } from 'next/server'
import { GET, POST } from '../../src/app/api/orders/route'

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import { prisma } from '../../src/lib/prisma'
const mockPrisma = prisma as any

describe.skip('/api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/orders', () => {
    it('should return orders successfully', async () => {
      const mockOrders = [
        {
          id: 1,
          orderNumber: 'ORD001',
          customerName: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          status: 'pending',
          totalPrice: 250,
          createdAt: new Date('2023-01-01'),
          items: [
            {
              id: 1,
              quantity: 2,
              price: 100,
              product: { id: 1, name: 'Product 1' },
              size: { id: 1, name: 'A4' },
            },
          ],
        },
      ]

      mockPrisma.order.findMany.mockResolvedValue(mockOrders)

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual(mockOrders)
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        include: { items: { include: { product: true, size: true } } },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toEqual({ error: 'Failed to fetch orders' })
    })
  })

  describe('POST /api/orders', () => {
    it('should create an order successfully', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD001',
        customerName: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        status: 'pending',
        totalPrice: 250,
        createdAt: new Date(),
        items: [
          {
            id: 1,
            quantity: 2,
            price: 100,
            productId: 1,
            sizeId: 1,
          },
        ],
      }

      const requestBody = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        items: [
          {
            productId: 1,
            sizeId: 1,
            quantity: 2,
            price: 100,
          },
        ],
      }

      mockPrisma.order.create.mockResolvedValue(mockOrder)

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result).toEqual(mockOrder)
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: {
          orderNumber: expect.any(String), // Generated order number
          customerName: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          status: 'pending',
          totalPrice: 200, // 2 * 100
          items: {
            create: [
              {
                productId: 1,
                sizeId: 1,
                quantity: 2,
                price: 100,
              },
            ],
          },
        },
        include: { items: true },
      })
    })

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toEqual({ error: 'Name, phone, and items are required' })
    })

    it('should handle empty items array', async () => {
      const requestBody = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        items: [],
      }

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result).toEqual({ error: 'At least one item is required' })
    })

    it('should handle database errors on create', async () => {
      const requestBody = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        items: [
          {
            productId: 1,
            sizeId: 1,
            quantity: 2,
            price: 100,
          },
        ],
      }

      mockPrisma.order.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toEqual({ error: 'Failed to create order' })
    })
  })
})