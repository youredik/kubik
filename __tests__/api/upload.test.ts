import { NextRequest } from 'next/server'
import { POST } from '../../src/app/api/upload/route'

// Mock dependencies
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

jest.mock('sharp', () => jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
})))

const mockWriteFile = require('fs/promises').writeFile
const mockMkdir = require('fs/promises').mkdir
const mockExistsSync = require('fs').existsSync
const mockSharp = require('sharp')

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExistsSync.mockReturnValue(true)
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
  })

  describe('POST /api/upload', () => {
    it('should upload images successfully', async () => {
      const mockFile = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('images', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        formData: () => Promise.resolve(formData)
      })

      // Mock Sharp buffer return
      mockSharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized image')),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.uploaded).toBeDefined()
      expect(result.uploaded.length).toBe(1)
      expect(result.uploaded[0]).toMatch(/\d+_\w+\.jpg/)

      expect(mockWriteFile).toHaveBeenCalledTimes(3) // original, catalog, view
      expect(mockSharp).toHaveBeenCalledTimes(2) // catalog and view versions
    })

    it('should handle multiple image uploads', async () => {
      const mockFile1 = new File(['test image 1'], 'test1.jpg', { type: 'image/jpeg' })
      const mockFile2 = new File(['test image 2'], 'test2.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('images', mockFile1)
      formData.append('images', mockFile2)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        formData: formData
      })

      mockSharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized image')),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.uploaded).toHaveLength(2)
      expect(mockWriteFile).toHaveBeenCalledTimes(6) // 3 files per image
    })

    it('should reject invalid file types', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('images', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        formData: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('No files were successfully uploaded')
      expect(result.details).toBeDefined()
      expect(result.details[0]).toContain('Invalid file type')
    })

    it('should reject files that are too large', async () => {
      // Create a large file (11MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024)
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('images', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: 'mock body'
      })
      request.formData = jest.fn().mockResolvedValue(formData)

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('No files were successfully uploaded')
      expect(result.details[0]).toContain('File too large')
    })

    it('should create upload directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const mockFile = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('images', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: 'mock body'
      })
      request.formData = jest.fn().mockResolvedValue(formData)

      mockSharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized image')),
      })

      await POST(request)

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('public/uploads'),
        { recursive: true }
      )
    })

    it('should handle Sharp processing errors gracefully', async () => {
      const mockFile = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('images', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: 'mock body'
      })
      request.formData = jest.fn().mockResolvedValue(formData)

      // Mock Sharp to throw error
      mockSharp.mockImplementation(() => {
        throw new Error('Sharp processing failed')
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200) // Still succeeds because original is saved
      expect(result.success).toBe(true)
      expect(result.uploaded).toHaveLength(1)
      expect(result.errors).toBeDefined() // But with errors for thumbnails
    })

    it('should return error when no files provided', async () => {
      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: 'mock body'
      })
      request.formData = jest.fn().mockResolvedValue(formData)

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No files provided')
    })
  })
})