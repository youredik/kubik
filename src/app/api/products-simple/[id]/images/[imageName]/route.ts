import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageName: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    const imageName = resolvedParams.imageName

    console.log('DELETE request:', { productId, imageName })

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    if (!imageName) {
      return NextResponse.json({ error: 'Image name is required' }, { status: 400 })
    }

    // Connect to database
    const db = new Database('dev.db')

    // Get current product images
    const product = db.prepare('SELECT images FROM products WHERE id = ?').get(productId) as { images: string } | undefined

    if (!product) {
      db.close()
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log('Product found, images field:', product.images)

    // Parse images array
    const images = JSON.parse(product.images || '[]')
    console.log('Parsed images array:', images)
    console.log('Image to delete:', imageName)

    // Check if image exists in product
    if (!images.includes(imageName)) {
      console.log('Image not found in array')
      db.close()
      return NextResponse.json({ error: 'Image not found in product' }, { status: 404 })
    }

    // Remove image from array
    const updatedImages = images.filter((img: string) => img !== imageName)
    console.log('Updated images array:', updatedImages)

    // Update product in database
    const updateQuery = 'UPDATE products SET images = ? WHERE id = ?'
    const updateResult = db.prepare(updateQuery).run(JSON.stringify(updatedImages), productId)
    console.log('Database update result:', updateResult)

    // Verify the update
    const verifyQuery = 'SELECT images FROM products WHERE id = ?'
    const updatedProduct = db.prepare(verifyQuery).get(productId) as { images: string }
    console.log('Verified updated images in DB:', updatedProduct?.images)

    db.close()

    // Delete physical files
    try {
      const baseName = imageName.replace(/\.[^/.]+$/, '')

      const filesToDelete = [
        path.join(UPLOAD_DIR, imageName), // original
        path.join(UPLOAD_DIR, `${baseName}_catalog.jpg`), // catalog thumbnail
        path.join(UPLOAD_DIR, `${baseName}_view.jpg`), // view image
      ]

      console.log('Files to delete:', filesToDelete)

      for (const filePath of filesToDelete) {
        if (existsSync(filePath)) {
          await unlink(filePath)
          console.log('Deleted file:', filePath)
        } else {
          console.log('File not found:', filePath)
        }
      }
    } catch (fileError) {
      console.error('Error deleting physical files:', fileError)
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({ message: 'Image deleted successfully' })

  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}