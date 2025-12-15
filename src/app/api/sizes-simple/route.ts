import { NextResponse } from 'next/server'
import { getDb, closeDb } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDb()

    const sizes = db.prepare('SELECT * FROM sizes ORDER BY price ASC').all()

    await closeDb(db)

    return NextResponse.json(sizes)
  } catch (error) {
    console.error('Error fetching sizes:', error)
    return NextResponse.json({ error: 'Failed to fetch sizes' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, price } = body

    if (!id || typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Invalid size ID or price' }, { status: 400 })
    }

    const db = await getDb()

    const result = db.prepare('UPDATE sizes SET price = ? WHERE id = ?').run(price, id)

    await closeDb(db)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Size not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Size updated successfully' })
  } catch (error) {
    console.error('Error updating size:', error)
    return NextResponse.json({ error: 'Failed to update size' }, { status: 500 })
  }
}