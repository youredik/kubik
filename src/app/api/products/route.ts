import {NextResponse} from 'next/server'
import Database from 'better-sqlite3'

export async function GET() {
    try {
        const db = new Database('dev.db')
        const products = db.prepare('SELECT * FROM products WHERE available = 1 ORDER BY name ASC').all()
        db.close()

        const transformedProducts = products.map((product: any) => ({
          id: product.id,
          name: product.name,
          article: product.article,
          images: JSON.parse(product.images || '[]'),
          available: Boolean(product.available)
        }))

        return NextResponse.json(transformedProducts)
    } catch (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json({error: 'Failed to fetch products'}, {status: 500})
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {name, article, images, available} = body

        const db = new Database('dev.db')
        const result = db.prepare('INSERT INTO products (name, article, images, available) VALUES (?, ?, ?, ?)').run(
            name,
            article,
            JSON.stringify(images || []),
            (available ?? true) ? 1 : 0
        )

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
        db.close()

        const transformedProduct = {
          id: (product as any).id,
          name: (product as any).name,
          article: (product as any).article,
          images: JSON.parse((product as any).images || '[]'),
          available: Boolean((product as any).available)
        }

        return NextResponse.json(transformedProduct, {status: 201})
    } catch (error) {
        console.error('Error creating product:', error)
        return NextResponse.json({error: 'Failed to create product'}, {status: 500})
    }
}