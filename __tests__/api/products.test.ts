import { NextRequest } from 'next/server'
import { GET, POST } from '../../src/app/api/products/route'

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockPrisma = require('../../src/lib/prisma').prisma

describe('/api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/products', () => {
    it('should return products successfully', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Test Product',
          article: 'ART001',
          images: '["image1.jpg"]',
          available: true,
        },
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual([
        {
          id: 1,
          name: 'Test Product',
          article: 'ART001',
          images: '["image1.jpg"]',
          available: true,
        },
      ])
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { available: true },
        orderBy: { name: 'asc' },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toEqual({ error: 'Failed to fetch products' })
    })
  })

  describe('POST /api/products', () => {
    it('should create a product successfully', async () => {
      const mockProduct = {
        id: 1,
        name: 'New Product',
        article: 'ART002',
        images: '["image1.jpg"]',
        available: true,
      }

      const requestBody = {
        name: 'New Product',
        article: 'ART002',
        images: ['image1.jpg'],
        available: true,
      }

      mockPrisma.product.create.mockResolvedValue(mockProduct)

      const request = new NextRequest('http://localhost:3000/api/products', {
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
        id: 1,
        name: 'New Product',
        article: 'ART002',
        images: '["image1.jpg"]',
        available: true,
      })
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'New Product',
          article: 'ART002',
          images: JSON.stringify(['image1.jpg']),
          available: true,
        },
      })
    })


    it('should handle database errors on create', async () => {
      const requestBody = {
        name: 'New Product',
        article: 'ART002',
        images: ['image1.jpg'],
        available: true,
      }

      mockPrisma.product.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toEqual({ error: 'Failed to create product' })
    })
  })
})