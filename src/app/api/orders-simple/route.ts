import { NextResponse } from 'next/server'
import { getDb, closeDb } from '@/lib/db'
import { sendTelegramNotification } from '@/lib/telegram'

export async function GET() {
  try {
    const db = await getDb()

    const orders = db.prepare(`
      SELECT o.*, GROUP_CONCAT(oi.product_name || '|' || oi.article || '|' || oi.size || '|' || oi.quantity || '|' || oi.price, ';') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all()

    // Transform the data
    const transformedOrders = orders.map((order: any) => ({
      ...order,
      items: order.items ? order.items.split(';').map((item: string) => {
        const [productName, article, size, quantity, price] = item.split('|')
        return { productName, article, size, quantity: parseInt(quantity), price: parseFloat(price) }
      }) : []
    }))

    await closeDb(db)
    return NextResponse.json(transformedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, deliveryType, address, comment, items, total } = body

    const db = await getDb()

    // Generate order number
    const orderCountResult = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }
    const orderCount = orderCountResult.count
    const orderNumber = String(orderCount + 1).padStart(4, '0')

    // Create order
    const orderResult = db.prepare(`
      INSERT INTO orders (order_number, customer_name, phone, delivery_type, address, comment, total_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(orderNumber, name, phone, deliveryType, address || null, comment || null, total)

    const orderId = orderResult.lastInsertRowid as number

    // Create order items
    for (const item of items) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_name, article, size, quantity, price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderId, item.productName, item.article, item.sizeLabel, item.quantity, item.price)
    }

    await closeDb(db)

    // Prepare order data for Telegram notification
    const orderData = {
      orderNumber,
      customerName: name,
      phone,
      deliveryType,
      address,
      comment,
      totalAmount: total,
      items: items.map((item: any) => ({
        productName: item.productName,
        article: item.article,
        size: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
      }))
    }

    // Send Telegram notification
    await sendTelegramNotification(orderData)

    return NextResponse.json({
      success: true,
      orderNumber,
      total,
      order: {
        id: orderId,
        orderNumber,
        customerName: name,
        phone,
        deliveryType,
        address,
        comment,
        totalAmount: total,
        createdAt: new Date(),
        items: items.map((item: any) => ({
          productName: item.productName,
          article: item.article,
          size: item.sizeLabel,
          quantity: item.quantity,
          price: item.price,
        }))
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}