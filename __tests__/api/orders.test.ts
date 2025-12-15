import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/orders/route'
import {beforeEach, describe} from "node:test";

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

const mockPrisma = require('../../src/lib/prisma').prisma

describe('/api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/orders', () => {
    it('should return orders successfully', async () => {
      const mockOrders = [
        {
          id: 1,
          orderNumber: '0001',
          customerName: 'John Doe',
          phone: '+1234567890',
          deliveryType: 'pickup',
          address: '123 Main St',
          comment: 'Test comment',
          totalAmount: 250,
          createdAt: new Date('2023-01-01'),
          items: [
            {
              id: 1,
              productName: 'Product 1',
              article: 'ART001',
              size: 'A4',
              quantity: 2,
              price: 100,
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
        include: { items: true },
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
        orderNumber: '0001',
        customerName: 'John Doe',
        phone: '+1234567890',
        deliveryType: 'pickup',
        address: '123 Main St',
        comment: 'Test comment',
        totalAmount: 200,
        createdAt: new Date(),
        items: [
          {
            id: 1,
            productName: 'Product 1',
            article: 'ART001',
            size: 'A4',
            quantity: 2,
            price: 100,
          },
        ],
      }

      const requestBody = {
        name: 'John Doe',
        phone: '+1234567890',
        deliveryType: 'pickup',
        address: '123 Main St',
        comment: 'Test comment',
        items: [
          {
            productName: 'Product 1',
            article: 'ART001',
            sizeLabel: 'A4',
            quantity: 2,
            price: 100,
          },
        ],
        total: 200,
      }

      mockPrisma.order.count.mockResolvedValue(0)
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
      expect(result).toEqual({
        success: true,
        orderNumber: '0001',
        total: 200,
        order: mockOrder,
      })
      expect(mockPrisma.order.count).toHaveBeenCalled()
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: {
          orderNumber: '0001',
          customerName: 'John Doe',
          phone: '+1234567890',
          deliveryType: 'pickup',
          address: '123 Main St',
          comment: 'Test comment',
          totalAmount: 200,
          items: {
            create: [
              {
                productName: 'Product 1',
                article: 'ART001',
                size: 'A4',
                quantity: 2,
                price: 100,
              },
            ],
          },
        },
        include: { items: true },
      })
    })

    it('should handle database errors on create', async () => {
      const requestBody = {
        name: 'John Doe',
        phone: '+1234567890',
        deliveryType: 'pickup',
        address: '123 Main St',
        comment: 'Test comment',
        items: [
          {
            productName: 'Product 1',
            article: 'ART001',
            sizeLabel: 'A4',
            quantity: 2,
            price: 100,
          },
        ],
        total: 200,
      }

      mockPrisma.order.count.mockResolvedValue(0)
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