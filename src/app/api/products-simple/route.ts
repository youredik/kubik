import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'dev.db')
    const db = new Database(dbPath)

    const products = db.prepare('SELECT * FROM products WHERE available = 1 ORDER BY name ASC').all()

    db.close()

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, article, images, available } = body

    if (!name || !article) {
      return NextResponse.json({ error: 'Name and article are required' }, { status: 400 })
    }

    const dbPath = path.join(process.cwd(), 'dev.db')
    const db = new Database(dbPath)

    const result = db.prepare(`
      INSERT INTO products (name, article, images, available)
      VALUES (?, ?, ?, ?)
    `).run(name, article, JSON.stringify(images || []), (available ?? true) ? 1 : 0)

    db.close()

    return NextResponse.json({
      id: result.lastInsertRowid,
      name,
      article,
      images: JSON.stringify(images || []),
      available: available ?? true
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}