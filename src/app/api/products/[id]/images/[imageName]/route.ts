import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; imageName: string } }
) {
  try {
    const productId = parseInt(params.id)
    const imageName = params.imageName

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Get the product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Parse current images
    let images: string[] = []
    try {
      images = JSON.parse(product.images || '[]')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image data' },
        { status: 500 }
      )
    }

    // Check if image exists in product's images
    if (!images.includes(imageName)) {
      return NextResponse.json(
        { error: 'Image not found in product' },
        { status: 404 }
      )
    }

    // Remove image from array
    const updatedImages = images.filter(img => img !== imageName)

    // Delete physical files (all sizes)
    const sizes = ['', '_catalog', '_view'] // original, catalog, view
    const ext = path.extname(imageName)
    const baseName = path.basename(imageName, ext)

    for (const size of sizes) {
      const filename = `${baseName}${size}.jpg`
      const filepath = path.join(UPLOAD_DIR, filename)

      try {
        if (existsSync(filepath)) {
          await unlink(filepath)
        }
      } catch (error) {
        console.error(`Failed to delete file ${filename}:`, error)
        // Continue with other files
      }
    }

    // Update product in database
    await prisma.product.update({
      where: { id: productId },
      data: {
        images: JSON.stringify(updatedImages)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}