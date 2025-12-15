import { GET } from '../../src/app/api/sizes/route'

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    size: {
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '../../src/lib/prisma'
const mockPrisma = prisma as any

describe('/api/sizes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/sizes', () => {
    it('should return sizes successfully', async () => {
      const mockSizes = [
        {
          id: 1,
          name: 'A4',
          width: 210,
          height: 297,
          price: 100,
        },
        {
          id: 2,
          name: 'A3',
          width: 297,
          height: 420,
          price: 150,
        },
      ]

      mockPrisma.size.findMany.mockResolvedValue(mockSizes)

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual(mockSizes)
      expect(mockPrisma.size.findMany).toHaveBeenCalledWith({
        orderBy: { price: 'asc' },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.size.findMany.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toEqual({ error: 'Failed to fetch sizes' })
    })

    it('should return empty array when no sizes exist', async () => {
      mockPrisma.size.findMany.mockResolvedValue([])

      const response = await GET()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual([])
    })
  })
})