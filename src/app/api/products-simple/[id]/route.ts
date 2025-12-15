import { NextResponse } from 'next/server'
import { getDb, closeDb } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { name, article, images, available } = body
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const db = await getDb()

    // Check if product exists
    const existingProduct = db.prepare('SELECT id FROM products WHERE id = ?').get(productId)
    if (!existingProduct) {
      await closeDb(db)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Update product
    db.prepare(`
      UPDATE products
      SET name = ?, article = ?, images = ?, available = ?
      WHERE id = ?
    `).run(
      name,
      article,
      JSON.stringify(images || []),
      (available ?? true) ? 1 : 0,
      productId
    )

    // Get updated product
    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)

    await closeDb(db)

    return NextResponse.json({
      id: (updatedProduct as any).id,
      name: (updatedProduct as any).name,
      article: (updatedProduct as any).article,
      images: JSON.parse((updatedProduct as any).images || '[]'),
      available: Boolean((updatedProduct as any).available)
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const db = await getDb()

    // Check if product exists
    const existingProduct = db.prepare('SELECT id FROM products WHERE id = ?').get(productId)
    if (!existingProduct) {
      await closeDb(db)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete product
    db.prepare('DELETE FROM products WHERE id = ?').run(productId)

    await closeDb(db)

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}