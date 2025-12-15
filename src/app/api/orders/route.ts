import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
            size: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, deliveryType, address, comment, items, total } = body

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = String(orderCount + 1).padStart(4, '0')

    // Create order with items in a transaction
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: name,
        phone,
        deliveryType,
        address,
        comment,
        totalAmount: total,
        items: {
          create: items.map((item: any) => ({
            productName: item.productName,
            article: item.article,
            size: item.sizeLabel,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        items: true
      }
    })

    // TODO: Send Telegram notification
    // await sendTelegramNotification(order)

    return NextResponse.json({
      success: true,
      orderNumber,
      total,
      order
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}