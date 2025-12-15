import { DELETE } from '../../src/app/api/products/[id]/images/[imageName]/route'

// Mock dependencies
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { unlink as mockUnlink } from 'fs/promises'
import { existsSync as mockExistsSync } from 'fs'
import { prisma as mockPrisma } from '../../src/lib/prisma'

describe.skip('/api/products/[id]/images/[imageName]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockExistsSync as any).mockReturnValue(true)
    ;(mockUnlink as any).mockResolvedValue(undefined)
  })

  describe('DELETE /api/products/[id]/images/[imageName]', () => {
    it('should delete image successfully', async () => {
      const productId = '1'
      const imageName = '1734212345678_abc123.jpg'

      // Mock product with images
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test Product',
        images: JSON.stringify(['1734212345678_abc123.jpg', 'other_image.jpg']),
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 1,
        images: JSON.stringify(['other_image.jpg']),
      })

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: productId, imageName } }
      )

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Image deleted successfully')

      // Should delete all image sizes
      expect(mockUnlink as any).toHaveBeenCalledTimes(3)
      expect(mockUnlink as any).toHaveBeenCalledWith(
        expect.stringContaining('1734212345678_abc123.jpg')
      )
      expect(mockUnlink as any).toHaveBeenCalledWith(
        expect.stringContaining('1734212345678_abc123_catalog.jpg')
      )
      expect(mockUnlink as any).toHaveBeenCalledWith(
        expect.stringContaining('1734212345678_abc123_view.jpg')
      )

      // Should update product in database
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          images: JSON.stringify(['other_image.jpg'])
        }
      })
    })

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '999', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Product not found')
    })

    it('should return 404 when image not in product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        images: JSON.stringify(['other_image.jpg']),
      })

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'nonexistent.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Image not found in product')
    })

    it('should return 400 for invalid product ID', async () => {
      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: 'invalid', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid product ID')
    })

    it('should handle invalid JSON in images field', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        images: 'invalid json',
      })

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Invalid image data')
    })

    it('should handle file deletion errors gracefully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        images: JSON.stringify(['test.jpg']),
      })

      ;(mockUnlink as any).mockRejectedValue(new Error('File system error'))

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(200) // Still succeeds
      expect(result.success).toBe(true)
      expect(mockPrisma.product.update).toHaveBeenCalled()
    })

    it('should handle missing image files gracefully', async () => {
      ;(mockExistsSync as any).mockReturnValue(false)

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        images: JSON.stringify(['test.jpg']),
      })

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(mockUnlink as any).toHaveBeenCalledTimes(3) // Still attempts to delete
    })

    it('should handle database errors', async () => {
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to delete image')
    })

    it('should handle database update errors', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 1,
        images: JSON.stringify(['test.jpg']),
      })

      mockPrisma.product.update.mockRejectedValue(new Error('Update failed'))

      const response = await DELETE(
        new Request('http://localhost:3000'),
        { params: { id: '1', imageName: 'test.jpg' } }
      )

      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to delete image')
    })
  })
})