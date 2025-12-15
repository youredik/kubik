import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const ext = path.extname(originalName)
  return `${timestamp}_${random}${ext}`
}

// Resize image using Sharp
async function resizeImage(
  inputBuffer: Buffer,
  width: number,
  height: number,
  quality: number = 85
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality })
    .toBuffer()
}

// Validate file type
function isValidImageType(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const uploadedImages: string[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Validate file
        if (!isValidImageType(file.type)) {
          errors.push(`Invalid file type for ${file.name}: ${file.type}`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          errors.push(`File too large: ${file.name}`)
          continue
        }

        // Generate filename
        const filename = generateFilename(file.name)
        const filepath = path.join(UPLOAD_DIR, filename)

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Save original
        await writeFile(filepath, buffer)

        // Create catalog thumbnail (150x150)
        try {
          const catalogBuffer = await resizeImage(buffer, 150, 150)
          const catalogFilename = filename.replace(/\.[^/.]+$/, '_catalog.jpg')
          const catalogPath = path.join(UPLOAD_DIR, catalogFilename)
          await writeFile(catalogPath, catalogBuffer)
        } catch (error) {
          console.error('Failed to create catalog thumbnail:', error)
        }

        // Create view size (800x800)
        try {
          const viewBuffer = await resizeImage(buffer, 800, 800)
          const viewFilename = filename.replace(/\.[^/.]+$/, '_view.jpg')
          const viewPath = path.join(UPLOAD_DIR, viewFilename)
          await writeFile(viewPath, viewBuffer)
        } catch (error) {
          console.error('Failed to create view image:', error)
        }

        uploadedImages.push(filename)
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        errors.push(`Failed to process ${file.name}`)
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: 'No files were successfully uploaded', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedImages,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}